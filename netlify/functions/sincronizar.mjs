/**
 * Function agendada: todo dia às 06:00 (horário de Brasília) reimporta os
 * imóveis do site Square da unidade para o Netlify Blobs.
 *
 * É uma rede de segurança caso alguma chamada do webhook se perca.
 * Para desligar, defina a variável SINCRONIZAR_SQUARE=false na Netlify.
 */
import importador from '../../scripts/importar.js';
import store from '../../src/store.js';

export default async () => {
  if (process.env.SINCRONIZAR_SQUARE === 'false') {
    console.log('Sincronização desativada (SINCRONIZAR_SQUARE=false).');
    return;
  }
  const { imoveis, erros, total } = await importador.importarTudo({ concorrencia: 10 });
  // Proteção: não apaga o catálogo se o site de origem falhar
  if (!imoveis.length || imoveis.length < total * 0.8) {
    console.error(`Sincronização abortada: ${imoveis.length}/${total} importados.`, erros.slice(0, 5));
    return;
  }
  await store.salvarTodos(imoveis);
  console.log(`Sincronizados ${imoveis.length} imóveis.${erros.length ? ` ${erros.length} falhas.` : ''}`);
};

export const config = {
  schedule: '0 9 * * *', // 09:00 UTC = 06:00 BRT
};
