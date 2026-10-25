import type { GoldpanMessages } from '../types';
export type { GoldpanMessages } from '../types';

const ja: GoldpanMessages = {
  lang: 'ja',
  placeholder: 'メールアドレスを貼り付けまたは入力',
  inputLabel: 'メールアドレス',
  valid: '有効',
  warning: '要確認',
  invalid: '除外',
  filterGroup: '絞り込み',
  counter: '{count} 件',
  counterMax: '{count} / {max} 枠',
  empty: 'アドレスはまだありません。カンマ、スペース、改行で区切ってください。',
  format: '有効なメールアドレスではありません',
  blockedDomain: 'このドメインのアドレスは受け付けていません',
  typo: '{suggestion} ではありませんか？',
  duplicate: '上に同じアドレスがあります',
  existing: '登録済みです',
  limit: 'このアドレスを追加する空きがありません',
  fix: '{suggestion} を使用',
  fixButton: '修正',
  edit: '{email} を編集',
  remove: '{email} を削除',
  editField: '{email} を編集中',
  announceAdd: '有効 {valid} 件、要確認 {warning} 件、除外 {invalid} 件。',
  announceRemove: '{email} を削除しました',
  formHasErrors: '除外されたアドレスがあります。修正または削除してください。',
  formRequired: 'メールアドレスを1件以上追加してください。',
  rejectedAsk: '除外されたアドレスが {count} 件あります。',
  rejectedAgain: 'もう一度押すと、これらを除いて続行します。',
  rejectedSkip: '無視して送信',
};

export default ja;
