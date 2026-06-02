import { useState, useEffect, useMemo, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFF = {
  easy:   { label:"Easy",   xp:15, color:"#4ade80" },
  normal: { label:"Normal", xp:30, color:"#fbbf24" },
  hard:   { label:"Hard",   xp:60, color:"#f87171" },
};
const CATS = {
  fitness:  { label:"Fitness",  emoji:"⚔️",  color:"#f87171" },
  haushalt: { label:"Haushalt", emoji:"🏠",  color:"#38bdf8" },
  familie:  { label:"Familie",  emoji:"👨‍👩‍👧", color:"#c084fc" },
  einkauf:  { label:"Einkauf",  emoji:"🛒",  color:"#4ade80" },
  sonstige: { label:"Sonstige", emoji:"📋",  color:"#94a3b8" },
};
const RANKS = [
  { rank:"E",   title:"Awakened One",          min:1,   max:9,   color:"#94a3b8" },
  { rank:"D",   title:"Shadow Hunter",          min:10,  max:24,  color:"#4ade80" },
  { rank:"C",   title:"Elite Hunter",           min:25,  max:49,  color:"#38bdf8" },
  { rank:"B",   title:"Master Hunter",          min:50,  max:74,  color:"#fbbf24" },
  { rank:"A",   title:"Shadow Sovereign",       min:75,  max:99,  color:"#c084fc" },
  { rank:"S",   title:"Monarch of Shadows",     min:100, max:149, color:"#f87171" },
  { rank:"SS",  title:"Transcendent Hunter",    min:150, max:199, color:"#fb923c" },
  { rank:"SSS", title:"Ruler of the Shadows",   min:200, max:299, color:"#e879f9" },
  { rank:"NL",  title:"National Level Hunter",  min:300, max:499, color:"#67e8f9" },
  { rank:"SM",  title:"Shadow Monarch",         min:500, max:Infinity, color:"#fde68a" },
];
// Tiered achievements: levels array = [bronze, silver, gold] thresholds
// Single-level achievements have no levels array
const ACHIEVEMENTS = [
  // ── Single-level ──────────────────────────────────────────────────────────
  { id:"first_step",  emoji:"⚔️",  title:"First Step",    desc:"Erste Quest erledigt",         check: s=>s.total>=1 },
  { id:"awakened",    emoji:"✨",  title:"Awakened",      desc:"Level 5 erreicht",             check: s=>s.level>=5 },
  { id:"d_rank",      emoji:"🗡️",  title:"Shadow Hunter", desc:"D-Rank (Level 6)",             check: s=>s.level>=6 },
  { id:"c_rank",      emoji:"🌟",  title:"Elite Hunter",  desc:"C-Rank (Level 16)",            check: s=>s.level>=16 },
  { id:"once_done",   emoji:"✅",  title:"Completionist", desc:"Einmalig-Quest abgeschlossen", check: s=>s.onceDone>=1 },
  { id:"freeze_used", emoji:"❄️",  title:"Cool Head",     desc:"Streak-Freeze eingesetzt",     check: s=>s.usedFreeze },
  // ── Tiered (Bronze / Silber / Gold) ────────────────────────────────────────
  { id:"streak",   emoji:"🔥", title:"Streak",      tiers:[
    {level:1, label:"Bronze", desc:"7 Tage Streak",   check:s=>s.streak>=7},
    {level:2, label:"Silber", desc:"30 Tage Streak",  check:s=>s.streak>=30},
    {level:3, label:"Gold",   desc:"100 Tage Streak", check:s=>s.streak>=100},
  ]},
  { id:"quests",   emoji:"🏅", title:"Questor",     tiers:[
    {level:1, label:"Bronze", desc:"100 Quests",   check:s=>s.total>=100},
    {level:2, label:"Silber", desc:"250 Quests",   check:s=>s.total>=250},
    {level:3, label:"Gold",   desc:"1.000 Quests", check:s=>s.total>=1000},
  ]},
  { id:"xp",       emoji:"💎", title:"XP Hunter",   tiers:[
    {level:1, label:"Bronze", desc:"10.000 XP",    check:s=>s.totalXP>=10000},
    {level:2, label:"Silber", desc:"50.000 XP",    check:s=>s.totalXP>=50000},
    {level:3, label:"Gold",   desc:"250.000 XP",   check:s=>s.totalXP>=250000},
  ]},
  { id:"fitness",  emoji:"⚡", title:"Warrior",     tiers:[
    {level:1, label:"Bronze", desc:"50 Fitness-Quests",   check:s=>(s.cat.fitness||0)>=50},
    {level:2, label:"Silber", desc:"150 Fitness-Quests",  check:s=>(s.cat.fitness||0)>=150},
    {level:3, label:"Gold",   desc:"500 Fitness-Quests",  check:s=>(s.cat.fitness||0)>=500},
  ]},
  { id:"familie",  emoji:"❤️", title:"Family First", tiers:[
    {level:1, label:"Bronze", desc:"50 Familie-Quests",   check:s=>(s.cat.familie||0)>=50},
    {level:2, label:"Silber", desc:"150 Familie-Quests",  check:s=>(s.cat.familie||0)>=150},
    {level:3, label:"Gold",   desc:"500 Familie-Quests",  check:s=>(s.cat.familie||0)>=500},
  ]},
  { id:"haushalt", emoji:"🏠", title:"Clean Slate",  tiers:[
    {level:1, label:"Bronze", desc:"50 Haushalt-Quests",  check:s=>(s.cat.haushalt||0)>=50},
    {level:2, label:"Silber", desc:"150 Haushalt-Quests", check:s=>(s.cat.haushalt||0)>=150},
    {level:3, label:"Gold",   desc:"500 Haushalt-Quests", check:s=>(s.cat.haushalt||0)>=500},
  ]},
];
// Helpers to work with the new format
const TIER_COLORS = {1:"#cd7f32", 2:"#94a3b8", 3:"#fbbf24"}; // bronze, silver, gold
const TIER_EMOJI  = {1:"🥉", 2:"🥈", 3:"🥇"};
function getAchLevel(plrAchs, id){ const e=plrAchs.find(a=>a.id===id); return e?e.level:0; }
// Migrate old string[] format → {id,level}[]
function migAchs(arr){ if(!arr||!arr.length)return[]; if(typeof arr[0]==="string")return arr.map(id=>({id,level:1})); return arr; }
const INIT_TPL = [
  { id:"t1", name:"Training",             category:"fitness",  difficulty:"hard",   frequency:"daily",  repeatable:false, emoji:"⚔️" },
  { id:"t2", name:"Müll rausbringen",     category:"haushalt", difficulty:"easy",   frequency:"daily",  repeatable:false, emoji:"🗑️" },
  { id:"t3", name:"Spülmaschine",         category:"haushalt", difficulty:"easy",   frequency:"daily",  repeatable:false, emoji:"🍽️" },
  { id:"t4", name:"Waschmaschine",        category:"haushalt", difficulty:"normal", frequency:"daily",  repeatable:false, emoji:"👕" },
  { id:"t5", name:"Kita Rucksack packen", category:"familie",  difficulty:"easy",   frequency:"daily",  repeatable:false, emoji:"🎒" },
  { id:"t6", name:"Einkaufen",            category:"einkauf",  difficulty:"normal", frequency:"daily",  repeatable:false, emoji:"🛒" },
  { id:"t7", name:"Wohnung aufräumen",    category:"haushalt", difficulty:"normal", frequency:"weekly", repeatable:false, emoji:"🧹" },
  { id:"t8", name:"Wickeln",              category:"familie",  difficulty:"easy",   frequency:"daily",  repeatable:true,  emoji:"🍼" },
];
const DAYS_DE   = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const STORE_KEY = "sqt"; // permanent — never change this

// ─── Storage ──────────────────────────────────────────────────────────────────
function loadAll() {
  // Try current key first, then migrate from old versioned keys
  for (const key of [STORE_KEY, "sqt_v3", "sqt_v2"]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (key !== STORE_KEY) { localStorage.setItem(STORE_KEY, raw); localStorage.removeItem(key); }
        return data;
      }
    } catch {}
  }
  return null;
}
function saveAll(t, c, p) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({templates:t,completions:c,player:p})); }
  catch(e) { console.warn("save failed:", e); }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ld(d=new Date()){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
const TODAY=()=>ld();
const MONTH=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
function wkStart(){const t=new Date(),o=(t.getDay()+6)%7,m=new Date(t);m.setDate(t.getDate()-o);return ld(m);}
function lvlInfo(xp){let l=1,u=0;while(l<9999){const n=l*100;if(u+n>xp)break;u+=n;l++;}const i=xp-u,f=l*100;return{level:l,inLvl:i,forNext:f,pct:Math.min(100,(i/f)*100)};}
function getRank(l){return RANKS.find(r=>l>=r.min&&l<=r.max)??RANKS.at(-1);}
function sBon(s){return Math.min(s*3,30);}
function weekDays(weekOffset=0){const t=new Date(),o=(t.getDay()+6)%7,mon=new Date(t);mon.setDate(t.getDate()-o+weekOffset*7);return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return ld(d);});}
function weekStartFromOffset(weekOffset=0){const t=new Date(),o=(t.getDay()+6)%7,mon=new Date(t);mon.setDate(t.getDate()-o+weekOffset*7);return ld(mon);}
function monDays(monthOffset=0){const ref=new Date();ref.setDate(1);ref.setMonth(ref.getMonth()+monthOffset);const year=ref.getFullYear(),month=ref.getMonth(),f=new Date(year,month,1),la=new Date(year,month+1,0),pad=(f.getDay()+6)%7,arr=Array(pad).fill(null);for(let d=1;d<=la.getDate();d++)arr.push(ld(new Date(year,month,d)));return arr;}
function monLabel(monthOffset=0){const ref=new Date();ref.setDate(1);ref.setMonth(ref.getMonth()+monthOffset);return{month:ref.getMonth(),year:ref.getFullYear()};}
function weekLabel(weekOffset=0){const days=weekDays(weekOffset);const start=new Date(days[0]+"T12:00"),end=new Date(days[6]+"T12:00");const fmt=d=>d.toLocaleDateString("de-DE",{day:"numeric",month:"short"});const d=new Date(days[0]+"T12:00");d.setHours(0,0,0,0);d.setDate(d.getDate()+4-(d.getDay()||7));const kw=Math.ceil((((d-new Date(d.getFullYear(),0,1))/86400000)+1)/7);return{label:`KW ${kw}: ${fmt(start)} – ${fmt(end)}`,kw};}
function migTpl(arr){return arr.map(t=>({repeatable:false,...t,frequency:t.frequency??(t.recurring?"daily":"daily")}));}
function mkPlayer(p={}){const base={name:"Tim",streak:0,lastDate:null,completedOnce:[],weeklyGoal:500,freezes:1,lastFreezeMonth:null,achievements:[],usedFreeze:false,...p};base.achievements=migAchs(base.achievements);return base;}

function computeStats(comps, player, level) {
  const cat={};
  comps.forEach(c=>{cat[c.category]=(cat[c.category]||0)+1;});
  return { total:comps.length, totalXP:comps.reduce((s,c)=>s+c.earnedXp,0), streak:player.streak, level, cat, onceDone:(player.completedOnce||[]).length, usedFreeze:player.usedFreeze||false };
}
// Returns array of {ach, newLevel} for newly reached tiers
function checkAchievementUpdates(stats, plrAchs) {
  const updates = [];
  for(const a of ACHIEVEMENTS){
    if(a.tiers){
      const current = getAchLevel(plrAchs, a.id);
      for(const tier of a.tiers){
        if(tier.level > current && tier.check(stats)){
          updates.push({ach:a, tier, newLevel:tier.level});
        }
      }
    } else {
      if(!plrAchs.find(x=>x.id===a.id) && a.check(stats)){
        updates.push({ach:a, tier:null, newLevel:1});
      }
    }
  }
  return updates;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const saved   = useMemo(()=>loadAll(),[]);
  const [tpl,   setTpl]   = useState(()=>migTpl(saved?.templates??INIT_TPL));
  const [comps, setComps] = useState(()=>saved?.completions??[]);
  const [plr,   setPlr]   = useState(()=>mkPlayer(saved?.player));
  const [tab,   setTab]   = useState("today");
  const [flash, setFlash] = useState(null);         // {xp, key}
  const [achFlash, setAchFlash] = useState(null);   // achievement unlock
  const [showAdd,   setShowAdd]   = useState(false);
  const [showFreeze,setShowFreeze]= useState(false); // freeze prompt
  const [pendingNote, setPendingNote] = useState(null); // {compId}
  const [noteText, setNoteText] = useState("");
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [newQ, setNewQ] = useState({name:"",category:"sonstige",difficulty:"normal",emoji:"📋",frequency:"daily",repeatable:false});
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);

  const noteTimer = useRef(null);

  // Persist
  useEffect(()=>{ saveAll(tpl,comps,plr); },[tpl,comps,plr]);

  // On mount: streak check, freeze regen, show freeze prompt
  useEffect(()=>{
    const yest=ld(new Date(Date.now()-86400000)), mon=MONTH();
    let p={...plr};
    // Freeze regen: 1 per month, max 2
    if(p.lastFreezeMonth!==mon){p={...p,freezes:Math.min(2,(p.freezes||0)+1),lastFreezeMonth:mon};}
    // Streak check
    if(p.lastDate&&p.lastDate<yest){
      if(p.streak>0&&p.freezes>0){ setShowFreeze(true); }
      else { p={...p,streak:0}; }
    }
    setPlr(p);
  },[]);// eslint-disable-line

  const today=TODAY(), ws=wkStart();
  const totalXP    =useMemo(()=>comps.reduce((s,c)=>s+c.earnedXp,0),[comps]);
  const lv         =useMemo(()=>lvlInfo(totalXP),[totalXP]);
  const rank       =useMemo(()=>getRank(lv.level),[lv.level]);
  const todayC     =useMemo(()=>comps.filter(c=>c.date===today),[comps,today]);
  const weekC      =useMemo(()=>comps.filter(c=>c.weekStart===ws),[comps,ws]);
  const todayXP    =useMemo(()=>todayC.reduce((s,c)=>s+c.earnedXp,0),[todayC]);
  const weekXP     =useMemo(()=>weekC.reduce((s,c)=>s+c.earnedXp,0),[weekC]);
  const bon        =sBon(plr.streak);
  const dailyQ     =useMemo(()=>tpl.filter(t=>t.frequency==="daily"),[tpl]);
  const weeklyQ    =useMemo(()=>tpl.filter(t=>t.frequency==="weekly"),[tpl]);
  const onceQ      =useMemo(()=>tpl.filter(t=>t.frequency==="once"),[tpl]);
  const onceActive =useMemo(()=>onceQ.filter(t=>!(plr.completedOnce||[]).includes(t.id)),[onceQ,plr.completedOnce]);
  const doneIds    =useMemo(()=>new Set(todayC.map(c=>c.templateId)),[todayC]);
  const wkDoneIds  =useMemo(()=>new Set(weekC.map(c=>c.templateId)),[weekC]);
  const repCnt     =useMemo(()=>{const m={};todayC.forEach(c=>{m[c.templateId]=(m[c.templateId]||0)+1;});return m;},[todayC]);
  const dailyDone  =dailyQ.filter(q=>!q.repeatable&&doneIds.has(q.id)).length;
  const dailyTotal =dailyQ.filter(q=>!q.repeatable).length;
  const weeklyDone =weeklyQ.filter(q=>wkDoneIds.has(q.id)).length;
  const onceDone   =onceQ.length-onceActive.length;
  const totalDone  =dailyDone+weeklyDone+onceDone;
  const totalQ     =dailyTotal+weeklyQ.length+onceQ.length;
  const progress   =totalQ>0?Math.round((totalDone/totalQ)*100):0;
  const allDone    =totalQ>0&&dailyDone===dailyTotal&&weeklyDone===weeklyQ.length&&onceActive.length===0;
  const wkDays     =useMemo(()=>weekDays(weekOffset),[weekOffset]);
  const wkLabel    =useMemo(()=>weekLabel(weekOffset),[weekOffset]);
  const weekData   =useMemo(()=>wkDays.map(d=>({date:d,xp:comps.filter(c=>c.date===d).reduce((s,c)=>s+c.earnedXp,0),list:comps.filter(c=>c.date===d)})),[comps,wkDays]);
  const monArr     =useMemo(()=>monDays(monthOffset),[monthOffset]);
  const mLabel     =useMemo(()=>monLabel(monthOffset),[monthOffset]);
  const monPrefix  =useMemo(()=>{const {year,month}=monLabel(monthOffset);return`${year}-${String(month+1).padStart(2,"0")}`;},[monthOffset]);
  const xpDay      =useMemo(()=>{const m={};comps.forEach(c=>{m[c.date]=(m[c.date]||0)+c.earnedXp});return m;},[comps]);
  const monXP      =useMemo(()=>comps.filter(c=>c.date.startsWith(monPrefix)).reduce((s,c)=>s+c.earnedXp,0),[comps,monPrefix]);
  const monCnt     =useMemo(()=>comps.filter(c=>c.date.startsWith(monPrefix)).length,[comps,monPrefix]);
  const actDays    =useMemo(()=>new Set(comps.filter(c=>c.date.startsWith(monPrefix)).map(c=>c.date)).size,[comps,monPrefix]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  function afterComplete(newComps, newPlr) {
    const stats = computeStats(newComps, newPlr, lv.level);
    const plrAchs = migAchs(newPlr.achievements||[]);
    const updates = checkAchievementUpdates(stats, plrAchs);
    if(updates.length>0){
      // Apply highest new level per achievement
      let achs = [...plrAchs];
      for(const u of updates){
        const idx = achs.findIndex(x=>x.id===u.ach.id);
        if(idx>=0) achs[idx]={...achs[idx],level:u.newLevel};
        else achs.push({id:u.ach.id, level:u.newLevel});
      }
      newPlr = {...newPlr, achievements:achs};
      setAchFlash({ach:updates[0].ach, tier:updates[0].tier, newLevel:updates[0].newLevel, key:Date.now()});
    }
    setComps(newComps); setPlr(newPlr); saveAll(tpl,newComps,newPlr);
  }

  function doComplete(t) {
    const base=DIFF[t.difficulty].xp, earned=base+bon;
    const id=Date.now()+"";
    const nc=[...comps,{id,templateId:t.id,name:t.name,category:t.category,difficulty:t.difficulty,emoji:t.emoji,frequency:t.frequency,repeatable:t.repeatable||false,baseXp:base,streakBonus:bon,earnedXp:earned,date:today,weekStart:ws,ts:Date.now(),note:""}];
    let np={...plr};
    if(t.frequency==="once") np={...np,completedOnce:[...(np.completedOnce||[]),t.id]};
    const yest=ld(new Date(Date.now()-86400000)); let s=np.streak;
    if(np.lastDate!==today){s=(np.lastDate===yest||!np.lastDate)?s+1:1;}
    np={...np,streak:s,lastDate:today};
    setFlash({xp:earned,key:Date.now()});
    // Note prompt
    clearTimeout(noteTimer.current);
    setPendingNote({compId:id}); setNoteText("");
    noteTimer.current=setTimeout(()=>setPendingNote(null),8000);
    afterComplete(nc,np);
  }

  function doUndo(tid, weekly=false) {
    const pool=weekly?comps.filter(c=>c.templateId===tid&&c.weekStart===ws):comps.filter(c=>c.templateId===tid&&c.date===today);
    if(!pool.length)return;
    const nc=comps.filter(c=>c.id!==pool.at(-1).id);
    setComps(nc); saveAll(tpl,nc,plr);
  }

  function doSaveNote() {
    if(!pendingNote||!noteText.trim())return;
    const nc=comps.map(c=>c.id===pendingNote.compId?{...c,note:noteText.trim()}:c);
    setComps(nc); saveAll(tpl,nc,plr);
    setPendingNote(null); setNoteText("");
  }

  function doResetOnce(id){const np={...plr,completedOnce:(plr.completedOnce||[]).filter(x=>x!==id)};setPlr(np);saveAll(tpl,comps,np);}

  function doFreeze(){
    const np={...plr,freezes:plr.freezes-1,usedFreeze:true};
    setPlr(np); saveAll(tpl,comps,np); setShowFreeze(false);
    afterComplete(comps,np);
  }
  function doBreakStreak(){const np={...plr,streak:0};setPlr(np);saveAll(tpl,comps,np);setShowFreeze(false);}

  function doAdd(){
    if(!newQ.name.trim())return;
    const id="t"+Date.now(),t={...newQ,id,name:newQ.name.trim()};
    const nt=[...tpl,t]; setTpl(nt); saveAll(nt,comps,plr);
    setNewQ({name:"",category:"sonstige",difficulty:"normal",emoji:"📋",frequency:"daily",repeatable:false});
    setShowAdd(false);
  }
  function doDelete(id){const nt=tpl.filter(t=>t.id!==id);setTpl(nt);saveAll(nt,comps,plr);}

  function moveQuest(i, dir) {
    const daily = tpl.filter(t=>t.frequency==="daily");
    const rest  = tpl.filter(t=>t.frequency!=="daily");
    const j = i + dir;
    if(j < 0 || j >= daily.length) return;
    const reordered = [...daily];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    const nt = [...reordered, ...rest];
    setTpl(nt); saveAll(nt, comps, plr);
  }

  function doExport(){
    const data=JSON.stringify({templates:tpl,completions:comps,player:plr},null,2);
    const blob=new Blob([data],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`shadow-quest-backup-${today}.json`;a.click();
  }
  function doImport(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(data.templates)setTpl(migTpl(data.templates));
        if(data.completions)setComps(data.completions);
        if(data.player)setPlr(mkPlayer(data.player));
        saveAll(data.templates||tpl,data.completions||comps,data.player||plr);
        alert("Import erfolgreich ✓");
      }catch{alert("Fehler beim Importieren.");}
    };
    reader.readAsText(file);
    e.target.value="";
  }

  function saveGoal(){
    const g=parseInt(goalInput);
    if(isNaN(g)||g<50)return;
    const np={...plr,weeklyGoal:g}; setPlr(np); saveAll(tpl,comps,np); setEditGoal(false);
  }

  // ── Sub-Components ───────────────────────────────────────────────────────────
  function NormalRow({t,done,onToggle,isWeekly=false}){
    const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,earned=d.xp+bon;
    return(<div className="tap" onClick={onToggle} style={{background:done?"rgba(12,17,30,.5)":"rgba(12,18,40,.95)",border:`1px solid ${done?"#0d1628":d.color+"38"}`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,opacity:done?.48:1,boxShadow:done?"none":`0 2px 16px ${d.color}12`,transition:"all .18s"}}>
      <div style={{fontSize:25,minWidth:40,textAlign:"center"}}>{t.emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:16,color:done?"#2d3f55":"#e2e8f0",textDecoration:done?"line-through":"none"}}>{t.name}</div>
        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
          <Tag color={(CATS[t.category]??CATS.sonstige).color} label={(CATS[t.category]??CATS.sonstige).label.toUpperCase()}/>
          <Tag color={d.color} label={d.label.toUpperCase()}/>
          {isWeekly&&<Tag color="#c084fc" label="📅 WEEKLY"/>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,minWidth:52}}>
        <XPLabel earned={earned} bon={bon} done={done} color={d.color}/>
        <Circle done={done} color={d.color}/>
      </div>
    </div>);
  }

  function RepeatRow({t}){
    const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,count=repCnt[t.id]||0,earned=d.xp+bon;
    return(<div style={{background:"rgba(12,18,40,.95)",border:`1px solid ${d.color}38`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,boxShadow:`0 2px 16px ${d.color}12`}}>
      <div style={{fontSize:25,minWidth:40,textAlign:"center"}}>{t.emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:16,color:"#e2e8f0"}}>{t.name}</div>
        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
          <Tag color={cat.color} label={cat.label.toUpperCase()}/>
          <Tag color={d.color} label={d.label.toUpperCase()}/>
          <Tag color="#fbbf24" label="🔁 REPEAT"/>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={e=>{e.stopPropagation();doUndo(t.id);}} disabled={count===0} style={{width:32,height:32,borderRadius:"50%",border:`1.5px solid ${count>0?"#475569":"#1a2540"}`,background:"transparent",color:count>0?"#94a3b8":"#2d3f55",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>−</button>
        <div style={{minWidth:44,textAlign:"center"}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:22,fontWeight:900,color:count>0?d.color:"#2d3f55",lineHeight:1}}>×{count}</div>
          {count>0&&<div style={{fontSize:9,color:"#3a4f6a",marginTop:2}}>{count*earned} XP</div>}
        </div>
        <button className="tap" onClick={e=>{e.stopPropagation();doComplete(t);}} style={{width:38,height:38,borderRadius:"50%",border:`2px solid ${d.color}`,background:d.color+"20",color:d.color,fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</button>
      </div>
    </div>);
  }

  function OnceRow({t}){
    const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,earned=d.xp+bon;
    return(<div className="tap" onClick={()=>doComplete(t)} style={{background:"rgba(12,18,40,.95)",border:`1px solid ${d.color}38`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,boxShadow:`0 2px 16px ${d.color}12`}}>
      <div style={{fontSize:25,minWidth:40,textAlign:"center"}}>{t.emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:16,color:"#e2e8f0"}}>{t.name}</div>
        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
          <Tag color={cat.color} label={cat.label.toUpperCase()}/>
          <Tag color={d.color} label={d.label.toUpperCase()}/>
          <Tag color="#fb923c" label="1× EINMALIG"/>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,minWidth:52}}>
        <XPLabel earned={earned} bon={bon} done={false} color={d.color}/>
        <div style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${d.color}55`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:d.color,fontSize:16}}>→</span></div>
      </div>
    </div>);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const goalPct = Math.min(100, Math.round((weekXP/(plr.weeklyGoal||500))*100));

  return(
    <div style={{minHeight:"100vh",background:"#060612",color:"#e2e8f0",maxWidth:480,margin:"0 auto",position:"relative",fontFamily:"'Rajdhani',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:#060612}
        @keyframes xpFloat{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}15%{opacity:1;transform:translate(-50%,-65%) scale(1.35)}65%{opacity:1;transform:translate(-50%,-85%) scale(1)}100%{opacity:0;transform:translate(-50%,-110%) scale(.85)}}
        @keyframes achSlide{0%{opacity:0;transform:translateY(60px)}15%{opacity:1;transform:translateY(0)}80%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-20px)}}
        @keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes glow{0%,100%{opacity:.7}50%{opacity:1}}
        .tap:active{transform:scale(.96);opacity:.85}.tab-btn{transition:color .15s,border-color .15s}.modal-sheet{animation:slideUp .22s ease}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
        input{outline:none}input::placeholder{color:#334155}button{cursor:pointer}
      `}</style>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",background:"radial-gradient(ellipse at 12% 88%,rgba(56,189,248,.06) 0%,transparent 50%),radial-gradient(ellipse at 88% 12%,rgba(192,132,252,.06) 0%,transparent 50%)"}}/>

      {/* XP Flash */}
      {flash&&<div key={flash.key} style={{position:"fixed",top:"50%",left:"50%",zIndex:9999,pointerEvents:"none",animation:"xpFloat 1.5s ease-out forwards",fontFamily:"'Orbitron',monospace",fontSize:32,fontWeight:900,color:"#38bdf8",textShadow:"0 0 18px #38bdf8,0 0 40px #38bdf870",letterSpacing:2,whiteSpace:"nowrap"}} onAnimationEnd={()=>setFlash(null)}>+{flash.xp} XP</div>}

      {/* Achievement Flash */}
      {achFlash&&(()=>{const tc=achFlash.tier?TIER_COLORS[achFlash.newLevel]:"#fbbf24",te=achFlash.tier?TIER_EMOJI[achFlash.newLevel]:"";return(
        <div key={achFlash.key} style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:9998,animation:"achSlide 3s ease-out forwards",background:"linear-gradient(135deg,rgba(15,20,40,.98),rgba(20,25,50,.98))",border:`1px solid ${tc}80`,borderRadius:16,padding:"14px 22px",display:"flex",alignItems:"center",gap:12,boxShadow:`0 0 30px ${tc}40`,whiteSpace:"nowrap"}} onAnimationEnd={()=>setAchFlash(null)}>
          <div style={{fontSize:28}}>{achFlash.ach.emoji}</div>
          <div>
            <div style={{fontSize:9,color:tc,letterSpacing:2,fontFamily:"'Orbitron',monospace",fontWeight:700}}>{achFlash.tier?`${te} ${achFlash.tier.label.toUpperCase()} UNLOCKED`:"ACHIEVEMENT UNLOCKED"}</div>
            <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginTop:2}}>{achFlash.ach.title}</div>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>{achFlash.tier?achFlash.tier.desc:achFlash.ach.desc}</div>
          </div>
        </div>
      );})()}

      {/* Note Input */}
      {pendingNote&&<div style={{position:"fixed",bottom:80,left:0,right:0,zIndex:300,maxWidth:480,margin:"0 auto",padding:"0 16px",animation:"slideUp .2s ease"}}>
        <div style={{background:"#0f172a",border:"1px solid rgba(56,189,248,.3)",borderRadius:14,padding:"12px 14px",display:"flex",gap:10,alignItems:"center",boxShadow:"0 0 20px rgba(0,0,0,.5)"}}>
          <span style={{fontSize:16}}>📝</span>
          <input value={noteText} onChange={e=>setNoteText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")doSaveNote();if(e.key==="Escape"){setPendingNote(null);setNoteText("");}}}
            placeholder="Notiz hinzufügen... (optional)" autoFocus
            style={{flex:1,background:"transparent",border:"none",color:"#e2e8f0",fontSize:14,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}/>
          <button onClick={doSaveNote} disabled={!noteText.trim()} style={{background:"rgba(56,189,248,.2)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif"}}>OK</button>
          <button onClick={()=>{setPendingNote(null);setNoteText("");}} style={{background:"none",border:"none",color:"#334155",fontSize:18,lineHeight:1}}>✕</button>
        </div>
      </div>}

      {/* Freeze Prompt */}
      {showFreeze&&<div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 20px"}}>
        <div style={{background:"#0a0f1e",border:"1px solid rgba(56,189,248,.3)",borderRadius:20,padding:"30px 24px",maxWidth:360,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>❄️</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:14,color:"#38bdf8",letterSpacing:2,marginBottom:8}}>STREAK IN GEFAHR</div>
          <div style={{fontSize:14,color:"#94a3b8",marginBottom:6}}>Du hast gestern keine Quest erledigt.</div>
          <div style={{fontSize:13,color:"#475569",marginBottom:24}}>Streak-Freeze einsetzen um deinen <span style={{color:"#fbbf24",fontWeight:700}}>{plr.streak}-Tage Streak</span> zu retten?</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={doBreakStreak} style={{flex:1,padding:"12px",borderRadius:11,border:"1px solid #1e293b",background:"transparent",color:"#475569",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13}}>Streak verlieren</button>
            <button onClick={doFreeze} style={{flex:1,padding:"12px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#1d4ed8,#38bdf8)",color:"#fff",fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:11,letterSpacing:1}}>❄️ FREEZE ({plr.freezes})</button>
          </div>
        </div>
      </div>}

      {/* HEADER */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(6,6,18,.97)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(56,189,248,.12)",padding:"16px 18px 0",paddingTop:"max(16px,calc(env(safe-area-inset-top,0px) + 16px))"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:48,height:48,borderRadius:13,border:`2px solid ${rank.color}`,background:`${rank.color}0a`,boxShadow:`0 0 18px ${rank.color}50,inset 0 0 12px ${rank.color}10`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace",fontSize:22,fontWeight:900,color:rank.color,flexShrink:0,animation:"glow 3s ease infinite"}}>{rank.rank}</div>
            <div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:700,letterSpacing:1}}>{plr.name}</div>
              <div style={{fontSize:11,color:rank.color,fontWeight:600,letterSpacing:.5,marginTop:2,animation:"shimmer 2.5s ease infinite"}}>{rank.title} · LV.{lv.level}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {plr.freezes>0&&<div style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.2)",borderRadius:10,padding:"6px 10px",textAlign:"center"}}>
              <div style={{fontSize:14}}>❄️</div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:"#38bdf8",lineHeight:1}}>{plr.freezes}</div>
            </div>}
            <div style={{background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.22)",borderRadius:12,padding:"8px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:17}}>🔥</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:700,color:"#fbbf24",lineHeight:1}}>{plr.streak}</span>
              <span style={{fontSize:8,color:"#78350f",letterSpacing:1,fontWeight:700}}>STREAK</span>
            </div>
          </div>
        </div>
        <div style={{marginBottom:4}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#38bdf8",letterSpacing:1}}>XP {lv.inLvl.toLocaleString()} / {lv.forNext.toLocaleString()}</span>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#1e293b"}}>{totalXP.toLocaleString()} TOTAL</span>
          </div>
          <div style={{height:5,background:"#0a1020",borderRadius:3,border:"1px solid #1a2540",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${lv.pct}%`,background:"linear-gradient(90deg,#1d4ed8,#38bdf8,#7dd3fc)",boxShadow:"0 0 12px #38bdf8",borderRadius:3,transition:"width .9s cubic-bezier(.4,0,.2,1)"}}/>
          </div>
        </div>
        <div style={{display:"flex",marginTop:14}}>
          {[{id:"today",l:"TODAY",i:"⚔️"},{id:"week",l:"WOCHE",i:"📅"},{id:"month",l:"MONAT",i:"📆"},{id:"quests",l:"QUESTS",i:"📋"},{id:"profil",l:"PROFIL",i:"🏆"}].map(({id,l,i})=>(
            <button key={id} className="tab-btn" onClick={()=>setTab(id)} style={{flex:1,padding:"10px 0 8px",border:"none",background:"transparent",borderBottom:`2px solid ${tab===id?"#38bdf8":"transparent"}`,color:tab===id?"#38bdf8":"#2d3f55",fontSize:9,fontWeight:700,letterSpacing:1,fontFamily:"'Rajdhani',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:15}}>{i}</span>{l}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"18px 16px 90px",position:"relative",zIndex:1}}>

        {/* ═══ TODAY ═══════════════════════════════════════════════════════════ */}
        {tab==="today"&&<>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {[{v:todayXP,l:"XP HEUTE",c:"#38bdf8"},{v:totalDone,l:"ERLEDIGT",c:"#c084fc"},{v:progress+"%",l:"PROGRESS",c:"#4ade80"}].map(({v,l,c})=>(
              <div key={l} style={{flex:1,background:`${c}09`,border:`1px solid ${c}28`,borderRadius:12,padding:"12px 6px",textAlign:"center"}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:20,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:9,color:"#3a4f6a",letterSpacing:.5,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          {allDone&&<div style={{background:"linear-gradient(135deg,rgba(56,189,248,.1),rgba(192,132,252,.1))",border:"1px solid rgba(56,189,248,.38)",borderRadius:14,padding:"14px 18px",marginBottom:18,textAlign:"center",animation:"slideUp .4s ease"}}>
            <div style={{fontSize:24}}>🏆</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:"#38bdf8",letterSpacing:2,marginTop:5}}>ALL QUESTS COMPLETE!</div>
          </div>}
          {weeklyQ.length>0&&<>
            <SecHead label="WEEKLY CHALLENGES" color="#c084fc" count={`${weeklyDone}/${weeklyQ.length}`} sub={`Reset ${(()=>{const t=new Date(),o=(t.getDay()+6)%7,m=new Date(t);m.setDate(t.getDate()-o+7);return m.toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"});})()}`} onAdd={()=>setShowAdd(true)} btnColor="#c084fc"/>
            {weeklyQ.map(t=><NormalRow key={t.id} t={t} done={wkDoneIds.has(t.id)} onToggle={()=>wkDoneIds.has(t.id)?doUndo(t.id,true):doComplete(t)} isWeekly/>)}
            <HR/>
          </>}
          {onceActive.length>0&&<>
            <SecHead label="EINMALIG" color="#fb923c" count={`${onceDone}/${onceQ.length}`} sub="einmalig erledigen" onAdd={()=>setShowAdd(true)} btnColor="#fb923c"/>
            {onceActive.map(t=><OnceRow key={t.id} t={t}/>)}
            <HR/>
          </>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2}}>DAILY QUESTS</div>
                <div style={{fontSize:9,color:"#38bdf8",background:"rgba(56,189,248,.15)",border:"1px solid rgba(56,189,248,.3)",borderRadius:20,padding:"2px 8px",fontWeight:700}}>{dailyDone}/{dailyTotal}</div>
              </div>
              <div style={{fontSize:11,color:"#2d3f55",marginTop:2}}>{new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              {reorderMode
                ?<button onClick={()=>setReorderMode(false)} style={{background:"linear-gradient(135deg,rgba(56,189,248,.2),rgba(56,189,248,.1))",border:"1px solid rgba(56,189,248,.6)",color:"#38bdf8",borderRadius:9,padding:"8px 14px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>✓ FERTIG</button>
                :<>
                  <button onClick={()=>setReorderMode(true)} style={{background:"rgba(71,85,105,.15)",border:"1px solid rgba(71,85,105,.35)",color:"#64748b",borderRadius:9,padding:"8px 10px",fontSize:15,lineHeight:1}} title="Reihenfolge ändern">⇅</button>
                  <button onClick={()=>setShowAdd(true)} style={{background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:9,padding:"8px 15px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ QUEST</button>
                </>
              }
            </div>
          </div>
          {reorderMode&&<div style={{fontSize:10,color:"#334155",textAlign:"center",marginBottom:10,letterSpacing:.5}}>Quests per Drag & Drop sortieren</div>}
          {dailyQ.length===0?<EmptyState/>:dailyQ.filter(t=>t.frequency==="daily").map((t,i,arr)=>(
            <div key={t.id} style={{position:"relative",display:"flex",alignItems:"center",gap:0}}>
              {reorderMode&&<div style={{display:"flex",flexDirection:"column",gap:3,marginRight:8,flexShrink:0}}>
                <button onClick={()=>moveQuest(i,-1)} disabled={i===0}
                  style={{width:28,height:28,borderRadius:7,border:"1px solid rgba(56,189,248,.3)",background:"rgba(56,189,248,.08)",color:i===0?"#1e2840":"#38bdf8",fontSize:13,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▲</button>
                <button onClick={()=>moveQuest(i,1)} disabled={i===arr.length-1}
                  style={{width:28,height:28,borderRadius:7,border:"1px solid rgba(56,189,248,.3)",background:"rgba(56,189,248,.08)",color:i===arr.length-1?"#1e2840":"#38bdf8",fontSize:13,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▼</button>
              </div>}
              <div style={{flex:1}}>
                {t.repeatable?<RepeatRow t={t}/>:<NormalRow t={t} done={doneIds.has(t.id)} onToggle={()=>!reorderMode&&(doneIds.has(t.id)?doUndo(t.id):doComplete(t))}/>}
              </div>
            </div>
          ))}
        </>}

        {/* ═══ WEEK ════════════════════════════════════════════════════════════ */}
        {tab==="week"&&<>
          {/* Week navigation */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button onClick={()=>setWeekOffset(o=>o-1)} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.2)",color:"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1}}>‹</button>
            <div style={{textAlign:"center",flex:1,padding:"0 8px"}}>
              {weekOffset===0
                ?<div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:"#38bdf8",letterSpacing:2}}>AKTUELLE WOCHE</div>
                :<div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#64748b",letterSpacing:1}}>{wkLabel.label}</div>
              }
            </div>
            <button onClick={()=>setWeekOffset(o=>o+1)} disabled={weekOffset>=0} style={{background:weekOffset>=0?"transparent":"rgba(56,189,248,.08)",border:`1px solid ${weekOffset>=0?"#0d1628":"rgba(56,189,248,.2)"}`,color:weekOffset>=0?"#1a2840":"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1,cursor:weekOffset>=0?"default":"pointer"}}>›</button>
          </div>

          {/* Wochenziel */}
          <div style={{background:"rgba(56,189,248,.06)",border:"1px solid rgba(56,189,248,.18)",borderRadius:14,padding:"16px 18px",marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:"#38bdf8",letterSpacing:2}}>WOCHENZIEL</div>
                <div style={{fontSize:12,color:"#2d3f55",marginTop:2}}>{weekXP.toLocaleString()} / {(plr.weeklyGoal||500).toLocaleString()} XP</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:28,fontWeight:900,color:goalPct>=100?"#4ade80":"#38bdf8"}}>{goalPct}%</div>
                {editGoal
                  ?<div style={{display:"flex",gap:6,marginTop:4}}>
                    <input value={goalInput} onChange={e=>setGoalInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveGoal();if(e.key==="Escape")setEditGoal(false);}} autoFocus placeholder="500" style={{width:70,background:"#111929",border:"1px solid #38bdf8",borderRadius:8,padding:"4px 8px",color:"#38bdf8",fontSize:13,fontFamily:"'Orbitron',monospace",textAlign:"center"}}/>
                    <button onClick={saveGoal} style={{background:"rgba(56,189,248,.2)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:7,padding:"4px 8px",fontSize:10,fontWeight:700,fontFamily:"'Rajdhani',sans-serif"}}>OK</button>
                  </div>
                  :<button onClick={()=>{setGoalInput(String(plr.weeklyGoal||500));setEditGoal(true);}} style={{background:"none",border:"none",color:"#2d3f55",fontSize:10,fontFamily:"'Rajdhani',sans-serif",padding:0,marginTop:2}}>✏️ Ziel ändern</button>
                }
              </div>
            </div>
            <div style={{height:6,background:"#0a1020",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${goalPct}%`,background:goalPct>=100?"linear-gradient(90deg,#16a34a,#4ade80)":"linear-gradient(90deg,#1d4ed8,#38bdf8)",boxShadow:goalPct>=100?"0 0 10px #4ade80":"0 0 10px #38bdf8",borderRadius:3,transition:"width .8s cubic-bezier(.4,0,.2,1)"}}/>
            </div>
          </div>

          {(()=>{const mx=Math.max(1,...weekData.map(d=>d.xp));return<>
            <div style={{display:"flex",gap:6,alignItems:"flex-end",height:110,marginBottom:7}}>
              {weekData.map((d)=>{const isT=d.date===today,h=d.xp>0?Math.max(8,(d.xp/mx)*100):3;return(
                <div key={d.date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  {d.xp>0&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:8,color:isT?"#38bdf8":"#475569"}}>{d.xp}</div>}
                  <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end"}}>
                    <div style={{width:"100%",minHeight:3,height:`${h}%`,background:isT?"linear-gradient(180deg,#7dd3fc,#1d4ed8)":d.xp>0?"linear-gradient(180deg,#2d4060,#1a2840)":"#0d1628",borderRadius:"5px 5px 3px 3px",boxShadow:isT?"0 0 14px #38bdf880":"none",transition:"height .5s"}}/>
                  </div>
                </div>);})}
            </div>
            <div style={{display:"flex",gap:6}}>{DAYS_DE.map((l,i)=><div key={l} style={{flex:1,textAlign:"center",fontSize:10,fontWeight:700,letterSpacing:.5,color:weekData[i]?.date===today?"#38bdf8":"#2d3f55",fontFamily:"'Rajdhani',sans-serif"}}>{l}</div>)}</div>
          </>})()}
          <div style={{marginTop:22}}>
            {weekData.filter(d=>d.list.length>0).reverse().map(d=>(
              <div key={d.date} style={{background:"rgba(12,18,35,.85)",border:"1px solid #1a2840",borderRadius:13,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:700,color:d.date===today?"#38bdf8":"#94a3b8"}}>{new Date(d.date+"T12:00").toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"short"})}{d.date===today&&<span style={{marginLeft:7,fontSize:8,color:"#38bdf8",letterSpacing:1}}>● HEUTE</span>}</div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#38bdf8",fontWeight:700}}>{d.xp} XP</div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {d.list.map(c=><div key={c.id}>
                    <span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:(DIFF[c.difficulty]?.color)+"15",color:DIFF[c.difficulty]?.color,fontWeight:600}}>{c.emoji} {c.name}</span>
                    {c.note&&<span style={{fontSize:10,color:"#475569",marginLeft:4}}>💬 {c.note}</span>}
                  </div>)}
                </div>
              </div>
            ))}
            {weekData.every(d=>d.list.length===0)&&<div style={{textAlign:"center",padding:44,color:"#1a2840",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2}}>KEINE DATEN</div>}
          </div>
        </>}

        {/* ═══ MONTH ═══════════════════════════════════════════════════════════ */}
        {tab==="month"&&<>
          {/* Month navigation */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button onClick={()=>setMonthOffset(o=>o-1)} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.2)",color:"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1}}>‹</button>
            <div style={{textAlign:"center",flex:1,padding:"0 8px"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:monthOffset===0?11:10,color:monthOffset===0?"#38bdf8":"#64748b",letterSpacing:2}}>{MONTHS_DE[mLabel.month].toUpperCase()} {mLabel.year}</div>
              {monthOffset===0&&<div style={{fontSize:9,color:"#2d3f55",letterSpacing:1,marginTop:2}}>AKTUELLER MONAT</div>}
            </div>
            <button onClick={()=>setMonthOffset(o=>o+1)} disabled={monthOffset>=0} style={{background:monthOffset>=0?"transparent":"rgba(56,189,248,.08)",border:`1px solid ${monthOffset>=0?"#0d1628":"rgba(56,189,248,.2)"}`,color:monthOffset>=0?"#1a2840":"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1,cursor:monthOffset>=0?"default":"pointer"}}>›</button>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {[{v:monXP.toLocaleString(),l:"XP MONAT",c:"#38bdf8"},{v:monCnt,l:"QUESTS",c:"#c084fc"},{v:actDays,l:"AKTIV TAGE",c:"#4ade80"}].map(({v,l,c})=>(
              <div key={l} style={{flex:1,background:`${c}09`,border:`1px solid ${c}28`,borderRadius:12,padding:"12px 6px",textAlign:"center"}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:19,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:8,color:"#3a4f6a",letterSpacing:.5,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{background:"rgba(8,14,30,.92)",border:"1px solid #1a2840",borderRadius:18,padding:"18px 14px",marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:8}}>{DAYS_DE.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:"#2d3f55",fontWeight:700}}>{d}</div>)}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
              {monArr.map((d,i)=>{
                if(!d)return<div key={"p"+i} style={{aspectRatio:"1"}}/>;
                const xp=xpDay[d]||0,it=xp>0?Math.min(1,xp/120):0,isT=d===today,day=parseInt(d.split("-")[2]);
                return(<div key={d} onClick={()=>xp>0&&setSelectedDay(d)} style={{aspectRatio:"1",borderRadius:8,background:xp>0?`rgba(56,189,248,${.07+it*.55})`:"rgba(255,255,255,.018)",border:`1px solid ${isT?"#38bdf8":xp>0?"rgba(56,189,248,.22)":"transparent"}`,boxShadow:isT?"0 0 12px #38bdf845":"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:2,cursor:xp>0?"pointer":"default"}}>
                  <div style={{fontSize:10,color:isT?"#38bdf8":xp>0?"#94a3b8":"#2d3f55",fontWeight:isT?700:400}}>{day}</div>
                  {xp>0&&<div style={{fontSize:6,color:"#38bdf8",fontFamily:"'Orbitron',monospace",lineHeight:1,marginTop:1}}>{xp}</div>}
                </div>);
              })}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,justifyContent:"center"}}>
            <span style={{fontSize:9,color:"#2d3f55"}}>0 XP</span>
            {[.07,.18,.32,.48,.65].map((v,i)=><div key={i} style={{width:15,height:15,borderRadius:5,background:`rgba(56,189,248,${v})`}}/>)}
            <span style={{fontSize:9,color:"#2d3f55"}}>max</span>
          </div>
        </>}

        {/* ═══ QUESTS ══════════════════════════════════════════════════════════ */}
        {tab==="quests"&&<>

          {/* Templates */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2}}>TEMPLATES</div>
              <div style={{fontSize:11,color:"#2d3f55",marginTop:3}}>{dailyQ.length} daily · {weeklyQ.length} weekly · {onceQ.length} einmalig</div>
            </div>
            <button onClick={()=>setShowAdd(true)} style={{background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:9,padding:"8px 15px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ NEW</button>
          </div>

          {dailyQ.length>0&&<>
            <div style={{fontSize:9,color:"#38bdf8",letterSpacing:2,fontWeight:700,marginBottom:10,fontFamily:"'Orbitron',monospace"}}>⚔️ DAILY</div>
            {(tplSort==="alpha"?[...dailyQ].sort((a,b)=>a.name.localeCompare(b.name)):dailyQ).map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige;return(
              <TplRow key={t.id} t={t} d={d} cat={cat} onDelete={()=>doDelete(t.id)} onEdit={()=>openEdit(t)} extra={t.repeatable&&<Tag color="#fbbf24" label="🔁 REPEAT"/>}/>
            );})}
          </>}
          {weeklyQ.length>0&&<>
            <div style={{fontSize:9,color:"#c084fc",letterSpacing:2,fontWeight:700,margin:"16px 0 10px",fontFamily:"'Orbitron',monospace"}}>📅 WEEKLY</div>
            {(tplSort==="alpha"?[...weeklyQ].sort((a,b)=>a.name.localeCompare(b.name)):weeklyQ).map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige;return(<TplRow key={t.id} t={t} d={d} cat={cat} onDelete={()=>doDelete(t.id)} onEdit={()=>openEdit(t)}/>);})}
          </>}
          {onceQ.length>0&&<>
            <div style={{fontSize:9,color:"#fb923c",letterSpacing:2,fontWeight:700,margin:"16px 0 10px",fontFamily:"'Orbitron',monospace"}}>✅ EINMALIG</div>
            {(tplSort==="alpha"?[...onceQ].sort((a,b)=>a.name.localeCompare(b.name)):onceQ).map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,done=(plr.completedOnce||[]).includes(t.id);return(
              <TplRow key={t.id} t={t} d={d} cat={cat} onDelete={()=>doDelete(t.id)} onEdit={()=>openEdit(t)} done={done}
                extra={<Tag color={done?"#4ade80":"#fb923c"} label={done?"✓ ERLEDIGT":"1× EINMALIG"}/>}
                onReset={done?()=>doResetOnce(t.id):null}/>
            );})}
          </>}
          {tpl.length===0&&<div style={{textAlign:"center",padding:44,color:"#1a2840",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2}}>NO TEMPLATES</div>}
        </>}

        {/* ═══ PROFIL ═══════════════════════════════════════════════════════════ */}
        {tab==="profil"&&<>

          {/* Achievements */}
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#fbbf24",letterSpacing:2}}>ACHIEVEMENTS</div>
              <div style={{fontSize:11,color:"#2d3f55"}}>{migAchs(plr.achievements||[]).length}/{ACHIEVEMENTS.length + ACHIEVEMENTS.filter(a=>a.tiers).length*2} Stufen erreicht</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {ACHIEVEMENTS.map(a=>{
                if(a.tiers){
                  const plrAchs=migAchs(plr.achievements||[]);
                  const curLevel=getAchLevel(plrAchs,a.id);
                  const nextTier=a.tiers.find(t=>t.level>curLevel);
                  const curTier=a.tiers.find(t=>t.level===curLevel);
                  const tc=curLevel>0?TIER_COLORS[curLevel]:"#1e2840";
                  const te=curLevel>0?TIER_EMOJI[curLevel]:"";
                  return(
                    <div key={a.id} style={{background:curLevel>0?`${tc}10`:"rgba(255,255,255,.02)",border:`1px solid ${curLevel>0?tc+"50":"#1e2840"}`,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
                      <div style={{fontSize:24}}>{a.emoji}</div>
                      {curLevel>0&&<div style={{fontSize:13,marginTop:2}}>{te}</div>}
                      <div style={{fontSize:11,fontWeight:700,color:curLevel>0?tc:"#64748b",marginTop:4,lineHeight:1.3}}>{a.title}</div>
                      {curTier
                        ?<div style={{fontSize:10,color:"#94a3b8",marginTop:3,lineHeight:1.4}}>{curTier.label}: {curTier.desc}</div>
                        :<div style={{fontSize:10,color:"#475569",marginTop:3,lineHeight:1.4,opacity:.6}}>{a.tiers[0].desc}</div>
                      }
                      {nextTier&&curLevel>0&&<div style={{fontSize:9,color:"#334155",marginTop:3}}>▶ {nextTier.label}: {nextTier.desc}</div>}
                      <div style={{display:"flex",justifyContent:"center",gap:3,marginTop:6}}>
                        {a.tiers.map(t=><div key={t.level} style={{width:8,height:8,borderRadius:"50%",background:t.level<=curLevel?TIER_COLORS[t.level]:"#1e2840"}}/>)}
                      </div>
                    </div>
                  );
                } else {
                  const done=migAchs(plr.achievements||[]).some(x=>x.id===a.id);
                  return(
                    <div key={a.id} style={{background:done?"rgba(251,191,36,.08)":"rgba(255,255,255,.025)",border:`1px solid ${done?"rgba(251,191,36,.35)":"#1e2840"}`,borderRadius:12,padding:"12px 8px",textAlign:"center",opacity:done?1:.55}}>
                      <div style={{fontSize:24}}>{a.emoji}</div>
                      {done&&<div style={{fontSize:13,marginTop:2}}>✓</div>}
                      <div style={{fontSize:11,fontWeight:700,color:done?"#fbbf24":"#64748b",marginTop:4,lineHeight:1.3}}>{a.title}</div>
                      <div style={{fontSize:10,color:done?"#94a3b8":"#475569",marginTop:4,lineHeight:1.4}}>{a.desc}</div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
          <HR/>

          {/* Stats */}
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2,marginBottom:12}}>STATISTIKEN</div>
            {(()=>{
              const topCatEntry=Object.entries(Object.fromEntries(Object.keys(CATS).map(k=>[k,comps.filter(c=>c.category===k).length]))).sort((a,b)=>b[1]-a[1])[0];
              const activeDaysTotal=new Set(comps.map(c=>c.date)).size;
              const avgXP=activeDaysTotal>0?Math.round(totalXP/activeDaysTotal):0;
              return(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {l:"Gesamt Quests",v:comps.length,c:"#38bdf8"},
                    {l:"Gesamt XP",v:totalXP.toLocaleString(),c:"#c084fc"},
                    {l:"Ø XP / Aktivtag",v:avgXP,c:"#4ade80"},
                    {l:"Top Kategorie",v:topCatEntry&&topCatEntry[1]>0?`${CATS[topCatEntry[0]]?.emoji} ${CATS[topCatEntry[0]]?.label}`:"-",c:"#fbbf24"},
                  ].map(({l,v,c})=>(
                    <div key={l} style={{background:`${c}09`,border:`1px solid ${c}22`,borderRadius:12,padding:"12px 14px"}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:17,fontWeight:900,color:c}}>{v}</div>
                      <div style={{fontSize:11,color:"#475569",marginTop:4}}>{l}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          <HR/>

          {/* Export / Import */}
          <div style={{marginBottom:20}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2,marginBottom:10}}>DATEN</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={doExport} style={{flex:1,padding:"12px",borderRadius:11,border:"1px solid rgba(56,189,248,.4)",background:"rgba(56,189,248,.08)",color:"#38bdf8",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13}}>⬇ Export JSON</button>
              <label style={{flex:1,padding:"12px",borderRadius:11,border:"1px solid rgba(192,132,252,.4)",background:"rgba(192,132,252,.08)",color:"#c084fc",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,textAlign:"center",cursor:"pointer"}}>
                ⬆ Import JSON
                <input type="file" accept=".json" onChange={doImport} style={{display:"none"}}/>
              </label>
            </div>
          </div>
          <HR/>

        </>}
      </div>

      {/* Day Detail Overlay */}
      {selectedDay&&(()=>{
        const dayComps=comps.filter(c=>c.date===selectedDay);
        const dayXP=dayComps.reduce((s,c)=>s+c.earnedXp,0);
        const label=new Date(selectedDay+"T12:00").toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
        return(
          <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",display:"flex",alignItems:"flex-end"}} onClick={()=>setSelectedDay(null)}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#080d1c",borderRadius:"22px 22px 0 0",border:"1px solid #1a2840",borderBottom:"none",padding:"22px 18px 44px",animation:"slideUp .2s ease"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
                <div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#38bdf8",letterSpacing:2,marginBottom:4}}>{label.toUpperCase()}</div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:26,fontWeight:900,color:"#38bdf8"}}>{dayXP} <span style={{fontSize:12}}>XP</span></div>
                  <div style={{fontSize:11,color:"#475569",marginTop:2}}>{dayComps.length} Quests abgeschlossen</div>
                </div>
                <button onClick={()=>setSelectedDay(null)} style={{background:"none",border:"none",color:"#475569",fontSize:22,lineHeight:1,padding:"4px"}}>✕</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"50vh",overflowY:"auto"}}>
                {dayComps.map(c=>{const d=DIFF[c.difficulty],cat=CATS[c.category]??CATS.sonstige;return(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(12,18,40,.9)",border:"1px solid #1a2840",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontSize:22}}>{c.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{c.name}</div>
                      <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                        <Tag color={cat.color} label={cat.label.toUpperCase()}/>
                        <Tag color={d.color} label={d.label.toUpperCase()}/>
                      </div>
                      {c.note&&<div style={{fontSize:11,color:"#64748b",marginTop:5}}>💬 {c.note}</div>}
                    </div>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,color:d.color,flexShrink:0}}>+{c.earnedXp}</div>
                  </div>
                );})}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ADD MODAL */}
      {showAdd&&<div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.88)",backdropFilter:"blur(12px)",display:"flex",alignItems:"flex-end"}} onClick={e=>{if(e.target===e.currentTarget){setShowAdd(false);setEditingId(null);}}}>
        <div className="modal-sheet" style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#080d1c",borderRadius:"24px 24px 0 0",border:"1px solid #1a2840",borderBottom:"none",padding:"24px 18px 48px",paddingBottom:"max(48px,env(safe-area-inset-bottom,48px))"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#38bdf8",letterSpacing:2}}>{editingId?"QUEST BEARBEITEN":"ADD QUEST"}</div>
            <button onClick={()=>{setShowAdd(false);setEditingId(null);}} style={{background:"none",border:"none",color:"#475569",fontSize:22,padding:"0 4px",lineHeight:1}}>✕</button>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>QUEST NAME</div>
            <input value={newQ.name} onChange={e=>setNewQ(q=>({...q,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doAdd()} placeholder="z.B. Wickeln" autoFocus style={{width:"100%",background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"13px 15px",color:"#e2e8f0",fontSize:16,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>ICON</div>
            <input value={newQ.emoji} onChange={e=>setNewQ(q=>({...q,emoji:e.target.value}))} style={{width:58,background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"10px",color:"#e2e8f0",fontSize:22,textAlign:"center"}}/>
          </div>
          <div style={{marginBottom:newQ.frequency==="daily"?10:16}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>HÄUFIGKEIT</div>
            <div style={{display:"flex",gap:8}}>
              {[{k:"daily",l:"🔄",sub:"TÄGLICH",c:"#38bdf8"},{k:"weekly",l:"📅",sub:"WÖCHENTLICH",c:"#c084fc"},{k:"once",l:"✅",sub:"EINMALIG",c:"#fb923c"}].map(({k,l,sub,c})=>(
                <button key={k} onClick={()=>setNewQ(q=>({...q,frequency:k,repeatable:k==="daily"?q.repeatable:false}))} style={{flex:1,padding:"12px 4px",borderRadius:11,border:`1px solid ${newQ.frequency===k?c:"#1e2f48"}`,background:newQ.frequency===k?c+"16":"transparent",color:newQ.frequency===k?c:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>
                  <div style={{fontSize:18}}>{l}</div><div style={{fontSize:10,marginTop:2}}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
          {newQ.frequency==="daily"&&<div style={{marginBottom:14,background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.2)",borderRadius:11,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>🔁 Mehrfach täglich</div>
              <div style={{fontSize:11,color:"#3a4f6a",marginTop:1}}>Jeder Tap zählt (z.B. Wickeln)</div>
            </div>
            <div onClick={()=>setNewQ(q=>({...q,repeatable:!q.repeatable}))} style={{width:48,height:28,borderRadius:14,cursor:"pointer",background:newQ.repeatable?"#fbbf24":"#111929",border:`1px solid ${newQ.repeatable?"#fbbf24":"#1e2f48"}`,position:"relative",transition:"background .2s",flexShrink:0}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:newQ.repeatable?25:4,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
            </div>
          </div>}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>KATEGORIE</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.entries(CATS).map(([k,v])=>(
                <button key={k} onClick={()=>setNewQ(q=>({...q,category:k}))} style={{padding:"7px 12px",borderRadius:9,fontSize:11,fontWeight:700,border:`1px solid ${newQ.category===k?v.color:"#1e2f48"}`,background:newQ.category===k?v.color+"16":"transparent",color:newQ.category===k?v.color:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif"}}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>SCHWIERIGKEIT</div>
            <div style={{display:"flex",gap:8}}>
              {Object.entries(DIFF).map(([k,v])=>(
                <button key={k} onClick={()=>setNewQ(q=>({...q,difficulty:k}))} style={{flex:1,padding:"12px 0",borderRadius:11,border:`1px solid ${newQ.difficulty===k?v.color:"#1e2f48"}`,background:newQ.difficulty===k?v.color+"16":"transparent",color:newQ.difficulty===k?v.color:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>
                  <div style={{fontSize:12}}>{v.label}</div><div style={{fontSize:10,opacity:.6}}>{v.xp} XP</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={doSaveQuest} disabled={!newQ.name.trim()} style={{width:"100%",padding:"16px",borderRadius:13,border:"none",background:newQ.name.trim()?"linear-gradient(135deg,#1d4ed8,#38bdf8)":"#111929",color:newQ.name.trim()?"#fff":"#2d3f55",fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,letterSpacing:2,boxShadow:newQ.name.trim()?"0 4px 24px rgba(56,189,248,.25)":"none",transition:"all .2s"}}>
            {editingId?"ÄNDERUNGEN SPEICHERN":"QUEST HINZUFÜGEN"}
          </button>
        </div>
      </div>}
    </div>
  );
}

// ─── Micro Components ─────────────────────────────────────────────────────────
function Tag({color,label}){return<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color,background:color+"15"}}>{label}</span>;}
function XPLabel({earned,bon,done,color}){return<><div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:done?"#2d3f55":color}}>+{earned}<span style={{fontSize:8}}>XP</span></div>{bon>0&&!done&&<div style={{fontSize:9,color:"#fbbf24"}}>🔥+{bon}</div>}</>;}
function Circle({done,color}){return<div style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${done?"#1a2540":color+"55"}`,background:done?color+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{done&&<span style={{color,fontSize:15,fontWeight:700}}>✓</span>}</div>;}
function SecHead({label,color,count,sub,onAdd,btnColor}){return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
  <div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color,letterSpacing:2}}>{label}</div><div style={{fontSize:9,color,background:color+"20",border:`1px solid ${color}50`,borderRadius:20,padding:"2px 8px",fontWeight:700}}>{count}</div></div><div style={{fontSize:11,color:"#2d3f55",marginTop:2}}>{sub}</div></div>
  <button onClick={onAdd} style={{background:btnColor+"18",border:`1px solid ${btnColor}`,color:btnColor,borderRadius:9,padding:"8px 14px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ QUEST</button>
</div>;}
function HR(){return<div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(56,189,248,.12),transparent)",margin:"6px 0 18px"}}/>;}
function EmptyState(){return<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40}}>⚔️</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#1a2540",marginTop:12,letterSpacing:2}}>NO ACTIVE QUESTS</div></div>;}
function TplRow({t,d,cat,onDelete,onEdit,done=false,extra,onReset}){return(
  <div style={{background:"rgba(12,18,40,.9)",border:`1px solid ${done?"rgba(74,222,128,.15)":"#1a2840"}`,borderRadius:13,padding:"13px 15px",marginBottom:10,display:"flex",alignItems:"center",gap:12,opacity:done?.65:1}}>
    <div style={{fontSize:22}}>{t.emoji}</div>
    <div style={{flex:1}}>
      <div style={{fontWeight:700,fontSize:15,color:done?"#475569":"#e2e8f0",textDecoration:done?"line-through":"none"}}>{t.name}</div>
      <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
        <Tag color={cat.color} label={cat.label.toUpperCase()}/>
        <Tag color={d.color} label={`${d.label.toUpperCase()} · ${d.xp} XP`}/>
        {extra}
      </div>
    </div>
    <div style={{display:"flex",gap:6}}>
      {onReset&&<button onClick={onReset} style={{background:"rgba(56,189,248,.1)",border:"1px solid rgba(56,189,248,.3)",color:"#38bdf8",borderRadius:9,padding:"8px 10px",fontSize:12,flexShrink:0}}>↺</button>}
      {onEdit&&<button onClick={onEdit} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.25)",color:"#38bdf8",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>✏️</button>}
      <button onClick={onDelete} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>🗑</button>
    </div>
  </div>
);}            <div style={{display:"flex",gap:7}}>
              <button onClick={()=>setTplSort(s=>s==="alpha"?"manual":"alpha")} style={{background:tplSort==="alpha"?"rgba(56,189,248,.15)":"rgba(71,85,105,.1)",border:`1px solid ${tplSort==="alpha"?"rgba(56,189,248,.5)":"rgba(71,85,105,.3)"}`,color:tplSort==="alpha"?"#38bdf8":"#64748b",borderRadius:9,padding:"8px 10px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:.5}}>A-Z</button>
              <button onClick={openAdd} style={{background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:9,padding:"8px 15px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ NEW</button>
            </div>
          </div>

          {dailyQ.length>0&&<>
            <div style={{fontSize:9,color:"#38bdf8",letterSpacing:2,fontWeight:700,marginBottom:10,fontFamily:"'Orbitron',monospace"}}>⚔️ DAILY</div>
            {dailyQ.map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige;return(
              <TplRow key={t.id} t={t} d={d} cat={cat} onDelete={()=>doDelete(t.id)} extra={t.repeatable&&<Tag color="#fbbf24" label="🔁 REPEAT"/>}/>
            );})}
          </>}
          {weeklyQ.length>0&&<>
            <div style={{fontSize:9,color:"#c084fc",letterSpacing:2,fontWeight:700,margin:"16px 0 10px",fontFamily:"'Orbitron',monospace"}}>📅 WEEKLY</div>
            {weeklyQ.map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige;return(<TplRow key={t.id} t={t} d={d} cat={cat} onDelete={()=>doDelete(t.id)}/>);})}
          </>}
          {onceQ.length>0&&<>
            <div style={{fontSize:9,color:"#fb923c",letterSpacing:2,fontWeight:700,margin:"16px 0 10px",fontFamily:"'Orbitron',monospace"}}>✅ EINMALIG</div>
            {onceQ.map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,done=(plr.completedOnce||[]).includes(t.id);return(
              <TplRow key={t.id} t={t} d={d} cat={cat} onDelete={()=>doDelete(t.id)} done={done}
                extra={<Tag color={done?"#4ade80":"#fb923c"} label={done?"✓ ERLEDIGT":"1× EINMALIG"}/>}
                onReset={done?()=>doResetOnce(t.id):null}/>
            );})}
          </>}
          {tpl.length===0&&<div style={{textAlign:"center",padding:44,color:"#1a2840",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2}}>NO TEMPLATES</div>}
        </>}

        {/* ═══ PROFIL ═══════════════════════════════════════════════════════════ */}
        {tab==="profil"&&<>

          {/* Achievements */}
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#fbbf24",letterSpacing:2}}>ACHIEVEMENTS</div>
              <div style={{fontSize:11,color:"#2d3f55"}}>{migAchs(plr.achievements||[]).length}/{ACHIEVEMENTS.length + ACHIEVEMENTS.filter(a=>a.tiers).length*2} Stufen erreicht</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {ACHIEVEMENTS.map(a=>{
                if(a.tiers){
                  const plrAchs=migAchs(plr.achievements||[]);
                  const curLevel=getAchLevel(plrAchs,a.id);
                  const nextTier=a.tiers.find(t=>t.level>curLevel);
                  const curTier=a.tiers.find(t=>t.level===curLevel);
                  const tc=curLevel>0?TIER_COLORS[curLevel]:"#1e2840";
                  const te=curLevel>0?TIER_EMOJI[curLevel]:"";
                  return(
                    <div key={a.id} style={{background:curLevel>0?`${tc}10`:"rgba(255,255,255,.02)",border:`1px solid ${curLevel>0?tc+"50":"#1e2840"}`,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
                      <div style={{fontSize:24}}>{a.emoji}</div>
                      {curLevel>0&&<div style={{fontSize:13,marginTop:2}}>{te}</div>}
                      <div style={{fontSize:11,fontWeight:700,color:curLevel>0?tc:"#64748b",marginTop:4,lineHeight:1.3}}>{a.title}</div>
                      {curTier
                        ?<div style={{fontSize:10,color:"#94a3b8",marginTop:3,lineHeight:1.4}}>{curTier.label}: {curTier.desc}</div>
                        :<div style={{fontSize:10,color:"#475569",marginTop:3,lineHeight:1.4,opacity:.6}}>{a.tiers[0].desc}</div>
                      }
                      {nextTier&&curLevel>0&&<div style={{fontSize:9,color:"#334155",marginTop:3}}>▶ {nextTier.label}: {nextTier.desc}</div>}
                      <div style={{display:"flex",justifyContent:"center",gap:3,marginTop:6}}>
                        {a.tiers.map(t=><div key={t.level} style={{width:8,height:8,borderRadius:"50%",background:t.level<=curLevel?TIER_COLORS[t.level]:"#1e2840"}}/>)}
                      </div>
                    </div>
                  );
                } else {
                  const done=migAchs(plr.achievements||[]).some(x=>x.id===a.id);
                  return(
                    <div key={a.id} style={{background:done?"rgba(251,191,36,.08)":"rgba(255,255,255,.025)",border:`1px solid ${done?"rgba(251,191,36,.35)":"#1e2840"}`,borderRadius:12,padding:"12px 8px",textAlign:"center",opacity:done?1:.55}}>
                      <div style={{fontSize:24}}>{a.emoji}</div>
                      {done&&<div style={{fontSize:13,marginTop:2}}>✓</div>}
                      <div style={{fontSize:11,fontWeight:700,color:done?"#fbbf24":"#64748b",marginTop:4,lineHeight:1.3}}>{a.title}</div>
                      <div style={{fontSize:10,color:done?"#94a3b8":"#475569",marginTop:4,lineHeight:1.4}}>{a.desc}</div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
          <HR/>

          {/* Stats */}
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2,marginBottom:12}}>STATISTIKEN</div>
            {(()=>{
              const topCatEntry=Object.entries(Object.fromEntries(Object.keys(CATS).map(k=>[k,comps.filter(c=>c.category===k).length]))).sort((a,b)=>b[1]-a[1])[0];
              const activeDaysTotal=new Set(comps.map(c=>c.date)).size;
              const avgXP=activeDaysTotal>0?Math.round(totalXP/activeDaysTotal):0;
              return(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {l:"Gesamt Quests",v:comps.length,c:"#38bdf8"},
                    {l:"Gesamt XP",v:totalXP.toLocaleString(),c:"#c084fc"},
                    {l:"Ø XP / Aktivtag",v:avgXP,c:"#4ade80"},
                    {l:"Top Kategorie",v:topCatEntry&&topCatEntry[1]>0?`${CATS[topCatEntry[0]]?.emoji} ${CATS[topCatEntry[0]]?.label}`:"-",c:"#fbbf24"},
                  ].map(({l,v,c})=>(
                    <div key={l} style={{background:`${c}09`,border:`1px solid ${c}22`,borderRadius:12,padding:"12px 14px"}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:17,fontWeight:900,color:c}}>{v}</div>
                      <div style={{fontSize:11,color:"#475569",marginTop:4}}>{l}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          <HR/>

          {/* Export / Import */}
          <div style={{marginBottom:20}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2,marginBottom:10}}>DATEN</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={doExport} style={{flex:1,padding:"12px",borderRadius:11,border:"1px solid rgba(56,189,248,.4)",background:"rgba(56,189,248,.08)",color:"#38bdf8",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13}}>⬇ Export JSON</button>
              <label style={{flex:1,padding:"12px",borderRadius:11,border:"1px solid rgba(192,132,252,.4)",background:"rgba(192,132,252,.08)",color:"#c084fc",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,textAlign:"center",cursor:"pointer"}}>
                ⬆ Import JSON
                <input type="file" accept=".json" onChange={doImport} style={{display:"none"}}/>
              </label>
            </div>
          </div>
          <HR/>

        </>}
      </div>

      {/* Day Detail Overlay */}
      {selectedDay&&(()=>{
        const dayComps=comps.filter(c=>c.date===selectedDay);
        const dayXP=dayComps.reduce((s,c)=>s+c.earnedXp,0);
        const label=new Date(selectedDay+"T12:00").toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
        return(
          <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",display:"flex",alignItems:"flex-end"}} onClick={()=>setSelectedDay(null)}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#080d1c",borderRadius:"22px 22px 0 0",border:"1px solid #1a2840",borderBottom:"none",padding:"22px 18px 44px",animation:"slideUp .2s ease"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
                <div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#38bdf8",letterSpacing:2,marginBottom:4}}>{label.toUpperCase()}</div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:26,fontWeight:900,color:"#38bdf8"}}>{dayXP} <span style={{fontSize:12}}>XP</span></div>
                  <div style={{fontSize:11,color:"#475569",marginTop:2}}>{dayComps.length} Quests abgeschlossen</div>
                </div>
                <button onClick={()=>setSelectedDay(null)} style={{background:"none",border:"none",color:"#475569",fontSize:22,lineHeight:1,padding:"4px"}}>✕</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"50vh",overflowY:"auto"}}>
                {dayComps.map(c=>{const d=DIFF[c.difficulty],cat=CATS[c.category]??CATS.sonstige;return(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(12,18,40,.9)",border:"1px solid #1a2840",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontSize:22}}>{c.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{c.name}</div>
                      <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                        <Tag color={cat.color} label={cat.label.toUpperCase()}/>
                        <Tag color={d.color} label={d.label.toUpperCase()}/>
                      </div>
                      {c.note&&<div style={{fontSize:11,color:"#64748b",marginTop:5}}>💬 {c.note}</div>}
                    </div>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,color:d.color,flexShrink:0}}>+{c.earnedXp}</div>
                  </div>
                );})}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ADD MODAL */}
      {showAdd&&<div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.88)",backdropFilter:"blur(12px)",display:"flex",alignItems:"flex-end"}} onClick={e=>{if(e.target===e.currentTarget){setShowAdd(false);setEditingId(null);}}}>
        <div className="modal-sheet" style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#080d1c",borderRadius:"24px 24px 0 0",border:"1px solid #1a2840",borderBottom:"none",padding:"24px 18px 48px",paddingBottom:"max(48px,env(safe-area-inset-bottom,48px))"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#38bdf8",letterSpacing:2}}>{editingId?"QUEST BEARBEITEN":"ADD QUEST"}</div>
            <button onClick={()=>{setShowAdd(false);setEditingId(null);}} style={{background:"none",border:"none",color:"#475569",fontSize:22,padding:"0 4px",lineHeight:1}}>✕</button>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>QUEST NAME</div>
            <input value={newQ.name} onChange={e=>setNewQ(q=>({...q,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doAdd()} placeholder="z.B. Wickeln" autoFocus style={{width:"100%",background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"13px 15px",color:"#e2e8f0",fontSize:16,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>ICON</div>
            <input value={newQ.emoji} onChange={e=>setNewQ(q=>({...q,emoji:e.target.value}))} style={{width:58,background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"10px",color:"#e2e8f0",fontSize:22,textAlign:"center"}}/>
          </div>
          <div style={{marginBottom:newQ.frequency==="daily"?10:16}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>HÄUFIGKEIT</div>
            <div style={{display:"flex",gap:8}}>
              {[{k:"daily",l:"🔄",sub:"TÄGLICH",c:"#38bdf8"},{k:"weekly",l:"📅",sub:"WÖCHENTLICH",c:"#c084fc"},{k:"once",l:"✅",sub:"EINMALIG",c:"#fb923c"}].map(({k,l,sub,c})=>(
                <button key={k} onClick={()=>setNewQ(q=>({...q,frequency:k,repeatable:k==="daily"?q.repeatable:false}))} style={{flex:1,padding:"12px 4px",borderRadius:11,border:`1px solid ${newQ.frequency===k?c:"#1e2f48"}`,background:newQ.frequency===k?c+"16":"transparent",color:newQ.frequency===k?c:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>
                  <div style={{fontSize:18}}>{l}</div><div style={{fontSize:10,marginTop:2}}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
          {newQ.frequency==="daily"&&<div style={{marginBottom:14,background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.2)",borderRadius:11,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>🔁 Mehrfach täglich</div>
              <div style={{fontSize:11,color:"#3a4f6a",marginTop:1}}>Jeder Tap zählt (z.B. Wickeln)</div>
            </div>
            <div onClick={()=>setNewQ(q=>({...q,repeatable:!q.repeatable}))} style={{width:48,height:28,borderRadius:14,cursor:"pointer",background:newQ.repeatable?"#fbbf24":"#111929",border:`1px solid ${newQ.repeatable?"#fbbf24":"#1e2f48"}`,position:"relative",transition:"background .2s",flexShrink:0}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:newQ.repeatable?25:4,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
            </div>
          </div>}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>KATEGORIE</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.entries(CATS).map(([k,v])=>(
                <button key={k} onClick={()=>setNewQ(q=>({...q,category:k}))} style={{padding:"7px 12px",borderRadius:9,fontSize:11,fontWeight:700,border:`1px solid ${newQ.category===k?v.color:"#1e2f48"}`,background:newQ.category===k?v.color+"16":"transparent",color:newQ.category===k?v.color:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif"}}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>SCHWIERIGKEIT</div>
            <div style={{display:"flex",gap:8}}>
              {Object.entries(DIFF).map(([k,v])=>(
                <button key={k} onClick={()=>setNewQ(q=>({...q,difficulty:k}))} style={{flex:1,padding:"12px 0",borderRadius:11,border:`1px solid ${newQ.difficulty===k?v.color:"#1e2f48"}`,background:newQ.difficulty===k?v.color+"16":"transparent",color:newQ.difficulty===k?v.color:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>
                  <div style={{fontSize:12}}>{v.label}</div><div style={{fontSize:10,opacity:.6}}>{v.xp} XP</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={doSaveQuest} disabled={!newQ.name.trim()} style={{width:"100%",padding:"16px",borderRadius:13,border:"none",background:newQ.name.trim()?"linear-gradient(135deg,#1d4ed8,#38bdf8)":"#111929",color:newQ.name.trim()?"#fff":"#2d3f55",fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,letterSpacing:2,boxShadow:newQ.name.trim()?"0 4px 24px rgba(56,189,248,.25)":"none",transition:"all .2s"}}>
            {editingId?"ÄNDERUNGEN SPEICHERN":"QUEST HINZUFÜGEN"}
          </button>
        </div>
      </div>}
    </div>
  );
}

// ─── Micro Components ─────────────────────────────────────────────────────────
function Tag({color,label}){return<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color,background:color+"15"}}>{label}</span>;}
function XPLabel({earned,bon,done,color}){return<><div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:done?"#2d3f55":color}}>+{earned}<span style={{fontSize:8}}>XP</span></div>{bon>0&&!done&&<div style={{fontSize:9,color:"#fbbf24"}}>🔥+{bon}</div>}</>;}
function Circle({done,color}){return<div style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${done?"#1a2540":color+"55"}`,background:done?color+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{done&&<span style={{color,fontSize:15,fontWeight:700}}>✓</span>}</div>;}
function SecHead({label,color,count,sub,onAdd,btnColor}){return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
  <div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color,letterSpacing:2}}>{label}</div><div style={{fontSize:9,color,background:color+"20",border:`1px solid ${color}50`,borderRadius:20,padding:"2px 8px",fontWeight:700}}>{count}</div></div><div style={{fontSize:11,color:"#2d3f55",marginTop:2}}>{sub}</div></div>
  <button onClick={onAdd} style={{background:btnColor+"18",border:`1px solid ${btnColor}`,color:btnColor,borderRadius:9,padding:"8px 14px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ QUEST</button>
</div>;}
function HR(){return<div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(56,189,248,.12),transparent)",margin:"6px 0 18px"}}/>;}
function EmptyState(){return<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40}}>⚔️</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#1a2540",marginTop:12,letterSpacing:2}}>NO ACTIVE QUESTS</div></div>;}
function TplRow({t,d,cat,onDelete,onEdit,done=false,extra,onReset}){return(
  <div style={{background:"rgba(12,18,40,.9)",border:`1px solid ${done?"rgba(74,222,128,.15)":"#1a2840"}`,borderRadius:13,padding:"13px 15px",marginBottom:10,display:"flex",alignItems:"center",gap:12,opacity:done?.65:1}}>
    <div style={{fontSize:22}}>{t.emoji}</div>
    <div style={{flex:1}}>
      <div style={{fontWeight:700,fontSize:15,color:done?"#475569":"#e2e8f0",textDecoration:done?"line-through":"none"}}>{t.name}</div>
      <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
        <Tag color={cat.color} label={cat.label.toUpperCase()}/>
        <Tag color={d.color} label={`${d.label.toUpperCase()} · ${d.xp} XP`}/>
        {extra}
      </div>
    </div>
    <div style={{display:"flex",gap:6}}>
      {onReset&&<button onClick={onReset} style={{background:"rgba(56,189,248,.1)",border:"1px solid rgba(56,189,248,.3)",color:"#38bdf8",borderRadius:9,padding:"8px 10px",fontSize:12,flexShrink:0}}>↺</button>}
      {onEdit&&<button onClick={onEdit} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.25)",color:"#38bdf8",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>✏️</button>}
      <button onClick={onDelete} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>🗑</button>
    </div>
  </div>
);}
