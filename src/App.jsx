import { useState, useEffect, useMemo } from "react";

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
  { rank:"E", title:"Awakened One",       min:1,  max:5,   color:"#94a3b8" },
  { rank:"D", title:"Shadow Hunter",      min:6,  max:15,  color:"#4ade80" },
  { rank:"C", title:"Elite Hunter",       min:16, max:30,  color:"#38bdf8" },
  { rank:"B", title:"Master Hunter",      min:31, max:50,  color:"#fbbf24" },
  { rank:"A", title:"Shadow Sovereign",   min:51, max:75,  color:"#c084fc" },
  { rank:"S", title:"Monarch of Shadows", min:76, max:100, color:"#f87171" },
];

// frequency: "daily" | "weekly" | "once"
// repeatable: boolean (only meaningful for daily — tap multiple times per day)
const INIT_TEMPLATES = [
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
const STORE_KEY = "sqt_v3";

// ─── Storage ─────────────────────────────────────────────────────────────────
function loadAll() {
  try { const r=localStorage.getItem(STORE_KEY); return r?JSON.parse(r):null; } catch { return null; }
}
function saveAll(templates, completions, player) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({templates,completions,player})); }
  catch(e) { console.warn("save failed:",e); }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function localDate(d=new Date()){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
const TODAY=()=>localDate();
function getWeekStart(){const t=new Date(),o=(t.getDay()+6)%7,m=new Date(t);m.setDate(t.getDate()-o);return localDate(m);}
function getLevelInfo(xp){let l=1,u=0;while(l<100){const n=l*100;if(u+n>xp)break;u+=n;l++;}const i=xp-u,f=l*100;return{level:l,inLvl:i,forNext:f,pct:Math.min(100,(i/f)*100)};}
function getRank(l){return RANKS.find(r=>l>=r.min&&l<=r.max)??RANKS.at(-1);}
function sBon(s){return Math.min(s*3,30);}
function getWeekDays(){const t=new Date(),o=(t.getDay()+6)%7;return Array.from({length:7},(_,i)=>{const d=new Date(t);d.setDate(t.getDate()-o+i);return localDate(d);});}
function getMonthDays(){const t=new Date(),f=new Date(t.getFullYear(),t.getMonth(),1),la=new Date(t.getFullYear(),t.getMonth()+1,0),pad=(f.getDay()+6)%7,arr=Array(pad).fill(null);for(let d=1;d<=la.getDate();d++)arr.push(localDate(new Date(t.getFullYear(),t.getMonth(),d)));return arr;}
function migrateTpl(arr){return arr.map(t=>({repeatable:false,...t,frequency:t.frequency??(t.recurring?"daily":t.oneOff?"once":"daily")}));}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const saved = useMemo(()=>loadAll(),[]);
  const [templates,   setTemplates]   = useState(()=>migrateTpl(saved?.templates??INIT_TEMPLATES));
  const [completions, setCompletions] = useState(()=>saved?.completions??[]);
  const [player,      setPlayer]      = useState(()=>({completedOnce:[],...(saved?.player??{name:"Tim",streak:0,lastDate:null})}));
  const [tab,         setTab]         = useState("today");
  const [flash,       setFlash]       = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [newQ,        setNewQ]        = useState({name:"",category:"sonstige",difficulty:"normal",emoji:"📋",frequency:"daily",repeatable:false});

  useEffect(()=>{ saveAll(templates,completions,player); },[templates,completions,player]);
  useEffect(()=>{ const y=localDate(new Date(Date.now()-86400000)); if(player.lastDate&&player.lastDate<y) setPlayer(p=>({...p,streak:0})); },[]);// eslint-disable-line

  const today=TODAY(), weekStart=getWeekStart();
  const totalXP     =useMemo(()=>completions.reduce((s,c)=>s+c.earnedXp,0),[completions]);
  const lvl         =useMemo(()=>getLevelInfo(totalXP),[totalXP]);
  const rank        =useMemo(()=>getRank(lvl.level),[lvl.level]);
  const todayComps  =useMemo(()=>completions.filter(c=>c.date===today),[completions,today]);
  const weekComps   =useMemo(()=>completions.filter(c=>c.weekStart===weekStart),[completions,weekStart]);
  const todayXP     =useMemo(()=>todayComps.reduce((s,c)=>s+c.earnedXp,0),[todayComps]);
  const bon         =sBon(player.streak);

  // Quest buckets
  const dailyQ   =useMemo(()=>templates.filter(t=>t.frequency==="daily"),[templates]);
  const weeklyQ  =useMemo(()=>templates.filter(t=>t.frequency==="weekly"),[templates]);
  const onceQ    =useMemo(()=>templates.filter(t=>t.frequency==="once"),[templates]);
  const onceActive=useMemo(()=>onceQ.filter(t=>!player.completedOnce?.includes(t.id)),[onceQ,player.completedOnce]);

  // Done sets
  const dailyDoneIds  =useMemo(()=>new Set(todayComps.map(c=>c.templateId)),[todayComps]);
  const weeklyDoneIds =useMemo(()=>new Set(weekComps.map(c=>c.templateId)),[weekComps]);
  // Count per repeatable quest today
  const repCount      =useMemo(()=>{const m={};todayComps.forEach(c=>{m[c.templateId]=(m[c.templateId]||0)+1;});return m;},[todayComps]);

  const dailyDone  =dailyQ.filter(q=>!q.repeatable&&dailyDoneIds.has(q.id)).length;
  const dailyTotal =dailyQ.filter(q=>!q.repeatable).length;
  const weeklyDone =weeklyQ.filter(q=>weeklyDoneIds.has(q.id)).length;
  const onceDone   =onceQ.length-onceActive.length;
  const totalDone  =dailyDone+weeklyDone+onceDone;
  const totalQ     =dailyTotal+weeklyQ.length+onceQ.length;
  const progress   =totalQ>0?Math.round((totalDone/totalQ)*100):0;
  const allDone    =totalQ>0&&dailyDone===dailyTotal&&weeklyDone===weeklyQ.length&&onceActive.length===0;

  // Week/month data
  const weekData  =useMemo(()=>getWeekDays().map(d=>({date:d,xp:completions.filter(c=>c.date===d).reduce((s,c)=>s+c.earnedXp,0),list:completions.filter(c=>c.date===d)})),[completions]);
  const monArr    =useMemo(()=>getMonthDays(),[]);
  const xpByDay   =useMemo(()=>{const m={};completions.forEach(c=>{m[c.date]=(m[c.date]||0)+c.earnedXp});return m;},[completions]);
  const monthXP   =useMemo(()=>completions.filter(c=>c.date.startsWith(today.slice(0,7))).reduce((s,c)=>s+c.earnedXp,0),[completions,today]);
  const monthCnt  =useMemo(()=>completions.filter(c=>c.date.startsWith(today.slice(0,7))).length,[completions,today]);
  const activeDays=useMemo(()=>new Set(completions.filter(c=>c.date.startsWith(today.slice(0,7))).map(c=>c.date)).size,[completions,today]);

  function doComplete(t) {
    const base=DIFF[t.difficulty].xp, earned=base+bon;
    const newComp={id:Date.now()+"",templateId:t.id,name:t.name,category:t.category,difficulty:t.difficulty,emoji:t.emoji,frequency:t.frequency,repeatable:t.repeatable??false,baseXp:base,streakBonus:bon,earnedXp:earned,date:today,weekStart,ts:Date.now()};
    const nextComp=[...completions,newComp];
    setCompletions(nextComp);

    let nextPlayer=player;
    if(t.frequency==="once"){
      nextPlayer={...player,completedOnce:[...(player.completedOnce??[]),t.id]};
    }
    const y=localDate(new Date(Date.now()-86400000));
    let s=nextPlayer.streak;
    if(nextPlayer.lastDate!==today){s=(nextPlayer.lastDate===y||!nextPlayer.lastDate)?s+1:1;}
    nextPlayer={...nextPlayer,streak:s,lastDate:today};
    setPlayer(nextPlayer);
    saveAll(templates,nextComp,nextPlayer);
    setFlash({xp:earned,key:Date.now()});
  }

  function doUndo(templateId, opts={}) {
    const {weekly=false}=opts;
    const nextComp=completions.filter((c,i)=>{
      const pool=weekly
        ?completions.filter(c=>c.templateId===templateId&&c.weekStart===weekStart)
        :completions.filter(c=>c.templateId===templateId&&c.date===today);
      if(!pool.length)return true;
      return c.id!==pool.at(-1).id;
    });
    setCompletions(nextComp);
    saveAll(templates,nextComp,player);
  }

  function doResetOnce(id) {
    const nextPlayer={...player,completedOnce:(player.completedOnce??[]).filter(x=>x!==id)};
    setPlayer(nextPlayer);
    saveAll(templates,completions,nextPlayer);
  }

  function doAdd() {
    if(!newQ.name.trim())return;
    const id="t"+Date.now(), t={...newQ,id,name:newQ.name.trim()};
    const next=[...templates,t];
    setTemplates(next); saveAll(next,completions,player);
    setNewQ({name:"",category:"sonstige",difficulty:"normal",emoji:"📋",frequency:"daily",repeatable:false});
    setShowAdd(false);
  }
  function doDelete(id) {
    const next=templates.filter(t=>t.id!==id);
    setTemplates(next); saveAll(next,completions,player);
  }

  // ── Quest Row Components ──────────────────────────────────────────────────

  function NormalRow({t, done, onToggle, isWeekly=false}) {
    const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,earned=d.xp+bon;
    return(
      <div className="tap" onClick={onToggle} style={{background:done?"rgba(12,17,30,.5)":"rgba(12,18,40,.95)",border:`1px solid ${done?"#0d1628":d.color+"38"}`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,opacity:done?.48:1,transition:"all .18s",boxShadow:done?"none":`0 2px 16px ${d.color}12`}}>
        <div style={{fontSize:25,minWidth:40,textAlign:"center"}}>{t.emoji}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:16,color:done?"#2d3f55":"#e2e8f0",textDecoration:done?"line-through":"none"}}>{t.name}</div>
          <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color:cat.color,background:cat.color+"15"}}>{cat.label.toUpperCase()}</span>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color:d.color,background:d.color+"15"}}>{d.label.toUpperCase()}</span>
            {isWeekly&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color:"#c084fc",background:"rgba(192,132,252,.15)"}}>📅 WEEKLY</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,minWidth:52}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:done?"#2d3f55":d.color}}>+{earned}<span style={{fontSize:8}}>XP</span></div>
          {bon>0&&!done&&<div style={{fontSize:9,color:"#fbbf24"}}>🔥+{bon}</div>}
          <div style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${done?"#1a2540":d.color+"55"}`,background:done?d.color+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
            {done&&<span style={{color:d.color,fontSize:15,fontWeight:700}}>✓</span>}
          </div>
        </div>
      </div>
    );
  }

  function RepeatRow({t}) {
    const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,count=repCount[t.id]||0,earned=d.xp+bon;
    return(
      <div style={{background:"rgba(12,18,40,.95)",border:`1px solid ${d.color}38`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,boxShadow:`0 2px 16px ${d.color}12`}}>
        <div style={{fontSize:25,minWidth:40,textAlign:"center"}}>{t.emoji}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:16,color:"#e2e8f0"}}>{t.name}</div>
          <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color:cat.color,background:cat.color+"15"}}>{cat.label.toUpperCase()}</span>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color:d.color,background:d.color+"15"}}>{d.label.toUpperCase()}</span>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color:"#fbbf24",background:"rgba(251,191,36,.15)"}}>🔁 REPEAT</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Minus */}
          <button onClick={e=>{e.stopPropagation();doUndo(t.id);}} disabled={count===0} style={{width:32,height:32,borderRadius:"50%",border:`1.5px solid ${count>0?"#475569":"#1a2540"}`,background:"transparent",color:count>0?"#94a3b8":"#2d3f55",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,lineHeight:1}}>−</button>
          {/* Counter */}
          <div style={{minWidth:44,textAlign:"center"}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:22,fontWeight:900,color:count>0?d.color:"#2d3f55",lineHeight:1}}>×{count}</div>
            {count>0&&<div style={{fontSize:9,color:"#3a4f6a",marginTop:2}}>{count*earned} XP</div>}
          </div>
          {/* Plus */}
          <button className="tap" onClick={e=>{e.stopPropagation();doComplete(t);}} style={{width:38,height:38,borderRadius:"50%",border:`2px solid ${d.color}`,background:d.color+"20",color:d.color,fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,lineHeight:1}}>+</button>
        </div>
      </div>
    );
  }

  function OnceRow({t}) {
    const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,earned=d.xp+bon;
    return(
      <div className="tap" onClick={()=>doComplete(t)} style={{background:"rgba(12,18,40,.95)",border:`1px solid ${d.color}38`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,boxShadow:`0 2px 16px ${d.color}12`}}>
        <div style={{fontSize:25,minWidth:40,textAlign:"center"}}>{t.emoji}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:16,color:"#e2e8f0"}}>{t.name}</div>
          <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color:cat.color,background:cat.color+"15"}}>{cat.label.toUpperCase()}</span>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color:d.color,background:d.color+"15"}}>{d.label.toUpperCase()}</span>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color:"#fb923c",background:"rgba(251,146,60,.15)"}}>1× EINMALIG</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,minWidth:52}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:d.color}}>+{earned}<span style={{fontSize:8}}>XP</span></div>
          {bon>0&&<div style={{fontSize:9,color:"#fbbf24"}}>🔥+{bon}</div>}
          <div style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${d.color}55`,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:d.color,fontSize:16}}>→</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"#060612",color:"#e2e8f0",maxWidth:480,margin:"0 auto",position:"relative",fontFamily:"'Rajdhani',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:#060612}
        @keyframes xpFloat{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}15%{opacity:1;transform:translate(-50%,-65%) scale(1.35)}65%{opacity:1;transform:translate(-50%,-85%) scale(1)}100%{opacity:0;transform:translate(-50%,-110%) scale(.85)}}
        @keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes glow{0%,100%{opacity:.7}50%{opacity:1}}
        .tap:active{transform:scale(.96);opacity:.85}.tab-btn{transition:color .15s,border-color .15s}.modal-sheet{animation:slideUp .22s ease}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
        input{outline:none}input::placeholder{color:#334155}button{cursor:pointer}
      `}</style>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",background:"radial-gradient(ellipse at 12% 88%,rgba(56,189,248,.06) 0%,transparent 50%),radial-gradient(ellipse at 88% 12%,rgba(192,132,252,.06) 0%,transparent 50%)"}}/>
      {flash&&<div key={flash.key} style={{position:"fixed",top:"50%",left:"50%",zIndex:9999,pointerEvents:"none",animation:"xpFloat 1.5s ease-out forwards",fontFamily:"'Orbitron',monospace",fontSize:32,fontWeight:900,color:"#38bdf8",textShadow:"0 0 18px #38bdf8,0 0 40px #38bdf870",letterSpacing:2,whiteSpace:"nowrap"}} onAnimationEnd={()=>setFlash(null)}>+{flash.xp} XP</div>}

      {/* HEADER */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(6,6,18,.97)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(56,189,248,.12)",padding:"16px 18px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:48,height:48,borderRadius:13,border:`2px solid ${rank.color}`,background:`${rank.color}0a`,boxShadow:`0 0 18px ${rank.color}50,inset 0 0 12px ${rank.color}10`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace",fontSize:22,fontWeight:900,color:rank.color,flexShrink:0,animation:"glow 3s ease infinite"}}>{rank.rank}</div>
            <div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:700,letterSpacing:1}}>{player.name}</div>
              <div style={{fontSize:11,color:rank.color,fontWeight:600,letterSpacing:.5,marginTop:2,animation:"shimmer 2.5s ease infinite"}}>{rank.title} · LV.{lvl.level}</div>
            </div>
          </div>
          <div style={{background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.22)",borderRadius:12,padding:"8px 14px",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:17}}>🔥</span>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:700,color:"#fbbf24",lineHeight:1}}>{player.streak}</span>
            <span style={{fontSize:8,color:"#78350f",letterSpacing:1,fontWeight:700}}>STREAK</span>
          </div>
        </div>
        <div style={{marginBottom:4}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#38bdf8",letterSpacing:1}}>XP {lvl.inLvl.toLocaleString()} / {lvl.forNext.toLocaleString()}</span>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#1e293b"}}>{totalXP.toLocaleString()} TOTAL</span>
          </div>
          <div style={{height:5,background:"#0a1020",borderRadius:3,border:"1px solid #1a2540",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${lvl.pct}%`,background:"linear-gradient(90deg,#1d4ed8,#38bdf8,#7dd3fc)",boxShadow:"0 0 12px #38bdf8",borderRadius:3,transition:"width .9s cubic-bezier(.4,0,.2,1)"}}/>
          </div>
        </div>
        <div style={{display:"flex",marginTop:14}}>
          {[{id:"today",l:"TODAY",i:"⚔️"},{id:"week",l:"WOCHE",i:"📅"},{id:"month",l:"MONAT",i:"📆"},{id:"quests",l:"QUESTS",i:"📋"}].map(({id,l,i})=>(
            <button key={id} className="tab-btn" onClick={()=>setTab(id)} style={{flex:1,padding:"10px 0 8px",border:"none",background:"transparent",borderBottom:`2px solid ${tab===id?"#38bdf8":"transparent"}`,color:tab===id?"#38bdf8":"#2d3f55",fontSize:9,fontWeight:700,letterSpacing:1,fontFamily:"'Rajdhani',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:15}}>{i}</span>{l}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"18px 16px 90px",position:"relative",zIndex:1}}>

        {/* ═══ TODAY ═══════════════════════════════════════════════════════ */}
        {tab==="today"&&<>
          {/* Stats */}
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

          {/* WEEKLY */}
          {weeklyQ.length>0&&<>
            <SectionHeader label="WEEKLY CHALLENGES" color="#c084fc" count={`${weeklyDone}/${weeklyQ.length}`} onAdd={()=>setShowAdd(true)} btnColor="rgba(192,132,252,.4)" btnText="rgba(192,132,252,1)" reset={(()=>{const t=new Date(),o=(t.getDay()+6)%7,m=new Date(t);m.setDate(t.getDate()-o+7);return`Reset ${m.toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"})}`;})()}/>
            {weeklyQ.map(t=><NormalRow key={t.id} t={t} done={weeklyDoneIds.has(t.id)} onToggle={()=>weeklyDoneIds.has(t.id)?doUndo(t.id,{weekly:true}):doComplete(t)} isWeekly/>)}
            <Divider/>
          </>}

          {/* EINMALIG (once) — active only */}
          {onceActive.length>0&&<>
            <SectionHeader label="EINMALIG" color="#fb923c" count={`${onceDone}/${onceQ.length}`} onAdd={()=>setShowAdd(true)} btnColor="rgba(251,146,60,.4)" btnText="rgba(251,146,60,1)" reset="einmalig erledigen"/>
            {onceActive.map(t=><OnceRow key={t.id} t={t}/>)}
            <Divider/>
          </>}

          {/* DAILY */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2}}>DAILY QUESTS</div>
                <div style={{fontSize:9,color:"#38bdf8",background:"rgba(56,189,248,.15)",border:"1px solid rgba(56,189,248,.3)",borderRadius:20,padding:"2px 8px",fontWeight:700}}>{dailyDone}/{dailyTotal}</div>
              </div>
              <div style={{fontSize:11,color:"#2d3f55",marginTop:2}}>{new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
            <button onClick={()=>setShowAdd(true)} style={{background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:9,padding:"8px 15px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ QUEST</button>
          </div>
          {dailyQ.length===0
            ?<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40}}>⚔️</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#1a2540",marginTop:12,letterSpacing:2}}>NO ACTIVE QUESTS</div></div>
            :dailyQ.map(t=>t.repeatable
                ?<RepeatRow key={t.id} t={t}/>
                :<NormalRow key={t.id} t={t} done={dailyDoneIds.has(t.id)} onToggle={()=>dailyDoneIds.has(t.id)?doUndo(t.id):doComplete(t)}/>
              )
          }
        </>}

        {/* ═══ WEEK ════════════════════════════════════════════════════════ */}
        {tab==="week"&&<>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2,marginBottom:14}}>AKTUELLE WOCHE</div>
          <div style={{background:"rgba(56,189,248,.07)",border:"1px solid rgba(56,189,248,.2)",borderRadius:14,padding:"18px",marginBottom:18,textAlign:"center"}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:34,fontWeight:900,color:"#38bdf8"}}>{weekData.reduce((s,d)=>s+d.xp,0).toLocaleString()}</div>
            <div style={{fontSize:10,color:"#2d3f55",letterSpacing:1,marginTop:3}}>TOTAL XP DIESE WOCHE</div>
          </div>
          {(()=>{const mx=Math.max(1,...weekData.map(d=>d.xp));return<>
            <div style={{display:"flex",gap:6,alignItems:"flex-end",height:120,marginBottom:7}}>
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
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{d.list.map(c=><span key={c.id} style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:(DIFF[c.difficulty]?.color)+"15",color:DIFF[c.difficulty]?.color,fontWeight:600}}>{c.emoji} {c.name}</span>)}</div>
              </div>
            ))}
            {weekData.every(d=>d.list.length===0)&&<div style={{textAlign:"center",padding:44,color:"#1a2840",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2}}>KEINE DATEN</div>}
          </div>
        </>}

        {/* ═══ MONTH ═══════════════════════════════════════════════════════ */}
        {tab==="month"&&<>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2,marginBottom:14}}>{MONTHS_DE[new Date().getMonth()].toUpperCase()} {new Date().getFullYear()}</div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {[{v:monthXP.toLocaleString(),l:"XP MONAT",c:"#38bdf8"},{v:monthCnt,l:"QUESTS",c:"#c084fc"},{v:activeDays,l:"AKTIV TAGE",c:"#4ade80"}].map(({v,l,c})=>(
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
                const xp=xpByDay[d]||0,it=xp>0?Math.min(1,xp/120):0,isT=d===today,day=parseInt(d.split("-")[2]);
                return(<div key={d} style={{aspectRatio:"1",borderRadius:8,background:xp>0?`rgba(56,189,248,${.07+it*.55})`:"rgba(255,255,255,.018)",border:`1px solid ${isT?"#38bdf8":xp>0?"rgba(56,189,248,.22)":"transparent"}`,boxShadow:isT?"0 0 12px #38bdf845":"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:2}}>
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

        {/* ═══ QUESTS ══════════════════════════════════════════════════════ */}
        {tab==="quests"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2}}>QUEST TEMPLATES</div>
              <div style={{fontSize:11,color:"#2d3f55",marginTop:3}}>{dailyQ.length} daily · {weeklyQ.length} weekly · {onceQ.length} einmalig</div>
            </div>
            <button onClick={()=>setShowAdd(true)} style={{background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:9,padding:"8px 15px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ NEW</button>
          </div>

          {/* Daily templates */}
          {dailyQ.length>0&&<>
            <div style={{fontSize:9,color:"#38bdf8",letterSpacing:2,fontWeight:700,marginBottom:10,fontFamily:"'Orbitron',monospace"}}>⚔️ DAILY</div>
            {dailyQ.map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige;return(
              <div key={t.id} style={{background:"rgba(12,18,40,.9)",border:`1px solid ${t.repeatable?"rgba(251,191,36,.2)":"#1a2840"}`,borderRadius:13,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:23}}>{t.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#e2e8f0"}}>{t.name}</div>
                  <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:cat.color,background:cat.color+"15",fontWeight:700,letterSpacing:.5}}>{cat.label.toUpperCase()}</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:d.color,background:d.color+"15",fontWeight:700,letterSpacing:.5}}>{d.label.toUpperCase()} · {d.xp} XP</span>
                    {t.repeatable&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:"#fbbf24",background:"rgba(251,191,36,.12)",fontWeight:700,letterSpacing:.5}}>🔁 REPEAT</span>}
                  </div>
                </div>
                <button onClick={()=>doDelete(t.id)} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>🗑</button>
              </div>);})}
          </>}

          {/* Weekly templates */}
          {weeklyQ.length>0&&<>
            <div style={{fontSize:9,color:"#c084fc",letterSpacing:2,fontWeight:700,margin:"18px 0 10px",fontFamily:"'Orbitron',monospace"}}>📅 WEEKLY</div>
            {weeklyQ.map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige;return(
              <div key={t.id} style={{background:"rgba(12,18,40,.9)",border:"1px solid rgba(192,132,252,.2)",borderRadius:13,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:23}}>{t.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#e2e8f0"}}>{t.name}</div>
                  <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:cat.color,background:cat.color+"15",fontWeight:700,letterSpacing:.5}}>{cat.label.toUpperCase()}</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:d.color,background:d.color+"15",fontWeight:700,letterSpacing:.5}}>{d.label.toUpperCase()} · {d.xp} XP</span>
                  </div>
                </div>
                <button onClick={()=>doDelete(t.id)} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>🗑</button>
              </div>);})}
          </>}

          {/* Once templates */}
          {onceQ.length>0&&<>
            <div style={{fontSize:9,color:"#fb923c",letterSpacing:2,fontWeight:700,margin:"18px 0 10px",fontFamily:"'Orbitron',monospace"}}>✅ EINMALIG</div>
            {onceQ.map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,done=(player.completedOnce??[]).includes(t.id);return(
              <div key={t.id} style={{background:"rgba(12,18,40,.9)",border:`1px solid ${done?"rgba(74,222,128,.2)":"rgba(251,146,60,.2)"}`,borderRadius:13,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,opacity:done?.65:1}}>
                <div style={{fontSize:23}}>{t.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:done?"#475569":"#e2e8f0",textDecoration:done?"line-through":"none"}}>{t.name}</div>
                  <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:cat.color,background:cat.color+"15",fontWeight:700,letterSpacing:.5}}>{cat.label.toUpperCase()}</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:d.color,background:d.color+"15",fontWeight:700,letterSpacing:.5}}>{d.label.toUpperCase()} · {d.xp} XP</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:done?"#4ade80":"#fb923c",background:done?"rgba(74,222,128,.12)":"rgba(251,146,60,.12)",fontWeight:700,letterSpacing:.5}}>{done?"✓ ERLEDIGT":"1× EINMALIG"}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {done&&<button onClick={()=>doResetOnce(t.id)} style={{background:"rgba(56,189,248,.1)",border:"1px solid rgba(56,189,248,.3)",color:"#38bdf8",borderRadius:9,padding:"8px 10px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",flexShrink:0}}>↺</button>}
                  <button onClick={()=>doDelete(t.id)} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>🗑</button>
                </div>
              </div>);})}
          </>}

          {templates.length===0&&<div style={{textAlign:"center",padding:44,color:"#1a2840",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2}}>NO TEMPLATES</div>}
        </>}
      </div>

      {/* ADD MODAL */}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.88)",backdropFilter:"blur(12px)",display:"flex",alignItems:"flex-end"}} onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}>
          <div className="modal-sheet" style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#080d1c",borderRadius:"24px 24px 0 0",border:"1px solid #1a2840",borderBottom:"none",padding:"24px 18px 48px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#38bdf8",letterSpacing:2}}>ADD QUEST</div>
              <button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",color:"#475569",fontSize:22,padding:"0 4px",lineHeight:1}}>✕</button>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>QUEST NAME</div>
              <input value={newQ.name} onChange={e=>setNewQ(q=>({...q,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doAdd()} placeholder="z.B. Wickeln" autoFocus style={{width:"100%",background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"13px 15px",color:"#e2e8f0",fontSize:16,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>ICON</div>
              <input value={newQ.emoji} onChange={e=>setNewQ(q=>({...q,emoji:e.target.value}))} style={{width:58,background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"10px",color:"#e2e8f0",fontSize:22,textAlign:"center"}}/>
            </div>
            {/* Frequency */}
            <div style={{marginBottom:newQ.frequency==="daily"?12:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>HÄUFIGKEIT</div>
              <div style={{display:"flex",gap:8}}>
                {[{k:"daily",l:"🔄",sub:"TÄGLICH",c:"#38bdf8"},{k:"weekly",l:"📅",sub:"WÖCHENTLICH",c:"#c084fc"},{k:"once",l:"✅",sub:"EINMALIG",c:"#fb923c"}].map(({k,l,sub,c})=>(
                  <button key={k} onClick={()=>setNewQ(q=>({...q,frequency:k,repeatable:k==="daily"?q.repeatable:false}))} style={{flex:1,padding:"12px 4px",borderRadius:11,border:`1px solid ${newQ.frequency===k?c:"#1e2f48"}`,background:newQ.frequency===k?c+"16":"transparent",color:newQ.frequency===k?c:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>
                    <div style={{fontSize:18}}>{l}</div><div style={{fontSize:10,marginTop:2}}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
            {/* Repeatable toggle — only for daily */}
            {newQ.frequency==="daily"&&<div style={{marginBottom:16,background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.2)",borderRadius:11,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>🔁 Mehrfach täglich</div>
                <div style={{fontSize:11,color:"#3a4f6a",marginTop:2}}>Jeder Tap zählt separat (z.B. Wickeln)</div>
              </div>
              <div onClick={()=>setNewQ(q=>({...q,repeatable:!q.repeatable}))} style={{width:48,height:28,borderRadius:14,cursor:"pointer",background:newQ.repeatable?"#fbbf24":"#111929",border:`1px solid ${newQ.repeatable?"#fbbf24":"#1e2f48"}`,position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:newQ.repeatable?25:4,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
              </div>
            </div>}
            {/* Category */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>KATEGORIE</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {Object.entries(CATS).map(([k,v])=>(
                  <button key={k} onClick={()=>setNewQ(q=>({...q,category:k}))} style={{padding:"7px 12px",borderRadius:9,fontSize:11,fontWeight:700,border:`1px solid ${newQ.category===k?v.color:"#1e2f48"}`,background:newQ.category===k?v.color+"16":"transparent",color:newQ.category===k?v.color:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif"}}>
                    {v.emoji} {v.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Difficulty */}
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
            <button onClick={doAdd} disabled={!newQ.name.trim()} style={{width:"100%",padding:"16px",borderRadius:13,border:"none",background:newQ.name.trim()?"linear-gradient(135deg,#1d4ed8,#38bdf8)":"#111929",color:newQ.name.trim()?"#fff":"#2d3f55",fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,letterSpacing:2,boxShadow:newQ.name.trim()?"0 4px 24px rgba(56,189,248,.25)":"none",transition:"all .2s"}}>
              QUEST HINZUFÜGEN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Sub-Components ────────────────────────────────────────────────────
function SectionHeader({label,color,count,reset}) {
  return(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color,letterSpacing:2}}>{label}</div>
        <div style={{fontSize:9,color,background:color+"20",border:`1px solid ${color}50`,borderRadius:20,padding:"2px 8px",fontWeight:700}}>{count}</div>
      </div>
      {reset&&<div style={{fontSize:11,color:"#2d3f55",marginTop:2}}>{reset}</div>}
    </div>
  );
}
function Divider(){return<div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(56,189,248,.12),transparent)",margin:"6px 0 18px"}}/>;}
