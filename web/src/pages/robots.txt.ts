import type { APIRoute } from 'astro';
import { site } from '../data/site';
export const GET: APIRoute = () => new Response(site.indexing && site.url ? `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type':'text/plain; charset=utf-8' } });
