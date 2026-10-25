import type { GoldpanMessages } from '../types';
export type { GoldpanMessages } from '../types';

const de: GoldpanMessages = {
  lang: 'de',
  placeholder: 'E-Mail-Adressen einfügen oder eingeben',
  inputLabel: 'E-Mail-Adressen',
  valid: 'Gültig',
  warning: 'Prüfen',
  invalid: 'Abgelehnt',
  filterGroup: 'Nur anzeigen',
  counter: { one: '{count} Adresse', other: '{count} Adressen' },
  counterMax: '{count} von {max} Plätzen',
  empty: 'Noch keine Adressen. Trennen Sie sie mit Kommas, Leerzeichen oder Zeilenumbrüchen.',
  format: 'Keine gültige E-Mail-Adresse',
  blockedDomain: 'Adressen dieser Domain werden nicht akzeptiert',
  typo: 'Meinten Sie {suggestion}?',
  duplicate: 'Steht bereits weiter oben',
  existing: 'Bereits registriert',
  limit: 'Kein Platz mehr für diese Adresse',
  fix: '{suggestion} verwenden',
  fixButton: 'Korrigieren',
  edit: '{email} bearbeiten',
  remove: '{email} entfernen',
  editField: '{email} wird bearbeitet',
  announceAdd: 'Gültig: {valid}. Prüfen: {warning}. Abgelehnt: {invalid}.',
  announceRemove: '{email} entfernt',
  formHasErrors: 'Einige Adressen wurden abgelehnt: Korrigieren oder entfernen Sie sie.',
  formRequired: 'Fügen Sie mindestens eine E-Mail-Adresse hinzu.',
  rejectedAsk: { one: 'Es gibt {count} abgelehnte Adresse.', other: 'Es gibt {count} abgelehnte Adressen.' },
  rejectedAgain: 'Erneut drücken, um ohne sie fortzufahren.',
  rejectedSkip: 'Ignorieren und senden',
};

export default de;
