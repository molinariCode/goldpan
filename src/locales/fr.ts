import type { GoldpanMessages } from '../types';
export type { GoldpanMessages } from '../types';

const fr: GoldpanMessages = {
  lang: 'fr',
  placeholder: 'Collez ou saisissez des adresses e-mail',
  inputLabel: 'Adresses e-mail',
  valid: 'Valides',
  warning: 'À vérifier',
  invalid: 'Écartées',
  filterGroup: 'Afficher seulement',
  counter: { one: '{count} adresse', other: '{count} adresses' },
  counterMax: '{count} sur {max} places',
  empty: 'Aucune adresse pour l’instant. Séparez-les par des virgules, des espaces ou des retours à la ligne.',
  format: 'Ce n’est pas une adresse e-mail valide',
  blockedDomain: 'Les adresses de ce domaine ne sont pas acceptées',
  typo: 'Vouliez-vous dire {suggestion} ?',
  duplicate: 'Déjà présente plus haut',
  existing: 'Déjà enregistrée',
  limit: 'Plus de place pour cette adresse',
  fix: 'Utiliser {suggestion}',
  fixButton: 'Corriger',
  edit: 'Modifier {email}',
  remove: 'Retirer {email}',
  editField: 'Modification de {email}',
  announceAdd: 'Valides : {valid}. À vérifier : {warning}. Écartées : {invalid}.',
  announceRemove: '{email} retirée',
  formHasErrors: 'Certaines adresses sont écartées : corrigez-les ou retirez-les.',
  formRequired: 'Ajoutez au moins une adresse e-mail.',
  rejectedAsk: { one: 'Il y a {count} adresse écartée.', other: 'Il y a {count} adresses écartées.' },
  rejectedAgain: { one: 'Appuyez à nouveau pour continuer sans elle.', other: 'Appuyez à nouveau pour continuer sans elles.' },
  rejectedSkip: 'Ignorer et envoyer',
};

export default fr;
