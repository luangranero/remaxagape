# Site RE/MAX Agapê

Vitrine de imóveis no estilo e-commerce: filtros, carrinho com vários imóveis e envio da lista
pelo WhatsApp direto para o corretor responsável. O catálogo é alimentado pelo **webhook** do CRM.

Não tem dependências externas, só Node.js 18+.

```bash
npm start              # http://localhost:3000
npm run dev            # mesmo, recarregando ao salvar
npm run importar       # puxa os imóveis do site atual (usesquare) para data/imoveis.json
npm run testar-webhook # simula criar → atualizar → remover via webhook
```

## Estrutura

```
server.js              servidor HTTP: páginas, API, webhook, sitemap
src/normalizar.js      converte o imóvel do CRM → modelo do site (tolerante a variações)
src/webhook.js         autenticação + criar/atualizar/remover a partir do payload
src/store.js           armazenamento em data/imoveis.json (escrita atômica)
src/config.js          dados da unidade (WhatsApp, endereço, CRECI...)
scripts/importar.js    importa os imóveis do site público atual
public/                front-end (HTML/CSS/JS puro)
  index.html           vitrine com filtros
  imovel.html          página do imóvel (meta tags de SEO injetadas pelo servidor)
  js/comum.js          carrinho, card, cabeçalho/rodapé, WhatsApp
  js/catalogo.js       filtros facetados, ordenação, paginação, estado na URL
  js/imovel.js         galeria, lightbox, ficha, imóveis semelhantes
```

## Webhook

**Endpoint:** `POST https://SEU-DOMINIO/api/webhook/imoveis`

**Autenticação** (defina no `.env`, veja `.env.example`):
- `WEBHOOK_TOKEN`: enviado em `X-Webhook-Token: <token>`, em `Authorization: Bearer <token>` ou em `?token=<token>`
- ou `WEBHOOK_SECRET`: assinatura HMAC-SHA256 do corpo em `X-Signature` / `X-Hub-Signature-256`

Em produção (`NODE_ENV=production`), sem nenhum dos dois o webhook recusa todas as chamadas.

**Formatos aceitos:**

```jsonc
{ "event": "property.created", "data": { ...imóvel } }   // cria ou atualiza
{ "event": "property.updated", "data": { "id": "...", "values": { "sale": 375000 } } } // parcial: mescla
{ "event": "property.deleted", "data": { "id": "..." } } // remove
{ ...imóvel }                                             // o próprio imóvel
[ { ...imóvel }, { ...imóvel } ]                          // lote
```

Eventos com nome de remoção (`delete`, `removido`, `inativo`, `vendido`, `alugado`, `archived`...)
tiram o imóvel do ar. Imóveis com `status` VENDIDO/ALUGADO/INATIVO também saem.

O normalizador entende o formato do Nonstop/Square (`base36Id`, `values.sale`, `areas.private`,
`rooms`, `baths`, `parkingLots`, `user`, `media.images`...) e nomes alternativos em português/inglês.

**Depuração:** as últimas 200 chamadas ficam em `data/webhook-log.jsonl`, com o corpo recebido e o
resultado. Na primeira integração real, confira esse arquivo para ajustar o mapeamento, se precisar.

## Publicação

Funciona em qualquer hospedagem que rode Node e tenha **disco persistente** (o catálogo fica em
`data/imoveis.json`): VPS, Railway, Render (com disk), Fly.io (com volume), Hostinger VPS etc.

1. Copie `.env.example` para `.env` e preencha `SITE_URL` e `WEBHOOK_TOKEN`
2. `npm start` (ou use PM2 / systemd)
3. Cadastre a URL do webhook com o token no sistema da RE/MAX
4. Opcional: agende `npm run importar` 1x por dia como sincronização de segurança

Para hospedagem serverless (Vercel/Netlify), troque `src/store.js` por um banco (Supabase,
Postgres, Vercel KV). A interface tem só 5 funções.
