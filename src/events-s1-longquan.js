import { EVENTS } from './events.js';

const STAGE_F_EVENTS = [
  {
    id: 's1_longquan_formal_rumors_return', season: 1, category: 'main', location: 'tongwenguan',
    title: '龙泉旧闻再起', desc: '李星云的身份公开后，关于龙泉剑与宝藏的旧传闻重新涌入各地。真消息、假地图和政治试探混在了一起。',
    conditions: [{ type: 'flagTrue', key: 's1_stage_e_complete' }, { type: 'chapterIs', value: 's1_longquan' }, { type: 'eventNotCompleted', event: 's1_longquan_formal_rumors_return' }],
    action: { type: 'instant' }, rewards: { exp: 24, reputation: 5 },
    effects: [{ type: 'setQuest', value: '辨清真假龙泉线索' }],
    log: '龙泉旧闻重新席卷江湖。你很快发现，真正值得追的不是某张突然冒出来的藏宝图，而是谁在借龙泉剑和李星云的身份推动各自的盘算。'
  },
  {
    id: 's1_longquan_formal_false_map', season: 1, category: 'side', location: 'yuzhou',
    title: '一张卖了三遍的图', desc: '渝州有人兜售所谓“龙泉藏宝图”。同一张图竟被卖给三拨不同的人，怎么看都更像一场局。', retryOnFail: true,
    conditions: [{ type: 'eventCompleted', event: 's1_longquan_formal_rumors_return' }, { type: 'eventNotCompleted', event: 's1_longquan_formal_false_map' }],
    action: { type: 'battle', enemies: ['scout'] }, rewards: { silver: 40, exp: 22, cultivation: 6, reputation: 5 },
    effects: [{ type: 'setFlag', key: 'discarded_false_dragon_spring_map', value: true }],
    log: '你截住抢图的玄冥教外围人手，也确认那张图本身毫无价值。真正有用的是：连假线索都开始有人争，说明龙泉已经成了各方试探彼此的工具。',
    failureLog: '抢图的人太多，你没有强留那张假图。好在这条支线并不影响真正的龙泉线索。'
  },
  {
    id: 's1_longquan_formal_cangbing_news', season: 1, category: 'main', location: 'cangbing',
    title: '谷外传出的名字', desc: '藏兵谷外围的消息终于与江湖传言对上：龙泉剑仍在李星云这条线上，而他的李唐身份已经被有意推到天下人面前。',
    conditions: [{ type: 'eventCompleted', event: 's1_longquan_formal_rumors_return' }, { type: 'reputationGte', value: 220 }, { type: 'eventNotCompleted', event: 's1_longquan_formal_cangbing_news' }],
    action: { type: 'instant' }, rewards: { exp: 30, reputation: 5 },
    effects: [{ type: 'setFlag', key: 'confirmed_dragon_spring_sword_with_lixingyun_line', value: true }, { type: 'setQuest', value: '看清龙泉与李唐身份的关系' }],
    log: '你没有闯进藏兵谷核心，只从外围消息确认了两个已经公开化的事实：龙泉剑与李星云密切绑定，而他的李唐身份正被主动推向整个江湖。'
  },
  {
    id: 's1_longquan_formal_nvdi_note', season: 1, category: 'character', location: 'huanyinfang',
    title: '女帝的短札', desc: '你与女帝已经有了真实关系。岐地送来一张短札，只提醒你一句：如今各家真正争的，早已不只是剑。',
    conditions: [{ type: 'eventCompleted', event: 's1_longquan_formal_cangbing_news' }, { type: 'flagTrue', key: 'met_nvdi_formally' }, { type: 'affinityGte', character: 'nvdi', value: 15 }, { type: 'eventNotCompleted', event: 's1_longquan_formal_nvdi_note' }],
    action: { type: 'instant' }, rewards: { exp: 12 },
    effects: [{ type: 'changeAffinity', character: 'nvdi', value: 2 }, { type: 'setPersonalFlag', character: 'nvdi', key: 'shared_dragon_spring_political_warning', value: true }],
    log: '女帝没有给你所谓“龙泉答案”，只点明一个事实：谁控制李星云，谁就有机会把龙泉与李唐名分同时变成政治筹码。'
  },
  {
    id: 's1_longquan_formal_hidden_three_routes', season: 1, category: 'hidden', location: 'tongwenguan',
    title: '三路假线索', desc: '你曾看清玄冥教、幻音坊、通文馆三条传信路线。现在回头比对，三家故意放出的假龙泉消息竟有明显不同。',
    conditions: [{ type: 'eventCompleted', event: 's1_longquan_formal_cangbing_news' }, { type: 'flagTrue', key: 'recognized_three_faction_convergence' }, { type: 'eventNotCompleted', event: 's1_longquan_formal_hidden_three_routes' }],
    action: { type: 'instant' }, rewards: { exp: 16, cultivation: 8 },
    effects: [{ type: 'setFlag', key: 'sorted_three_faction_dragon_spring_feints', value: true }],
    log: '你把三家的假消息拆开后，看见了各自不同的目的：有人要逼目标现身，有人要测试盟友，有人要抬高李星云的政治价值。你仍然没有得到真正的龙泉宝藏位置。'
  },
  {
    id: 's1_longquan_formal_identity_binding', season: 1, category: 'main', location: 'qiguo',
    title: '剑已经和人绑在一起', desc: '龙泉剑、李唐血脉、李星云本人，正在被各方势力当成同一件事来谈。江湖争夺已经彻底政治化。',
    conditions: [{ type: 'eventCompleted', event: 's1_longquan_formal_cangbing_news' }, { type: 'reputationGte', value: 235 }, { type: 'eventNotCompleted', event: 's1_longquan_formal_identity_binding' }],
    action: { type: 'instant' }, rewards: { exp: 32, cultivation: 8, reputation: 8 },
    effects: [{ type: 'setFlag', key: 'dragon_spring_identity_bound', value: true }, { type: 'setQuest', value: '观察各方下一步动作' }],
    log: '你终于看清龙泉线索在第一季真正的变化：剑还是那把剑，但它已经和李星云的血脉、名分与诸侯野心绑在一起。谁都不只是为了拿走一件兵器。'
  },
  {
    id: 's1_longquan_formal_road_feint', season: 1, category: 'encounter', location: 'xuanming',
    title: '追错方向的人', desc: '一批江湖人被假龙泉线索引到玄冥教势力范围，双方很快打成一团。你可以处理这场被谣言引爆的冲突。', retryOnFail: true,
    conditions: [{ type: 'eventCompleted', event: 's1_longquan_formal_identity_binding' }, { type: 'eventNotCompleted', event: 's1_longquan_formal_road_feint' }],
    action: { type: 'battle', enemies: ['guard', 'scout'] }, rewards: { silver: 50, exp: 30, cultivation: 8, reputation: 7 },
    effects: [],
    log: '你把一场由假龙泉消息引爆的冲突压了下去。越来越多人被卷进来，也说明这场争夺已经从几个大势力扩散到整个江湖。',
    failureLog: '局面过于混乱，你先退出战圈。真正的龙泉主线不会因此中断。'
  },
  {
    id: 's1_longquan_formal_factions_move', season: 1, category: 'main', location: 'tongwenguan',
    title: '各方都开始动了', desc: '玄冥教、岐国、通文馆以及不良人相关力量都已围绕李星云与龙泉重新部署。局部争夺即将升级成公开的多方角力。',
    conditions: [{ type: 'eventCompleted', event: 's1_longquan_formal_identity_binding' }, { type: 'reputationGte', value: 250 }, { type: 'flagFalse', key: 's1_stage_f_complete' }, { type: 'eventNotCompleted', event: 's1_longquan_formal_factions_move' }],
    action: { type: 'instant' }, rewards: { exp: 36, cultivation: 10, reputation: 8 },
    effects: [{ type: 'setFlag', key: 's1_stage_f_complete', value: true }, { type: 'setFlag', key: 'multi_faction_conflict_ready', value: true }, { type: 'setQuest', value: '多方势力争夺' }],
    log: '龙泉线索没有把你带到某个已经开启的秘地，反而把整个第一季的几条势力线拧到了一起。各方开始公开调动人手，多方势力争夺已经具备爆发条件。龙泉线索篇至此收束。'
  }
];

EVENTS.push(...STAGE_F_EVENTS);
