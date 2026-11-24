import { defineConfig } from 'astro/config';
import { reviewPage } from './dev/review-page.mjs';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Szablony strony: src/templates/<nazwa>/ (Layout.astro, Home.astro, styles.css). Aktywny wybiera zmienna PUBLIC_TEMPLATE
// (domyślnie "classic"). Alias @template wskazuje na katalog aktywnego szablonu, więc do builda trafia tylko on.
const templatesDir = fileURLToPath(new URL('./src/templates/', import.meta.url));
const available = readdirSync(templatesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(`${templatesDir}${d.name}/Layout.astro`) && existsSync(`${templatesDir}${d.name}/Home.astro`))
  .map((d) => d.name);
const active = (process.env.PUBLIC_TEMPLATE || 'classic').trim();
if (!available.includes(active)) {
  throw new Error(`Nieznany szablon "${active}" (PUBLIC_TEMPLATE). Dostępne: ${available.join(', ')}`);
}

export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  vite: {
    plugins: [reviewPage()],
    define: { 'import.meta.env.PUBLIC_REVIEW_ENABLED': JSON.stringify(existsSync(new URL('../docs/checklista-odbioru.html', import.meta.url))) },
    resolve: { alias: { '@template': `${templatesDir}${active}` } },
    // Lokalny test formularza: DEV_API_PROXY=http://127.0.0.1:8081 przekazuje /api do serwera PHP (scripts/dev_with_api.sh).
    server: process.env.DEV_API_PROXY ? { proxy: { '/api': { target: process.env.DEV_API_PROXY, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') } } } : {},
  },
});
