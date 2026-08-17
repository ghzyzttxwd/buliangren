export const CHARACTERS = {
  player: {
    id: 'player', name: '无名少侠', short: '侠', rarity: '游侠', level: 1,
    maxHp: 125, attack: 22, defense: 9, speed: 12, c1: '#3f4b62', c2: '#161b25',
    skills: ['basic_sword', 'qi_burst']
  },
  chimeng: {
    id: 'chimeng', name: '蚩梦', short: '梦', rarity: '万毒窟圣女', level: 3,
    maxHp: 108, attack: 25, defense: 7, speed: 18, c1: '#725477', c2: '#281d31',
    skills: ['butterfly_dart', 'miao_heal']
  },
  nvdi: {
    id: 'nvdi', name: '女帝', short: '岐', rarity: '幻音坊之主', level: 12,
    maxHp: 188, attack: 39, defense: 18, speed: 21, c1: '#84514f', c2: '#2b171b',
    skills: ['phantom_note', 'sky_slash']
  },
  jiangchen: {
    id: 'jiangchen', name: '降臣', short: '臣', rarity: '四大尸祖', level: 16,
    maxHp: 215, attack: 46, defense: 21, speed: 16, c1: '#5d445f', c2: '#1e1724',
    skills: ['corpse_thread', 'red_moon'], locked: true, unlock: '完成尸祖支线'
  }
};

export const SKILLS = {
  basic_sword: { id:'basic_sword', name:'断风式', type:'招式', power:1.0, qiCost:12, desc:'迅捷的一剑，造成100%攻击伤害。', playerLearnable:true },
  qi_burst: { id:'qi_burst', name:'聚气破', type:'内功', power:1.45, qiCost:28, desc:'运气于掌，造成145%攻击伤害。', playerLearnable:true },
  folding_wind_sword: { id:'folding_wind_sword', name:'折风剑式', type:'招式', power:1.7, qiCost:36, desc:'从无名残谱中整理出的三段折返剑路，造成170%攻击伤害。', playerLearnable:true, realmRequirement:'middle_star', masteryMax:5 },
  butterfly_dart: {
    id:'butterfly_dart', name:'蝶影毒镖', type:'蛊术', power:1.15, qiCost:18,
    desc:'灵巧掷出毒镖，造成115%攻击伤害，并使目标中毒。',
    statusEffects:[{ id:'poisoned', name:'中毒', type:'poison', duration:3, potency:0.04, maxStacks:3 }]
  },
  miao_heal: {
    id:'miao_heal', name:'苗疆灵蛊', type:'秘术', heal:0.32, qiCost:24,
    desc:'为己方生命最低者恢复32%最大生命，并附加短时护体。',
    statusEffects:[{ id:'miao_shield', name:'灵蛊护体', type:'shield', duration:2, amountRatio:0.18 }]
  },
  phantom_note: { id:'phantom_note', name:'幻音诀', type:'内功', power:1.65, qiCost:30, desc:'以音驭气，造成165%攻击伤害。' },
  sky_slash: { id:'sky_slash', name:'岐王斩', type:'绝技', power:2.05, qiCost:42, desc:'霸道剑势，造成205%攻击伤害。' },
  corpse_thread: {
    id:'corpse_thread', name:'尸祖缚魂丝', type:'奇术', power:1.55, qiCost:30,
    desc:'诡谲丝劲袭敌，造成155%攻击伤害，并有较高概率令目标定身。',
    statusEffects:[{ id:'soul_bind', name:'缚魂定身', type:'control', duration:1, chance:0.85 }]
  },
  red_moon: { id:'red_moon', name:'赤月尸舞', type:'绝技', power:2.2, qiCost:46, desc:'尸祖秘术，造成220%攻击伤害。' },

  nether_spike: { id:'nether_spike', name:'冥水刺', type:'招式', power:1.18, qiCost:14, desc:'玄冥教探子惯用的短促突刺。' },
  nether_heavy_palm: { id:'nether_heavy_palm', name:'玄冥重掌', type:'外功', power:1.38, qiCost:22, desc:'力士蓄劲拍出的沉重掌力。' },
  wuchang_claw: { id:'wuchang_claw', name:'无常鬼爪', type:'阴功', power:1.62, qiCost:30, desc:'黑无常以阴寒劲力催动的狠辣爪功。' },
  palace_saber: { id:'palace_saber', name:'禁军横刀', type:'刀法', power:1.3, qiCost:18, desc:'焦兰殿禁卫训练有素的横刀劈斩。' },
  guard_breath: { id:'guard_breath', name:'禁军调息', type:'内功', heal:0.24, qiCost:22, desc:'短暂调息，恢复自身一部分气血。' }
};

export const ENEMIES = {
  scout: {
    id:'scout', name:'玄冥教探子', level:2, realm:'small_star',
    maxHp:88, attack:16, defense:5, speed:9,
    skills:['nether_spike'], aiProfile:{ skillChance:0.65, healThreshold:0.35 }
  },
  guard: {
    id:'guard', name:'玄冥教力士', level:4, realm:'middle_star',
    maxHp:125, attack:20, defense:8, speed:7,
    skills:['nether_heavy_palm'], aiProfile:{ skillChance:0.35, healThreshold:0.35 }
  },
  blackwuchang: {
    id:'blackwuchang', name:'黑无常', level:7, realm:'great_star',
    maxHp:240, attack:29, defense:12, speed:15,
    skills:['wuchang_claw'], aiProfile:{ skillChance:0.85, healThreshold:0.35 }
  },
  palace_guard: {
    id:'palace_guard', name:'焦兰殿禁卫', level:5, realm:'middle_star',
    maxHp:155, attack:23, defense:10, speed:10,
    skills:['palace_saber', 'guard_breath'], aiProfile:{ skillChance:0.6, healThreshold:0.55 }
  }
};

const unlocked = (state, id) => state?.world?.unlockedLocations?.includes(id);

export const LOCATIONS = [
  { id:'yuzhou', name:'渝州城', icon:'渝', desc:'暗流涌动的起点。玄冥教正在城外活动。', unlock:()=>true },
  { id:'cangbing', name:'藏兵谷', icon:'藏', desc:'不良人旧部留下的隐秘据点。', unlock:(s)=>unlocked(s,'cangbing') },
  { id:'xuanming', name:'玄冥教势力', icon:'冥', desc:'玄冥教在中原活动的外围势力范围，并非一处可随意闯入的总舵。', unlock:(s)=>unlocked(s,'xuanming') },
  { id:'tongwenguan', name:'通文馆', icon:'文', desc:'晋地大势力通文馆所在。', unlock:(s)=>unlocked(s,'tongwenguan') },
  { id:'qiguo', name:'岐国', icon:'岐', desc:'凤翔一带，幻音坊势力所在。', unlock:(s)=>unlocked(s,'qiguo') },
  { id:'huanyinfang', name:'幻音坊', icon:'幻', desc:'女帝麾下在岐地经营的江湖势力与活动据点。', unlock:(s)=>unlocked(s,'huanyinfang') },
  { id:'taiyuan', name:'太原', icon:'太', desc:'晋地重镇，群雄势力交错。', unlock:(s)=>unlocked(s,'taiyuan') },
  { id:'raojiang', name:'娆疆', icon:'娆', desc:'万毒窟、蛊术与十万大山。', unlock:(s)=>unlocked(s,'raojiang') },
  { id:'mobei', name:'漠北', icon:'漠', desc:'北地风沙漫天，强敌与异族势力盘踞。', unlock:(s)=>unlocked(s,'mobei') },
  { id:'longquan', name:'龙泉秘地', icon:'龙', desc:'只在满足特殊条件后才会显露的秘密地点。', unlock:(s)=>unlocked(s,'longquan') },
  { id:'luoyang', name:'洛阳', icon:'洛', desc:'大梁东都。第一季终局将指向焦兰殿。', unlock:(s)=>unlocked(s,'luoyang') }
];

export const ITEM_CATEGORIES = Object.freeze({
  equipment: 'equipment',
  consumable: 'consumable',
  manual: 'manual',
  fragment: 'fragment',
  quest: 'quest',
  treasure: 'treasure',
  material: 'material'
});

// v0.5 正式物品目录。State 只保存 itemId -> count，不复制静态物品定义。
export const ITEM_CATALOG = Object.freeze({
  healing_powder: Object.freeze({
    id: 'healing_powder',
    name: '止血散',
    category: ITEM_CATEGORIES.consumable,
    description: '常见的外敷伤药。战斗外用于调理伤势、恢复体力；战斗中可恢复部分气血。',
    stackable: true,
    useContext: ['field', 'battle'],
    effects: [
      { type: 'restoreStamina', value: 10, contexts: ['field'] },
      { type: 'restoreHpRatio', value: 0.25, contexts: ['battle'] }
    ],
    price: 24,
    defaultCount: 3
  }),
  old_coin: Object.freeze({
    id: 'old_coin',
    name: '旧铜钱',
    category: ITEM_CATEGORIES.quest,
    description: '从渝州驿道拾到的铜钱，似乎刻有特殊纹样。',
    stackable: false,
    unique: true,
    defaultCount: 1
  }),
  cloth_bracer: Object.freeze({
    id: 'cloth_bracer',
    name: '粗布护腕',
    category: ITEM_CATEGORIES.equipment,
    description: '以厚布反复缠制的护腕，能略微减轻近身冲击。',
    stackable: false,
    slot: 'accessory',
    statModifiers: { defense: 2 },
    defaultCount: 1
  })
});

export function getItem(itemId) {
  return ITEM_CATALOG[itemId] || null;
}

// 阶段 B 临时兼容旧行囊展示。阶段 C 会改为读取 state.inventory.items 后移除此依赖。
export const ITEMS = Object.freeze(Object.values(ITEM_CATALOG).map(item => Object.freeze({
  id: item.id,
  name: item.name,
  count: item.defaultCount ?? 0,
  desc: item.description
})));
