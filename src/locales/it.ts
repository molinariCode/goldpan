import type { GoldpanMessages } from '../types';
export type { GoldpanMessages } from '../types';

const it: GoldpanMessages = {
  lang: 'it',
  placeholder: 'Incolla o scrivi indirizzi email',
  inputLabel: 'Indirizzi email',
  valid: 'Validi',
  warning: 'Da controllare',
  invalid: 'Scartati',
  filterGroup: 'Mostra solo',
  counter: { one: '{count} indirizzo', other: '{count} indirizzi' },
  counterMax: '{count} su {max} posti',
  empty: 'Ancora nessun indirizzo. Separali con virgole, spazi o a capo.',
  format: 'Non è un indirizzo email valido',
  blockedDomain: 'Gli indirizzi di questo dominio non sono accettati',
  typo: 'Forse intendevi {suggestion}?',
  duplicate: 'Già presente più sopra',
  existing: 'Già registrato',
  limit: 'Non c’è più posto per questo indirizzo',
  fix: 'Usa {suggestion}',
  fixButton: 'Correggi',
  edit: 'Modifica {email}',
  remove: 'Rimuovi {email}',
  editField: 'Modifica di {email}',
  announceAdd: 'Validi: {valid}. Da controllare: {warning}. Scartati: {invalid}.',
  announceRemove: '{email} rimosso',
  formHasErrors: 'Alcuni indirizzi sono scartati: correggili o rimuovili.',
  formRequired: 'Aggiungi almeno un indirizzo email.',
  rejectedAsk: { one: 'C’è {count} indirizzo scartato.', other: 'Ci sono {count} indirizzi scartati.' },
  rejectedAgain: 'Premi di nuovo per procedere senza.',
  rejectedSkip: 'Ignora e invia',
};

export default it;
