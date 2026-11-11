'use strict';
/**
 * Simula chamadas do CRM ao webhook, para testar localmente.
 *
 *   npm start                 (em um terminal)
 *   npm run testar-webhook    (em outro)
 */
const URL_WH = process.env.WEBHOOK_URL || `http://localhost:${process.env.PORT || 3000}/api/webhook/imoveis`;
const TOKEN = process.env.WEBHOOK_TOKEN || '';

async function enviar(nome, corpo) {
  const r = await fetch(URL_WH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { 'X-Webhook-Token': TOKEN } : {}) },
    body: JSON.stringify(corpo),
  });
  console.log(`${nome}: HTTP ${r.status}`, await r.text());
}

const imovelTeste = {
  id: 'teste-webhook-001',
  base36Id: 'TESTE1',
  title: 'Apartamento de teste via webhook com 2 quartos, 58m²',
  type: 'APARTAMENTO_TIPO',
  available: { sale: true, longStay: false },
  values: { sale: 389000, condoFee: 520, propertyTax: 90 },
  areas: { private: 58 },
  rooms: 2, suites: 1, baths: 2,
  parkingLots: [{ id: 'v1' }],
  address: { street: 'Rua Francisco Fett', number: '464', area: 'Vila Paulo Silas', city: 'São Paulo', state: 'SP', zipcode: '03264-000', geo: { coordinates: [-46.5517, -23.6006] } },
  description: 'Imóvel criado pelo script de teste do webhook. Pode ser removido.',
  features: ['SACADA', 'CHURRASQUEIRA', 'AREA_SERVICO'],
  media: { images: [{ url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200' }] },
  user: { id: 'corretor-teste', name: 'Corretor Teste', whatsapp: '+5511997598200' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

(async () => {
  await enviar('1) criar', { event: 'property.created', data: imovelTeste });
  await enviar('2) atualizar preço', { event: 'property.updated', data: { id: 'teste-webhook-001', values: { sale: 375000 } } });
  const r = await fetch(URL_WH.replace('/webhook/imoveis', '/imoveis/TESTE1'));
  const i = await r.json();
  console.log(`   → preço agora: ${i.precoVenda} | título mantido: "${i.titulo}" | corretor: ${i.corretor.nome}`);
  await enviar('3) remover', { event: 'property.deleted', data: { id: 'teste-webhook-001' } });
})().catch((e) => { console.error('Falhou — o servidor está rodando?', e.message); process.exit(1); });
