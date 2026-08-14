import { EVENTS } from './events.js';

const STAGE_H_GROWTH_EVENTS = [
  {
    id: 's1_growth_hidden_torn_sword_notes', season: 1, category: 'hidden', location: 'cangbing',
    title: '石缝里的残谱', desc: '藏兵谷外围一处旧石缝里夹着几页残破剑谱。字迹无名，招路也缺了大半，看不出是谁留下的。',
    conditions: [{ type: 'flagTrue', key: 's1_stage_c_complete' }, { type: 'realmGte', value: 'middle_star' }, { type: 'eventNotCompleted', event: 's1_growth_hidden_torn_sword_notes' }],
    action: { type: 'instant' }, rewards: { exp: 10, cultivation: 4 },
    effects: [{ type: 'setFlag', key: 'found_torn_sword_notes', value: true }],
    log: '你从藏兵谷外围石缝里取出几页无名残谱。招路并不完整，但其中几处折返用剑的思路很有意思，值得找懂剑的人重新理一遍。'
  },
  {
    id: 's1_growth_restore_sword_notes', season: 1, category: 'side', location: 'yuzhou',
    title: '补全残谱', desc: '渝州一名退隐老剑客愿意替你理顺残谱中的断招，但纸墨、人情和工夫都要算钱：120 两银子。',
    conditions: [{ type: 'eventCompleted', event: 's1_growth_hidden_torn_sword_notes' }, { type: 'silverGte', value: 120 }, { type: 'eventNotCompleted', event: 's1_growth_restore_sword_notes' }],
    action: { type: 'instant' }, rewards: { silver: -120, exp: 12, learnMartialArt: 'folding_wind_sword' },
    effects: [{ type: 'setFlag', key: 'restored_torn_sword_notes', value: true }],
    log: '你花了 120 两银子，请老剑客把残缺招路重新理顺。残谱没有名号，你按其中三段折返剑路将其称作【折风剑式】。这门剑式已经真正归入你的武学。'
  },
  {
    id: 's1_growth_test_folding_wind_sword', season: 1, category: 'encounter', location: 'cangbing',
    title: '残谱试锋', desc: '新整理出的折风剑式还没有真正见过血。藏兵谷外围正有玄冥教残余力士借乱滋事，可以拿来试一试剑。', retryOnFail: true,
    conditions: [{ type: 'eventCompleted', event: 's1_growth_restore_sword_notes' }, { type: 'eventNotCompleted', event: 's1_growth_test_folding_wind_sword' }],
    action: { type: 'battle', enemies: ['guard'] }, rewards: { exp: 22, cultivation: 6, reputation: 3 }, effects: [],
    log: '你在实战中把【折风剑式】完整走了一遍。它不是顶级神功，却第一次证明：江湖探索本身也能变成真正可用的武学成长。',
    failureLog: '新剑式还不够熟，你先退开重新琢磨招路。这场试锋仍可再来。'
  }
];

EVENTS.push(...STAGE_H_GROWTH_EVENTS);
