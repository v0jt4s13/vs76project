export const site = {
  name: 'vs76project.pl',
  description: 'Praktyczne szkolenia AI dla firm, doradztwo i automatyzacja. Rezultaty, które można sprawdzić, oraz odpowiedzialna praca z informacją.',
  email: (import.meta.env.PUBLIC_CONTACT_EMAIL || '').trim(),
  url: (import.meta.env.PUBLIC_SITE_URL || '').trim().replace(/\/$/, ''),
  indexing: import.meta.env.PUBLIC_INDEXING === 'true',
  // true: formularz wysyła wiadomość przez web/api/*.php (własna poczta). false: tylko przygotowuje treść do skopiowania.
  contactApi: import.meta.env.PUBLIC_CONTACT_API === 'true',
  template: (import.meta.env.PUBLIC_TEMPLATE || 'classic').trim(),
};
if (site.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.email)) throw new Error('Niepoprawny PUBLIC_CONTACT_EMAIL');
if (site.url) {
  const parsed = new URL(site.url);
  if (parsed.protocol !== 'https:' || parsed.origin !== site.url) throw new Error('PUBLIC_SITE_URL musi być originem HTTPS bez ścieżki, parametrów i danych logowania');
}
export const navigation = [
  ['/szkolenia/', 'Szkolenia'], ['/edukacja/', 'Edukacja'], ['/doradztwo/', 'Doradztwo'], ['/ai-security/', 'AI Security'], ['/wiedza/', 'Wiedza'],
];
