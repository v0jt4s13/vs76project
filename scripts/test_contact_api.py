"""Test end-to-end endpointów formularza (web/api/*.php): php -S + fałszywy serwer SMTP. Bez sieci zewnętrznej."""
import base64, json, os, re, shutil, socket, subprocess, sys, tempfile, threading, time, unittest
import urllib.request, urllib.error
from email import message_from_bytes
from email.header import decode_header, make_header
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / 'web/api'


class FakeSMTP(threading.Thread):
    """Minimalny serwer SMTP: EHLO, AUTH PLAIN, MAIL, RCPT, DATA. Zapisuje odebrane wiadomości."""
    def __init__(self):
        super().__init__(daemon=True)
        self.sock = socket.socket(); self.sock.bind(('127.0.0.1', 0)); self.sock.listen(5)
        self.port = self.sock.getsockname()[1]
        self.messages = []; self.auth = []; self.fail_next = False

    def run(self):
        while True:
            try:
                conn, _ = self.sock.accept()
            except OSError:
                return
            threading.Thread(target=self.handle, args=(conn,), daemon=True).start()

    def handle(self, conn):
        f = conn.makefile('rwb', buffering=0)
        def send(line): f.write((line + '\r\n').encode())
        send('220 fake ESMTP')
        mail_from = rcpt = None
        while True:
            line = f.readline()
            if not line: break
            cmd = line.decode(errors='replace').strip()
            up = cmd.upper()
            if up.startswith('EHLO'): send('250-fake'); send('250 AUTH PLAIN')
            elif up.startswith('AUTH PLAIN'):
                self.auth.append(base64.b64decode(cmd.split()[2]))
                send('235 ok')
            elif up.startswith('MAIL FROM'): mail_from = cmd; send('250 ok')
            elif up.startswith('RCPT TO'): rcpt = cmd; send('250 ok')
            elif up == 'DATA':
                if self.fail_next:
                    self.fail_next = False; send('554 odrzucono'); continue
                send('354 go')
                data = b''
                while True:
                    l = f.readline()
                    if l == b'.\r\n': break
                    data += l
                self.messages.append({'from': mail_from, 'rcpt': rcpt, 'raw': data})
                send('250 queued')
            elif up == 'QUIT': send('221 bye'); break
            else: send('500 ?')
        conn.close()


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not shutil.which('php'):
            raise unittest.SkipTest('brak php w PATH')
        cls.tmp = Path(tempfile.mkdtemp(prefix='talnet-api-'))
        cls.smtp = FakeSMTP(); cls.smtp.start()
        cls.write_config(limits={'send_per_hour': 50, 'min_solve_seconds': 0})
        cls.port = free_port()
        env = dict(os.environ, TALNET_CONFIG=str(cls.tmp / 'config.php'))
        cls.php = subprocess.Popen(['php', '-S', f'127.0.0.1:{cls.port}', '-t', str(API)], env=env,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.base = f'http://127.0.0.1:{cls.port}'
        for _ in range(50):
            try:
                socket.create_connection(('127.0.0.1', cls.port), 0.2).close(); break
            except OSError:
                time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.php.terminate(); cls.php.wait(); cls.smtp.sock.close(); shutil.rmtree(cls.tmp, ignore_errors=True)

    @classmethod
    def write_config(cls, limits=None, secret='s' * 40):
        cfg = {'secret': secret, 'to': 'kontakt@example.test', 'from': 'formularz@example.test', 'transport': 'smtp',
               'smtp': {'host': '127.0.0.1', 'port': cls.smtp.port, 'secure': 'none', 'user': 'formularz@example.test', 'pass': 'haslo-testowe'},
               'allowed_origins': ['https://example.test'], 'state_dir': str(cls.tmp / 'state'), 'limits': limits or {}}
        (cls.tmp / 'config.php').write_text('<?php return json_decode(' + repr(json.dumps(cfg)) + ', true);')

    def req(self, path, method='GET', body=None, headers=None, raw=None):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        r = urllib.request.Request(self.base + path, data=data, method=method, headers=headers or {})
        try:
            with urllib.request.urlopen(r, timeout=10) as resp:
                return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read() or b'{}')

    def challenge(self):
        status, ch = self.req('/challenge.php'); self.assertEqual(status, 200); return ch

    def payload(self, ch, **over):
        d = {'topic': 'AI Security w firmie', 'name': 'Anna Test', 'email': 'anna@example.org', 'company': 'Firma Testowa',
             'people': '8', 'format': 'Online', 'message': 'Chcemy przećwiczyć weryfikację odpowiedzi AI w zespole.',
             'website': '', 'challenge_token': ch['token'], 'selected_icon': ch['target']}
        d.update(over); return d

    def post(self, body, headers=None):
        return self.req('/contact.php', 'POST', body, {'Content-Type': 'application/json', 'Origin': 'https://example.test', **(headers or {})})

    def test_wyzwanie_ma_szesc_unikalnych_ikon_i_cel(self):
        ch = self.challenge()
        self.assertEqual(len(set(ch['options'])), 6); self.assertIn(ch['target'], ch['options'])

    def test_poprawna_wysylka_trafia_do_smtp_z_logowaniem(self):
        n = len(self.smtp.messages)
        status, res = self.post(self.payload(self.challenge()))
        self.assertEqual((status, res), (200, {'ok': True}))
        self.assertEqual(len(self.smtp.messages), n + 1)
        m = self.smtp.messages[-1]
        self.assertIn('kontakt@example.test', m['rcpt']); self.assertIn('formularz@example.test', m['from'])
        self.assertIn(b'\x00formularz@example.test\x00haslo-testowe', self.smtp.auth[-1])
        msg = message_from_bytes(m['raw'])
        self.assertEqual(str(make_header(decode_header(msg['Subject']))), 'Zapytanie ze strony vs76project.pl: AI Security w firmie')
        self.assertEqual(msg['Reply-To'], '<anna@example.org>')
        body = msg.get_payload(decode=True).decode()
        self.assertIn('Anna Test', body); self.assertIn('weryfikację odpowiedzi AI', body); self.assertIn('Forma: Online', body)

    def test_token_jest_jednorazowy(self):
        ch = self.challenge()
        self.assertEqual(self.post(self.payload(ch))[0], 200)
        status, res = self.post(self.payload(ch))
        self.assertEqual((status, res.get('kod')), (400, 'challenge'))

    def test_zla_ikona_i_zmieniony_token_odrzucone(self):
        ch = self.challenge(); wrong = next(i for i in ch['options'] if i != ch['target'])
        self.assertEqual(self.post(self.payload(ch, selected_icon=wrong))[1].get('kod'), 'challenge')
        ch = self.challenge(); tok = ch['token'][:-1] + ('0' if ch['token'][-1] != '0' else '1')
        self.assertEqual(self.post(self.payload(ch, challenge_token=tok))[1].get('kod'), 'challenge')

    def test_honeypot_odrzuca_bez_zuzycia_informacji(self):
        status, res = self.post(self.payload(self.challenge(), website='http://spam.example'))
        self.assertEqual(status, 400); self.assertNotIn('kod', res)

    def test_walidacja_pol(self):
        for over in ({'email': 'to-nie-email'}, {'message': 'krótka'}, {'name': ''}, {'message': 'x' * 2501}):
            status, _ = self.post(self.payload(self.challenge(), **over)); self.assertEqual(status, 400, over)

    def test_wstrzykniecie_naglowka_nie_dodaje_bcc(self):
        n = len(self.smtp.messages)
        status, _ = self.post(self.payload(self.challenge(), name='Anna\r\nBcc: zly@example.org', company='Firma\nCc: zly2@example.org'))
        self.assertEqual(status, 200)
        raw = self.smtp.messages[n]['raw']
        self.assertNotIn(b'\nBcc:', raw); self.assertNotIn(b'\nCc:', raw)

    def test_zly_origin_i_metoda(self):
        ch = self.challenge()
        status, _ = self.post(self.payload(ch), headers={'Origin': 'https://zly.example'}); self.assertEqual(status, 403)
        self.assertEqual(self.req('/contact.php')[0], 405)
        self.assertEqual(self.req('/challenge.php', 'POST', {})[0], 405)

    def test_odrzuca_typy_prostych_formularzy_bez_wysylki(self):
        n = len(self.smtp.messages)
        body = self.payload(self.challenge())
        for content_type in ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=test', '']:
            status, _ = self.post(body, headers={'Content-Type': content_type})
            self.assertEqual(status, 415, content_type)
        self.assertEqual(len(self.smtp.messages), n)
        # Rejected encodings must not consume the challenge; JSON with charset is valid.
        self.assertEqual(self.post(body, headers={'Content-Type': 'application/json; charset=UTF-8'})[0], 200)

    def test_zbyt_duze_zgloszenie(self):
        status, _ = self.req('/contact.php', 'POST', raw=b'{"x":"' + b'a' * 20000 + b'"}', headers={'Content-Type': 'application/json', 'Origin': 'https://example.test'})
        self.assertEqual(status, 413)

    def test_blad_smtp_daje_502_bez_szczegolow(self):
        self.smtp.fail_next = True
        status, res = self.post(self.payload(self.challenge()))
        self.assertEqual(status, 502); self.assertNotIn('554', json.dumps(res))


class LimitsTest(unittest.TestCase):
    """Osobny serwer z ciasnymi limitami i wymuszonym minimalnym czasem."""
    @classmethod
    def setUpClass(cls):
        if not shutil.which('php'):
            raise unittest.SkipTest('brak php w PATH')
        cls.tmp = Path(tempfile.mkdtemp(prefix='talnet-lim-'))
        cls.smtp = FakeSMTP(); cls.smtp.start()
        cfg = {'secret': 'k' * 40, 'to': 'a@example.test', 'from': 'b@example.test', 'transport': 'smtp',
               'smtp': {'host': '127.0.0.1', 'port': cls.smtp.port, 'secure': 'none'},
               'allowed_origins': [], 'state_dir': str(cls.tmp / 'state'),
               'limits': {'send_per_hour': 3, 'challenge_per_hour': 4, 'min_solve_seconds': 2}}
        (cls.tmp / 'config.php').write_text('<?php return json_decode(' + repr(json.dumps(cfg)) + ', true);')
        cls.port = free_port()
        cls.php = subprocess.Popen(['php', '-S', f'127.0.0.1:{cls.port}', '-t', str(API)], env=dict(os.environ, TALNET_CONFIG=str(cls.tmp / 'config.php')),
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                socket.create_connection(('127.0.0.1', cls.port), 0.2).close(); break
            except OSError:
                time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.php.terminate(); cls.php.wait(); cls.smtp.sock.close(); shutil.rmtree(cls.tmp, ignore_errors=True)

    def req(self, path, method='GET', body=None):
        r = urllib.request.Request(f'http://127.0.0.1:{self.port}{path}', data=json.dumps(body).encode() if body is not None else None, method=method,
                                   headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(r, timeout=10) as resp: return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'{}')

    def test_limity_i_minimalny_czas(self):
        body = lambda ch: {'topic': 'Doradztwo', 'name': 'Jan', 'email': 'jan@example.org', 'message': 'Wiadomość o minimum piętnastu znakach.',
                           'website': '', 'challenge_token': ch['token'], 'selected_icon': ch['target']}
        status, ch = self.req('/challenge.php'); self.assertEqual(status, 200)
        status, res = self.req('/contact.php', 'POST', body(ch))               # 1. próba: za szybko
        self.assertEqual((status, res.get('kod')), (400, 'challenge'))
        time.sleep(2.2)
        status, ch = self.req('/challenge.php')
        time.sleep(2.2)
        self.assertEqual(self.req('/contact.php', 'POST', body(ch))[0], 200)   # 2. próba przechodzi
        status, ch = self.req('/challenge.php'); time.sleep(2.2)
        self.assertEqual(self.req('/contact.php', 'POST', body(ch))[0], 200)   # 3. próba
        status, _ = self.req('/contact.php', 'POST', body(ch))                 # 4. próba: limit 3/h
        self.assertEqual(status, 429)
        # limit pobrań wyzwania: 4/h (wykorzystano już 3)
        self.assertEqual(self.req('/challenge.php')[0], 200)
        self.assertEqual(self.req('/challenge.php')[0], 429)


class CleanupTest(unittest.TestCase):
    def test_cleanup_without_http_traffic(self):
        if not shutil.which('php'):
            self.skipTest('brak php')
        with tempfile.TemporaryDirectory(prefix='vs76-cleanup-') as temp:
            root = Path(temp)
            for sub, ttl in [('nonces', 1200), ('rl', 172800)]:
                (root / sub).mkdir()
                for name, age in [('old', ttl + 60), ('fresh', 0)]:
                    f = root / sub / name
                    f.write_text('test')
                    os.utime(f, (time.time() - age, time.time() - age))
            command = ['php', str(ROOT / 'scripts/cleanup_contact_state.php'), str(API / '_lib.php'), str(root)]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            for sub in ['nonces', 'rl']:
                self.assertFalse((root / sub / 'old').exists())
                self.assertTrue((root / sub / 'fresh').exists())
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 0)
            self.assertNotEqual(subprocess.run(command[:-1] + [str(root / 'missing')], capture_output=True).returncode, 0)


class ZgodnoscTest(unittest.TestCase):
    def test_tematy_php_zgodne_z_contact_utils(self):
        js = (ROOT / 'web/src/scripts/contact-utils.mjs').read_text()
        php = (API / '_lib.php').read_text()
        topics_js = re.findall(r"'([^']+)'", re.search(r'export const topics = \[(.*?)\]', js, re.S).group(1))
        topics_php = re.findall(r"'([^']+)'", re.search(r'const TN_TOPICS = \[(.*?)\];', php, re.S).group(1))
        self.assertEqual(topics_js, topics_php)

    def test_ikony_php_zgodne_z_klientem(self):
        ts = (ROOT / 'web/src/scripts/site.ts').read_text()
        php = (API / '_lib.php').read_text()
        icons_php = re.findall(r"'([^']+)'", re.search(r'const TN_ICONS = \[(.*?)\];', php, re.S).group(1))
        for icon in icons_php:
            self.assertIn(icon, ts, f'brak etykiety ikony {icon} w site.ts')

    def test_brak_sekretow_w_repo(self):
        for f in API.glob('*'):
            self.assertNotRegex(f.read_text(), r'pass\' => \'(?!WSTAW)', f.name)


if __name__ == '__main__':
    unittest.main(verbosity=2)
