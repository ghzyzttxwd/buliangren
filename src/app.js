import { CHARACTERS, SKILLS, LOCATIONS } from './data.js';
import { loadState, saveState, resetState } from './state.js';
import {
  createBattle,
  useSkill,
  basicAttack,
  useBattleItem,
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
  getInventoryEntries,
  getItemCategoryLabel,
  getSlotLabel,
  getUseContextLabel,
  getSpecialItemSemantic,
  formatStatModifiers,
  formatItemUseChanges,
  canUseConsumableItem,
  useConsumableItem,
  canUseManualItem,
  useManualItem,
  equipItem,
  unequipItem
} from './inventory.js';
import { getMerchant, getMerchantItems, canPurchaseItem, purchaseItem } from './shops.js';
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
let shop = null;
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
function itemUseError(reason,context='field'){
  return ({
    empty:'物品已经用完',
    wrong_context:'当前场景不能使用此物品',
    no_effect:context==='battle'?'当前角色无需使用':'当前资源已满，无需使用',
    not_consumable:'此物品不能直接使用',
    invalid_actor:'当前角色不能使用物品',
    battle_inactive:'当前不在战斗中'
  })[reason] || '当前无法使用此物品';
}
function manualUseError(result){
  return ({
    not_owned:'当前未持有此秘籍',
    already_learned:'这门武学已经掌握',
    realm_requirement:result?.requiredRealm?`境界不足 · 需${result.requiredRealm.name}`:'境界不足',
    invalid_martial_art:'秘籍记录的武学无效',
    not_manual:'此物品不是可研读秘籍'
  })[result?.reason] || '当前无法研读此秘籍';
}
function shopError(reason){
  return ({
    insufficient_silver:'银两不足',
    restricted_item:'此物不可由普通商人出售',
    not_sold_here:'此商人不出售该物品',
    merchant_missing:'商人数据不存在',
    item_missing:'物品数据不存在'
  })[reason] || '当前无法购买';
}

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

const LOCATION_STATE_CLASS={
  locked:'location--locked',
  open:'location--open',
  event:'location--event'
};

function worldView(){
  const objective = currentObjectiveEvent();
  const meta = chapterMeta();
  const seasonComplete = state.world.flags?.season1Complete === true;
  const breakthrough = getBreakthroughInfo(state);
  const nextRealm = breakthrough.next;
  const expNeed = expRequiredForNextLevel(state.player.level);
  const targetLocation = objective ? LOCATIONS.find(loc=>loc.id===objective.location) : null;
  const unlockedCount=LOCATIONS.filter(loc=>loc.unlock(state)).length;
  const overviewMode=seasonComplete?'complete':objective?'active':'free';
  const overviewLabel=seasonComplete?'第一季已完成':objective?categoryLabel(objective.category):'自由活动';
  const overviewTitle=seasonComplete?'江湖未止 · 自由行走':objective?objective.title:meta.title;
  const overviewDesc=seasonComplete
    ? '第一季主线已经结束，没有强制主线。你可以继续处理尚未完成的支线、人物事件、奇遇和武学成长。'
    : objective
      ? objective.desc
      : '当前没有必须立刻处理的主线。可以练功、探索已解锁地点，等待新的江湖线索出现。';
  const nextAction=objective
    ? `<div class="world-next-action"><div><span>下一步</span><b>前往${esc(targetLocation?.name || '事发地点')}</b><small>${esc(objective.title)}</small></div><button class="primary" data-quest="${esc(objective.location)}">前往</button></div>`
    : seasonComplete
      ? `<div class="world-next-action world-next-action--quiet"><div><span>当前状态</span><b>无强制主线</b><small>从下方地图选择已解锁地点继续江湖活动。</small></div></div>`
      : `<div class="world-next-action world-next-action--quiet"><div><span>下一步</span><b>自由探索</b><small>从有事件的地点开始，或继续积累修为与声望。</small></div></div>`;
  const cultivationText=nextRealm?`${state.player.cultivation}/${nextRealm.cultivationRequired}`:`${state.player.cultivation}`;
  const growthNote=nextRealm
    ? breakthrough.canBreakthrough?`可突破至${nextRealm.name}`:`距${nextRealm.name}还差 ${breakthrough.remaining} 修为`
    : '已至当前版本最高境界';
  const nodes=LOCATIONS.map(loc=>{
    const unlocked=loc.unlock(state);
    const count=unlocked?getAvailableEvents(state,loc.id).length:0;
    const status=!unlocked?'locked':count>0?'event':'open';
    const stateLabel=status==='event'?`${count}事`:status==='open'?'可进':'未解锁';
    return `<button class="location ${LOCATION_STATE_CLASS[status]}" data-location="${esc(loc.id)}" style="--map-x:${loc.map.x}%;--map-y:${loc.map.y}%" aria-label="${esc(loc.name)} · ${stateLabel}" ${unlocked?'':'disabled'}><span class="loc-icon">${esc(loc.icon)}</span><span class="loc-copy"><b>${esc(loc.name)}</b><small>${esc(loc.map.region || '')}</small></span><span class="loc-state">${stateLabel}</span></button>`;
  }).join('');
  return `<main class="page world-page">
    <section class="world-overview world-overview--${overviewMode}">
      <div class="world-overview__head"><div><div class="eyebrow">${esc(meta.eyebrow)}</div><span class="world-mode-chip">${esc(overviewLabel)}</span></div><strong>${meta.progress}%</strong></div>
      <h2>${esc(overviewTitle)}</h2>
      <p>${esc(overviewDesc)}</p>
      <div class="progress-line"><span style="width:${meta.progress}%"></span></div>
      ${nextAction}
    </section>

    <section class="world-growth-summary">
      <div><span>境界</span><b>${esc(getRealmName(state.player.realm))}</b></div>
      <div><span>修为</span><b>${esc(cultivationText)}</b></div>
      <div><span>阅历</span><b>${state.player.exp}/${expNeed}</b></div>
      <div><span>江湖</span><b>${esc(getReputationRank(state.world.reputation))}</b></div>
      <p>${esc(growthNote)}</p>
      ${breakthrough.canBreakthrough?'<button class="primary" data-breakthrough>尝试突破</button>':''}
    </section>

    <div class="section-title world-map-title"><h3>江湖地图</h3><span>${unlockedCount} / ${LOCATIONS.length} 已解锁</span></div>
    <div class="map-legend"><span><i class="legend-dot legend-dot--event"></i>有事件</span><span><i class="legend-dot legend-dot--open"></i>可进入</span><span><i class="legend-dot legend-dot--locked"></i>未解锁</span></div>
    <section class="location-list" aria-label="江湖地点地图"><div class="map-route map-route--one"></div><div class="map-route map-route--two"></div>${nodes}</section>
  </main>`;
}

function partyView(){
  const playerCombat=buildPlayerCombatant(state,state.martialArts);
  const knownCount=Object.values(CHARACTERS).filter(c=>!c.locked||state.party.includes(c.id)||state.relationships[c.id]?.met).length;
  const cards=Object.values(CHARACTERS).map(c=>{
    const inParty=state.party.includes(c.id);
    const locked=c.locked&&!inParty;
    const level=c.id==='player'?state.player.level:c.level;
    const rel=state.relationships[c.id];
    const stats=c.id==='player'?playerCombat:c;
    const stateLabel=locked?'未解锁':inParty?'同行中':rel?.met?'已结识':'尚未相识';
    const detail=c.id==='player'
      ? `<div class="character-detail"><span><i>境界</i><b>${esc(getRealmName(state.player.realm))}</b></span><span><i>修为</i><b>${state.player.cultivation}</b></span><span><i>体力</i><b>${state.player.stamina}/${state.player.maxStamina}</b></span></div>`
      : locked
        ? `<div class="character-detail character-detail--single"><span><i>解锁条件</i><b>${esc(c.unlock)}</b></span></div>`
        : rel
          ? `<div class="character-detail character-detail--single"><span><i>关系</i><b>${esc(relationLabel(rel.affinity))}${rel.met?'':' · 尚未相识'}</b></span></div>`
          : `<div class="character-detail character-detail--single"><span><i>武学</i><b>${esc(c.skills.map(id=>SKILLS[id]?.name||id).join('、'))}</b></span></div>`;
    return `<article class="character-card ${locked?'locked':''}">
      <div class="portrait" data-char="${esc(c.short)}" style="--c1:${c.c1};--c2:${c.c2}"><span class="level">Lv.${level}</span></div>
      <div class="char-info">
        <div class="character-card__head"><div><span class="rarity">${esc(c.rarity)}</span><h3>${esc(c.name)}</h3></div><span class="character-state ${locked?'character-state--locked':inParty?'character-state--active':''}">${stateLabel}</span></div>
        <div class="character-stats"><span><i>攻</i><b>${stats.attack}</b></span><span><i>防</i><b>${stats.defense}</b></span><span><i>速</i><b>${stats.speed}</b></span></div>
        ${detail}
      </div>
    </article>`;
  }).join('');
  return `<main class="page party-page"><div class="section-title"><h3>同行之人</h3><span>${state.party.length} / 4 同行</span></div><section class="party-summary"><div><span>当前同行</span><b>${state.party.length}</b></div><div><span>已知人物</span><b>${knownCount}/${Object.keys(CHARACTERS).length}</b></div><p>角色属性用于战斗构成；关系与解锁状态只展示现有剧情结果。</p></section><section class="character-grid">${cards}</section></main>`;
}

function skillsView(){
  const owned=new Set([...state.party.flatMap(id=>CHARACTERS[id].skills),...learnedPlayerSkills()]);
  const cards=[...owned].map(id=>{
    const s=SKILLS[id];
    if(!s) return '';
    const mastery=state.martialArts[id]?.mastery||1;
    const effectLabel=s.heal?'治疗':'威力';
    const effectValue=s.heal?`${Math.round(s.heal*100)}%最大气血`:`${Math.round((s.power||1)*100)}%`;
    const realmText=s.realmRequirement?getRealmName(s.realmRequirement):'无';
    return `<article class="skill-card">
      <div class="skill-card__head"><div><span class="skill-type">${esc(s.type)}</span><h3 class="skill-name">${esc(s.name)}</h3></div><span class="skill-requirement"><i>境界要求</i><b>${esc(realmText)}</b></span></div>
      <div class="skill-metrics"><span><i>熟练</i><b>Lv.${mastery}</b></span><span><i>${effectLabel}</i><b>${esc(effectValue)}</b></span><span><i>内力</i><b>${getSkillQiCost(id)}</b></span></div>
      <div class="skill-description"><span>简介</span><p>${esc(s.desc)}</p></div>
    </article>`;
  }).join('');
  return `<main class="page skills-page"><div class="section-title"><h3>已掌握武学</h3><span>${owned.size} 门</span></div><section class="skill-page-note"><b>武学总览</b><span>熟练度影响部分武学实际发挥；境界要求会限制战斗中的可用性。</span></section><section class="skill-list">${cards}</section></main>`;
}

function bagView(){
  const entries=getInventoryEntries(state);
  const total=entries.reduce((sum,item)=>sum+item.count,0);
  const cards=entries.length?entries.map(item=>{
    const meta=[getItemCategoryLabel(item.category)];
    let action='';
    if(item.category==='equipment'){
      meta.push(`部位：${getSlotLabel(item.slot)}`);
      meta.push(item.equippedSlot?`已装备：${getSlotLabel(item.equippedSlot)}`:'未装备');
      const stats=formatStatModifiers(item.statModifiers);
      if(stats) meta.push(stats);
      action=item.equippedSlot
        ? `<button class="secondary full" data-unequip-slot="${esc(item.equippedSlot)}">卸下</button>`
        : `<button class="primary full" data-equip-item="${esc(item.id)}" data-equip-slot="${esc(item.slot)}">装备</button>`;
    }
    if(item.category==='consumable' && item.useContext?.includes('field')){
      const usable=canUseConsumableItem(state,item.id,'field');
      action=`<button class="primary full" data-use-item="${esc(item.id)}" ${usable.ok?'':'disabled'}>${usable.ok?'使用':'当前无需使用'}</button>`;
    }
    if(item.category==='manual'){
      const check=canUseManualItem(state,item.id);
      if(item.realmRequirement) meta.push(`研读境界：${getRealmName(item.realmRequirement)}`);
      if(item.learnMartialArt && SKILLS[item.learnMartialArt]) meta.push(`可学：${SKILLS[item.learnMartialArt].name}`);
      action=`<button class="primary full" data-study-manual="${esc(item.id)}" ${check.ok?'':'disabled'}>${check.ok?'研读':esc(manualUseError(check))}</button>`;
    }
    const useContext=getUseContextLabel(item);
    if(useContext) meta.push(useContext);
    const semantic=getSpecialItemSemantic(item);
    if(semantic?.description && item.category!=='manual') meta.push(semantic.description);
    if(item.category==='unknown') meta.push('兼容旧存档保留');
    return `<article class="item-card"><div class="item-head"><div class="item-title"><span class="skill-type">${esc(getItemCategoryLabel(item.category))}</span><b>${esc(item.name)}</b></div><span class="item-count">×${item.count}</span></div><p>${esc(item.description)}</p><div class="item-meta">${meta.slice(1).map(text=>`<span>${esc(text)}</span>`).join('')}</div>${action}</article>`;
  }).join(''):'<article class="item-card item-empty"><b>行囊空空</b><p>当前没有持有任何物品。</p></article>';
  return `<main class="page"><div class="section-title"><h3>行囊</h3><span>${entries.length} 类 · 共 ${total} 件</span></div><section class="inventory-list">${cards}</section></main>`;
}

function logsView(){ return `<main class="page"><div class="section-title"><h3>江湖记录</h3><span>自动存档</span></div><section class="log-list">${state.logs.map((x,i)=>`<article class="log-card"><b>${i===0?'最近':'记录'}</b><p>${esc(x)}</p></article>`).join('')}</section><section class="settings"><button class="danger full" data-reset>重置本地存档</button><div class="version">不良人：江湖行 · v${GAME_VERSION} · 存档结构 v${SAVE_VERSION}</div></section></main>`; }

function locationModal(id){
  const loc=LOCATIONS.find(x=>x.id===id); if(!loc||!loc.unlock(state))return '';
  const events=getAvailableEvents(state,id);
  const eventButtons=events.map(event=>`<button class="story-option" data-event="${event.id}"><b>${categoryLabel(event.category)} · ${event.title}</b><small>${event.desc}</small></button>`).join('');
  const rest=id==='yuzhou'?'<button class="story-option" data-action="rest"><b>客栈休整</b><small>暂时歇脚，整理江湖见闻。</small></button>':'';
  const merchant=id==='yuzhou'?'<button class="story-option" data-shop="yuzhou_apothecary"><b>渝州药摊</b><small>用银两购买常见伤药。</small></button>':'';
  const body=eventButtons || '<button class="story-option"><b>暂时无事发生</b><small>继续提升声望、境界或推进其他事件后再来看看。</small></button>';
  return `<div class="modal" data-close><section class="sheet" data-sheet><div class="sheet-handle"></div><div class="eyebrow">地点 · 条件事件</div><h2>${loc.name}</h2><div class="sheet-desc">${loc.desc}</div><div class="option-stack">${body}${rest}${merchant}<button class="secondary full" data-close-btn>返回江湖</button></div></section></div>`;
}

function shopModal(merchantId){
  const merchant=getMerchant(merchantId);
  if(!merchant) return '';
  const listings=getMerchantItems(merchantId);
  const cards=listings.length?listings.map(({item,price})=>{
    const check=canPurchaseItem(state,merchantId,item.id);
    const owned=state.inventory.items[item.id]||0;
    return `<article class="item-card"><div class="item-head"><div class="item-title"><span class="skill-type">${esc(getItemCategoryLabel(item.category))}</span><b>${esc(item.name)}</b></div><span class="item-count">持有 ×${owned}</span></div><p>${esc(item.description)}</p><div class="item-meta"><span>价格：${price} 银</span></div><button class="primary full" data-buy-item="${esc(item.id)}" data-buy-merchant="${esc(merchantId)}" ${check.ok?'':'disabled'}>${check.ok?`购买 · ${price} 银`:esc(shopError(check.reason))}</button></article>`;
  }).join(''):'<article class="item-card item-empty"><b>暂无商品</b><p>商人今天没有可出售的东西。</p></article>';
  return `<div class="modal"><section class="sheet"><div class="sheet-handle"></div><div class="eyebrow">商人 · 银两 ${state.player.silver}</div><h2>${esc(merchant.name)}</h2><div class="sheet-desc">${esc(merchant.description)}</div><section class="inventory-list">${cards}</section><button class="secondary full" data-shop-close>返回${merchant.location==='yuzhou'?'渝州':'江湖'}</button></section></div>`;
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
  if(battle.status==='active' && current?.side==='ally'){
    const skills=`<div class="skill-buttons"><button class="skill-btn" data-basic-attack><b>普通攻击</b><small>威力 100% · 回复 ${BASIC_ATTACK_QI_RECOVERY} 内力</small></button>${current.skills.map(id=>{const s=SKILLS[id];const cost=getSkillQiCost(id);const block=getSkillBlockReason(current,id);const usable=canUseSkill(current,id);const mastery=getSkillMastery(current,id);const effectivePower=Math.round((s.power||1)*getMasteryPowerMultiplier(current,id)*100);const reason=block==='realm'?`境界不足 · 需${getRealmName(s.realmRequirement)}`:block==='qi'?'内力不足':block?'当前不可用':'';const effectText=s.heal?'恢复气血':`威力 ${effectivePower}%`;return `<button class="skill-btn" data-skill="${id}" ${usable?'':'disabled'}><b>${s.name}</b><small>${usable?effectText:reason} · 熟练 ${mastery} · 消耗 ${cost}</small></button>`}).join('')}</div>`;
    const itemButtons=getInventoryEntries(state).filter(item=>item.category==='consumable'&&item.useContext?.includes('battle')).map(item=>{const check=canUseConsumableItem(state,item.id,'battle',current);const note=check.ok?'使用后占用本次行动':itemUseError(check.reason,'battle');return `<button class="skill-btn" data-battle-item="${esc(item.id)}" ${check.ok?'':'disabled'}><b>${esc(item.name)} ×${item.count}</b><small>${esc(note)}</small></button>`}).join('');
    controls=`${skills}${itemButtons?`<div class="eyebrow">战斗物品</div><div class="skill-buttons">${itemButtons}</div>`:''}`;
  }
  if(battle.status==='win') controls='<button class="primary full" data-battle-finish>领取战果</button>';
  if(battle.status==='lose') controls='<button class="secondary full" data-battle-leave>暂时撤退</button>';
  const currentBanner=battle.status==='active'&&current?`<div class="current-actor-banner"><span>当前行动</span><b>${esc(current.name)}</b><small>${getRealmName(current.realm)} · 速度 ${current.speed}</small></div>`:'';
  const orderBanner=battle.status==='active'?`<div class="turn-order"><span>本回合顺序</span><div>${roundOrder}</div></div>`:'';
  return `<div class="modal"><section class="sheet"><div class="sheet-handle"></div><div class="battle-title"><div><div class="eyebrow">速度演算 · 回合制</div><h2>交锋</h2></div><span class="turn-pill">第 ${battle.round} 回合</span></div>${currentBanner}${orderBanner}<div class="combatants"><div class="side">${battle.allies.map(fighter).join('')}</div><div class="vs">VS</div><div class="side">${battle.enemies.map(fighter).join('')}</div></div><div class="battle-log">${battle.log.slice(-10).map(x=>`<div>· ${esc(x)}</div>`).join('')}</div>${controls}</section></div>`;
}

function render(){
  const pages={world:worldView,party:partyView,skills:skillsView,bag:bagView,logs:logsView};
  app.innerHTML=`<div class="app-shell">${header()}${pages[view]()}${nav()}</div>${modal?locationModal(modal):''}${shop?shopModal(shop):''}${battle?battleModal():''}`;
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
    shop=null;
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

function finishBattle(){
  if(battle?.status!=='win') return;
  const eventId=battle.eventId;
  const result=eventId?completeEvent(state,eventId):{ok:false};
  if(result.ok && result.levels) state.logs.unshift(`阅历积累足够，你提升了 ${result.levels} 级。`);
  persist();
  battle=null;
  render();
  showToast(result.ok?'战果已结算 · 自动存档':'战斗结束');
}

function leaveBattle(){
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

function handleEquipItem(itemId, slot){
  const result=equipItem(state,itemId,slot);
  if(!result.ok){
    const message={
      not_equipment:'此物品不能装备',
      not_owned:'当前未持有该装备',
      slot_mismatch:'装备部位不匹配',
      invalid_slot:'装备部位无效'
    }[result.reason] || '当前无法装备';
    showToast(message);
    return;
  }
  persist();
  render();
  showToast(`${result.item.name} 已装备`);
}

function handleUnequipItem(slot){
  const result=unequipItem(state,slot);
  if(!result.ok){ showToast('当前部位没有可卸下装备'); return; }
  persist();
  render();
  showToast(`${result.item?.name || result.itemId} 已卸下`);
}

function handleUseFieldItem(itemId){
  const result=useConsumableItem(state,itemId,'field');
  if(!result.ok){ showToast(itemUseError(result.reason,'field')); return; }
  const changeText=formatItemUseChanges(result.changes);
  state.logs.unshift(`你使用【${result.item.name}】${changeText?`，${changeText}`:''}。`);
  persist();
  render();
  showToast(`${result.item.name} · ${changeText} · 剩余 ${result.remaining}`);
}

function handleStudyManual(itemId){
  const result=useManualItem(state,itemId);
  if(!result.ok){ showToast(manualUseError(result)); return; }
  state.logs.unshift(`你研读【${result.item.name}】，学会了【${result.skill.name}】。`);
  persist();
  render();
  showToast(`学会武学 · ${result.skill.name}${result.consumed?` · 秘籍剩余 ${result.remaining}`:''}`);
}

function handleBattleItem(itemId){
  const action=useBattleItem(battle,state,itemId);
  battle=action.battle;
  if(!action.result.ok){ showToast(itemUseError(action.result.reason,'battle')); return; }
  const changeText=formatItemUseChanges(action.result.changes);
  persist();
  render();
  showToast(`${action.result.item.name} · ${changeText} · 剩余 ${action.result.remaining}`);
}

function handlePurchase(merchantId,itemId){
  const result=purchaseItem(state,merchantId,itemId);
  if(!result.ok){ showToast(shopError(result.reason)); return; }
  state.logs.unshift(`你在【${result.merchant.name}】花费 ${result.totalPrice} 银，购得【${result.item.name}】×${result.count}。`);
  persist();
  render();
  showToast(`${result.item.name} +${result.count} · 剩余银两 ${result.remainingSilver}`);
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{view=b.dataset.nav; modal=null;shop=null; render();});
  document.querySelectorAll('[data-location]').forEach(b=>b.onclick=()=>{modal=b.dataset.location;shop=null; render();});
  document.querySelector('[data-quest]')?.addEventListener('click',e=>{modal=e.currentTarget.dataset.quest;shop=null;render();});
  document.querySelector('[data-breakthrough]')?.addEventListener('click',handleBreakthrough);
  document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>startEvent(b.dataset.event));
  document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',e=>{if(e.target===x){modal=null;shop=null;render();}}));
  document.querySelectorAll('[data-sheet]').forEach(x=>x.addEventListener('click',e=>e.stopPropagation()));
  document.querySelector('[data-close-btn]')?.addEventListener('click',()=>{modal=null;shop=null;render();});
  document.querySelector('[data-action="rest"]')?.addEventListener('click',()=>{modal=null;render();showToast('已休整');});
  document.querySelectorAll('[data-shop]').forEach(b=>b.onclick=()=>{shop=b.dataset.shop;modal=null;render();});
  document.querySelector('[data-shop-close]')?.addEventListener('click',()=>{shop=null;modal='yuzhou';render();});
  document.querySelectorAll('[data-buy-item]').forEach(b=>b.onclick=()=>handlePurchase(b.dataset.buyMerchant,b.dataset.buyItem));
  document.querySelectorAll('[data-equip-item]').forEach(b=>b.onclick=()=>handleEquipItem(b.dataset.equipItem,b.dataset.equipSlot));
  document.querySelectorAll('[data-unequip-slot]').forEach(b=>b.onclick=()=>handleUnequipItem(b.dataset.unequipSlot));
  document.querySelectorAll('[data-use-item]').forEach(b=>b.onclick=()=>handleUseFieldItem(b.dataset.useItem));
  document.querySelectorAll('[data-study-manual]').forEach(b=>b.onclick=()=>handleStudyManual(b.dataset.studyManual));
  document.querySelector('[data-basic-attack]')?.addEventListener('click',()=>{battle=basicAttack(battle);render();});
  document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{battle=useSkill(battle,b.dataset.skill);render();});
  document.querySelectorAll('[data-battle-item]').forEach(b=>b.onclick=()=>handleBattleItem(b.dataset.battleItem));
  document.querySelectorAll('[data-battle-finish]').forEach(b=>b.addEventListener('click',finishBattle));
  document.querySelectorAll('[data-battle-leave]').forEach(b=>b.addEventListener('click',leaveBattle));
  document.querySelector('[data-reset]')?.addEventListener('click',()=>{if(confirm('确定清空当前本地存档？')){state=resetState();view='world';modal=null;shop=null;battle=null;render();showToast('存档已重置');}});
}

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
