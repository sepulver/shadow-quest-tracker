import { useState, useEffect, useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFF = {
  easy:   { label: "Easy",   xp: 15, color: "#4ade80" },
  normal: { label: "Normal", xp: 30, color: "#fbbf24" },
  hard:   { label: "Hard",   xp: 60, color: "#f87171" },
};

const CATS = {
  fitness:  { label: "Fitness",  emoji: "⚔️",  color: "#f87171" },
  haushalt: { label: "Haushalt", emoji: "🏠",  color: "#38bdf8" },
  familie:  { label: "Familie",  emoji: "👨‍👩‍👧", color: "#c084fc" },
  einkauf:  { label: "Einkauf",  emoji: "🛒",  color: "#4ade80" },
  sonstige: { label: "Sonstige", emoji: "📋",  color: "#94a3b8" },
};

const RANKS = [
  { rank: "E", title: "Awakened One",       min: 1,  max: 5,   color: "#94a3b8" },
  { rank: "D", title: "Shadow Hunter",      min: 6,  max: 15,  color: "#4ade80" },
  { rank: "C", title: "Elite Hunter",       min: 16, max: 30,  color: "#38bdf8" },
  { rank: "B", title: "Master Hunter",      min: 31, max: 50,  color: "#fbbf24" },
  { rank: "A", title: "Shadow Sovereign",   min: 51, max: 75,  color: "#c084fc" },
  { rank: "S", title: "Monarch of Shadows", min: 76, max: 100, color: "#f87171" },
];

// frequency: "daily" | "weekly" | "oneoff"
const INIT_TEMPLATES = [
  { id: "t1", name: "Training",             category: "fitness",  difficulty: "hard",   frequency: "daily",  emoji: "⚔️" },
  { id: "t2", name: "Müll rausbringen",     category: "haushalt", difficulty: "easy",   frequency: "daily",  emoji: "🗑️" },
  { id: "t3", name: "Spülmaschine",         category: "haushalt", difficulty: "easy",   frequency: "daily",  emoji: "🍽️" },
  { id: "t4", name: "Waschmaschine",        category: "haushalt", difficulty: "normal", frequency: "daily",  emoji: "👕" },
  { id: "t5", name: "Kita Rucksack packen", category: "familie",  difficulty: "easy",   frequency: "daily",  emoji: "🎒" },
  { id: "t6", name: "Einkaufen",            category: "einkauf",  difficulty: "normal", frequency: "daily",  emoji: "🛒" },
  { id: "t7", name: "Wohnung aufräumen",    category: "haushalt", difficulty: "normal", frequency: "weekly", emoji: "🧹" },
];

const DAYS_DE   = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
const TODAY = () => localDate();

function getWeekStart() {
  const t = new Date(), offset = (t.getDay() + 6) % 7;
  const mon = new Date(t); mon.setDate(t.getDate() - offset);
  return localDate(mon);
}

function getLevelInfo(totalXP) {
  let level = 1, used = 0;
  while (level < 100) { const n = level * 100; if (used + n > totalXP) break; used += n; level++; }
  const inLvl = totalXP - used, forNext = level * 100;
  return { level, inLvl, forNext, pct: Math.min(100, (inLvl / forNext) * 100) };
}
function getRank(level) { return RANKS.find(r => level >= r.min && level <= r.max) ?? RANKS.at(-1); }
function streakBonus(streak) { return Math.min(streak * 3, 30); }

function getWeekDays(weekOffset = 0) {
  const t = new Date(), offset = (t.getDay() + 6) % 7;
  const mon = new Date(t); mon.setDate(t.getDate() - offset + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return localDate(d); });
}
function getWeekStartFromOffset(weekOffset = 0) {
  const t = new Date(), offset = (t.getDay() + 6) % 7;
  const mon = new Date(t); mon.setDate(t.getDate() - offset + weekOffset * 7);
  return localDate(mon);
}
function getMonthDays(monthOffset = 0) {
  const ref = new Date(); ref.setDate(1); ref.setMonth(ref.getMonth() + monthOffset);
  const year = ref.getFullYear(), month = ref.getMonth();
  const f = new Date(year, month, 1), la = new Date(year, month + 1, 0);
  const pad = (f.getDay() + 6) % 7, arr = Array(pad).fill(null);
  for (let d = 1; d <= la.getDate(); d++) arr.push(localDate(new Date(year, month, d)));
  return arr;
}
function getMonthLabel(monthOffset = 0) {
  const ref = new Date(); ref.setDate(1); ref.setMonth(ref.getMonth() + monthOffset);
  return { month: ref.getMonth(), year: ref.getFullYear() };
}
function getWeekLabel(weekOffset = 0) {
  const days = getWeekDays(weekOffset);
  const start = new Date(days[0] + "T12:00"), end = new Date(days[6] + "T12:00");
  const fmt = (d) => d.toLocaleDateString("de-DE", { day:"numeric", month:"short" });
  // ISO week number
  const d = new Date(days[0] + "T12:00"); d.setHours(0,0,0,0); d.setDate(d.getDate()+4-(d.getDay()||7));
  const kw = Math.ceil((((d-new Date(d.getFullYear(),0,1))/86400000)+1)/7);
  return { label: `KW ${kw}: ${fmt(start)} – ${fmt(end)}`, kw };
}

async function sGet(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function sSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

// Migrate old templates (recurring bool → frequency string)
function migrateTemplates(arr) {
  return arr.map(t => ({
    ...t,
    frequency: t.frequency ?? (t.recurring ? "daily" : "oneoff"),
  }));
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [loaded,     setLoaded]     = useState(false);
  const [templates,  setTemplates]  = useState(INIT_TEMPLATES);
  const [completions,setCompletions]= useState([]);
  const [player,     setPlayer]     = useState({ name: "Tim", streak: 0, lastDate: null });
  const [tab,        setTab]        = useState("today");
  const [flash,      setFlash]      = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [newQ,       setNewQ]       = useState({ name: "", category: "sonstige", difficulty: "normal", emoji: "📋", frequency: "daily" });
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset,setMonthOffset]= useState(0);

  // ── Storage ──
  useEffect(() => {
    (async () => {
      const [t, c, p] = await Promise.all([sGet("sl_tpl"), sGet("sl_comp"), sGet("sl_plr")]);
      if (t) setTemplates(migrateTemplates(t));
      if (c) setCompletions(c);
      if (p) setPlayer(p);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) sSet("sl_tpl",  templates);   }, [templates,   loaded]);
  useEffect(() => { if (loaded) sSet("sl_comp", completions); }, [completions, loaded]);
  useEffect(() => { if (loaded) sSet("sl_plr",  player);      }, [player,      loaded]);

  useEffect(() => {
    const yest = localDate(new Date(Date.now() - 86400000));
    if (player.lastDate && player.lastDate < yest) setPlayer(p => ({ ...p, streak: 0 }));
  }, []);

  // ── Derived ──
  const today     = TODAY();
  const weekStart = getWeekStart();

  const totalXP     = useMemo(() => completions.reduce((s,c) => s+c.earnedXp, 0), [completions]);
  const lvl         = useMemo(() => getLevelInfo(totalXP), [totalXP]);
  const rank        = useMemo(() => getRank(lvl.level), [lvl.level]);
  const todayComps  = useMemo(() => completions.filter(c => c.date === today), [completions, today]);
  const weekComps   = useMemo(() => completions.filter(c => c.weekStart === weekStart), [completions, weekStart]);
  const todayXP     = useMemo(() => todayComps.reduce((s,c) => s+c.earnedXp, 0), [todayComps]);

  // Split quests by frequency
  const dailyQuests  = useMemo(() => templates.filter(t => t.frequency === "daily" || (t.frequency === "oneoff" && t.oneOff === today)), [templates, today]);
  const weeklyQuests = useMemo(() => templates.filter(t => t.frequency === "weekly"), [templates]);

  // Done sets
  const dailyDoneIds  = useMemo(() => new Set(todayComps.map(c => c.templateId)), [todayComps]);
  const weeklyDoneIds = useMemo(() => new Set(weekComps.map(c => c.templateId)), [weekComps]);

  // Progress: combined daily + weekly
  const dailyDone  = dailyQuests.filter(q => dailyDoneIds.has(q.id)).length;
  const weeklyDone = weeklyQuests.filter(q => weeklyDoneIds.has(q.id)).length;
  const totalQ     = dailyQuests.length + weeklyQuests.length;
  const progress   = totalQ > 0 ? Math.round(((dailyDone + weeklyDone) / totalQ) * 100) : 0;
  const allDone    = totalQ > 0 && dailyDone === dailyQuests.length && weeklyDone === weeklyQuests.length;

  // Week/Month navigation derived data
  const weekDays    = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekLabel   = useMemo(() => getWeekLabel(weekOffset), [weekOffset]);
  const weekStartOff= useMemo(() => getWeekStartFromOffset(weekOffset), [weekOffset]);
  const monthLabel  = useMemo(() => getMonthLabel(monthOffset), [monthOffset]);
  const monArr      = useMemo(() => getMonthDays(monthOffset), [monthOffset]);
  const monthPrefix = useMemo(() => { const {year,month} = getMonthLabel(monthOffset); return `${year}-${String(month+1).padStart(2,"0")}`; }, [monthOffset]);

  // Week bar data
  const weekData  = useMemo(() => weekDays.map(d => ({ date: d, xp: completions.filter(c=>c.date===d).reduce((s,c)=>s+c.earnedXp,0), list: completions.filter(c=>c.date===d) })), [completions, weekDays]);
  const xpByDay   = useMemo(() => { const m={}; completions.forEach(c=>{ m[c.date]=(m[c.date]||0)+c.earnedXp; }); return m; }, [completions]);
  const monthXP   = useMemo(() => completions.filter(c=>c.date.startsWith(monthPrefix)).reduce((s,c)=>s+c.earnedXp,0), [completions, monthPrefix]);
  const monthCnt  = useMemo(() => completions.filter(c=>c.date.startsWith(monthPrefix)).length, [completions, monthPrefix]);
  const activeDays= useMemo(() => new Set(completions.filter(c=>c.date.startsWith(monthPrefix)).map(c=>c.date)).size, [completions, monthPrefix]);

  // ── Actions ──
  function doComplete(t, isWeekly = false) {
    const bon = streakBonus(player.streak), base = DIFF[t.difficulty].xp, earned = base + bon;
    setCompletions(p => [...p, {
      id: Date.now()+"", templateId: t.id, name: t.name, category: t.category,
      difficulty: t.difficulty, emoji: t.emoji, frequency: t.frequency ?? "daily",
      baseXp: base, streakBonus: bon, earnedXp: earned,
      date: today, weekStart, ts: Date.now(),
    }]);
    setPlayer(p => {
      const yest = localDate(new Date(Date.now()-86400000));
      let s = p.streak;
      if (p.lastDate !== today) { s = (p.lastDate===yest||!p.lastDate) ? s+1 : 1; }
      return { ...p, streak: s, lastDate: today };
    });
    setFlash({ xp: earned, key: Date.now() });
  }

  function doUndo(templateId, isWeekly = false) {
    setCompletions(p => {
      const pool = isWeekly
        ? p.filter(c => c.templateId === templateId && c.weekStart === weekStart)
        : p.filter(c => c.templateId === templateId && c.date === today);
      if (pool.length === 0) return p;
      const lastId = pool.at(-1).id;
      return p.filter(c => c.id !== lastId);
    });
  }

  function doAddQuest() {
    if (!newQ.name.trim()) return;
    const id = "t" + Date.now(), t = { ...newQ, id, name: newQ.name.trim() };
    if (t.frequency === "oneoff") t.oneOff = today;
    setTemplates(p => [...p, t]);
    setNewQ({ name:"", category:"sonstige", difficulty:"normal", emoji:"📋", frequency:"daily" });
    setShowAdd(false);
  }
  function doDelete(id) { setTemplates(p => p.filter(t => t.id !== id)); }

  // ── Loading ──
  if (!loaded) return (
    <div style={{ minHeight:"100vh", background:"#060612", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:40, height:40, border:"2px solid #38bdf8", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .9s linear infinite" }}/>
      <div style={{ fontFamily:"'Orbitron',monospace", color:"#38bdf8", fontSize:10, letterSpacing:4 }}>INITIALIZING</div>
    </div>
  );

  // ── QuestCard helper (inline) ──
  function QuestRow({ t, done, onToggle, bon, isWeekly = false }) {
    const d = DIFF[t.difficulty], cat = CATS[t.category] ?? CATS.sonstige;
    const earned = d.xp + bon;
    return (
      <div className="tap" onClick={onToggle} style={{
        background: done ? "rgba(12,17,30,.5)" : "rgba(12,18,40,.95)",
        border: `1px solid ${done ? "#0d1628" : d.color+"38"}`,
        borderRadius:14, padding:"14px 16px", marginBottom:10,
        display:"flex", alignItems:"center", gap:12,
        opacity: done ? .48 : 1,
        boxShadow: done ? "none" : `0 2px 16px ${d.color}12`,
        transition:"all .18s" }}>
        <div style={{ fontSize:25, minWidth:40, textAlign:"center" }}>{t.emoji}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:16, color:done?"#2d3f55":"#e2e8f0", textDecoration:done?"line-through":"none" }}>
            {t.name}
          </div>
          <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
            <span style={{ fontSize:9, padding:"2px 7px", borderRadius:20, fontWeight:700, letterSpacing:.5, color:cat.color, background:cat.color+"15" }}>
              {cat.label.toUpperCase()}
            </span>
            <span style={{ fontSize:9, padding:"2px 7px", borderRadius:20, fontWeight:700, letterSpacing:.5, color:d.color, background:d.color+"15" }}>
              {d.label.toUpperCase()}
            </span>
            {isWeekly && (
              <span style={{ fontSize:9, padding:"2px 7px", borderRadius:20, fontWeight:700, letterSpacing:.5, color:"#c084fc", background:"rgba(192,132,252,.15)" }}>
                📅 WEEKLY
              </span>
            )}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, minWidth:54 }}>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:12, fontWeight:700, color:done?"#2d3f55":d.color }}>
            +{earned}<span style={{ fontSize:8 }}>XP</span>
          </div>
          {bon > 0 && !done && <div style={{ fontSize:9, color:"#fbbf24" }}>🔥+{bon}</div>}
          <div style={{ width:30, height:30, borderRadius:"50%",
            border:`2px solid ${done?"#1a2540":d.color+"55"}`,
            background:done?d.color+"22":"transparent",
            display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s" }}>
            {done && <span style={{ color:d.color, fontSize:15, fontWeight:700 }}>✓</span>}
          </div>
        </div>
      </div>
    );
  }

  const bon = streakBonus(player.streak);

  // ── Render ──
  return (
    <div style={{ minHeight:"100vh", background:"#060612", color:"#e2e8f0", maxWidth:480, margin:"0 auto", position:"relative", fontFamily:"'Rajdhani',sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap');
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        body { margin:0; background:#060612; }
        @keyframes xpFloat {
          0%   { opacity:0; transform:translate(-50%,-50%) scale(.6); }
          15%  { opacity:1; transform:translate(-50%,-65%) scale(1.35); }
          65%  { opacity:1; transform:translate(-50%,-85%) scale(1); }
          100% { opacity:0; transform:translate(-50%,-110%) scale(.85); }
        }
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes glow    { 0%,100%{opacity:.7} 50%{opacity:1} }
        .tap:active { transform:scale(.96); opacity:.85; }
        .tab-btn    { transition:color .15s, border-color .15s; }
        .modal-sheet{ animation:slideUp .22s ease; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:2px; }
        input { outline:none; } input::placeholder { color:#334155; } button { cursor:pointer; }
      `}</style>

      {/* Ambient */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(ellipse at 12% 88%, rgba(56,189,248,.06) 0%, transparent 50%), radial-gradient(ellipse at 88% 12%, rgba(192,132,252,.06) 0%, transparent 50%)" }} />

      {/* XP Flash */}
      {flash && (
        <div key={flash.key} style={{ position:"fixed", top:"50%", left:"50%", zIndex:9999, pointerEvents:"none",
          animation:"xpFloat 1.5s ease-out forwards", fontFamily:"'Orbitron',monospace",
          fontSize:32, fontWeight:900, color:"#38bdf8",
          textShadow:"0 0 18px #38bdf8, 0 0 40px #38bdf870", letterSpacing:2, whiteSpace:"nowrap" }}
          onAnimationEnd={() => setFlash(null)}>
          +{flash.xp} XP
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:"rgba(6,6,18,.97)",
        backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(56,189,248,.12)", padding:"16px 18px 0" }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:48, height:48, borderRadius:13,
              border:`2px solid ${rank.color}`, background:`${rank.color}0a`,
              boxShadow:`0 0 18px ${rank.color}50, inset 0 0 12px ${rank.color}10`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Orbitron',monospace", fontSize:22, fontWeight:900, color:rank.color,
              flexShrink:0, animation:"glow 3s ease infinite" }}>
              {rank.rank}
            </div>
            <div>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:15, fontWeight:700, letterSpacing:1 }}>{player.name}</div>
              <div style={{ fontSize:11, color:rank.color, fontWeight:600, letterSpacing:.5, marginTop:2, animation:"shimmer 2.5s ease infinite" }}>
                {rank.title} · LV.{lvl.level}
              </div>
            </div>
          </div>
          <div style={{ background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.22)",
            borderRadius:12, padding:"8px 14px", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span style={{ fontSize:17 }}>🔥</span>
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:15, fontWeight:700, color:"#fbbf24", lineHeight:1 }}>{player.streak}</span>
            <span style={{ fontSize:8, color:"#78350f", letterSpacing:1, fontWeight:700 }}>STREAK</span>
          </div>
        </div>

        <div style={{ marginBottom:4 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:"#38bdf8", letterSpacing:1 }}>XP {lvl.inLvl.toLocaleString()} / {lvl.forNext.toLocaleString()}</span>
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:"#1e293b" }}>{totalXP.toLocaleString()} TOTAL</span>
          </div>
          <div style={{ height:5, background:"#0a1020", borderRadius:3, border:"1px solid #1a2540", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${lvl.pct}%`, background:"linear-gradient(90deg,#1d4ed8,#38bdf8,#7dd3fc)",
              boxShadow:"0 0 12px #38bdf8", borderRadius:3, transition:"width .9s cubic-bezier(.4,0,.2,1)" }} />
          </div>
        </div>

        <div style={{ display:"flex", marginTop:14 }}>
          {[{id:"today",l:"TODAY",i:"⚔️"},{id:"week",l:"WOCHE",i:"📅"},{id:"month",l:"MONAT",i:"📆"},{id:"quests",l:"QUESTS",i:"📋"}].map(({id,l,i})=>(
            <button key={id} className="tab-btn" onClick={()=>setTab(id)} style={{
              flex:1, padding:"10px 0 8px", border:"none", background:"transparent",
              borderBottom:`2px solid ${tab===id?"#38bdf8":"transparent"}`,
              color:tab===id?"#38bdf8":"#2d3f55", fontSize:9, fontWeight:700, letterSpacing:1,
              fontFamily:"'Rajdhani',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <span style={{fontSize:15}}>{i}</span>{l}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding:"18px 16px 90px", position:"relative", zIndex:1 }}>

        {/* ═══ TODAY ═══════════════════════════════════════════════════════ */}
        {tab === "today" && <>

          {/* Stats */}
          <div style={{ display:"flex", gap:8, marginBottom:18 }}>
            {[
              { v: todayXP,        l:"XP HEUTE",  c:"#38bdf8" },
              { v: dailyDone + weeklyDone, l:"ERLEDIGT",  c:"#c084fc" },
              { v: progress + "%", l:"PROGRESS",  c:"#4ade80" },
            ].map(({v,l,c})=>(
              <div key={l} style={{ flex:1, background:`${c}09`, border:`1px solid ${c}28`, borderRadius:12, padding:"12px 6px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:20, fontWeight:900, color:c }}>{v}</div>
                <div style={{ fontSize:9, color:"#3a4f6a", letterSpacing:.5, marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* All Done Banner */}
          {allDone && (
            <div style={{ background:"linear-gradient(135deg,rgba(56,189,248,.1),rgba(192,132,252,.1))",
              border:"1px solid rgba(56,189,248,.38)", borderRadius:14, padding:"14px 18px",
              marginBottom:18, textAlign:"center", boxShadow:"0 0 24px rgba(56,189,248,.1)",
              animation:"slideUp .4s ease" }}>
              <div style={{fontSize:24}}>🏆</div>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:12, fontWeight:700, color:"#38bdf8", letterSpacing:2, marginTop:5 }}>
                ALL QUESTS COMPLETE!
              </div>
              <div style={{ fontSize:11, color:"#475569", marginTop:3 }}>Daily + Weekly für heute erledigt</div>
            </div>
          )}

          {/* ─ WEEKLY CHALLENGES section ─ */}
          {weeklyQuests.length > 0 && <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, color:"#c084fc", letterSpacing:2 }}>WEEKLY CHALLENGES</div>
                  <div style={{ fontSize:9, color:"#c084fc", background:"rgba(192,132,252,.15)", border:"1px solid rgba(192,132,252,.3)", borderRadius:20, padding:"2px 8px", fontWeight:700, letterSpacing:.5 }}>
                    {weeklyDone}/{weeklyQuests.length}
                  </div>
                </div>
                <div style={{ fontSize:11, color:"#2d3f55", marginTop:2 }}>
                  Reset am {(() => { const t=new Date(); const off=(t.getDay()+6)%7; const mon=new Date(t); mon.setDate(t.getDate()-off+7); return mon.toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}); })()}
                </div>
              </div>
              <button onClick={()=>setShowAdd(true)} style={{ background:"rgba(192,132,252,.12)", border:"1px solid rgba(192,132,252,.4)",
                color:"#c084fc", borderRadius:9, padding:"8px 14px",
                fontSize:11, fontWeight:700, fontFamily:"'Rajdhani',sans-serif", letterSpacing:1 }}>
                + QUEST
              </button>
            </div>

            {weeklyQuests.map(t => (
              <QuestRow key={t.id} t={t}
                done={weeklyDoneIds.has(t.id)}
                onToggle={() => weeklyDoneIds.has(t.id) ? doUndo(t.id, true) : doComplete(t, true)}
                bon={bon} isWeekly />
            ))}

            {/* Divider */}
            <div style={{ height:1, background:"linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)", margin:"6px 0 18px" }}/>
          </>}

          {/* ─ DAILY QUESTS section ─ */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, color:"#38bdf8", letterSpacing:2 }}>DAILY QUESTS</div>
                <div style={{ fontSize:9, color:"#38bdf8", background:"rgba(56,189,248,.15)", border:"1px solid rgba(56,189,248,.3)", borderRadius:20, padding:"2px 8px", fontWeight:700, letterSpacing:.5 }}>
                  {dailyDone}/{dailyQuests.length}
                </div>
              </div>
              <div style={{ fontSize:11, color:"#2d3f55", marginTop:2 }}>
                {new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}
              </div>
            </div>
            {weeklyQuests.length === 0 && (
              <button onClick={()=>setShowAdd(true)} style={{ background:"rgba(56,189,248,.12)", border:"1px solid rgba(56,189,248,.4)",
                color:"#38bdf8", borderRadius:9, padding:"8px 15px",
                fontSize:11, fontWeight:700, fontFamily:"'Rajdhani',sans-serif", letterSpacing:1 }}>
                + QUEST
              </button>
            )}
          </div>

          {dailyQuests.length === 0
            ? <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:40 }}>⚔️</div>
                <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, color:"#1a2540", marginTop:12, letterSpacing:2 }}>NO ACTIVE QUESTS</div>
              </div>
            : dailyQuests.map(t => (
                <QuestRow key={t.id} t={t}
                  done={dailyDoneIds.has(t.id)}
                  onToggle={() => dailyDoneIds.has(t.id) ? doUndo(t.id, false) : doComplete(t, false)}
                  bon={bon} />
              ))
          }
        </>}

        {/* ═══ WEEK ════════════════════════════════════════════════════════ */}
        {tab === "week" && <>
          {/* Navigation */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button onClick={()=>setWeekOffset(o=>o-1)} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.2)",color:"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1}}>‹</button>
            <div style={{textAlign:"center",flex:1,padding:"0 8px"}}>
              {weekOffset === 0
                ? <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:"#38bdf8",letterSpacing:2}}>AKTUELLE WOCHE</div>
                : <div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#64748b",letterSpacing:1}}>{weekLabel.label}</div>
              }
            </div>
            <button onClick={()=>setWeekOffset(o=>o+1)} disabled={weekOffset >= 0}
              style={{background:weekOffset>=0?"transparent":"rgba(56,189,248,.08)",border:`1px solid ${weekOffset>=0?"#0d1628":"rgba(56,189,248,.2)"}`,color:weekOffset>=0?"#1a2840":"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1,cursor:weekOffset>=0?"default":"pointer"}}>›</button>
          </div>
          <div style={{ background:"rgba(56,189,248,.07)", border:"1px solid rgba(56,189,248,.2)", borderRadius:14, padding:"18px", marginBottom:18, textAlign:"center" }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:34, fontWeight:900, color:"#38bdf8" }}>
              {weekData.reduce((s,d)=>s+d.xp,0).toLocaleString()}
            </div>
            <div style={{ fontSize:10, color:"#2d3f55", letterSpacing:1, marginTop:3 }}>TOTAL XP {weekOffset===0?"DIESE WOCHE":weekLabel.label}</div>
          </div>
          {(() => {
            const mx = Math.max(1,...weekData.map(d=>d.xp));
            return <>
              <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:120, marginBottom:7 }}>
                {weekData.map((d,i)=>{const isT=d.date===today,h=d.xp>0?Math.max(8,(d.xp/mx)*100):3;return(
                  <div key={d.date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    {d.xp>0&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:8,color:isT?"#38bdf8":"#475569"}}>{d.xp}</div>}
                    <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end"}}>
                      <div style={{width:"100%",minHeight:3,height:`${h}%`,background:isT?"linear-gradient(180deg,#7dd3fc,#1d4ed8)":d.xp>0?"linear-gradient(180deg,#2d4060,#1a2840)":"#0d1628",borderRadius:"5px 5px 3px 3px",boxShadow:isT?"0 0 14px #38bdf880":"none",transition:"height .5s"}}/>
                    </div>
                  </div>);
                })}
              </div>
              <div style={{display:"flex",gap:6}}>
                {DAYS_DE.map((l,i)=><div key={l} style={{flex:1,textAlign:"center",fontSize:10,fontWeight:700,letterSpacing:.5,color:weekData[i]?.date===today?"#38bdf8":"#2d3f55",fontFamily:"'Rajdhani',sans-serif"}}>{l}</div>)}
              </div>
            </>;
          })()}
          <div style={{marginTop:22}}>
            {weekData.filter(d=>d.list.length>0).reverse().map(d=>(
              <div key={d.date} style={{background:"rgba(12,18,35,.85)",border:"1px solid #1a2840",borderRadius:13,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:700,color:d.date===today?"#38bdf8":"#94a3b8"}}>
                    {new Date(d.date+"T12:00").toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"short"})}
                    {d.date===today&&<span style={{marginLeft:7,fontSize:8,color:"#38bdf8",letterSpacing:1}}>● HEUTE</span>}
                  </div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#38bdf8",fontWeight:700}}>{d.xp} XP</div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {d.list.map(c=><span key={c.id} style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:(DIFF[c.difficulty]?.color)+"15",color:DIFF[c.difficulty]?.color,fontWeight:600}}>{c.emoji} {c.name}</span>)}
                </div>
              </div>
            ))}
            {weekData.every(d=>d.list.length===0)&&<div style={{textAlign:"center",padding:44,color:"#1a2840",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2}}>KEINE DATEN</div>}
          </div>
        </>}

        {/* ═══ MONTH ═══════════════════════════════════════════════════════ */}
        {tab === "month" && <>
          {/* Navigation */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button onClick={()=>setMonthOffset(o=>o-1)} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.2)",color:"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1}}>‹</button>
            <div style={{textAlign:"center",flex:1,padding:"0 8px"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:monthOffset===0?11:10,color:monthOffset===0?"#38bdf8":"#64748b",letterSpacing:2}}>
                {MONTHS_DE[monthLabel.month].toUpperCase()} {monthLabel.year}
              </div>
              {monthOffset === 0 && <div style={{fontSize:9,color:"#2d3f55",letterSpacing:1,marginTop:2}}>AKTUELLER MONAT</div>}
            </div>
            <button onClick={()=>setMonthOffset(o=>o+1)} disabled={monthOffset >= 0}
              style={{background:monthOffset>=0?"transparent":"rgba(56,189,248,.08)",border:`1px solid ${monthOffset>=0?"#0d1628":"rgba(56,189,248,.2)"}`,color:monthOffset>=0?"#1a2840":"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1,cursor:monthOffset>=0?"default":"pointer"}}>›</button>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {[{v:monthXP.toLocaleString(),l:"XP MONAT",c:"#38bdf8"},{v:monthCnt,l:"QUESTS",c:"#c084fc"},{v:activeDays,l:"AKTIV TAGE",c:"#4ade80"}].map(({v,l,c})=>(
              <div key={l} style={{flex:1,background:`${c}09`,border:`1px solid ${c}28`,borderRadius:12,padding:"12px 6px",textAlign:"center"}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:19,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:8,color:"#3a4f6a",letterSpacing:.5,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{background:"rgba(8,14,30,.92)",border:"1px solid #1a2840",borderRadius:18,padding:"18px 14px",marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:8}}>
              {DAYS_DE.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:"#2d3f55",fontWeight:700}}>{d}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
              {monArr.map((d,i)=>{
                if(!d)return<div key={"p"+i} style={{aspectRatio:"1"}}/>;
                const xp=xpByDay[d]||0,intensity=xp>0?Math.min(1,xp/120):0,isT=d===today,day=parseInt(d.split("-")[2]);
                return(
                  <div key={d} style={{aspectRatio:"1",borderRadius:8,background:xp>0?`rgba(56,189,248,${.07+intensity*.55})`:"rgba(255,255,255,.018)",border:`1px solid ${isT?"#38bdf8":xp>0?"rgba(56,189,248,.22)":"transparent"}`,boxShadow:isT?"0 0 12px #38bdf845":"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:2}}>
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
        {tab === "quests" && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:2}}>QUEST TEMPLATES</div>
              <div style={{fontSize:11,color:"#2d3f55",marginTop:3}}>
                {templates.filter(t=>t.frequency==="daily").length} daily · {templates.filter(t=>t.frequency==="weekly").length} weekly
              </div>
            </div>
            <button onClick={()=>setShowAdd(true)} style={{background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:9,padding:"8px 15px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ NEW</button>
          </div>

          {/* Daily templates */}
          {templates.filter(t=>t.frequency==="daily").length > 0 && <>
            <div style={{fontSize:9,color:"#38bdf8",letterSpacing:2,fontWeight:700,marginBottom:10,fontFamily:"'Orbitron',monospace"}}>⚔️ DAILY</div>
            {templates.filter(t=>t.frequency==="daily").map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige;return(
              <div key={t.id} style={{background:"rgba(12,18,40,.9)",border:"1px solid #1a2840",borderRadius:13,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:23}}>{t.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#e2e8f0"}}>{t.name}</div>
                  <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:cat.color,background:cat.color+"15",fontWeight:700,letterSpacing:.5}}>{cat.label.toUpperCase()}</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:d.color,background:d.color+"15",fontWeight:700,letterSpacing:.5}}>{d.label.toUpperCase()} · {d.xp} XP</span>
                  </div>
                </div>
                <button onClick={()=>doDelete(t.id)} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>🗑</button>
              </div>
            );})}
          </>}

          {/* Weekly templates */}
          {templates.filter(t=>t.frequency==="weekly").length > 0 && <>
            <div style={{fontSize:9,color:"#c084fc",letterSpacing:2,fontWeight:700,margin:"16px 0 10px",fontFamily:"'Orbitron',monospace"}}>📅 WEEKLY</div>
            {templates.filter(t=>t.frequency==="weekly").map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige;return(
              <div key={t.id} style={{background:"rgba(12,18,40,.9)",border:"1px solid rgba(192,132,252,.2)",borderRadius:13,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:23}}>{t.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#e2e8f0"}}>{t.name}</div>
                  <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:cat.color,background:cat.color+"15",fontWeight:700,letterSpacing:.5}}>{cat.label.toUpperCase()}</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:d.color,background:d.color+"15",fontWeight:700,letterSpacing:.5}}>{d.label.toUpperCase()} · {d.xp} XP</span>
                    <span style={{fontSize:9,padding:"2px 7px",borderRadius:20,color:"#c084fc",background:"rgba(192,132,252,.12)",fontWeight:700,letterSpacing:.5}}>📅 WEEKLY</span>
                  </div>
                </div>
                <button onClick={()=>doDelete(t.id)} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>🗑</button>
              </div>
            );})}
          </>}

          {templates.length===0&&<div style={{textAlign:"center",padding:44,color:"#1a2840",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2}}>NO TEMPLATES</div>}
        </>}
      </div>

      {/* ══ ADD QUEST MODAL ═══════════════════════════════════════════════════ */}
      {showAdd && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.88)",backdropFilter:"blur(12px)",display:"flex",alignItems:"flex-end"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}>
          <div className="modal-sheet" style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#080d1c",borderRadius:"24px 24px 0 0",border:"1px solid #1a2840",borderBottom:"none",padding:"24px 18px 48px"}}>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#38bdf8",letterSpacing:2}}>ADD QUEST</div>
              <button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",color:"#475569",fontSize:22,padding:"0 4px",lineHeight:1}}>✕</button>
            </div>

            {/* Name */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>QUEST NAME</div>
              <input value={newQ.name} onChange={e=>setNewQ(q=>({...q,name:e.target.value}))}
                placeholder="z.B. Joggen gehen" autoFocus
                style={{width:"100%",background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"13px 15px",color:"#e2e8f0",fontSize:16,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}/>
            </div>

            {/* Emoji */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>ICON</div>
              <input value={newQ.emoji} onChange={e=>setNewQ(q=>({...q,emoji:e.target.value}))}
                style={{width:58,background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"10px",color:"#e2e8f0",fontSize:22,textAlign:"center"}}/>
            </div>

            {/* Frequency — 3-Button */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>HÄUFIGKEIT</div>
              <div style={{display:"flex",gap:8}}>
                {[
                  {k:"daily",  l:"🔄 TÄGLICH",  c:"#38bdf8", sub:"Jeden Tag"},
                  {k:"weekly", l:"📅 WÖCHENTLICH",c:"#c084fc", sub:"Pro Woche"},
                  {k:"oneoff", l:"1️⃣ EINMALIG",  c:"#fbbf24", sub:"Nur heute"},
                ].map(({k,l,c,sub})=>(
                  <button key={k} onClick={()=>setNewQ(q=>({...q,frequency:k}))} style={{flex:1,padding:"11px 4px",borderRadius:11,
                    border:`1px solid ${newQ.frequency===k?c:"#1e2f48"}`,
                    background:newQ.frequency===k?c+"16":"transparent",
                    color:newQ.frequency===k?c:"#3a4f6a",
                    fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>
                    <div style={{fontSize:11}}>{l}</div>
                    <div style={{fontSize:9,opacity:.6,marginTop:2}}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>

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
                    <div style={{fontSize:12}}>{v.label}</div>
                    <div style={{fontSize:10,opacity:.6}}>{v.xp} XP</div>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={doAddQuest} disabled={!newQ.name.trim()} style={{width:"100%",padding:"16px",borderRadius:13,border:"none",background:newQ.name.trim()?"linear-gradient(135deg,#1d4ed8,#38bdf8)":"#111929",color:newQ.name.trim()?"#fff":"#2d3f55",fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,letterSpacing:2,boxShadow:newQ.name.trim()?"0 4px 24px rgba(56,189,248,.25)":"none",transition:"all .2s"}}>
              QUEST HINZUFÜGEN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
