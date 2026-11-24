import { existsSync, readFileSync } from 'node:fs';

// Checklist belongs to the local review site; it is not a public production page.
export function reviewPage() {
  const source = new URL('../../docs/checklista-odbioru.html', import.meta.url);
  return {
    name: 'vs76-review-page',
    apply: 'serve',
    configureServer(server) {
      if (!existsSync(source)) return;
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/odbior/' && path !== '/odbior') return next();
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { Allow: 'GET, HEAD' });
          return res.end();
        }
        try {
          let page = readFileSync(source, 'utf8');
          // Relative references concern local project files, not HTTP routes.
          page = page.replace(/<a href="(?!#)[^"]*">Otwórz materiał<\/a>/g,
            '<span class="muted">Materiał dostępny w lokalnym katalogu projektu.</span>');
          page = page.replace('<header>', '<header><a href="/">← Wróć do strony vs76project</a>');
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
          });
          res.end(req.method === 'HEAD' ? undefined : page);
        } catch (error) { next(error); }
      });
    },
  };
}
