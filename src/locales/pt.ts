import type { GoldpanMessages } from '../types';
export type { GoldpanMessages } from '../types';

const pt: GoldpanMessages = {
  lang: 'pt',
  placeholder: 'Cole ou digite endereços de e-mail',
  inputLabel: 'Endereços de e-mail',
  valid: 'Válidos',
  warning: 'A verificar',
  invalid: 'Rejeitados',
  filterGroup: 'Mostrar só',
  counter: { one: '{count} endereço', other: '{count} endereços' },
  counterMax: '{count} de {max} vagas',
  empty: 'Nenhum endereço ainda. Separe-os com vírgulas, espaços ou quebras de linha.',
  format: 'Não é um endereço de e-mail válido',
  blockedDomain: 'Endereços deste domínio não são aceitos',
  typo: 'Você quis dizer {suggestion}?',
  duplicate: 'Já aparece mais acima',
  existing: 'Já registrado',
  limit: 'Não há mais vaga para este endereço',
  fix: 'Usar {suggestion}',
  fixButton: 'Corrigir',
  edit: 'Editar {email}',
  remove: 'Remover {email}',
  editField: 'Editando {email}',
  announceAdd: 'Válidos: {valid}. A verificar: {warning}. Rejeitados: {invalid}.',
  announceRemove: '{email} removido',
  formHasErrors: 'Há endereços rejeitados: corrija-os ou remova-os.',
  formRequired: 'Adicione pelo menos um endereço de e-mail.',
  rejectedAsk: { one: 'Há {count} endereço rejeitado.', other: 'Há {count} endereços rejeitados.' },
  rejectedAgain: { one: 'Pressione de novo para continuar sem ele.', other: 'Pressione de novo para continuar sem eles.' },
  rejectedSkip: 'Ignorar e enviar',
};

export default pt;
