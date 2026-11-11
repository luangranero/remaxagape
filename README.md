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

## Publicação na Netlify (atual)

O `netlify.toml` já configura tudo:
- `public/` é servido pela CDN
- `netlify/functions/app.mjs` atende `/api/*`, `/imovel/*`, `/sitemap.xml` e `/robots.txt`
- o catálogo fica no **Netlify Blobs** (store `catalogo`). Até o primeiro webhook ou sincronização,
  usa `data/imoveis.json` do repositório como semente
- `netlify/functions/sincronizar.mjs` reimporta os imóveis do site Square todo dia às 06:00
  (desative com `SINCRONIZAR_SQUARE=false`)

Em **Site configuration → Environment variables**, defina:

| Variável | Valor |
|---|---|
| `WEBHOOK_TOKEN` | um valor longo e aleatório (sem ele o webhook recusa tudo) |
| `SITE_URL` | `https://seu-dominio` (opcional; usado no sitemap e nos links canônicos) |

URL para cadastrar no sistema da RE/MAX: `https://seu-dominio/api/webhook/imoveis?token=SEU_TOKEN`
(ou mande o token no header `X-Webhook-Token`).

Para ver as últimas chamadas recebidas: `GET /api/webhook/log?token=SEU_TOKEN`.

## Rodar em servidor próprio (VPS)

`npm start` também funciona em qualquer servidor com Node 22+ e disco persistente; nesse caso o
catálogo fica em `data/imoveis.json`. Configure o `.env` (veja `.env.example`) e agende
`npm run importar` 1x por dia se quiser a sincronização de segurança.
