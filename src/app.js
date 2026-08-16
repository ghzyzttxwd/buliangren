import { CHARACTERS, SKILLS, LOCATIONS, ITEMS } from './data.js';
import { loadState, saveState, resetState } from './state.js';
import {
  createBattle,
  useSkill,
  basicAttack,
  getCurrentActor,
  canUseSkill,
  getSkillQiCost,
  getSkillBlockReason,
  getSkillMastery,
  getMasteryPowerMultiplier,
  BASIC_ATTACK_QI_RECOVERY
} from './battle.js';
import { buildPlayerCombatant } from './combatants.js';
import {
  getRealmName,
  getBreakthroughInfo,
  tryBreakthrough,
  getReputationRank,
  expRequiredForNextLevel
} from './progression.js';
import { getAvailableEvents, getEvent, beginEvent, completeEvent, failEvent } from './events.js';
import { GAME_VERSION, SAVE_VERSION } from './version.js';

let state = loadState();
let view = 'world';
let modal = null;
let battle = null;
let toastTimer = null;

const app = document.querySelector('#app');

function pct(v,max){ return Math.max(0, Math.min(100, Math.round(v/max*100))); }
function esc(s=''){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function persist(){ state = saveState(state); }
function showToast(msg){ clearTimeout(toastTimer); const old=document.querySelector('.toast'); old?.remove(); const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); toastTimer=setTimeout(()=>el.remove(),1900); }
function relationLabel(value=0){ if(value>=70)return '亲近'; if(value>=45)return '信任'; if(value>=20)return '熟悉'; if(value>=0)return '初识'; if(value>=-40)return '冷淡'; return '敌视'; }
function categoryLabel(category){ return ({main:'主线',side:'支线',hidden:'奇遇',character:'人物',encounter:'江湖'})[category] || '事件'; }
function learnedPlayerSkills(){ return Object.entries(state.martialArts||{}).filter(([id,art])=>art?.learned===true&&SKILLS[id]?.playerLearnable===true).map(([id])=>id); }

function chapterMeta(){
  const table={
    s1_prologue:{eyebrow:'第一季 · 序章',title:'风起渝州',progress:8},
    s1_yuzhou:{eyebrow:'第一季 · 渝州篇',title:'渝州暗潮',progress:18},
    s1_xuanming:{eyebrow:'第一季 · 玄冥教篇',title:'玄冥暗流',progress:32},
    s1_huanyinfang:{eyebrow:'第一季 · 幻音坊篇',title:'岐地风云',progress:46},
    s1_tongwenguan:{eyebrow:'第一季 · 通文馆篇',title:'晋地来人',progress:60},
    s1_longquan:{eyebrow:'第一季 · 龙泉线索篇',title:'龙泉风声',progress:76},
    s1_finale:{eyebrow:'第一季 · 终局',title:'洛阳风急',progress:90},
    s1_complete:{eyebrow:'第一季 · 完成',title:'江湖未止',progress:100}
  };
  return table[state.world.chapter] || {eyebrow:'第一季 · 江湖行',title:'江湖风声',progress:12};
}

function currentObjectiveEvent(){
  const available = LOCATIONS
    .filter(loc => loc.unlock(state))
    .flatMap(loc => getAvailableEvents(state, loc.id))
    .filter(event => event.category === 'main' || (event.category === 'encounter' && !event.repeatable));
  return available.sort((a,b)=>{
    const rank = event => event.category === 'main' ? 0 : 1;
    return rank(a) - rank(b);
  })[0] || null;
}

function header(){ return `
<header class="topbar"><div class="brand-row"><div class="brand"><div class="brand-mark"><span>良</span></div><div><h1>不良人：江湖行</h1><small>江湖 RPG · v${GAME_VERSION}</small></div></div><div class="resources"><div class="resource">Lv.<b>${state.player.level}</b></div><div class="resource">境<b>${getRealmName(state.player.realm)}</b></div><div class="resource">声<b>${state.world.reputation}</b></div><div class="resource">银<b>${state.player.silver}</b></div></div></div></header>`; }

function nav(){
  const items=[['world','⌖','江湖'],['party','人','队伍'],['skills','武','武学'],['bag','囊','行囊'],['logs','录','记录']];
  return `<nav class="bottom-nav">${items.map(([id,ico,label])=>`<button class="nav-btn ${view===id?'active':''}" data-nav="${id}"><span class="ico">${ico}</span><span>${label}</span></button>`).join('')}</nav>`;
}

function worldView(){
  const objective = currentObjectiveEvent();
  const meta = chapterMeta();
  const seasonComplete = state.world.flags?.season1Complete === true;
  const breakthrough = getBreakthroughInfo(state);
  const nextRealm = breakthrough.next;
  const expNeed = expRequiredForNextLevel(state.player.level);
  const targetLocation = objective ? LOCATIONS.find(loc=>loc.id===objective.location) : null;
  const objectiveCard = objective
    ? `<section class="quest-card"><span class="tag">${categoryLabel(objective.category)}</span><h4>${objective.title}</h4><p>${objective.desc}</p><button class="primary full" data-quest="${objective.location}">前往${targetLocation?.name || '事发地点'}</button></section>`
    : seasonComplete
      ? `<section class="quest-card"><span class="tag">第一季完成</span><h4>江湖未止</h4><p>第一季主线已经结束。你仍可处理尚未完成的支线、奇遇、人物事件与武学成长；第二季正式内容尚未开始。</p></section>`
      : `<section class="quest-card"><span class="tag">自由活动</span><h4>暂无强制目标</h4><p>当前主线条件尚未满足，或本阶段正式内容已经完成。可继续练功、处理支线与奇遇，江湖声望和经历会让新的线索出现。</p></section>`;
  const heroTitle = objective ? objective.title : seasonComplete ? '第一季终 · 江湖未止' : meta.title;
  const heroDesc = objective ? objective.desc : seasonComplete
    ? '焦兰殿风波已经落幕，李星云仍选择浪迹江湖。你的第一季经历已经写入江湖记录。'
    : '眼下没有必须立刻处理的主线。继续在江湖活动，新的线索会在条件成熟后出现。';
  return `<main class="page">
    <section class="hero-banner"><div class="eyebrow">${meta.eyebrow}</div><h2>${heroTitle}</h2><p>${heroDesc}</p><div class="progress-line"><span style="width:${meta.progress}%"></span></div></section>

    <div class="section-title"><h3>江湖身份</h3><span>${getReputationRank(state.world.reputation)}</span></div>
    <section class="quest-card"><span class="tag">成长</span><h4>${getRealmName(state.player.realm)} · 修为 ${state.player.cultivation}${nextRealm?` / ${nextRealm.cultivationRequired}`:''}</h4><p>阅历 ${state.player.exp} / ${expNeed}。${nextRealm?`下一境：${nextRealm.name}${breakthrough.canBreakthrough?'，当前可以突破。':`，还差 ${breakthrough.remaining} 修为。`}`:'已至当前版本最高境界。'}</p>${breakthrough.canBreakthrough?'<button class="primary full" data-breakthrough>尝试突破</button>':''}</section>

    <div class="section-title"><h3>当前任务</h3><span>声望 ${state.world.reputation} · ${getRealmName(state.player.realm)}</span></div>
    ${objectiveCard}

    <div class="section-title"><h3>江湖地点</h3><span>${LOCATIONS.filter(x=>x.unlock(state)).length} / ${LOCATIONS.length} 已解锁</span></div>
    <section class="location-list">${LOCATIONS.map(loc=>{const unlocked=loc.unlock(state);const count=unlocked?getAvailableEvents(state,loc.id).length:0;return `<button class="location" data-location="${loc.id}" ${unlocked?'':'disabled'}><span class="loc-icon">${loc.icon}</span><span class="loc-copy"><b>${loc.name}</b><small>${loc.desc}${unlocked?` · ${count} 个可用事件`:' · 尚未解锁'}</small></span><span class="chev">›</span></button>`}).join('')}</section>
  </main>`;
}

function partyView(){
  const playerCombat = buildPlayerCombatant(state, state.martialArts);
  return `<main class="page"><div class="section-title"><h3>同行之人</h3><span>${state.party.length} / 4 上阵</span></div><section class="character-grid">${Object.values(CHARACTERS).map(c=>{
    const inParty=state.party.includes(c.id); const locked=c.locked && !inParty;
    const level=c.id==='player'?state.player.level:c.level;
    const rel=state.relationships[c.id];
    const stats=c.id==='player'?playerCombat:c;
    const extra=c.id==='player'?`境界：${getRealmName(state.player.realm)} · 修为 ${state.player.cultivation}`:rel?`关系：${relationLabel(rel.affinity)}${rel.met?'':' · 尚未相识'}`:`武学：${c.skills.map(id=>SKILLS[id].name).join('、')}`;
    return `<article class="character-card ${locked?'locked':''}"><div class="portrait" data-char="${c.short}" style="--c1:${c.c1};--c2:${c.c2}"><span class="level">Lv.${level}</span></div><div class="char-info"><div class="rarity">${c.rarity}${inParty?' · 同行':''}</div><h3>${c.name}</h3><div class="stat-row"><span>攻 <b>${stats.attack}</b></span><span>防 <b>${stats.defense}</b></span><span>速 <b>${stats.speed}</b></span></div><div class="hpbar"><span style="width:100%"></span></div>${locked?`<div class="lock-note">🔒 ${c.unlock}</div>`:`<div class="lock-note">${extra}</div>`}</div></article>`;
  }).join('')}</section></main>`;
}

function skillsView(){
  const owned=new Set([...state.party.flatMap(id=>CHARACTERS[id].skills), ...learnedPlayerSkills()]);
  return `<main class="page"><div class="section-title"><h3>已掌握武学</h3><span>${owned.size} 门</span></div><section class="skill-list">${[...owned].map(id=>{const s=SKILLS[id];const mastery=state.martialArts[id]?.mastery||1;return `<article class="skill-card"><div class="skill-head"><span class="skill-name">${s.name}</span><span class="skill-type">${s.type}</span></div><p>${s.desc}</p><div class="skill-meta"><span>熟练 Lv.${mastery}</span><span>${s.heal?'治疗型':`威力 ${Math.round((s.power||1)*100)}%`} · 内力 ${getSkillQiCost(id)}</span></div></article>`}).join('')}</section></main>`;
}

function bagView(){ return `<main class="page"><div class="section-title"><h3>行囊</h3><span>基础行囊</span></div><section class="inventory-list">${ITEMS.map(i=>`<article class="item-card"><div class="skill-head"><b>${i.name}</b><span class="skill-type">×${i.count}</span></div><p>${i.desc}</p></article>`).join('')}</section></main>`; }

function logsView(){ return `<main class="page"><div class="section-title"><h3>江湖记录</h3><span>自动存档</span></div><section class="log-list">${state.logs.map((x,i)=>`<article class="log-card"><b>${i===0?'最近':'记录'}</b><p>${esc(x)}</p></article>`).join('')}</section><section class="settings"><button class="danger full" data-reset>重置本地存档</button><div class="version">不良人：江湖行 · v${GAME_VERSION} · 存档结构 v${SAVE_VERSION}</div></section></main>`; }

function locationModal(id){
  const loc=LOCATIONS.find(x=>x.id===id); if(!loc||!loc.unlock(state))return '';
  const events=getAvailableEvents(state,id);
  const eventButtons=events.map(event=>`<button class="story-option" data-event="${event.id}"><b>${categoryLabel(event.category)} · ${event.title}</b><small>${event.desc}</small></button>`).join('');
  const rest=id==='yuzhou'?'<button class="story-option" data-action="rest"><b>客栈休整</b><small>暂时歇脚，整理江湖见闻。</small></button>':'';
  const body=eventButtons || '<button class="story-option"><b>暂时无事发生</b><small>继续提升声望、境界或推进其他事件后再来看看。</small></button>';
  return `<div class="modal" data-close><section class="sheet" data-sheet><div class="sheet-handle"></div><div class="eyebrow">地点 · 条件事件</div><h2>${loc.name}</h2><div class="sheet-desc">${loc.desc}</div><div class="option-stack">${body}${rest}<button class="secondary full" data-close-btn>返回江湖</button></div></section></div>`;
}

function battleStatusHtml(f){
  const statuses=f.statuses||[];
  if(!statuses.length) return '<div class="status-line"><span class="status-empty">无状态</span></div>';
  return `<div class="status-line">${statuses.map(s=>`<span class="status-chip">${esc(s.name)}${s.stacks>1?`×${s.stacks}`:''} · ${s.duration}回${s.type==='shield'?` · 护${Math.max(0,s.amount||0)}`:''}</span>`).join('')}</div>`;
}

function battleModal(){
  const current=getCurrentActor(battle);
  const roundOrder=(battle.turnOrder||[]).filter(f=>f.hp>0).map(f=>`<span class="turn-order-unit ${current===f?'active':''}">${esc(f.name)}</span>`).join('<span class="turn-arrow">→</span>');
  const fighter=(f)=>`<div class="fighter ${current===f&&battle.status==='active'?'current':''} ${f.hp<=0?'dead':''}"><div class="fighter-top"><b>${esc(f.name)}</b><span class="realm-chip">${getRealmName(f.realm)}</span></div><div class="fighter-vitals"><span>血 ${Math.max(0,f.hp)}/${f.maxHp}</span><span>内 ${Math.max(0,f.qi??0)}/${f.maxQi??0}</span></div><div class="hpbar"><span style="width:${pct(f.hp,f.maxHp)}%"></span></div>${battleStatusHtml(f)}</div>`;
  let controls='';
  if(battle.status==='active' && current?.side==='ally') controls=`<div class="skill-buttons"><button class="skill-btn" data-basic-attack><b>普通攻击</b><small>威力 100% · 回复 ${BASIC_ATTACK_QI_RECOVERY} 内力</small></button>${current.skills.map(id=>{const s=SKILLS[id];const cost=getSkillQiCost(id);const block=getSkillBlockReason(current,id);const usable=canUseSkill(current,id);const mastery=getSkillMastery(current,id);const effectivePower=Math.round((s.power||1)*getMasteryPowerMultiplier(current,id)*100);const reason=block==='realm'?`境界不足 · 需${getRealmName(s.realmRequirement)}`:block==='qi'?'内力不足':block?'当前不可用':'';const effectText=s.heal?'恢复气血':`威力 ${effectivePower}%`;return `<button class="skill-btn" data-skill="${id}" ${usable?'':'disabled'}><b>${s.name}</b><small>${usable?effectText:reason} · 熟练 ${mastery} · 消耗 ${cost}</small></button>`}).join('')}</div>`;
  if(battle.status==='win') controls='<button class="primary full" data-battle-finish>领取战果</button>';
  if(battle.status==='lose') controls='<button class="secondary full" data-battle-leave>暂时撤退</button>';
  if(battle.uiTest) controls+=`<button class="secondary full" data-battle-leave>退出界面验收</button>`;
  const currentBanner=battle.status==='active'&&current?`<div class="current-actor-banner"><span>当前行动</span><b>${esc(current.name)}</b><small>${getRealmName(current.realm)} · 速度 ${current.speed}</small></div>`:'';
  const orderBanner=battle.status==='active'?`<div class="turn-order"><span>本回合顺序</span><div>${roundOrder}</div></div>`:'';
  const testBanner=battle.uiTest?'<div class="turn-order"><span>界面验收模式</span><div class="sheet-desc">此战斗不会结算剧情、奖励或写入存档。</div></div>':'';
  return `<div class="modal"><section class="sheet"><div class="sheet-handle"></div><div class="battle-title"><div><div class="eyebrow">速度演算 · 回合制</div><h2>交锋</h2></div><span class="turn-pill">第 ${battle.round} 回合</span></div>${testBanner}${currentBanner}${orderBanner}<div class="combatants"><div class="side">${battle.allies.map(fighter).join('')}</div><div class="vs">VS</div><div class="side">${battle.enemies.map(fighter).join('')}</div></div><div class="battle-log">${battle.log.slice(-10).map(x=>`<div>· ${esc(x)}</div>`).join('')}</div>${controls}</section></div>`;
}

function render(){
  const pages={world:worldView,party:partyView,skills:skillsView,bag:bagView,logs:logsView};
  app.innerHTML=`<div class="app-shell">${header()}${pages[view]()}${nav()}</div>${modal?locationModal(modal):''}${battle?battleModal():''}`;
  bind();
}

function startEvent(eventId){
  const started=beginEvent(state,eventId);
  const event=started.event;
  if(!started.ok || !event){ showToast('当前条件不满足'); return; }
  if(event.action?.type==='battle'){
    battle=createBattle(event.action.enemies||[],state.party,state.martialArts,state);
    battle.eventId=event.id;
    modal=null;
    persist();
    render();
    return;
  }
  const result=completeEvent(state,event.id);
  if(result.ok){
    if(result.levels) state.logs.unshift(`阅历积累足够，你提升了 ${result.levels} 级。`);
    persist();
    render();
    showToast(event.repeatable?'修炼完成 · 自动存档':'事件完成 · 自动存档');
  }
}

function closeUiTestBattle(){
  history.replaceState({},'',location.pathname);
  battle=null;
  render();
  showToast('界面验收结束 · 未写入存档');
}

function finishBattle(){
  if(battle?.status!=='win') return;
  if(battle.uiTest){ closeUiTestBattle(); return; }
  const eventId=battle.eventId;
  const result=eventId?completeEvent(state,eventId):{ok:false};
  if(result.ok && result.levels) state.logs.unshift(`阅历积累足够，你提升了 ${result.levels} 级。`);
  persist();
  battle=null;
  render();
  showToast(result.ok?'战果已结算 · 自动存档':'战斗结束');
}

function leaveBattle(){
  if(battle?.uiTest){ closeUiTestBattle(); return; }
  const eventId=battle?.eventId;
  if(eventId) failEvent(state,eventId);
  persist();
  battle=null;
  render();
  showToast('已撤回渝州');
}

function handleBreakthrough(){
  const result=tryBreakthrough(state);
  if(!result.ok){ showToast('修为尚不足以突破'); return; }
  state.logs.unshift(`气机贯通，你正式踏入【${result.realm.name}】。`);
  persist();
  render();
  showToast(`突破成功 · ${result.realm.name}`);
}

function initBattleUiTest(){
  const params=new URLSearchParams(location.search);
  if(params.get('battleTest')!=='1') return;
  battle=createBattle(['guard','blackwuchang'],['player','chimeng'],state.martialArts,state);
  battle.uiTest=true;
  battle.log.unshift('【界面验收】模拟战斗已创建，不结算剧情与奖励。');
  if(battle.allies[0]) battle.allies[0].statuses.push({id:'ui_shield',name:'护体',type:'shield',duration:2,source:'ui-test',stacks:1,amount:30});
  if(battle.enemies[0]) battle.enemies[0].statuses.push({id:'ui_poison',name:'中毒',type:'poison',duration:3,source:'ui-test',stacks:2,potency:.04});
  const current=getCurrentActor(battle);
  if(current?.side==='ally') current.qi=Math.min(current.qi??0,10);
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{view=b.dataset.nav; modal=null; render();});
  document.querySelectorAll('[data-location]').forEach(b=>b.onclick=()=>{modal=b.dataset.location; render();});
  document.querySelector('[data-quest]')?.addEventListener('click',e=>{modal=e.currentTarget.dataset.quest;render();});
  document.querySelector('[data-breakthrough]')?.addEventListener('click',handleBreakthrough);
  document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>startEvent(b.dataset.event));
  document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',e=>{if(e.target===x){modal=null;render();}}));
  document.querySelectorAll('[data-sheet]').forEach(x=>x.addEventListener('click',e=>e.stopPropagation()));
  document.querySelector('[data-close-btn]')?.addEventListener('click',()=>{modal=null;render();});
  document.querySelector('[data-action="rest"]')?.addEventListener('click',()=>{modal=null;render();showToast('已休整');});
  document.querySelector('[data-basic-attack]')?.addEventListener('click',()=>{battle=basicAttack(battle);render();});
  document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{battle=useSkill(battle,b.dataset.skill);render();});
  document.querySelectorAll('[data-battle-finish]').forEach(b=>b.addEventListener('click',finishBattle));
  document.querySelectorAll('[data-battle-leave]').forEach(b=>b.addEventListener('click',leaveBattle));
  document.querySelector('[data-reset]')?.addEventListener('click',()=>{if(confirm('确定清空当前本地存档？')){state=resetState();view='world';modal=null;battle=null;render();showToast('存档已重置');}});
}

initBattleUiTest();
render();

if ('serviceWorker' in navigator) {
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(refreshing) return;
    refreshing=true;
    window.location.reload();
  });
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(reg=>reg.update()).catch(()=>{}));
}
