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
  { rank:"E",   title:"Awakened One",          min:1,   max:4,    color:"#94a3b8" },
  { rank:"D",   title:"Shadow Hunter",          min:5,   max:9,    color:"#4ade80" },
  { rank:"C",   title:"Elite Hunter",           min:10,  max:19,   color:"#38bdf8" },
  { rank:"B",   title:"Master Hunter",          min:20,  max:34,   color:"#fbbf24" },
  { rank:"A",   title:"Shadow Sovereign",       min:35,  max:54,   color:"#c084fc" },
  { rank:"S",   title:"Monarch of Shadows",     min:55,  max:79,   color:"#f87171" },
  { rank:"SS",  title:"Transcendent Hunter",    min:80,  max:99,   color:"#fb923c" },
  { rank:"SSS", title:"Ruler of the Shadows",   min:100, max:149,  color:"#e879f9" },
  { rank:"NL",  title:"National Level Hunter",  min:150, max:249,  color:"#67e8f9" },
  { rank:"SM",  title:"Shadow Monarch",         min:250, max:9999, color:"#fde68a" },
];
// Tiered achievements: levels array = [bronze, silver, gold] thresholds
// Single-level achievements have no levels array
const ACHIEVEMENTS = [
  // ── Single-level ──────────────────────────────────────────────────────────
  { id:"first_step",  emoji:"⚔️",  title:"First Step",    desc:"Erste Quest erledigt",         check: s=>s.total>=1 },
  { id:"awakened",    emoji:"✨",  title:"Awakened",           desc:"Level 4 erreicht",             check: s=>s.level>=4 },
  { id:"d_rank",      emoji:"🗡️",  title:"Shadow Hunter",      desc:"D-Rank (Level 5)",             check: s=>s.level>=5 },
  { id:"c_rank",      emoji:"🌟",  title:"Elite Hunter",       desc:"C-Rank (Level 10)",            check: s=>s.level>=10 },
  { id:"b_rank",      emoji:"⚔️",  title:"Master Hunter",      desc:"B-Rank (Level 20)",            check: s=>s.level>=20 },
  { id:"lv25",        emoji:"🔷",  title:"Level 25",           desc:"Level 25 erreicht",            check: s=>s.level>=25 },
  { id:"a_rank",      emoji:"👑",  title:"Shadow Sovereign",   desc:"A-Rank (Level 35)",            check: s=>s.level>=35 },
  { id:"lv50",        emoji:"🔶",  title:"Level 50",           desc:"Level 50 erreicht",            check: s=>s.level>=50 },
  { id:"s_rank",      emoji:"💀",  title:"Monarch of Shadows", desc:"S-Rank (Level 55)",            check: s=>s.level>=55 },
  { id:"lv75",        emoji:"💎",  title:"Level 75",           desc:"Level 75 erreicht",            check: s=>s.level>=75 },
  { id:"ss_rank",     emoji:"🌑",  title:"Transcendent",       desc:"SS-Rank (Level 80)",           check: s=>s.level>=80 },
  { id:"sss_rank",    emoji:"🔱",  title:"Ruler of Shadows",   desc:"SSS-Rank (Level 100)",         check: s=>s.level>=100 },
  { id:"nl_rank",     emoji:"🌌",  title:"National Level",     desc:"NL-Rank (Level 150)",          check: s=>s.level>=150 },
  { id:"sm_rank",     emoji:"🩸",  title:"Shadow Monarch",     desc:"Shadow Monarch (Level 250)",   check: s=>s.level>=250 },
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
  { id:"weekly_goal", emoji:"🎯", title:"Goal Crusher", tiers:[
    {level:1, label:"Bronze", desc:"5 Wochen in Folge Ziel erreicht (+75 XP/Woche)",  check:s=>(s.weekGoalStreak||0)>=5},
    {level:2, label:"Silber", desc:"12 Wochen in Folge Ziel erreicht (+150 XP/Woche)", check:s=>(s.weekGoalStreak||0)>=12},
    {level:3, label:"Gold",   desc:"24 Wochen in Folge Ziel erreicht (+300 XP/Woche)", check:s=>(s.weekGoalStreak||0)>=24},
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
  { id:"t7", name:"Wohnung aufräumen",    category:"haushalt", difficulty:"normal", frequency:"daily",  repeatable:false, emoji:"🧹", weekLimit:1 },
  { id:"t8", name:"Wickeln",              category:"familie",  difficulty:"easy",   frequency:"daily",  repeatable:true,  emoji:"🍼" },
];
const DAYS_DE   = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const STORE_KEY = "sqt"; // permanent - never change this

// ─── Daily Quotes ─────────────────────────────────────────────────────────────
const QUOTES = [
  // ── Solo Leveling ──────────────────────────────────────────────────────────
  { text: "I alone am the exception.", source: "Sung Jinwoo · Solo Leveling" },
  { text: "The difference between the strong and the weak is the will to keep moving forward.", source: "Sung Jinwoo · Solo Leveling" },
  { text: "Arise.", source: "System · Solo Leveling" },
  { text: "If I run now, I'll be running for the rest of my life.", source: "Sung Jinwoo · Solo Leveling" },
  { text: "A true hunter never panics in the face of the unknown.", source: "Go Gunhee · Solo Leveling" },
  { text: "The weak have no right to determine how the strong should live.", source: "Antares · Solo Leveling" },
  { text: "There is no shame in acknowledging one's weakness. The shame lies in refusing to overcome it.", source: "Sung Jinwoo · Solo Leveling" },
  { text: "I didn't come this far to only come this far.", source: "Sung Jinwoo · Solo Leveling" },
  { text: "Those who cannot acknowledge themselves will eventually fail.", source: "System · Solo Leveling" },
  { text: "My purpose is not to be the strongest. My purpose is to protect those I love.", source: "Sung Jinwoo · Solo Leveling" },
  // ── Naruto ─────────────────────────────────────────────────────────────────
  { text: "Hard work is worthless for those that don't believe in themselves.", source: "Naruto Uzumaki · Naruto" },
  { text: "If you don't like your destiny, don't accept it. Instead have the courage to change it.", source: "Naruto Uzumaki · Naruto" },
  { text: "The pain of being alone is completely out of this world, isn't it?", source: "Gaara · Naruto" },
  { text: "A dropout will beat a genius through hard work.", source: "Rock Lee · Naruto" },
  { text: "The true measure of a shinobi is not how he lives, but how he dies.", source: "Jiraiya · Naruto" },
  // ── Attack on Titan ────────────────────────────────────────────────────────
  { text: "If you win, you live. If you lose, you die. If you don't fight, you can't win.", source: "Eren Yeager · Attack on Titan" },
  { text: "No matter what, I'll keep moving forward until my enemies are destroyed.", source: "Eren Yeager · Attack on Titan" },
  { text: "Someone who can't sacrifice anything can never change anything.", source: "Armin Arlert · Attack on Titan" },
  { text: "Dedicate your hearts.", source: "Erwin Smith · Attack on Titan" },
  // ── Hunter x Hunter ────────────────────────────────────────────────────────
  { text: "You should enjoy the little detours in life. That's where you'll find the things that are more important than what you want.", source: "Ging Freecs · Hunter x Hunter" },
  { text: "If you want to get to know someone, find out what makes them angry.", source: "Gon Freecs · Hunter x Hunter" },
  { text: "People only find me interesting because they can't tell whether I'm serious or not.", source: "Hisoka · Hunter x Hunter" },
  // ── Dragon Ball ────────────────────────────────────────────────────────────
  { text: "Power comes in response to a need, not a desire. You have to create that need.", source: "Goku · Dragon Ball Z" },
  { text: "It's not about how hard you hit. It's about how hard you can get hit and keep moving forward.", source: "Vegeta · Dragon Ball Z" },
  { text: "Surpass your limits. Right here, right now.", source: "Vegeta · Dragon Ball Z" },
  // ── Demon Slayer ───────────────────────────────────────────────────────────
  { text: "No matter how many people you may lose, you have no choice but to go on living.", source: "Tanjiro Kamado · Demon Slayer" },
  { text: "Set your heart ablaze.", source: "Flame Hashira Rengoku · Demon Slayer" },
  { text: "A sword is only as strong as the will of the one who wields it.", source: "Tanjiro Kamado · Demon Slayer" },
  // ── One Piece ──────────────────────────────────────────────────────────────
  { text: "Bring on the hardship. It's preferred in a path of carnage.", source: "Roronoa Zoro · One Piece" },
  { text: "Only those who have suffered long can see the light within the shadows.", source: "Roronoa Zoro · One Piece" },
  { text: "I don't want to conquer anything. I just think the guy with the most freedom in this whole ocean... that's the Pirate King!", source: "Monkey D. Luffy · One Piece" },
  // ── Jujutsu Kaisen ─────────────────────────────────────────────────────────
  { text: "No matter what, don't regret choosing to fight.", source: "Yuji Itadori · Jujutsu Kaisen" },
  { text: "Looking away never makes the pain go away.", source: "Satoru Gojo · Jujutsu Kaisen" },
  { text: "Technique alone is not enough to win a fight. What you need is the will to overcome your enemy.", source: "Satoru Gojo · Jujutsu Kaisen" },
  // ── Motivational (real) ────────────────────────────────────────────────────
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", source: "Aristotle" },
  { text: "The secret of getting ahead is getting started.", source: "Mark Twain" },
  { text: "Do something today that your future self will thank you for.", source: "Sean Patrick Flanery" },
  { text: "Small daily improvements are the key to staggering long-term results.", source: "Robin Sharma" },
  { text: "Discipline is choosing between what you want now and what you want most.", source: "Abraham Lincoln" },
  { text: "It always seems impossible until it's done.", source: "Nelson Mandela" },
  { text: "You don't rise to the level of your goals. You fall to the level of your systems.", source: "James Clear · Atomic Habits" },
];

const SEASONS = [
  { id:"shadow_month",    name:"Shadow Month",     emoji:"🌑", months:[10],   days:null,  xpMult:1.5,  color:"#c084fc", desc:"Oktober: +50% XP auf alle Quests" },
  { id:"new_year_sprint", name:"New Year Sprint",  emoji:"🎯", months:[1],    days:[1,7], xpMult:1.3,  color:"#38bdf8", desc:"Erste Januarwoche: +30% XP" },
  { id:"summer_grind",    name:"Summer Grind",     emoji:"☀️", months:[7],    days:null,  xpMult:1.2,  color:"#fbbf24", desc:"Juli: +20% XP auf alle Quests" },
  { id:"winter_warrior",  name:"Winter Warrior",   emoji:"❄️", months:[12],   days:null,  xpMult:1.2,  color:"#7dd3fc", desc:"Dezember: +20% XP auf alle Quests" },
  { id:"spring_awakening",name:"Spring Awakening", emoji:"🌸", months:[3,4],  days:null,  xpMult:1.15, color:"#f9a8d4", desc:"Frühling: +15% XP" },
];
const MONTHLY_CHALLENGES = [
  { id:"fitness_20",  emoji:"⚔️",  title:"Warrior Month",    desc:"Schließe 20 Fitness-Quests ab",      type:"cat",    cat:"fitness",  target:20 },
  { id:"haushalt_25", emoji:"🏠",  title:"Clean Sweep",      desc:"Schließe 25 Haushalt-Quests ab",     type:"cat",    cat:"haushalt", target:25 },
  { id:"familie_20",  emoji:"❤️",  title:"Family First",     desc:"Schließe 20 Familie-Quests ab",      type:"cat",    cat:"familie",  target:20 },
  { id:"streak_7",    emoji:"🔥",  title:"Consistency Week", desc:"Erreiche einen 7-Tage Streak",       type:"streak", target:7  },
  { id:"streak_14",   emoji:"🔥",  title:"Iron Will",        desc:"Erreiche einen 14-Tage Streak",      type:"streak", target:14 },
  { id:"total_50",    emoji:"🏅",  title:"Quest Blitz",      desc:"Schließe 50 Quests diesen Monat ab", type:"month",  target:50 },
  { id:"total_75",    emoji:"💎",  title:"Elite Grinder",    desc:"Schließe 75 Quests diesen Monat ab", type:"month",  target:75 },
  { id:"xp_2000",     emoji:"✨",  title:"XP Rush",          desc:"Sammle 2.000 XP diesen Monat",       type:"monthxp",target:2000 },
  { id:"xp_5000",     emoji:"🌟",  title:"Power Surge",      desc:"Sammle 5.000 XP diesen Monat",       type:"monthxp",target:5000 },
  { id:"einkauf_10",  emoji:"🛒",  title:"Supply Run",       desc:"Schließe 10 Einkauf-Quests ab",      type:"cat",    cat:"einkauf",  target:10 },
  { id:"hard_15",     emoji:"💀",  title:"Hard Mode",        desc:"Schließe 15 Hard Quests ab",         type:"diff",   diff:"hard",    target:15 },
  { id:"allcat",      emoji:"🌈",  title:"All-Rounder",      desc:"Schließe in jeder Kategorie mind. 5 Quests ab", type:"allcat", target:5 },
];
function getMonthlyChallenge(dateStr){
  const d=new Date(dateStr+"T12:00");
  const key=d.getFullYear()*100+(d.getMonth()+1);
  let h=0; const s=String(key); for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;
  return MONTHLY_CHALLENGES[h%MONTHLY_CHALLENGES.length];
}
function calcChallengeProgress(challenge, comps, player, monPrefix){
  const mc=comps.filter(c=>c.date.startsWith(monPrefix)&&!c.isGhost&&c.earnedXp>0);
  if(challenge.type==="cat") return mc.filter(c=>c.category===challenge.cat).length;
  if(challenge.type==="diff") return mc.filter(c=>c.difficulty===challenge.diff).length;
  if(challenge.type==="month") return mc.length;
  if(challenge.type==="monthxp") return mc.reduce((s,c)=>s+c.earnedXp,0);
  if(challenge.type==="streak") return player.streak||0;
  if(challenge.type==="allcat"){
    const cats=["fitness","haushalt","familie","einkauf","sonstige"];
    return Math.min(...cats.map(cat=>mc.filter(c=>c.category===cat).length));
  }
  return 0;
}
function getActiveSeason(dateStr){
  const d=new Date(dateStr+"T12:00");
  const m=d.getMonth()+1, day=d.getDate();
  return SEASONS.find(s=>{
    if(!s.months.includes(m))return false;
    if(s.days){return day>=s.days[0]&&day<=s.days[1];}
    return true;
  })||null;
}

function getDailyQuote(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length];
}


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
// Deterministic daily random: hash date string to 0-99, Double XP if < 20 (20% chance)
function isDblXpDay(dateStr){
  let h=0;
  for(let i=0;i<dateStr.length;i++){h=(h*31+dateStr.charCodeAt(i))>>>0;}
  return (h%5)===0;
}
function weekDays(weekOffset=0){const t=new Date(),o=(t.getDay()+6)%7,mon=new Date(t);mon.setDate(t.getDate()-o+weekOffset*7);return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return ld(d);});}
function weekStartFromOffset(weekOffset=0){const t=new Date(),o=(t.getDay()+6)%7,mon=new Date(t);mon.setDate(t.getDate()-o+weekOffset*7);return ld(mon);}

function buildWeekHistory(completions){
  // Group completions by weekStart, exclude current week and ghost completions
  const ws=weekStartFromOffset(0);
  const byWeek={};
  completions.forEach(c=>{
    if(c.weekStart&&c.weekStart!==ws&&!c.isGhost&&c.earnedXp>0){
      if(!byWeek[c.weekStart])byWeek[c.weekStart]={xp:0};
      byWeek[c.weekStart].xp+=c.earnedXp;
    }
  });
  return Object.entries(byWeek)
    .filter(([,{xp}])=>xp>=50) // skip weeks with near-zero xp (before app existed)
    .sort((a,b)=>a[0]<b[0]?-1:1)
    .slice(-12)
    .map(([weekStart,{xp}])=>({
      weekStart, xp,
      goal:null,
      reached: true, // historical weeks: if you had activity, count as reached
    }));
}
function monDays(monthOffset=0){const ref=new Date();ref.setDate(1);ref.setMonth(ref.getMonth()+monthOffset);const year=ref.getFullYear(),month=ref.getMonth(),f=new Date(year,month,1),la=new Date(year,month+1,0),pad=(f.getDay()+6)%7,arr=Array(pad).fill(null);for(let d=1;d<=la.getDate();d++)arr.push(ld(new Date(year,month,d)));return arr;}
function monLabel(monthOffset=0){const ref=new Date();ref.setDate(1);ref.setMonth(ref.getMonth()+monthOffset);return{month:ref.getMonth(),year:ref.getFullYear()};}
function weekLabel(weekOffset=0){const days=weekDays(weekOffset);const start=new Date(days[0]+"T12:00"),end=new Date(days[6]+"T12:00");const fmt=d=>d.toLocaleDateString("de-DE",{day:"numeric",month:"short"});const d=new Date(days[0]+"T12:00");d.setHours(0,0,0,0);d.setDate(d.getDate()+4-(d.getDay()||7));const kw=Math.ceil((((d-new Date(d.getFullYear(),0,1))/86400000)+1)/7);return{label:`KW ${kw}: ${fmt(start)} - ${fmt(end)}`,kw};}
function migTpl(arr){return arr.map((t,i)=>({repeatable:false,activeDays:[],weekLimit:0,pauseUntil:null,...t,frequency:t.frequency==="weekly"?"daily":t.frequency??(t.recurring?"daily":"daily"),weekLimit:t.frequency==="weekly"?Math.max(t.weekLimit||0,1):t.weekLimit||0,order:t.order??i}));}
function mkPlayer(p={}){const base={name:"Tim",streak:0,lastDate:null,completedOnce:[],weeklyGoal:500,freezes:1,lastFreezeMonth:null,achievements:[],usedFreeze:false,weekHistory:[],weekGoalStreak:0,weekGoalBonusPaid:null,monthChallengePaid:null,...p};base.achievements=migAchs(base.achievements);return base;}

// Returns consecutive days streak for a specific template up to (not including) today
function questStreak(comps, templateId, today, template) {
  const days = new Set(comps.filter(c=>c.templateId===templateId).map(c=>c.date));
  const activeDays = template?.activeDays; // 0=Mo,1=Di,...,6=So
  const hasActiveDays = activeDays && activeDays.length > 0;
  let streak = 0;
  let d = new Date(today + 'T12:00');
  // include today if already done
  while(true) {
    const dow = (d.getDay()+6)%7; // 0=Mo..6=So
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    // skip days this quest wasn't scheduled
    if(hasActiveDays && !activeDays.includes(dow)){
      d.setDate(d.getDate()-1);
      if(streak===0&&d<new Date(today+'T12:00')){break;} // don't loop forever if today not scheduled
      // safety: don't go back more than 365 days
      if(new Date(today+'T12:00')-d > 365*86400000) break;
      continue;
    }
    if(!days.has(key)) break;
    streak++;
    d.setDate(d.getDate()-1);
    if(streak>365) break;
  }
  return streak;
}
function diffStreakMult(streak, difficulty){
  if(difficulty==="hard"){
    if(streak>=30)return 1.5;
    if(streak>=14)return 1.2;
    if(streak>=7) return 1.1;
  } else if(difficulty==="normal"){
    if(streak>=30)return 1.3;
    if(streak>=14)return 1.15;
    if(streak>=7) return 1.1;
  } else {
    if(streak>=30)return 1.2;
    if(streak>=14)return 1.1;
    if(streak>=7) return 1.05;
  }
  return 1;
}
function computeStats(comps, player, level) {
  const cat={};
  comps.forEach(c=>{cat[c.category]=(cat[c.category]||0)+1;});
  return { total:comps.length, totalXP:comps.reduce((s,c)=>s+c.earnedXp,0), streak:player.streak, level, cat, onceDone:(player.completedOnce||[]).length, usedFreeze:player.usedFreeze||false, weekGoalStreak:player.weekGoalStreak||0 };
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
  const [plr,   setPlr]   = useState(()=>{
    const p=mkPlayer(saved?.player);
    const compsInit=saved?.completions??[];
    // Backfill weekHistory from existing completions if empty OR if goals look wrong (old default 500)
    // Always rebuild from completions to ensure correctness
    if(compsInit.length){
      const rebuilt=buildWeekHistory(compsInit);
      // Merge: keep goal values from existing history if present
      const existing=p.weekHistory||[];
      p.weekHistory=rebuilt.map(r=>{
        const ex=existing.find(e=>e.weekStart===r.weekStart);
        return ex&&ex.goal?{...r,goal:ex.goal,reached:ex.reached??r.reached}:r;
      });
    }
    return p;
  });
  const [tab,   setTab]   = useState("today");
  const [profTab, setProfTab] = useState("hunter");
  const [flash, setFlash] = useState(null);         // {xp, key}
  const [achFlash, setAchFlash] = useState(null);   // achievement unlock
  const [lvlFlash, setLvlFlash] = useState(null);   // {level, rank, key}
  const [showAdd,   setShowAdd]   = useState(false);
  const [showFreeze,setShowFreeze]= useState(false); // freeze prompt
  const [pendingNote, setPendingNote] = useState(null); // {compId}
  const [noteText, setNoteText] = useState("");
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [newQ, setNewQ] = useState({name:"",category:"sonstige",difficulty:"normal",emoji:"📋",frequency:"daily",repeatable:false,noteEnabled:false});
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [pauseSheet, setPauseSheet] = useState(null);   // quest id for pause bottom sheet
  const [editingId,   setEditingId]   = useState(null);
  const noteTimer = useRef(null);

  // Persist
  useEffect(()=>{ saveAll(tpl,comps,plr); },[tpl,comps,plr]);

  // On mount: streak check, freeze regen, show freeze prompt, auto weekly goal
  useEffect(()=>{
    const yest=ld(new Date(Date.now()-86400000)), mon=MONTH();
    const curWs=wkStart();
    let p={...plr};
    // Freeze regen: 1 per month, max 5
    if(p.lastFreezeMonth!==mon){p={...p,freezes:Math.min(5,(p.freezes||0)+1),lastFreezeMonth:mon};}
    // Streak check
    if(p.lastDate&&p.lastDate<yest){
      if(p.streak>0&&p.freezes>0){ setShowFreeze(true); }
      else { p={...p,streak:0}; }
    }
    // Auto weekly goal: compute from prev week on new week start
    const hist=[...(p.weekHistory||[])];
    const hasCurrentWeek=hist.some(h=>h.weekStart===curWs);
    if(!hasCurrentWeek&&hist.length>0){
      const prev=hist[hist.length-1];
      const prevXP=prev.xp||0;
      // Always use current weeklyGoal as base (user may have changed it)
      const prevGoal=p.weeklyGoal||500;
      let newGoal;
      if(prevXP>=prevGoal){ newGoal=Math.round(prevGoal*1.1); }         // reached: +10%
      else if(prevXP>=prevGoal*0.8){ newGoal=prevGoal; }                // close: keep same
      else { newGoal=Math.max(300,Math.round(prevGoal*0.9)); }           // missed badly: -10%
      newGoal=Math.min(newGoal,Math.round(prevGoal*1.2));                // cap at +20%
      // Add current week placeholder
      hist.push({weekStart:curWs,xp:0,goal:newGoal,reached:false});
      p={...p,weeklyGoal:newGoal,weekHistory:hist};
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
  const dblXp      =isDblXpDay(today);
  const todayDow   =useMemo(()=>(new Date().getDay()+6)%7,[]);// 0=Mo..6=So
  const dailyQ     =useMemo(()=>tpl.filter(t=>{
    if(t.frequency!=="daily")return false;
    if(t.pauseUntil&&t.pauseUntil>=today)return false; // paused
    if(t.activeDays&&t.activeDays.length>0&&!t.activeDays.includes(todayDow))return false;
    if(t.weekLimit>0){
      const doneThisWeek=comps.filter(c=>c.templateId===t.id&&c.weekStart===ws).length;
      if(doneThisWeek>=t.weekLimit)return false;
    }
    return true;
  }),[tpl,todayDow,comps,ws]);
  const weeklyQ    =useMemo(()=>[]/*removed*/, []);// kept for safe ref cleanup
  const [catFilter, setCatFilter] = useState(null); // null = all
  const onceQ      =useMemo(()=>tpl.filter(t=>t.frequency==="once"),[tpl]);
  const onceActive =useMemo(()=>onceQ.filter(t=>!(plr.completedOnce||[]).includes(t.id)),[onceQ,plr.completedOnce]);
  const doneIds    =useMemo(()=>new Set(todayC.map(c=>c.templateId)),[todayC]);
  const wkDoneIds  =useMemo(()=>new Set(weekC.map(c=>c.templateId)),[weekC]);
  const repCnt     =useMemo(()=>{const m={};todayC.forEach(c=>{m[c.templateId]=(m[c.templateId]||0)+1;});return m;},[todayC]);
  const dailyDone  =dailyQ.filter(q=>q.repeatable?(repCnt[q.id]||0)>0:doneIds.has(q.id)).length;
  const dailyTotal =dailyQ.length;
  const weeklyDone =0;
  const onceDone   =onceQ.length-onceActive.length;
  const totalDone  =dailyDone+onceDone;
  const totalQ     =dailyTotal+onceQ.length;
  const progress   =totalQ>0?Math.round((totalDone/totalQ)*100):0;
  const allDone    =totalQ>0&&dailyDone===dailyTotal&&onceActive.length===0;
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
    // Track weekly goal history — update current week + record prev when rolling over
    const curWeekComps=newComps.filter(c=>c.weekStart===ws&&!c.isGhost&&c.earnedXp>0);
    const curXPForHist=curWeekComps.reduce((s,c)=>s+c.earnedXp,0);
    let hist=[...(newPlr.weekHistory||[])];
    const curHistIdx=hist.findIndex(h=>h.weekStart===ws);
    const curGoal=newPlr.weeklyGoal||500;
    if(curHistIdx>=0){ hist[curHistIdx]={...hist[curHistIdx],xp:curXPForHist,reached:curXPForHist>=curGoal}; }
    else { hist.push({weekStart:ws,xp:curXPForHist,goal:curGoal,reached:curXPForHist>=curGoal}); }
    if(hist.length>13) hist.splice(0,hist.length-13);
    newPlr={...newPlr,weekHistory:hist};
    // Record prev week when week rolls over
    const prevWs = newComps.length>1 ? newComps[newComps.length-2]?.weekStart : null;
    if(prevWs && prevWs !== ws){
      const prevXP = newComps.filter(c=>c.weekStart===prevWs&&!c.isGhost&&c.earnedXp>0).reduce((s,c)=>s+c.earnedXp,0);
      const prevHist=[...(newPlr.weekHistory||[])];
      if(!prevHist.find(h=>h.weekStart===prevWs)){
        const prevGoal=curGoal;
        prevHist.push({weekStart:prevWs,xp:prevXP,goal:prevGoal,reached:prevXP>=prevGoal});
        if(prevHist.length>13) prevHist.splice(0,prevHist.length-13);
        newPlr={...newPlr,weekHistory:prevHist};
      }
    }
    // Weekly goal bonus: pay out once per week when goal first reached
    const curWeekXP=newComps.filter(c=>c.weekStart===ws).reduce((s,c)=>s+c.earnedXp,0);
    const goal=newPlr.weeklyGoal||500;
    const goalJustReached=curWeekXP>=goal&&(newPlr.weekGoalBonusPaid!==ws);
    if(goalJustReached){
      const wgs=newPlr.weekGoalStreak||0;
      const achLvl=getAchLevel(migAchs(newPlr.achievements||[]),'weekly_goal');
      const bonusMap={0:0,1:75,2:150,3:300};
      const bonus=bonusMap[achLvl]||0;
      newPlr={...newPlr,weekGoalBonusPaid:ws,weekGoalStreak:wgs+1};
      if(bonus>0){
        const bonusComp={id:'wgb_'+ws,templateId:'_weekgoal',name:'Wochenziel erreicht!',category:'sonstige',difficulty:'normal',emoji:'🎯',frequency:'bonus',repeatable:false,baseXp:bonus,streakBonus:0,earnedXp:bonus,date:today,weekStart:ws,ts:Date.now(),note:''};
        newComps=[...newComps,bonusComp];
      }
    }
    // Monthly challenge bonus
    const monChal=getMonthlyChallenge(today);
    const monPaidKey=MONTH()+"-"+monChal.id;
    if(newPlr.monthChallengePaid!==monPaidKey){
      const prog=calcChallengeProgress(monChal,newComps,newPlr,MONTH());
      if(prog>=monChal.target){
        const chalComp={id:"mcb_"+monPaidKey,templateId:"_monthchallenge",name:"Monats-Challenge: "+monChal.title,category:"sonstige",difficulty:"hard",emoji:monChal.emoji,frequency:"bonus",repeatable:false,baseXp:200,streakBonus:0,earnedXp:200,date:today,weekStart:ws,ts:Date.now(),note:""};
        newComps=[...newComps,chalComp];
        newPlr={...newPlr,monthChallengePaid:monPaidKey};
      }
    }
    // Level-up detection
    const newTotalXP=newComps.reduce((s,c)=>s+c.earnedXp,0);
    const newLvl=lvlInfo(newTotalXP);
    if(newLvl.level>lv.level){
      const newRank=RANKS.find(r=>newLvl.level>=r.min&&newLvl.level<=r.max)||RANKS[0];
      setLvlFlash({level:newLvl.level,rank:newRank,key:Date.now()});
    }
    setComps(newComps); setPlr(newPlr); saveAll(tpl,newComps,newPlr);
  }

  function doComplete(t) {
    const base=DIFF[t.difficulty].xp;
    const qs=questStreak(comps,t.id,today,t);
    const diffMult=diffStreakMult(qs,t.difficulty);
    const activeSeason=getActiveSeason(today);
    const seasonMult=activeSeason?activeSeason.xpMult:1;
    const bossMult=t.frequency==="boss"?3:1;
    const earned=Math.round((base+bon)*(dblXp?2:1)*diffMult*seasonMult*bossMult);
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
    if(t.noteEnabled){setPendingNote({compId:id}); setNoteText("");}
    noteTimer.current=setTimeout(()=>setPendingNote(null),8000);
    afterComplete(nc,np);
  }

  function doUndo(tid) {
    const pool=comps.filter(c=>c.templateId===tid&&c.date===today);
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
    const yest=ld(new Date(Date.now()-86400000));
    // Ghost completions: preserve quest streaks for yesterday
    const ghostComps=tpl.filter(t=>t.frequency==="daily").map(t=>({
      id:'freeze_'+t.id+'_'+yest,templateId:t.id,name:t.name,category:t.category,
      difficulty:t.difficulty,emoji:t.emoji,frequency:t.frequency,repeatable:false,
      baseXp:0,streakBonus:0,earnedXp:0,date:yest,weekStart:ws,ts:Date.now(),note:'❄️ freeze',isGhost:true
    }));
    // Only add ghost if no real completion yesterday
    const newComps=[...comps,...ghostComps.filter(g=>!comps.some(c=>c.templateId===g.templateId&&c.date===yest))];
    const np={...plr,freezes:plr.freezes-1,usedFreeze:true};
    setComps(newComps); setPlr(np); saveAll(tpl,newComps,np); setShowFreeze(false);
    afterComplete(comps,np);
  }
  function doBreakStreak(){const np={...plr,streak:0};setPlr(np);saveAll(tpl,comps,np);setShowFreeze(false);}

  function doPause(tid, days){
    const d=new Date(); d.setDate(d.getDate()+days);
    const until=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    const nt=tpl.map(t=>t.id===tid?{...t,pauseUntil:until}:t);
    setTpl(nt); saveAll(nt,comps,plr); setPauseSheet(null); setSwipeId(null);
  }

  function doUnpause(tid){
    const nt=tpl.map(t=>t.id===tid?{...t,pauseUntil:null}:t);
    setTpl(nt); saveAll(nt,comps,plr);
  }

  const EMPTY_Q={name:'',category:'sonstige',difficulty:'normal',emoji:'📋',frequency:'daily',repeatable:false,activeDays:[],weekLimit:0,noteEnabled:false};
  function openAdd(){
    setEditingId(null);
    setNewQ({...EMPTY_Q});
    setShowAdd(true);
  }
  function openEdit(t){
    setEditingId(t.id);
    setNewQ({name:t.name,category:t.category,difficulty:t.difficulty,emoji:t.emoji,frequency:t.frequency,repeatable:t.repeatable||false,activeDays:t.activeDays||[],weekLimit:t.weekLimit||0,noteEnabled:t.noteEnabled||false});
    setShowAdd(true);
  }
  function doSaveQuest(){
    if(!newQ.name.trim())return;
    if(editingId){
      const nt=tpl.map(t=>t.id===editingId?{...t,...newQ,name:newQ.name.trim()}:t);
      setTpl(nt); saveAll(nt,comps,plr);
    } else {
      const id='t'+Date.now();
      const bossDeadline=newQ.frequency==="boss"?(()=>{const bd=new Date();bd.setDate(bd.getDate()+(newQ.bossDeadlineDays||7));return bd.getFullYear()+"-"+String(bd.getMonth()+1).padStart(2,"0")+"-"+String(bd.getDate()).padStart(2,"0");})():undefined;
      const t={...newQ,id,name:newQ.name.trim(),order:Date.now(),...(bossDeadline?{bossDeadline,bossStatus:"active"}:{})};
      const nt=[...tpl,t]; setTpl(nt); saveAll(nt,comps,plr);
    }
    setNewQ({...EMPTY_Q});
    setEditingId(null); setShowAdd(false);
  }
  function doDelete(id){const nt=tpl.filter(t=>t.id!==id);setTpl(nt);saveAll(nt,comps,plr);}

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
    // Update current week's history entry with new goal
    const hist=[...(plr.weekHistory||[])];
    const curIdx=hist.findIndex(h=>h.weekStart===ws);
    const curXP=weekC.reduce((s,c)=>s+c.earnedXp,0);
    if(curIdx>=0){ hist[curIdx]={...hist[curIdx],goal:g,reached:curXP>=g}; }
    else { hist.push({weekStart:ws,xp:curXP,goal:g,reached:curXP>=g}); }
    const np={...plr,weeklyGoal:g,weekHistory:hist}; setPlr(np); saveAll(tpl,comps,np); setEditGoal(false);
  }

  // ── Sub-Components ───────────────────────────────────────────────────────────
  function NormalRow({t,done,onToggle}){
    const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige;
    const qStreak=questStreak(comps,t.id,today,t);
    const dm=diffStreakMult(qStreak,t.difficulty);
    const earned=Math.round((d.xp+bon)*(dblXp?2:1)*dm);
    return(<div className="tap" onClick={onToggle} style={{background:done?"rgba(12,17,30,.5)":"rgba(12,18,40,.95)",border:`1px solid ${done?"#0d1628":d.color+"38"}`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,opacity:done?.48:1,boxShadow:done?"none":`0 2px 16px ${d.color}12`,transition:"all .18s"}}>
      <div style={{fontSize:25,minWidth:40,textAlign:"center"}}>{t.emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:16,color:done?"#2d3f55":"#e2e8f0",textDecoration:done?"line-through":"none"}}>{t.name}</div>
        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap",alignItems:"center"}}>
          <Tag color={(CATS[t.category]??CATS.sonstige).color} label={(CATS[t.category]??CATS.sonstige).label.toUpperCase()}/>
          <Tag color={d.color} label={d.label.toUpperCase()}/>
          {t.weekLimit>0&&<Tag color="#94a3b8" label={`${(comps.filter(c=>c.templateId===t.id&&c.weekStart===ws).length)}/${t.weekLimit}W`}/>}
          {qStreak>=2&&<span style={{fontSize:10,color:"#fbbf24",fontWeight:700}}>🔥{qStreak}</span>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,minWidth:52}}>
        <XPLabel earned={earned} bon={bon} done={done} color={d.color} dbl={dblXp} mult={dm}/>
        <Circle done={done} color={d.color}/>
      </div>
    </div>);
  }

  function RepeatRow({t}){
    const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,count=repCnt[t.id]||0,earned=(d.xp+bon)*(dblXp?2:1);
    const qStreak=questStreak(comps,t.id,today,t);
    return(<div style={{background:"rgba(12,18,40,.95)",border:`1px solid ${d.color}38`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,boxShadow:`0 2px 16px ${d.color}12`}}>
      <div style={{fontSize:25,minWidth:40,textAlign:"center"}}>{t.emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:16,color:"#e2e8f0"}}>{t.name}</div>
        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap",alignItems:"center"}}>
          <Tag color={cat.color} label={cat.label.toUpperCase()}/>
          <Tag color={d.color} label={d.label.toUpperCase()}/>
          <Tag color="#fbbf24" label="🔁 REPEAT"/>
          {t.weekLimit>0&&<Tag color="#94a3b8" label={`${(comps.filter(c=>c.templateId===t.id&&c.weekStart===ws).length)}/${t.weekLimit}W`}/>}
          {qStreak>=2&&<span style={{fontSize:10,color:"#fbbf24",fontWeight:700}}>🔥{qStreak}</span>}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={e=>{e.stopPropagation();doUndo(t.id);}} disabled={count===0} style={{width:32,height:32,borderRadius:"50%",border:`1.5px solid ${count>0?"#475569":"#1a2540"}`,background:"transparent",color:count>0?"#94a3b8":"#2d3f55",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>−</button>
        <div style={{minWidth:44,textAlign:"center"}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:22,fontWeight:900,color:count>0?d.color:"#2d3f55",lineHeight:1}}>x{count}</div>
          {count>0&&<div style={{fontSize:9,color:"#3a4f6a",marginTop:2}}>{count*earned} XP</div>}
        </div>
        <button className="tap" onClick={e=>{e.stopPropagation();doComplete(t);}} style={{width:38,height:38,borderRadius:"50%",border:`2px solid ${d.color}`,background:d.color+"20",color:d.color,fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</button>
      </div>
    </div>);
  }

  function OnceRow({t}){
    const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,earned=(d.xp+bon)*(dblXp?2:1);
    return(<div className="tap" onClick={()=>doComplete(t)} style={{background:"rgba(12,18,40,.95)",border:`1px solid ${d.color}38`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,boxShadow:`0 2px 16px ${d.color}12`}}>
      <div style={{fontSize:25,minWidth:40,textAlign:"center"}}>{t.emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:16,color:"#e2e8f0"}}>{t.name}</div>
        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
          <Tag color={cat.color} label={cat.label.toUpperCase()}/>
          <Tag color={d.color} label={d.label.toUpperCase()}/>
          <Tag color="#fb923c" label="1x EINMALIG"/>
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
        @keyframes lvlUp{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}75%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-52%) scale(.95)}}@keyframes xpFloat{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}15%{opacity:1;transform:translate(-50%,-65%) scale(1.35)}65%{opacity:1;transform:translate(-50%,-85%) scale(1)}100%{opacity:0;transform:translate(-50%,-110%) scale(.85)}}
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
      {lvlFlash&&<div key={lvlFlash.key} style={{position:"fixed",top:"50%",left:"50%",zIndex:9997,pointerEvents:"none",animation:"lvlUp 2.8s ease-out forwards",transform:"translate(-50%,-50%)",textAlign:"center",background:"radial-gradient(ellipse,rgba(56,189,248,.18) 0%,transparent 70%)",padding:"40px 50px",borderRadius:30}} onAnimationEnd={()=>setLvlFlash(null)}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#38bdf8",letterSpacing:4,marginBottom:8,textShadow:"0 0 20px #38bdf8"}}>LEVEL UP</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:72,fontWeight:900,color:lvlFlash.rank.color,lineHeight:1,textShadow:`0 0 40px ${lvlFlash.rank.color},0 0 80px ${lvlFlash.rank.color}60`}}>{lvlFlash.level}</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:lvlFlash.rank.color,letterSpacing:3,marginTop:8,opacity:.9}}>{lvlFlash.rank.rank} · {lvlFlash.rank.title}</div>
      </div>}

      {/* Note Input */}
      {pauseSheet&&(()=>{const pt=tpl.find(t=>t.id===pauseSheet);return pt&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)"}} onClick={()=>setPauseSheet(null)}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:0,left:0,right:0,maxWidth:480,margin:"0 auto",background:"#080d1c",borderRadius:"20px 20px 0 0",border:"1px solid rgba(248,113,113,.3)",borderBottom:"none",padding:"22px 18px 40px",animation:"slideUp .2s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
              <span style={{fontSize:22}}>{pt.emoji}</span>
              <div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:"#f87171",letterSpacing:2,fontWeight:700}}>QUEST PAUSIEREN</div>
                <div style={{fontSize:13,color:"#e2e8f0",fontWeight:600,marginTop:2}}>{pt.name}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{l:"1 Tag",d:1},{l:"2 Tage",d:2},{l:"3 Tage",d:3},{l:"1 Woche",d:7},{l:"2 Wochen",d:14},{l:"1 Monat",d:30}].map(({l,d})=>(
                <button key={d} onClick={()=>doPause(pt.id,d)} style={{padding:"13px",borderRadius:11,border:"1px solid rgba(248,113,113,.3)",background:"rgba(248,113,113,.08)",color:"#fca5a5",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14}}>⏸ {l}</button>
              ))}
            </div>
          </div>
        </div>
      );})()}
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
      {showFreeze&&(()=>{
        const yest=ld(new Date(Date.now()-86400000));
        const endangered=tpl.filter(t=>t.frequency==="daily").map(t=>({t,s:questStreak(comps,t.id,yest,t)})).filter(x=>x.s>=2);
        return(
        <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 20px"}}>
          <div style={{background:"#0a0f1e",border:"1px solid rgba(56,189,248,.3)",borderRadius:20,padding:"28px 22px",maxWidth:360,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:42,marginBottom:10}}>❄️</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#38bdf8",letterSpacing:2,marginBottom:6}}>STREAK FREEZE</div>
            <div style={{fontSize:13,color:"#94a3b8",marginBottom:10}}>Gestern keine Quest erledigt — dein <span style={{color:"#fbbf24",fontWeight:700}}>{plr.streak}-Tage Streak</span> ist in Gefahr.</div>
            {endangered.length>0&&<div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:11,padding:"10px 12px",marginBottom:14,textAlign:"left"}}>
              <div style={{fontSize:9,color:"#f87171",letterSpacing:1.5,fontWeight:700,marginBottom:6,fontFamily:"'Orbitron',monospace"}}>GEFÄHRDETE STREAKS</div>
              {endangered.map(({t,s})=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:14}}>{t.emoji}</span>
                  <span style={{fontSize:12,color:"#e2e8f0",fontWeight:600,flex:1}}>{t.name}</span>
                  <span style={{fontSize:11,color:"#fbbf24",fontWeight:700}}>🔥 {s} Tage</span>
                </div>
              ))}
            </div>}
            <div style={{fontSize:12,color:"#334155",marginBottom:18}}>Freeze einsetzen um alle Streaks zu erhalten?</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={doBreakStreak} style={{flex:1,padding:"11px",borderRadius:11,border:"1px solid #1e293b",background:"transparent",color:"#475569",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13}}>Verlieren</button>
              <button onClick={doFreeze} style={{flex:1,padding:"11px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#1d4ed8,#38bdf8)",color:"#fff",fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:11,letterSpacing:1}}>❄️ FREEZE ({plr.freezes})</button>
            </div>
          </div>
        </div>
        );
      })()}

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
            <div onClick={()=>plr.freezes>0&&setShowFreeze(true)} style={{background:plr.freezes>0?"rgba(56,189,248,.12)":"rgba(255,255,255,.03)",border:`1px solid ${plr.freezes>0?"rgba(56,189,248,.35)":"#1a2840"}`,borderRadius:10,padding:"6px 10px",textAlign:"center",cursor:plr.freezes>0?"pointer":"default",opacity:plr.freezes>0?1:.45}}>
              <div style={{fontSize:14}}>❄️</div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:plr.freezes>0?"#38bdf8":"#2d3f55",lineHeight:1}}>{plr.freezes}</div>
            </div>
            <div style={{background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.22)",borderRadius:12,padding:"8px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:17}}>🔥</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:700,color:"#fbbf24",lineHeight:1}}>{plr.streak}</span>
              <span style={{fontSize:8,color:"#78350f",letterSpacing:1,fontWeight:700}}>STREAK</span>
            </div>
            {(()=>{const s=getActiveSeason(today);return s&&<div style={{background:`${s.color}18`,border:`1px solid ${s.color}60`,borderRadius:12,padding:"8px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{fontSize:16}}>{s.emoji}</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:7,color:s.color,fontWeight:700,letterSpacing:.5}}>×{s.xpMult}</div></div>;})()}
              {dblXp&&<div style={{background:"rgba(250,204,21,.12)",border:"1px solid rgba(250,204,21,.4)",borderRadius:12,padding:"8px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,animation:"glow 1.5s ease infinite"}}>
              <span style={{fontSize:15}}>⚡</span>
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:900,color:"#fde047",lineHeight:1}}>x2</span>
              <span style={{fontSize:8,color:"#713f12",letterSpacing:1,fontWeight:700}}>XP</span>
            </div>}
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
          {(()=>{const s=getActiveSeason(today);return s&&<div style={{background:`linear-gradient(135deg,${s.color}18,${s.color}08)`,border:`1px solid ${s.color}50`,borderRadius:14,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12,animation:"slideUp .4s ease"}}><div style={{fontSize:24}}>{s.emoji}</div><div><div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:s.color,letterSpacing:2,fontWeight:700}}>{s.name.toUpperCase()} · ×{s.xpMult} XP</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{s.desc}</div></div></div>;})()}
          {dblXp&&<div style={{background:"linear-gradient(135deg,rgba(250,204,21,.12),rgba(250,204,21,.06))",border:"1px solid rgba(250,204,21,.35)",borderRadius:14,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12,animation:"slideUp .4s ease"}}>
            <span style={{fontSize:22}}>⚡</span>
            <div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:"#fde047",letterSpacing:2}}>DOUBLE XP EVENT</div>
              <div style={{fontSize:11,color:"#a16207",marginTop:2}}>Heute bekommst du doppelte XP!</div>
            </div>
          </div>}
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {[{v:todayXP,l:"XP HEUTE",c:"#38bdf8"},{v:totalDone,l:"ERLEDIGT",c:"#c084fc"},{v:progress+"%",l:"PROGRESS",c:"#4ade80"}].map(({v,l,c})=>(
              <div key={l} style={{flex:1,background:`${c}09`,border:`1px solid ${c}28`,borderRadius:12,padding:"12px 6px",textAlign:"center"}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:20,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:9,color:"#3a4f6a",letterSpacing:.5,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          {(()=>{const q=getDailyQuote(today);return(
            <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16,padding:"12px 14px",background:"rgba(56,189,248,.04)",borderRadius:12,border:"1px solid rgba(56,189,248,.1)"}}>
              <div style={{width:3,minHeight:36,borderRadius:2,background:"linear-gradient(180deg,#38bdf8,#c084fc)",flexShrink:0,marginTop:2}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,color:"#94a3b8",fontStyle:"italic",lineHeight:1.5,fontWeight:600}}>&ldquo;{q.text}&rdquo;</div>
                <div style={{fontSize:10,color:"#38bdf8",marginTop:6,letterSpacing:.5,fontWeight:700,opacity:.75}}>— {q.source}</div>
              </div>
            </div>
          );})()}
          {(()=>{
            const ch=getMonthlyChallenge(today);
            const prog=calcChallengeProgress(ch,comps,plr,MONTH());
            const pct=Math.min(100,Math.round((prog/ch.target)*100));
            const done=plr.monthChallengePaid===(MONTH()+"-"+ch.id);
            return(
              <div style={{marginBottom:16,padding:"12px 14px",background:done?"rgba(74,222,128,.06)":"rgba(192,132,252,.05)",borderRadius:12,border:`1px solid ${done?"rgba(74,222,128,.2)":"rgba(192,132,252,.15)"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:16}}>{ch.emoji}</span>
                    <div>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,color:done?"#4ade80":"#c084fc",letterSpacing:1.5,fontWeight:700}}>{done?"✓ ABGESCHLOSSEN":"MONATS-CHALLENGE"}</div>
                      <div style={{fontSize:12,color:"#e2e8f0",fontWeight:600,marginTop:1}}>{ch.title}</div>
                    </div>
                  </div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:14,fontWeight:900,color:done?"#4ade80":"#c084fc"}}>{pct}%</div>
                </div>
                <div style={{height:4,background:"#0a1020",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:pct+"%",background:done?"linear-gradient(90deg,#16a34a,#4ade80)":"linear-gradient(90deg,#7c3aed,#c084fc)",borderRadius:2,transition:"width .4s ease"}}/>
                </div>
                <div style={{fontSize:10,color:"#475569",marginTop:5}}>{ch.desc} · {prog}/{ch.target}{done&&" · +200 XP erhalten!"}</div>
              </div>
            );
          })()}
          {allDone&&<div style={{background:"linear-gradient(135deg,rgba(56,189,248,.1),rgba(192,132,252,.1))",border:"1px solid rgba(56,189,248,.38)",borderRadius:14,padding:"14px 18px",marginBottom:18,textAlign:"center",animation:"slideUp .4s ease"}}>
            <div style={{fontSize:24}}>🏆</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:"#38bdf8",letterSpacing:2,marginTop:5}}>ALL QUESTS COMPLETE!</div>
          </div>}
          {onceActive.length>0&&<>
            <SecHead label="EINMALIG" color="#fb923c" count={`${onceDone}/${onceQ.length}`} sub="einmalig erledigen" onAdd={()=>setShowAdd(true)} btnColor="#fb923c"/>
            {onceActive.map(t=><OnceRow key={t.id} t={t}/>)}
            <HR/>
          </>}
          {/* Boss Quests */}
          {(()=>{
            const bossQuests=tpl.filter(t=>t.frequency==="boss"&&t.bossStatus!=="done"&&t.bossStatus!=="failed");
            if(!bossQuests.length)return null;
            return bossQuests.map(t=>{
              const d=DIFF[t.difficulty];
              const deadline=t.bossDeadline?new Date(t.bossDeadline+"T23:59:59"):null;
              const daysLeft=deadline?Math.max(0,Math.ceil((deadline-new Date())/(86400000))):null;
              return(
                <div key={t.id} style={{background:"linear-gradient(135deg,rgba(248,113,113,.12),rgba(248,113,113,.05))",border:"1px solid rgba(248,113,113,.5)",borderRadius:16,padding:"16px",marginBottom:12,animation:"slideUp .3s ease"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{fontSize:28}}>{t.emoji}</div>
                      <div>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#f87171",letterSpacing:2,fontWeight:700}}>BOSS QUEST</div>
                        <div style={{fontWeight:700,fontSize:16,color:"#fee2e2",marginTop:2}}>{t.name}</div>
                        <div style={{fontSize:10,color:"#f87171",marginTop:2}}>x3 XP · {d.label}</div>
                      </div>
                    </div>
                    {daysLeft!==null&&<div style={{textAlign:"center",flexShrink:0}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:22,fontWeight:900,color:daysLeft<=2?"#f87171":"#fbbf24",lineHeight:1}}>{daysLeft}</div>
                      <div style={{fontSize:8,color:"#7f1d1d",letterSpacing:1,fontWeight:700}}>{daysLeft===1?"TAG":"TAGE"}</div>
                    </div>}
                  </div>
                  <button className="tap" onClick={()=>doComplete(t)} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#991b1b,#f87171)",color:"#fff",fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:11,letterSpacing:1}}>QUEST ABSCHLIESSEN</button>
                </div>
              );
            });
          })()}
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
                  <button onClick={openAdd} style={{background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:9,padding:"8px 15px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ QUEST</button>
                </>
              }
            </div>
          </div>
          {/* Category filter chips */}
          {!reorderMode&&dailyQ.length>2&&(()=>{const usedCats=[...new Set(dailyQ.map(t=>t.category))];return usedCats.length>1?(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              <button onClick={()=>setCatFilter(null)} style={{padding:"5px 11px",borderRadius:20,fontSize:10,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",border:`1px solid ${catFilter===null?"#38bdf8":"#1e2f48"}`,background:catFilter===null?"rgba(56,189,248,.15)":"transparent",color:catFilter===null?"#38bdf8":"#3a4f6a",letterSpacing:.5}}>ALLE</button>
              {usedCats.map(k=>{const c=CATS[k]??CATS.sonstige;return(<button key={k} onClick={()=>setCatFilter(f=>f===k?null:k)} style={{padding:"5px 11px",borderRadius:20,fontSize:10,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",border:`1px solid ${catFilter===k?c.color:"#1e2f48"}`,background:catFilter===k?c.color+"20":"transparent",color:catFilter===k?c.color:"#3a4f6a",letterSpacing:.5}}>{c.emoji} {c.label}</button>);})}
            </div>
          ):null;})()}
          {reorderMode&&<div style={{fontSize:10,color:"#334155",textAlign:"center",marginBottom:10,letterSpacing:.5}}>Reihenfolge mit den Pfeilen anpassen</div>}
          {dailyQ.length===0?<EmptyState/>:dailyQ.filter(t=>t.frequency==="daily"&&(!catFilter||t.category===catFilter)).map((t,i,arr)=>(
            <div key={t.id} style={{position:"relative",borderRadius:14,background:reorderMode?"rgba(56,189,248,.03)":"transparent",display:"flex",alignItems:"center",gap:6,marginBottom:reorderMode?6:0}}>
              {reorderMode&&<div style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0}}>
                <button onClick={()=>{if(i===0)return;const o=[...tpl];const ai=o.findIndex(x=>x.id===arr[i-1].id),bi=o.findIndex(x=>x.id===t.id);[o[ai],o[bi]]=[o[bi],o[ai]];setTpl(o);saveAll(o,comps,plr);}} disabled={i===0} style={{background:i===0?"transparent":"rgba(56,189,248,.12)",border:`1px solid ${i===0?"#0d1628":"rgba(56,189,248,.3)"}`,color:i===0?"#1a2840":"#38bdf8",borderRadius:6,width:26,height:26,fontSize:13,lineHeight:1,cursor:i===0?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>▲</button>
                <button onClick={()=>{if(i===arr.length-1)return;const o=[...tpl];const ai=o.findIndex(x=>x.id===arr[i+1].id),bi=o.findIndex(x=>x.id===t.id);[o[ai],o[bi]]=[o[bi],o[ai]];setTpl(o);saveAll(o,comps,plr);}} disabled={i===arr.length-1} style={{background:i===arr.length-1?"transparent":"rgba(56,189,248,.12)",border:`1px solid ${i===arr.length-1?"#0d1628":"rgba(56,189,248,.3)"}`,color:i===arr.length-1?"#1a2840":"#38bdf8",borderRadius:6,width:26,height:26,fontSize:13,lineHeight:1,cursor:i===arr.length-1?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>▼</button>
              </div>}
              <div style={{flex:1,position:"relative"}}>
                {!reorderMode&&<button onClick={e=>{e.stopPropagation();setPauseSheet(t.id);}} style={{position:"absolute",top:8,right:8,zIndex:10,background:"transparent",border:"none",color:"#334155",fontSize:18,lineHeight:1,padding:"2px 6px",cursor:"pointer"}}>···</button>}
                {t.repeatable?<RepeatRow t={t}/>:<NormalRow t={t} done={doneIds.has(t.id)} onToggle={()=>!reorderMode&&(doneIds.has(t.id)?doUndo(t.id):doComplete(t))}/>}
              </div>
            </div>
          ))}
        </>}
        {/* ═══ WEEK ════════════════════════════════════════════════════════════ */}
        {tab==="week"&&<>
          {/* Week navigation */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button onClick={()=>setWeekOffset(o=>o-1)} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.2)",color:"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1}}>{'<'}</button>
            <div style={{textAlign:"center",flex:1,padding:"0 8px"}}>
              {weekOffset===0
                ?<div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:"#38bdf8",letterSpacing:2}}>AKTUELLE WOCHE</div>
                :<div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:"#64748b",letterSpacing:1}}>{wkLabel.label}</div>
              }
            </div>
            <button onClick={()=>setWeekOffset(o=>o+1)} disabled={weekOffset>=0} style={{background:weekOffset>=0?"transparent":"rgba(56,189,248,.08)",border:`1px solid ${weekOffset>=0?"#0d1628":"rgba(56,189,248,.2)"}`,color:weekOffset>=0?"#1a2840":"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1,cursor:weekOffset>=0?"default":"pointer"}}>></button>
          </div>

          {/* Wochenziel — context-aware color */}
          {(()=>{
            const isPast=weekOffset<0;
            const dispWs=wkDays[0];
            const histEntry=(plr.weekHistory||[]).find(h=>h.weekStart===dispWs);
            const displayGoal=histEntry?.goal||plr.weeklyGoal||500;
            // For past weeks use stored xp; for current week use live weekC
            const displayXP=isPast
              ?(histEntry?.xp||comps.filter(c=>c.weekStart===dispWs&&!c.isGhost&&c.earnedXp>0).reduce((s,c)=>s+c.earnedXp,0))
              :weekC.reduce((s,c)=>(!c.isGhost&&c.earnedXp>0)?s+c.earnedXp:s,0);
            const pct=Math.min(100,Math.round((displayXP/displayGoal)*100));
            const reached=isPast?(histEntry?.reached??pct>=100):pct>=100;
            const barColor=reached?"linear-gradient(90deg,#16a34a,#4ade80)":isPast?"linear-gradient(90deg,#991b1b,#f87171)":"linear-gradient(90deg,#1d4ed8,#38bdf8)";
            const borderColor=reached?"rgba(74,222,128,.3)":isPast?"rgba(248,113,113,.25)":"rgba(56,189,248,.18)";
            const bgColor=reached?"rgba(74,222,128,.06)":isPast?"rgba(248,113,113,.05)":"rgba(56,189,248,.06)";
            const numColor=reached?"#4ade80":isPast?"#f87171":"#38bdf8";
            const glowColor=reached?"#4ade80":isPast?"#f87171":"#38bdf8";
            return(
              <div style={{background:bgColor,border:`1px solid ${borderColor}`,borderRadius:14,padding:"16px 18px",marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:numColor,letterSpacing:2}}>
                      WOCHENZIEL{reached?" ✓":isPast?" ✗":""}
                    </div>
                    <div style={{fontSize:12,color:"#2d3f55",marginTop:2}}>{displayXP.toLocaleString()} / {displayGoal.toLocaleString()} XP</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:28,fontWeight:900,color:numColor}}>{pct}%</div>
                    {weekOffset===0&&(editGoal
                      ?<div style={{display:"flex",gap:6,marginTop:4}}>
                        <input value={goalInput} onChange={e=>setGoalInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveGoal();if(e.key==="Escape")setEditGoal(false);}} autoFocus placeholder="500" style={{width:70,background:"#111929",border:"1px solid #38bdf8",borderRadius:8,padding:"4px 8px",color:"#38bdf8",fontSize:13,fontFamily:"'Orbitron',monospace",textAlign:"center"}}/>
                        <button onClick={saveGoal} style={{background:"rgba(56,189,248,.2)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:7,padding:"4px 8px",fontSize:10,fontWeight:700,fontFamily:"'Rajdhani',sans-serif"}}>OK</button>
                      </div>
                      :<button onClick={()=>{setGoalInput(String(displayGoal));setEditGoal(true);}} style={{background:"none",border:"none",color:"#2d3f55",fontSize:10,fontFamily:"'Rajdhani',sans-serif",padding:0,marginTop:2}}>✏️ Ziel ändern</button>
                    )}
                  </div>
                </div>
                <div style={{height:6,background:"#0a1020",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:barColor,boxShadow:`0 0 10px ${glowColor}`,borderRadius:3,transition:"width .8s cubic-bezier(.4,0,.2,1)"}}/>
                </div>
              </div>
            );
          })()}

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
            <button onClick={()=>setMonthOffset(o=>o-1)} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.2)",color:"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1}}>{'<'}</button>
            <div style={{textAlign:"center",flex:1,padding:"0 8px"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:monthOffset===0?11:10,color:monthOffset===0?"#38bdf8":"#64748b",letterSpacing:2}}>{MONTHS_DE[mLabel.month].toUpperCase()} {mLabel.year}</div>
              {monthOffset===0&&<div style={{fontSize:9,color:"#2d3f55",letterSpacing:1,marginTop:2}}>AKTUELLER MONAT</div>}
            </div>
            <button onClick={()=>setMonthOffset(o=>o+1)} disabled={monthOffset>=0} style={{background:monthOffset>=0?"transparent":"rgba(56,189,248,.08)",border:`1px solid ${monthOffset>=0?"#0d1628":"rgba(56,189,248,.2)"}`,color:monthOffset>=0?"#1a2840":"#38bdf8",borderRadius:9,padding:"7px 13px",fontSize:16,lineHeight:1,cursor:monthOffset>=0?"default":"pointer"}}>></button>
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
              <div style={{fontSize:11,color:"#2d3f55",marginTop:3}}>{tpl.filter(t=>t.frequency==="daily").length} daily · {onceQ.length} einmalig</div>
            </div>
            <button onClick={openAdd} style={{background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.4)",color:"#38bdf8",borderRadius:9,padding:"8px 15px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ NEW</button>
          </div>

          {tpl.filter(t=>t.frequency==="daily").length>0&&<>
            <div style={{fontSize:9,color:"#38bdf8",letterSpacing:2,fontWeight:700,marginBottom:12,fontFamily:"'Orbitron',monospace"}}>⚔️ DAILY</div>
            {Object.entries(CATS).map(([catKey,catVal])=>{
              const items=[...tpl.filter(t=>t.frequency==="daily"&&t.category===catKey)].sort((a,b)=>a.name.localeCompare(b.name));
              if(!items.length)return null;
              return(<div key={catKey} style={{marginBottom:14}}>
                <div style={{fontSize:9,color:catVal.color,letterSpacing:1.5,fontWeight:700,marginBottom:7,fontFamily:"'Orbitron',monospace",opacity:.85}}>{catVal.emoji} {catVal.label.toUpperCase()}</div>
                {items.map(t=>{const d=DIFF[t.difficulty],cat=catVal;return(
                  <TplRow key={t.id} t={t} d={d} cat={cat} onDelete={()=>doDelete(t.id)} onEdit={()=>openEdit(t)} extra={t.repeatable&&<Tag color="#fbbf24" label="🔁 REPEAT"/>}/>
                );})}
              </div>);
            })}
          </>}
          {onceQ.length>0&&<>
            <div style={{fontSize:9,color:"#fb923c",letterSpacing:2,fontWeight:700,margin:"16px 0 10px",fontFamily:"'Orbitron',monospace"}}>✅ EINMALIG</div>
            {[...onceQ].sort((a,b)=>a.name.localeCompare(b.name)).map(t=>{const d=DIFF[t.difficulty],cat=CATS[t.category]??CATS.sonstige,done=(plr.completedOnce||[]).includes(t.id);return(
              <TplRow key={t.id} t={t} d={d} cat={cat} onDelete={()=>doDelete(t.id)} onEdit={()=>openEdit(t)} done={done}
                extra={<Tag color={done?"#4ade80":"#fb923c"} label={done?"✓ ERLEDIGT":"1x EINMALIG"}/>}
                onReset={done?()=>doResetOnce(t.id):null}/>
            );})}
          </>}
          {tpl.length===0&&<div style={{textAlign:"center",padding:44,color:"#1a2840",fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:2}}>NO TEMPLATES</div>}
        </>}

        {/* ═══ PROFIL ═══════════════════════════════════════════════════════════ */}
        {tab==="profil"&&<>

          {/* Sub-Tab Toggle */}
          <div style={{display:"flex",gap:6,marginBottom:20,background:"rgba(255,255,255,.03)",borderRadius:12,padding:4}}>
            {[{id:"hunter",l:"⚔️ HUNTER"},{id:"analytics",l:"📊 ANALYTICS"}].map(({id,l})=>(
              <button key={id} onClick={()=>setProfTab(id)} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",background:profTab===id?"rgba(56,189,248,.15)":"transparent",color:profTab===id?"#38bdf8":"#334155",fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,letterSpacing:1,cursor:"pointer",transition:"all .2s"}}>
                {l}
              </button>
            ))}
          </div>

          {/* ── HUNTER TAB ── */}
          {profTab==="hunter"&&<>

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
                const activeDaysTotal=new Set(comps.map(c=>c.date)).size;
                const avgXP=activeDaysTotal>0?Math.round(totalXP/activeDaysTotal):0;
                const daysSinceFirst=comps.length>0?Math.max(1,Math.round((new Date(today)-new Date(comps.reduce((a,b)=>a.date<b.date?a:b).date+"T12:00"))/(86400000))+1):0;
                const consistencyPct=daysSinceFirst>0?Math.round((activeDaysTotal/daysSinceFirst)*100):0;
                return(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                    {[
                      {l:"Gesamt Quests",v:comps.length,c:"#38bdf8"},
                      {l:"Gesamt XP",v:totalXP.toLocaleString(),c:"#c084fc"},
                      {l:"Ø XP / Aktivtag",v:avgXP,c:"#4ade80"},
                      {l:"Konsistenz",v:consistencyPct+"%",c:"#fbbf24",sub:`${activeDaysTotal} von ${daysSinceFirst} Tagen`},
                    ].map(({l,v,c,sub})=>(
                      <div key={l} style={{background:`${c}09`,border:`1px solid ${c}22`,borderRadius:12,padding:"12px 14px"}}>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:17,fontWeight:900,color:c}}>{v}</div>
                        <div style={{fontSize:11,color:"#475569",marginTop:4}}>{l}</div>
                        {sub&&<div style={{fontSize:9,color:"#334155",marginTop:2}}>{sub}</div>}
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

          </>}

          {/* ── ANALYTICS TAB ── */}
          {profTab==="analytics"&&<>

            {/* 30-Day XP Chart */}
            <div style={{marginBottom:24}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#c084fc",letterSpacing:2,marginBottom:12}}>XP VERLAUF — 30 TAGE</div>
              {(()=>{
                const days30=Array.from({length:30},(_,i)=>{const d=new Date(today+"T12:00");d.setDate(d.getDate()-(29-i));return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");});
                const xpByDay=days30.map(d=>comps.filter(c=>c.date===d).reduce((s,c)=>s+c.earnedXp,0));
                const maxXP=Math.max(...xpByDay,1);
                return(
                  <div style={{background:"rgba(12,18,40,.8)",border:"1px solid #1a2840",borderRadius:14,padding:"14px 12px 10pt"}}>
                    <div style={{display:"flex",alignItems:"flex-end",gap:2,height:60}}>
                      {xpByDay.map((xp,i)=>{
                        const h=xp>0?Math.max(4,Math.round((xp/maxXP)*56)):2;
                        const isToday=i===29;
                        const dow=new Date(days30[i]+"T12:00").getDay();
                        const isWeekend=dow===0||dow===6;
                        return(
                          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:60}}>
                            <div style={{width:"100%",height:h,borderRadius:"3px 3px 0 0",background:isToday?"#38bdf8":xp>0?isWeekend?"#6366f1":"#c084fc":"#0f1628",transition:"height .3s",minHeight:2}}/>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                      {[0,14,29].map(i=><div key={i} style={{fontSize:9,color:"#334155"}}>{new Date(days30[i]+"T12:00").toLocaleDateString("de-DE",{day:"numeric",month:"short"})}</div>)}
                    </div>
                    <div style={{display:"flex",gap:12,marginTop:8}}>
                      {[{c:"#c084fc",l:"Werktag"},{c:"#6366f1",l:"Wochenende"},{c:"#38bdf8",l:"Heute"}].map(({c,l})=>(
                        <div key={l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:c}}/><div style={{fontSize:9,color:"#475569"}}>{l}</div></div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Weekday Heatmap */}
            <div style={{marginBottom:24}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#4ade80",letterSpacing:2,marginBottom:12}}>AKTIVSTE WOCHENTAGE</div>
              {(()=>{
                const labels=["Mo","Di","Mi","Do","Fr","Sa","So"];
                const counts=Array(7).fill(0);
                comps.forEach(c=>{const dow=(new Date(c.date+"T12:00").getDay()+6)%7;counts[dow]++;});
                const maxC=Math.max(...counts,1);
                return(
                  <div style={{background:"rgba(12,18,40,.8)",border:"1px solid #1a2840",borderRadius:14,padding:"14px"}}>
                    <div style={{display:"flex",gap:6}}>
                      {labels.map((l,i)=>{
                        const pct=counts[i]/maxC;
                        const isWeekend=i>=5;
                        const color=isWeekend?"#6366f1":"#4ade80";
                        return(
                          <div key={l} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                            <div style={{fontSize:9,color:"#475569",fontWeight:700}}>{l}</div>
                            <div style={{width:"100%",height:80,background:"#0a1020",borderRadius:8,display:"flex",alignItems:"flex-end",overflow:"hidden"}}>
                              <div style={{width:"100%",height:`${Math.max(4,pct*100)}%`,background:pct>0.8?color:pct>0.5?color+"bb":pct>0.2?color+"66":"#1a2840",borderRadius:"6px 6px 0 0",transition:"height .3s"}}/>
                            </div>
                            <div style={{fontSize:9,color:counts[i]>0?"#94a3b8":"#334155",fontWeight:700}}>{counts[i]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Category Breakdown */}
            <div style={{marginBottom:24}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#fbbf24",letterSpacing:2,marginBottom:12}}>KATEGORIEN</div>
              {(()=>{
                const total=comps.length||1;
                const cats=Object.entries(CATS).map(([k,v])=>({k,v,n:comps.filter(c=>c.category===k).length})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n);
                if(cats.length===0)return<div style={{fontSize:11,color:"#334155",textAlign:"center",padding:16}}>Noch keine Daten</div>;
                return(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {cats.map(({k,v,n})=>{
                      const pct=Math.round((n/total)*100);
                      return(
                        <div key={k}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>{v.emoji} {v.label}</div>
                            <div style={{fontSize:12,color:v.color,fontWeight:700,fontFamily:"'Orbitron',monospace"}}>{n} <span style={{color:"#334155",fontSize:10}}>({pct}%)</span></div>
                          </div>
                          <div style={{height:6,background:"#0a1020",borderRadius:3,overflow:"hidden"}}>
                            <div style={{height:"100%",width:pct+"%",background:v.color,borderRadius:3,transition:"width .4s ease"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Per-Quest Stats */}
            <div style={{marginBottom:24}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#f87171",letterSpacing:2,marginBottom:12}}>QUEST DETAILS</div>
              {(()=>{
                if(tpl.filter(t=>t.frequency==="daily").length===0)return<div style={{fontSize:11,color:"#334155",textAlign:"center",padding:16}}>Keine Daily Quests</div>;
                return(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {tpl.filter(t=>t.frequency==="daily").map(t=>{
                      const tc=comps.filter(c=>c.templateId===t.id);
                      const totalC=tc.length;
                      const qXP=tc.reduce((s,c)=>s+c.earnedXp,0);
                      const qs=questStreak(comps,t.id,today,t);
                      const d=DIFF[t.difficulty];
                      const activeDaysCount=new Set(comps.map(c=>c.date)).size||1;
                      const ratePct=activeDaysCount>0?Math.min(100,Math.round((totalC/activeDaysCount)*100)):0;
                      return(
                        <div key={t.id} style={{background:"rgba(12,18,40,.8)",border:"1px solid #1a2840",borderRadius:12,padding:"12px 14px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{fontSize:20}}>{t.emoji}</div>
                              <div>
                                <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{t.name}</div>
                                <div style={{fontSize:10,color:"#475569",marginTop:1}}>{totalC}× erledigt · {qXP.toLocaleString()} XP</div>
                              </div>
                            </div>
                            {qs>=2&&<div style={{fontSize:11,color:"#fbbf24",fontWeight:700,flexShrink:0}}>🔥{qs}</div>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{flex:1,height:5,background:"#0a1020",borderRadius:3,overflow:"hidden"}}>
                              <div style={{height:"100%",width:ratePct+"%",background:d.color,borderRadius:3}}/>
                            </div>
                            <div style={{fontSize:10,color:d.color,fontWeight:700,fontFamily:"'Orbitron',monospace",minWidth:36,textAlign:"right"}}>{ratePct}%</div>
                          </div>
                          <div style={{fontSize:9,color:"#334155",marginTop:4}}>Completion-Rate (vs. aktive Tage)</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </>}

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
      {showAdd&&<div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.88)",backdropFilter:"blur(12px)",display:"flex",alignItems:"flex-end"}} onClick={e=>{if(e.target===e.currentTarget){setShowAdd(false);setEditingId(null);}}} >
        <div className="modal-sheet" style={{width:"100%",maxWidth:480,margin:"0 auto",background:"#080d1c",borderRadius:"24px 24px 0 0",border:"1px solid #1a2840",borderBottom:"none",display:"flex",flexDirection:"column",maxHeight:"92dvh"}}>
          {/* ── Fixed Header ── */}
          <div style={{padding:"20px 18px 0",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#38bdf8",letterSpacing:2}}>{editingId?'QUEST BEARBEITEN':'ADD QUEST'}</div>
              <button onClick={()=>{setShowAdd(false);setEditingId(null);}} style={{background:"none",border:"none",color:"#475569",fontSize:22,padding:"0 4px",lineHeight:1}}>✕</button>
            </div>
          </div>
          {/* ── Scrollable Form Body ── */}
          <div style={{overflowY:"auto",WebkitOverflowScrolling:"touch",flex:1,padding:"0 18px"}}>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>QUEST NAME</div>
              <input value={newQ.name} onChange={e=>setNewQ(q=>({...q,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doSaveQuest()} placeholder="z.B. Wickeln" autoFocus style={{width:"100%",background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"13px 15px",color:"#e2e8f0",fontSize:16,fontFamily:"'Rajdhani',sans-serif",fontWeight:600,boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:6,fontWeight:700}}>ICON</div>
              <input value={newQ.emoji} onChange={e=>setNewQ(q=>({...q,emoji:e.target.value}))} style={{width:58,background:"#111929",border:"1px solid #1e2f48",borderRadius:11,padding:"10px",color:"#e2e8f0",fontSize:22,textAlign:"center"}}/>
            </div>
            <div style={{marginBottom:newQ.frequency==="daily"?10:16}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>HÄUFIGKEIT</div>
              <div style={{display:"flex",gap:8}}>
                {[{k:"daily",l:"🔄",sub:"TÄGLICH",c:"#38bdf8"},{k:"once",l:"✅",sub:"EINMALIG",c:"#fb923c"},{k:"boss",l:"⚠️",sub:"BOSS",c:"#f87171"}].map(({k,l,sub,c})=>(
                  <button key={k} onClick={()=>setNewQ(q=>({...q,frequency:k,repeatable:k==="daily"?q.repeatable:false}))} style={{flex:1,padding:"12px 4px",borderRadius:11,border:`1px solid ${newQ.frequency===k?c:"#1e2f48"}`,background:newQ.frequency===k?c+"16":"transparent",color:newQ.frequency===k?c:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>
                    <div style={{fontSize:18}}>{l}</div><div style={{fontSize:10,marginTop:2}}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
            {newQ.frequency==="boss"&&<div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:"#f87171",fontWeight:700,marginBottom:6,letterSpacing:.5}}>Deadline (Tage ab heute)</div>
                <input type="number" min="1" max="90" value={newQ.bossDeadlineDays||7}
                  onChange={e=>setNewQ(q=>({...q,bossDeadlineDays:Math.max(1,parseInt(e.target.value)||7)}))}
                  style={{width:"100%",background:"#111929",border:"1px solid rgba(248,113,113,.4)",borderRadius:9,padding:"10px 14px",color:"#fee2e2",fontSize:14,fontFamily:"'Rajdhani',sans-serif"}}/>
              </div>}
            {newQ.frequency==="daily"&&<div style={{marginBottom:14,background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.2)",borderRadius:11,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>🔁 Mehrfach täglich</div>
                <div style={{fontSize:11,color:"#3a4f6a",marginTop:1}}>Jeder Tap zählt (z.B. Wickeln)</div>
              </div>
              <div onClick={()=>setNewQ(q=>({...q,repeatable:!q.repeatable}))} style={{width:48,height:28,borderRadius:14,cursor:"pointer",background:newQ.repeatable?"#fbbf24":"#111929",border:`1px solid ${newQ.repeatable?"#fbbf24":"#1e2f48"}`,position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:newQ.repeatable?25:4,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
              </div>
            </div>}
            {newQ.frequency==="daily"&&<div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>AKTIVE WOCHENTAGE <span style={{color:"#1e2f48",fontWeight:400}}>(leer = täglich)</span></div>
              <div style={{display:"flex",gap:5}}>
                {['Mo','Di','Mi','Do','Fr','Sa','So'].map((d,i)=>{
                  const on=(newQ.activeDays||[]).includes(i);
                  return(<button key={i} onClick={()=>setNewQ(q=>{const a=q.activeDays||[];return{...q,activeDays:on?a.filter(x=>x!==i):[...a,i]};})} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${on?"#38bdf8":"#1e2f48"}`,background:on?"rgba(56,189,248,.15)":"transparent",color:on?"#38bdf8":"#3a4f6a",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif"}}>{d}</button>);
                })}
              </div>
            </div>}
            {newQ.frequency==="daily"&&<div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>MAX. PRO WOCHE <span style={{color:"#1e2f48",fontWeight:400}}>(0 = unbegrenzt)</span></div>
              <div style={{display:"flex",gap:6}}>
                {[0,1,2,3,4,5,6,7].map(n=>(
                  <button key={n} onClick={()=>setNewQ(q=>({...q,weekLimit:n}))} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${newQ.weekLimit===n?"#c084fc":"#1e2f48"}`,background:newQ.weekLimit===n?"rgba(192,132,252,.15)":"transparent",color:newQ.weekLimit===n?"#c084fc":"#3a4f6a",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif"}}>{n===0?'∞':n}</button>
                ))}
              </div>
            </div>}
            {/* ── noteEnabled Toggle ── */}
            <div style={{marginBottom:14,background:"rgba(56,189,248,.04)",border:"1px solid rgba(56,189,248,.15)",borderRadius:11,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#38bdf8"}}>📝 Kommentar nach Abschluss</div>
                <div style={{fontSize:11,color:"#3a4f6a",marginTop:1}}>Notizfeld beim Erledigen anzeigen</div>
              </div>
              <div onClick={()=>setNewQ(q=>({...q,noteEnabled:!q.noteEnabled}))} style={{width:48,height:28,borderRadius:14,cursor:"pointer",background:newQ.noteEnabled?"#38bdf8":"#111929",border:`1px solid ${newQ.noteEnabled?"#38bdf8":"#1e2f48"}`,position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:newQ.noteEnabled?25:4,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
              </div>
            </div>
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
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,color:"#3a4f6a",letterSpacing:1,marginBottom:8,fontWeight:700}}>SCHWIERIGKEIT</div>
              <div style={{display:"flex",gap:8}}>
                {Object.entries(DIFF).map(([k,v])=>(
                  <button key={k} onClick={()=>setNewQ(q=>({...q,difficulty:k}))} style={{flex:1,padding:"12px 0",borderRadius:11,border:`1px solid ${newQ.difficulty===k?v.color:"#1e2f48"}`,background:newQ.difficulty===k?v.color+"16":"transparent",color:newQ.difficulty===k?v.color:"#3a4f6a",fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>
                    <div style={{fontSize:12}}>{v.label}</div><div style={{fontSize:10,opacity:.6}}>{v.xp} XP</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* ── Fixed Footer Buttons ── */}
          <div style={{padding:"12px 18px",paddingBottom:"max(20px,env(safe-area-inset-bottom,20px))",flexShrink:0,borderTop:"1px solid #0f1a2e",background:"#080d1c"}}>
            <button onClick={doSaveQuest} disabled={!newQ.name.trim()} style={{width:"100%",padding:"15px",borderRadius:13,border:"none",background:newQ.name.trim()?"linear-gradient(135deg,#1d4ed8,#38bdf8)":"#111929",color:newQ.name.trim()?"#fff":"#2d3f55",fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,letterSpacing:2,boxShadow:newQ.name.trim()?"0 4px 24px rgba(56,189,248,.25)":"none",transition:"all .2s",marginBottom:8}}>
              {editingId?'SPEICHERN':'QUEST HINZUFUEGEN'}
            </button>
            <button onClick={()=>{setShowAdd(false);setEditingId(null);}} style={{width:"100%",padding:"13px",borderRadius:13,border:"1px solid #1e2f48",background:"transparent",color:"#475569",fontFamily:"'Rajdhani',sans-serif",fontSize:14,fontWeight:700,marginBottom:editingId?8:0}}>
              ABBRECHEN
            </button>
            {editingId&&<button onClick={()=>{doDelete(editingId);setShowAdd(false);setEditingId(null);}} style={{width:"100%",padding:"13px",borderRadius:13,border:"1px solid rgba(248,113,113,.3)",background:"rgba(248,113,113,.06)",color:"#f87171",fontFamily:"'Rajdhani',sans-serif",fontSize:14,fontWeight:700}}>
              🗑 QUEST LOESCHEN
            </button>}
          </div>
        </div>
      </div>}
    </div>
  );
}

// ─── Micro Components ─────────────────────────────────────────────────────────
function Tag({color,label}){return<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:.5,color,background:color+"15"}}>{label}</span>;}
function XPLabel({earned,bon,done,color,dbl,mult}){return<><div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:done?"#2d3f55":color}}>+{earned}<span style={{fontSize:8}}>XP</span></div>{bon>0&&!done&&<div style={{fontSize:9,color:"#fbbf24"}}>🔥+{bon}</div>}{dbl&&!done&&<div style={{fontSize:9,color:"#fde047"}}>⚡×2</div>}{mult&&mult>1&&!done&&<div style={{fontSize:9,color:"#f97316",fontWeight:700}}>🔥×{mult.toFixed(2).replace(/\.?0+$/,"")}</div>}</>;}
function Circle({done,color}){return<div style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${done?"#1a2540":color+"55"}`,background:done?color+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{done&&<span style={{color,fontSize:15,fontWeight:700}}>✓</span>}</div>;}
function SecHead({label,color,count,sub,onAdd,btnColor}){return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
  <div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color,letterSpacing:2}}>{label}</div><div style={{fontSize:9,color,background:color+"20",border:`1px solid ${color}50`,borderRadius:20,padding:"2px 8px",fontWeight:700}}>{count}</div></div><div style={{fontSize:11,color:"#2d3f55",marginTop:2}}>{sub}</div></div>
  <button onClick={onAdd} style={{background:btnColor+"18",border:`1px solid ${btnColor}`,color:btnColor,borderRadius:9,padding:"8px 14px",fontSize:11,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>+ QUEST</button>
</div>;}
function HR(){return<div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(56,189,248,.12),transparent)",margin:"6px 0 18px"}}/>;}
function EmptyState(){return<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40}}>⚔️</div><div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:"#1a2540",marginTop:12,letterSpacing:2}}>NO ACTIVE QUESTS</div></div>;}
function TplRow({t,d,cat,onDelete,onEdit,done=false,extra,onReset,onUnpause}){return(
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
      {onUnpause&&<button onClick={onUnpause} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.3)",color:"#f87171",borderRadius:9,padding:"8px 10px",fontSize:11,flexShrink:0,fontWeight:700}}>▶</button>}
      {onReset&&<button onClick={onReset} style={{background:"rgba(56,189,248,.1)",border:"1px solid rgba(56,189,248,.3)",color:"#38bdf8",borderRadius:9,padding:"8px 10px",fontSize:12,flexShrink:0}}>↺</button>}
      {onEdit&&<button onClick={onEdit} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.25)",color:"#38bdf8",borderRadius:9,padding:"9px 11px",fontSize:14,flexShrink:0}}>✏️</button>}
    </div>
  </div>
);}
