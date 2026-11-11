'use strict';
/** Dados da unidade — exibidos no site e usados no contato via WhatsApp. */
module.exports = {
  nome: 'RE/MAX Agapê',
  creci: '25367-J',
  whatsapp: '5511997598200',
  telefone: '(11) 99759-8200',
  email: 'hildakeller@remax.com.br',
  endereco: {
    rua: 'Rua Francisco Fett, 464',
    bairro: 'Vila Paulo Silas',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '03264-000',
  },
  sobre:
    'Há mais de 30 anos construindo lares e realizando sonhos no Parque São Lucas e região. ' +
    'Nosso compromisso é mais do que vender imóveis: é criar laços duradouros com pessoas. ' +
    'Nosso negócio é com pessoas, e não com propriedades.',
  // URL pública do site (usada no sitemap, nos links enviados por WhatsApp e nas meta tags)
  urlSite: process.env.SITE_URL || 'http://localhost:3000',
};
