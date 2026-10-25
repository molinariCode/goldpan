import type { GoldpanMessages } from '../types';
export type { GoldpanMessages } from '../types';

const es: GoldpanMessages = {
  lang: 'es',
  placeholder: 'Pega o escribe direcciones de correo',
  inputLabel: 'Direcciones de correo',
  valid: 'Válidas',
  warning: 'Por revisar',
  invalid: 'Descartadas',
  filterGroup: 'Mostrar solo',
  counter: { one: '{count} dirección', other: '{count} direcciones' },
  counterMax: '{count} de {max} plazas',
  empty: 'Todavía no hay direcciones. Sepáralas con comas, espacios o saltos de línea.',
  format: 'No es una dirección de correo válida',
  blockedDomain: 'No se aceptan direcciones de este dominio',
  typo: '¿Quisiste decir {suggestion}?',
  duplicate: 'Ya aparece más arriba',
  existing: 'Ya registrada',
  limit: 'No queda sitio para esta dirección',
  fix: 'Usar {suggestion}',
  fixButton: 'Corregir',
  edit: 'Editar {email}',
  remove: 'Quitar {email}',
  editField: 'Editando {email}',
  announceAdd: 'Válidas: {valid}. Por revisar: {warning}. Descartadas: {invalid}.',
  announceRemove: '{email} quitada',
  formHasErrors: 'Hay direcciones descartadas: corrígelas o quítalas.',
  formRequired: 'Añade al menos una dirección de correo.',
  rejectedAsk: { one: 'Hay {count} dirección descartada.', other: 'Hay {count} direcciones descartadas.' },
  rejectedAgain: { one: 'Pulsa de nuevo para seguir sin ella.', other: 'Pulsa de nuevo para seguir sin ellas.' },
  rejectedSkip: 'Ignorar y enviar',
};

export default es;
