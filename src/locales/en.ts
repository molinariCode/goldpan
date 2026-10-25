import type { GoldpanMessages } from '../types';
export type { GoldpanMessages } from '../types';

const en: GoldpanMessages = {
  lang: 'en',
  placeholder: 'Paste or type email addresses',
  inputLabel: 'Email addresses',
  valid: 'Valid',
  warning: 'To check',
  invalid: 'Rejected',
  filterGroup: 'Show only',
  counter: { one: '{count} address', other: '{count} addresses' },
  counterMax: '{count} of {max} places',
  empty: 'Nothing here yet. Separate addresses with commas, spaces or new lines.',
  format: 'Not a valid email address',
  blockedDomain: 'Addresses on this domain are not accepted',
  typo: 'Did you mean {suggestion}?',
  duplicate: 'Already listed above',
  existing: 'Already registered',
  limit: 'No place left for this address',
  fix: 'Use {suggestion}',
  fixButton: 'Fix',
  edit: 'Edit {email}',
  remove: 'Remove {email}',
  editField: 'Editing {email}',
  announceAdd: 'Valid: {valid}. To check: {warning}. Rejected: {invalid}.',
  announceRemove: '{email} removed',
  formHasErrors: 'Some addresses are rejected: fix or remove them.',
  formRequired: 'Add at least one email address.',
  rejectedAsk: { one: 'There is {count} rejected address.', other: 'There are {count} rejected addresses.' },
  rejectedAgain: { one: 'Press again to go on without it.', other: 'Press again to go on without them.' },
  rejectedSkip: 'Ignore and send',
};

export default en;
