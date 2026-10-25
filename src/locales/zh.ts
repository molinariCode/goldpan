import type { GoldpanMessages } from '../types';
export type { GoldpanMessages } from '../types';

const zh: GoldpanMessages = {
  lang: 'zh',
  placeholder: '粘贴或输入电子邮件地址',
  inputLabel: '电子邮件地址',
  valid: '有效',
  warning: '待确认',
  invalid: '已排除',
  filterGroup: '仅显示',
  counter: '{count} 个地址',
  counterMax: '{count} / {max} 个名额',
  empty: '还没有地址。可用逗号、空格或换行分隔。',
  format: '不是有效的电子邮件地址',
  blockedDomain: '不接受此域名的地址',
  typo: '您是想输入 {suggestion} 吗？',
  duplicate: '上方已有相同地址',
  existing: '已注册',
  limit: '已没有名额容纳此地址',
  fix: '改用 {suggestion}',
  fixButton: '修正',
  edit: '编辑 {email}',
  remove: '移除 {email}',
  editField: '正在编辑 {email}',
  announceAdd: '有效 {valid} 个，待确认 {warning} 个，已排除 {invalid} 个。',
  announceRemove: '已移除 {email}',
  formHasErrors: '部分地址已被排除：请更正或移除。',
  formRequired: '请至少添加一个电子邮件地址。',
  rejectedAsk: '有 {count} 个地址已被排除。',
  rejectedAgain: '再按一次即可跳过它们继续。',
  rejectedSkip: '忽略并发送',
};

export default zh;
