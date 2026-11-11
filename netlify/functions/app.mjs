/**
 * Netlify Function: API, webhook, página do imóvel (SEO), sitemap e robots.
 * Os arquivos estáticos (public/) são servidos direto pela CDN da Netlify.
 */
import fs from 'node:fs';
import path from 'node:path';
import app from '../../src/app.js';

let template = null;

/** Lê public/imovel.html (incluído via included_files) ou busca no próprio site. */
async function lerTemplate(request) {
  if (template) return template;
  const candidatos = [
    path.resolve('public/imovel.html'),
    path.join(process.env.LAMBDA_TASK_ROOT || '', 'public/imovel.html'),
  ];
  for (const c of candidatos) {
    try { template = fs.readFileSync(c, 'utf8'); return template; } catch { /* próximo */ }
  }
  const r = await fetch(new URL('/imovel.html', request.url));
  template = await r.text();
  return template;
}

export default async (request) => {
  try {
    const resposta = await app.handle(request, { lerTemplate: () => lerTemplate(request) });
    return resposta || new Response('Não encontrado', { status: 404 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ erro: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};

export const config = {
  path: ['/api/*', '/imovel/*', '/sitemap.xml', '/robots.txt'],
};
