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
  basic_sword: { id:'basic_sword', name:'断风式', type:'招式', power:1.0, desc:'迅捷的一剑，造成100%攻击伤害。' },
  qi_burst: { id:'qi_burst', name:'聚气破', type:'内功', power:1.45, desc:'运气于掌，造成145%攻击伤害。' },
  butterfly_dart: { id:'butterfly_dart', name:'蝶影毒镖', type:'蛊术', power:1.15, desc:'灵巧掷出毒镖，造成115%攻击伤害。' },
  miao_heal: { id:'miao_heal', name:'苗疆灵蛊', type:'秘术', heal:0.32, desc:'为己方生命最低者恢复32%最大生命。' },
  phantom_note: { id:'phantom_note', name:'幻音诀', type:'内功', power:1.65, desc:'以音驭气，造成165%攻击伤害。' },
  sky_slash: { id:'sky_slash', name:'岐王斩', type:'绝技', power:2.05, desc:'霸道剑势，造成205%攻击伤害。' },
  corpse_thread: { id:'corpse_thread', name:'尸祖缚魂丝', type:'奇术', power:1.55, desc:'诡谲丝劲袭敌，造成155%攻击伤害。' },
  red_moon: { id:'red_moon', name:'赤月尸舞', type:'绝技', power:2.2, desc:'尸祖秘术，造成220%攻击伤害。' }
};

export const ENEMIES = {
  scout: { id:'scout', name:'玄冥教探子', maxHp:88, attack:16, defense:5, speed:9 },
  guard: { id:'guard', name:'玄冥教力士', maxHp:125, attack:20, defense:8, speed:7 },
  blackwuchang: { id:'blackwuchang', name:'黑无常', maxHp:240, attack:29, defense:12, speed:15 }
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
  { id:'longquan', name:'龙泉秘地', icon:'龙', desc:'只在满足特殊条件后才会显露的秘密地点。', unlock:(s)=>unlocked(s,'longquan') }
];

export const ITEMS = [
  { name:'止血散', count:3, desc:'战斗外使用的基础伤药。' },
  { name:'旧铜钱', count:1, desc:'从渝州驿道拾到的铜钱，似乎刻有特殊纹样。' },
  { name:'粗布护腕', count:1, desc:'防御 +2。第一版暂作为展示装备。' }
];
