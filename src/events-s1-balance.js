import { EVENTS } from './events.js';

// 阶段 I 新存档烟雾测试暴露：v0.3 前期使用旧测试存档调门槛，导致纯新档在通文馆后被高声望阈值卡死。
// 这里只校正正式第一季后半段的 reputationGte 条件，不改奖励、不补送声望、不改变事件顺序。
const REP_GATES = {
  s1_tongwenguan_formal_lisiyuan_order: 135,
  s1_tongwenguan_formal_focus_shifts: 145,
  s1_longquan_formal_cangbing_news: 160,
  s1_longquan_formal_identity_binding: 165,
  s1_longquan_formal_factions_move: 180,
  s1_finale_formal_open_competition: 190,
  s1_finale_formal_xuanming_breaks: 195,
  s1_finale_formal_luoyang_wind: 200,
  s1_finale_formal_palace_outer_battle: 210
};

for (const [eventId, value] of Object.entries(REP_GATES)) {
  const event = EVENTS.find(item => item.id === eventId);
  if (!event) continue;
  const condition = event.conditions?.find(item => item.type === 'reputationGte');
  if (condition) condition.value = value;
}
