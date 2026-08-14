import { EVENTS } from './events.js';

const STAGE_G_EVENTS = [
  {
    id: 's1_finale_formal_open_competition', season: 1, category: 'main', location: 'tongwenguan',
    title: '争夺摆上明面', desc: '龙泉与李唐身份已经绑在一起，各方不再满足于暗中试探。围绕李星云的争夺开始公开化。',
    conditions: [{ type: 'flagTrue', key: 's1_stage_f_complete' }, { type: 'reputationGte', value: 250 }, { type: 'eventNotCompleted', event: 's1_finale_formal_open_competition' }],
    action: { type: 'instant' }, rewards: { exp: 32, reputation: 5 },
    effects: [{ type: 'setFlag', key: 'multi_faction_conflict_open', value: true }, { type: 'setQuest', value: '追查玄冥教与洛阳异动' }],
    log: '岐国、通文馆、玄冥教与不良人相关力量都开始公开调动人手。第一季后段的争夺已经不再是夺一把剑，而是争人、争名分、争谁能利用龙泉背后的政治价值。'
  },
  {
    id: 's1_finale_formal_nvdi_warning', season: 1, category: 'character', location: 'huanyinfang',
    title: '女帝的洛阳提醒', desc: '你与女帝已经建立了真实的江湖关系。岐地送来一条短讯：玄冥教最近的调动方向，正在明显向洛阳偏移。',
    conditions: [{ type: 'eventCompleted', event: 's1_finale_formal_open_competition' }, { type: 'flagTrue', key: 'met_nvdi_formally' }, { type: 'affinityGte', character: 'nvdi', value: 15 }, { type: 'eventNotCompleted', event: 's1_finale_formal_nvdi_warning' }],
    action: { type: 'instant' }, rewards: { exp: 12 },
    effects: [{ type: 'changeAffinity', character: 'nvdi', value: 3 }, { type: 'setPersonalFlag', character: 'nvdi', key: 'warned_player_about_luoyang', value: true }, { type: 'setFlag', key: 'received_nvdi_luoyang_warning', value: true }],
    log: '女帝没有替你解释洛阳会发生什么，只提醒你玄冥教的调动已经失去常态。这份消息让你比普通江湖人更早把注意力转向洛阳。'
  },
  {
    id: 's1_finale_formal_hidden_false_orders', season: 1, category: 'hidden', location: 'tongwenguan',
    title: '假令背后的真路', desc: '你此前拆过三方放出的假龙泉消息。如今再看几份互相矛盾的调令，反而能从假方向里筛出真正的人手流向。',
    conditions: [{ type: 'eventCompleted', event: 's1_finale_formal_open_competition' }, { type: 'flagTrue', key: 'sorted_three_faction_dragon_spring_feints' }, { type: 'eventNotCompleted', event: 's1_finale_formal_hidden_false_orders' }],
    action: { type: 'instant' }, rewards: { exp: 16, cultivation: 8 },
    effects: [{ type: 'setFlag', key: 'identified_luoyang_real_route', value: true }],
    log: '几份假调令故意把人往不同方向引。你借前面的经验反向筛查，确认真正值得盯住的是洛阳方向，却仍看不到朱友珪终局阴谋的全貌。'
  },
  {
    id: 's1_finale_formal_xuanming_breaks', season: 1, category: 'main', location: 'xuanming',
    title: '玄冥教的裂口', desc: '玄冥教内部争斗已经外溢到江湖。各路传令互相冲突，外围人马甚至开始彼此截杀。', retryOnFail: true,
    conditions: [{ type: 'eventCompleted', event: 's1_finale_formal_open_competition' }, { type: 'reputationGte', value: 255 }, { type: 'eventNotCompleted', event: 's1_finale_formal_xuanming_breaks' }],
    action: { type: 'battle', enemies: ['guard', 'scout'] }, rewards: { silver: 55, exp: 34, cultivation: 8, reputation: 8 },
    effects: [{ type: 'setFlag', key: 'saw_xuanming_collapse_spill_out', value: true }, { type: 'setQuest', value: '确认洛阳方向' }],
    log: '你在玄冥教外围压下了一场自相残杀引发的混战。内部裂口已经遮不住了，而多条高层传令都开始向洛阳收束。',
    failureLog: '玄冥教外围已经乱成一团，你先退出混战。这里的胜负不会改变核心历史，但这场冲突仍可重新处理。'
  },
  {
    id: 's1_finale_formal_luoyang_wind', season: 1, category: 'main', location: 'yuzhou',
    title: '洛阳风急', desc: '朱友珪与大梁皇室的矛盾已经从传闻变成危险的现实。李星云也正在被一步步牵向洛阳。',
    conditions: [{ type: 'eventCompleted', event: 's1_finale_formal_xuanming_breaks' }, { type: 'reputationGte', value: 263 }, { type: 'eventNotCompleted', event: 's1_finale_formal_luoyang_wind' }],
    action: { type: 'instant' }, rewards: { exp: 36, cultivation: 8, reputation: 7 },
    effects: [{ type: 'unlockLocation', id: 'luoyang' }, { type: 'setFlag', key: 'luoyang_finale_open', value: true }, { type: 'setChapter', value: 's1_finale' }, { type: 'setQuest', value: '赶赴洛阳·焦兰殿' }],
    log: '你终于确认：冥帝朱友珪正在把李星云往洛阳牵引。岐国、通文馆与不良人的目光也随之转向那里。洛阳正式成为第一季终局目标。'
  },
  {
    id: 's1_finale_formal_outer_rescue', season: 1, category: 'side', location: 'luoyang',
    title: '城外撤民', desc: '洛阳局势骤紧，焦兰殿附近的封锁向外扩散。你可以先把被卷进来的百姓和原创江湖人撤出冲突区域。', retryOnFail: true,
    conditions: [{ type: 'eventCompleted', event: 's1_finale_formal_luoyang_wind' }, { type: 'eventNotCompleted', event: 's1_finale_formal_outer_rescue' }],
    action: { type: 'battle', enemies: ['palace_guard'] }, rewards: { silver: 45, exp: 26, cultivation: 6, reputation: 6 },
    effects: [{ type: 'setFlag', key: 'helped_luoyang_civilians_escape', value: true }],
    log: '你替一批被封锁卷住的百姓和江湖人打开退路。焦兰殿的核心阴谋没有因此改变，但至少有人没有被这场权力争斗白白吞掉。',
    failureLog: '封锁来得太快，你先带人退回外城。这条救援不是终局硬门槛，之后仍可再试。'
  },
  {
    id: 's1_finale_formal_palace_outer_battle', season: 1, category: 'main', location: 'luoyang',
    title: '焦兰殿外', desc: '朱友珪的人封住焦兰殿外围。你的任务不是替李星云打核心一战，而是截住外围援军，让殿内的历史自己走到该到的位置。', retryOnFail: true,
    conditions: [{ type: 'eventCompleted', event: 's1_finale_formal_luoyang_wind' }, { type: 'locationUnlocked', location: 'luoyang' }, { type: 'chapterIs', value: 's1_finale' }, { type: 'reputationGte', value: 270 }, { type: 'eventNotCompleted', event: 's1_finale_formal_palace_outer_battle' }],
    action: { type: 'battle', enemies: ['palace_guard', 'guard'] }, rewards: { silver: 70, exp: 42, cultivation: 10, reputation: 8 },
    effects: [{ type: 'setFlag', key: 'held_jiaolan_outer_reinforcements', value: true }, { type: 'setQuest', value: '焦兰殿内局势翻转' }],
    log: '你在焦兰殿外围截住了一批援军，没有闯进属于李星云、朱友珪与袁天罡的核心对决。殿内很快传来更大的动静。',
    failureLog: '焦兰殿外围守备森严，你暂时撤开。核心终局尚未开始结算，这场外围战可以重试。'
  },
  {
    id: 's1_finale_formal_palace_turn', season: 1, category: 'main', location: 'luoyang',
    title: '殿内翻局', desc: '焦兰殿内的阴谋终于公开：朱友珪试图把大梁皇室之死嫁祸给李星云，李星云则公开自己的李唐皇室后裔身份。',
    conditions: [{ type: 'eventCompleted', event: 's1_finale_formal_palace_outer_battle' }, { type: 'eventNotCompleted', event: 's1_finale_formal_palace_turn' }],
    action: { type: 'instant' }, rewards: { exp: 38, reputation: 5 },
    effects: [{ type: 'setFlag', key: 'jiaolan_truth_revealed', value: true }, { type: 'setQuest', value: '见证冥帝败亡' }],
    log: '焦兰殿内，李星云公开李唐皇室后裔身份；玄冥教中潜伏的不良人随之响应，孟婆的真实立场也翻转。你没有提前揭破这些核心卧底，而是在历史成熟时亲眼看见这张网收紧。'
  },
  {
    id: 's1_finale_formal_mingdi_falls', season: 1, category: 'main', location: 'luoyang',
    title: '冥帝败亡', desc: '袁天罡现身接管局势。朱友珪再强，也无法越过不良帅对这一局的绝对控制。',
    conditions: [{ type: 'eventCompleted', event: 's1_finale_formal_palace_turn' }, { type: 'eventNotCompleted', event: 's1_finale_formal_mingdi_falls' }],
    action: { type: 'instant' }, rewards: { exp: 45, cultivation: 12, reputation: 8 },
    effects: [{ type: 'setFlag', key: 'mingdi_zhuyougui_defeated', value: true }, { type: 'setFlag', key: 'xuanming_remnants_under_buliangshuai', value: true }, { type: 'setQuest', value: '第一季最后的选择' }],
    log: '袁天罡压制并废去朱友珪武功。李星云没有亲手杀他，朱友珪最终选择自尽。玄冥教的核心结构随之巨变，残余力量被不良帅纳入掌控。这个结果没有被你取代。'
  },
  {
    id: 's1_finale_formal_wander_jianghu', season: 1, category: 'main', location: 'luoyang',
    title: '浪迹江湖', desc: '焦兰殿尘埃落定后，袁天罡再次要求李星云承担复唐大业。第一季最后的历史选择仍属于李星云本人。',
    conditions: [{ type: 'eventCompleted', event: 's1_finale_formal_mingdi_falls' }, { type: 'flagTrue', key: 'mingdi_zhuyougui_defeated' }, { type: 'eventNotCompleted', event: 's1_finale_formal_wander_jianghu' }],
    action: { type: 'instant' }, rewards: { exp: 50, cultivation: 15, reputation: 10 },
    effects: [{ type: 'setFlag', key: 'lixingyun_refused_restoration_again', value: true }, { type: 'setFlag', key: 'season1Complete', value: true }, { type: 'setFlag', key: 's1_stage_g_complete', value: true }, { type: 'setChapter', value: 's1_complete' }, { type: 'setQuest', value: '第一季终·江湖未止' }],
    log: '袁天罡再次要求李星云复兴大唐，李星云仍然拒绝称帝，选择与同伴继续浪迹江湖。第一季的大历史至此结束；天下格局已经改变，但第二季正式内容尚未开始。'
  }
];

EVENTS.push(...STAGE_G_EVENTS);
