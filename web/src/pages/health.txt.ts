import type { APIRoute } from 'astro';
export const GET: APIRoute = () => new Response('vs76project: test statycznego builda OK\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
