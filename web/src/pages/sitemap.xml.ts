import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { courses } from '../data/trainings';
import { eduPrograms } from '../data/education';
const paths=['/','/o-nas/','/szkolenia/','/szkolenia/narzedzia-ai/','/edukacja/','/doradztwo/','/ai-security/','/wspolpraca/','/wiedza/','/bannery/','/wiedza/2026-11-09/google-aktualizuje-zasady-agentowej-ai/','/wiedza/2026-10-30/jak-sprawdzac-odpowiedzi-ai/','/wiedza/2026-10-30/od-zadania-do-pilota/','/kontakt/','/prywatnosc/',...courses.map(c=>`/szkolenia/${c.slug}/`),...eduPrograms.map(p=>`/edukacja/${p.slug}/`)];
export const GET: APIRoute = () => new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${site.url && site.indexing ? paths.map(path=>`<url><loc>${new URL(path,site.url).href.replace(/&/g,'&amp;')}</loc></url>`).join('') : ''}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
