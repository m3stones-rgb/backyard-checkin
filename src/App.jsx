import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";

const DEFAULT_MILESTONE_MESSAGES = {
  1:   "はじめまして！BACKYARDへようこそ。",
  2:   "2回目の来店！また来てくれてありがとうございます。",
  3:   "3回目の来店！また来てくれてありがとうございます。",
  5:   "5回目の来店！そろそろ顔なじみですね。",
  10:  "10回目の来店、ありがとうございます。",
  25:  "25回目！BACKYARDの常連ですね。",
  50:  "50回目。もはや家族です。",
  100: "100回目！！！伝説です。本当にありがとうございます。",
};

// --- Firestore helpers ---
async function getUser(name) {
  const snap = await getDoc(doc(db, "users", name));
  return snap.exists() ? snap.data() : null;
}
async function saveUser(name, data) {
  await setDoc(doc(db, "users", name), data);
}
async function updateUser(name, data) {
  await updateDoc(doc(db, "users", name), data);
}
async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  const result = {};
  snap.forEach(d => { result[d.id] = d.data(); });
  return result;
}
async function getLogByDate(dk) {
  const snap = await getDoc(doc(db, "log", dk));
  return snap.exists() ? (snap.data().entries || []) : [];
}
async function saveLogByDate(dk, entries) {
  await setDoc(doc(db, "log", dk), { entries });
}
async function getAllLog() {
  const snap = await getDocs(collection(db, "log"));
  const result = {};
  snap.forEach(d => { result[d.id] = d.data().entries || []; });
  return result;
}
function getTonightKey() { return "tonight_" + new Date().toDateString(); }
async function getTonightList() {
  const snap = await getDoc(doc(db, "tonight", getTonightKey()));
  return snap.exists() ? (snap.data().list || []) : [];
}
async function saveTonightList(list) {
  await setDoc(doc(db, "tonight", getTonightKey()), { list });
}
async function getMilestoneMessages() {
  const snap = await getDoc(doc(db, "settings", "milestone_msgs"));
  return snap.exists() ? snap.data() : DEFAULT_MILESTONE_MESSAGES;
}
async function getTonightMessage() {
  const snap = await getDoc(doc(db, "settings", "tonight_msg"));
  return snap.exists() ? (snap.data().text || "") : "";
}

// --- Utils ---
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getRank(n) {
  if (n >= 20) return { label: "VETERAN", cls: "rank-veteran" };
  if (n >= 5)  return { label: "REGULAR", cls: "rank-regular" };
  return { label: "NEW FACE", cls: "rank-new" };
}
function getMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function getYearKey(d)  { return `${d.getFullYear()}`; }

async function getLastVisitDate(name) {
  const log   = await getAllLog();
  const today = toDateKey(new Date());
  const dates = Object.entries(log)
    .filter(([dk, entries]) => dk !== today && entries.some(e => e.name === name))
    .map(([dk]) => dk)
    .sort((a, b) => b.localeCompare(a));
  return dates.length > 0 ? dates[0] : null;
}
async function getMyRankings(name) {
  const users = await getAllUsers();
  const log   = await getAllLog();
  const now   = new Date();
  const totalList = Object.entries(users).map(([n,d]) => ({ name:n, count: d.visits||0 })).sort((a,b) => b.count-a.count);
  const totalRank = totalList.findIndex(m => m.name === name) + 1;
  const yearCounts = {}; const monthCounts = {};
  Object.entries(log).forEach(([dk, entries]) => {
    const d = new Date(dk.replace(/\//g, "-"));
    if (getYearKey(d)  === getYearKey(now))  entries.forEach(e => { yearCounts[e.name]  = (yearCounts[e.name]  || 0) + 1; });
    if (getMonthKey(d) === getMonthKey(now)) entries.forEach(e => { monthCounts[e.name] = (monthCounts[e.name] || 0) + 1; });
  });
  const yearRank  = Object.entries(yearCounts).sort((a,b) => b[1]-a[1]).findIndex(([n]) => n === name) + 1;
  const monthRank = Object.entries(monthCounts).sort((a,b) => b[1]-a[1]).findIndex(([n]) => n === name) + 1;
  return { total: totalRank||null, year: yearRank||null, month: monthRank||null };
}
async function getMyVisitDates(name) {
  const log = await getAllLog();
  return Object.entries(log).filter(([,entries]) => entries.some(e => e.name === name)).map(([dk]) => dk).sort((a,b) => b.localeCompare(a));
}
async function getMyPeople(name) {
  const log = await getAllLog(); const users = await getAllUsers(); const counts = {};
  Object.values(log).forEach(entries => {
    if (!entries.some(e => e.name === name)) return;
    entries.forEach(e => { if (e.name !== name) counts[e.name] = (counts[e.name]||0)+1; });
  });
  return Object.entries(counts).map(([n,count]) => ({ name:n, count, bio: users[n]?.bio||"" })).sort((a,b) => b.count-a.count);
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+JP:wght@400;700&display=swap');
* { box-sizing:border-box; margin:0; padding:0; }
body { background:#1a1410; font-family:'Noto Sans JP',sans-serif; min-height:100vh; }
.app { min-height:100vh; background:repeating-linear-gradient(105deg,transparent,transparent 18px,rgba(139,115,85,0.04) 18px,rgba(139,115,85,0.04) 19px),repeating-linear-gradient(-15deg,transparent,transparent 22px,rgba(100,80,55,0.04) 22px,rgba(100,80,55,0.04) 23px),#1e1810; display:flex; flex-direction:column; align-items:center; padding:0 0 80px 0; }
.header { width:100%; padding:28px 24px 20px; text-align:center; border-bottom:1px solid rgba(139,115,85,0.2); background:rgba(0,0,0,0.3); position:relative; }
.header::after { content:''; position:absolute; bottom:-1px; left:10%; width:80%; height:1px; background:linear-gradient(90deg,transparent,#7ec600,#ff2d78,transparent); }
.logo { font-family:'Bebas Neue',sans-serif; font-size:44px; letter-spacing:8px; color:#e8d8b8; line-height:1; }
.logo span { color:#7ec600; }
.subtitle { font-size:10px; letter-spacing:4px; color:rgba(200,180,140,0.4); margin-top:4px; text-transform:uppercase; }
.main { width:100%; max-width:420px; padding:28px 20px 0; }
.card { background:rgba(30,24,16,0.9); border:1px solid rgba(139,115,85,0.25); border-radius:2px; padding:28px 24px; position:relative; overflow:hidden; margin-bottom:16px; }
.card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,#7ec600,#ff2d78); }
.card.green::before { background:#7ec600; }
.card-title { font-family:'Bebas Neue',sans-serif; font-size:20px; letter-spacing:4px; color:#e8d8b8; margin-bottom:6px; }
.card-desc { font-size:12px; color:rgba(200,180,140,0.45); margin-bottom:24px; line-height:1.8; white-space:pre-line; }
.input-label { font-size:10px; letter-spacing:3px; color:rgba(200,180,140,0.4); text-transform:uppercase; margin-bottom:6px; display:block; }
.input-wrap { margin-bottom:14px; }
input[type="text"],input[type="password"] { width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(139,115,85,0.3); border-radius:2px; padding:13px 16px; color:#e8d8b8; font-family:'Noto Sans JP',sans-serif; font-size:16px; outline:none; transition:border-color 0.2s; }
input:focus { border-color:#7ec600; }
input::placeholder { color:rgba(200,180,140,0.2); }
.btn-primary { width:100%; background:#7ec600; border:none; border-radius:2px; padding:15px; font-family:'Bebas Neue',sans-serif; font-size:19px; letter-spacing:4px; color:#1a1410; cursor:pointer; transition:all 0.15s; margin-top:6px; }
.btn-primary:hover { background:#8fd600; }
.btn-outline { width:100%; background:transparent; border:1px solid rgba(139,115,85,0.3); border-radius:2px; padding:13px; font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:2px; color:rgba(200,180,140,0.45); cursor:pointer; transition:all 0.15s; margin-top:8px; }
.btn-outline:hover { border-color:rgba(139,115,85,0.6); color:#e8d8b8; }
.btn-checkin { width:100%; background:transparent; border:1px solid #7ec600; border-radius:2px; padding:18px; font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:5px; color:#7ec600; cursor:pointer; transition:all 0.2s; }
.btn-checkin:hover { background:#7ec600; color:#1a1410; }
.btn-checkin:disabled { opacity:0.5; cursor:not-allowed; }
.btn-history { width:100%; background:transparent; border:1px solid rgba(139,115,85,0.25); border-radius:2px; padding:11px; font-family:'Bebas Neue',sans-serif; font-size:15px; letter-spacing:3px; color:rgba(200,180,140,0.4); cursor:pointer; transition:all 0.2s; margin-top:10px; }
.btn-history:hover { border-color:rgba(139,115,85,0.5); color:#e8d8b8; }
.already-checked { text-align:center; font-size:11px; letter-spacing:3px; color:rgba(126,198,0,0.6); padding:14px; border:1px solid rgba(126,198,0,0.2); border-radius:2px; text-transform:uppercase; }
.profile-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; }
.profile-name { font-family:'Bebas Neue',sans-serif; font-size:30px; letter-spacing:3px; color:#e8d8b8; line-height:1; }
.profile-sub { font-size:10px; letter-spacing:2px; color:rgba(200,180,140,0.35); margin-top:4px; text-transform:uppercase; }
.big-count { font-family:'Bebas Neue',sans-serif; font-size:60px; color:#7ec600; line-height:1; text-shadow:0 0 30px rgba(126,198,0,0.3); }
.big-label { font-size:9px; letter-spacing:3px; color:rgba(200,180,140,0.35); text-align:right; text-transform:uppercase; }
.rank-badge { display:inline-block; font-size:9px; letter-spacing:3px; padding:3px 8px; border-radius:1px; text-transform:uppercase; margin-top:4px; }
.rank-new { background:rgba(139,115,85,0.15); color:rgba(200,180,140,0.5); }
.rank-regular { background:rgba(126,198,0,0.1); color:#7ec600; }
.rank-veteran { background:rgba(255,45,120,0.1); color:#ff2d78; }
.divider { border:none; border-top:1px solid rgba(139,115,85,0.12); margin:16px 0; }
.bio-row { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
.bio-display { font-size:12px; color:rgba(200,180,140,0.5); flex:1; font-style:italic; }
.bio-empty { font-size:12px; color:rgba(200,180,140,0.2); flex:1; }
.btn-bio-edit { background:none; border:1px solid rgba(139,115,85,0.25); border-radius:2px; padding:4px 10px; font-family:'Bebas Neue',sans-serif; font-size:11px; letter-spacing:2px; color:rgba(200,180,140,0.35); cursor:pointer; white-space:nowrap; transition:all 0.15s; }
.btn-bio-edit:hover { border-color:rgba(139,115,85,0.5); color:rgba(200,180,140,0.6); }
.bio-edit-row { display:flex; gap:8px; align-items:center; margin-bottom:14px; }
.bio-edit-row input { flex:1; padding:9px 12px; font-size:14px; }
.bio-chars { font-size:10px; color:rgba(200,180,140,0.25); white-space:nowrap; }
.btn-bio-save { background:transparent; border:1px solid rgba(126,198,0,0.4); border-radius:2px; padding:8px 12px; font-family:'Bebas Neue',sans-serif; font-size:12px; letter-spacing:2px; color:rgba(126,198,0,0.7); cursor:pointer; white-space:nowrap; transition:all 0.15s; }
.btn-bio-save:hover { border-color:#7ec600; color:#7ec600; }
.section-title { font-family:'Bebas Neue',sans-serif; font-size:13px; letter-spacing:5px; color:rgba(200,180,140,0.3); text-transform:uppercase; margin:32px 0 14px; padding-bottom:10px; border-bottom:1px solid rgba(139,115,85,0.12); display:flex; align-items:center; gap:10px; }
.section-title::before { content:''; width:3px; height:13px; background:#ff2d78; flex-shrink:0; }
.section-count { font-family:'Bebas Neue',sans-serif; font-size:13px; color:rgba(200,180,140,0.25); margin-left:auto; }
.member-list { display:flex; flex-direction:column; gap:6px; }
.member-item { background:rgba(0,0,0,0.2); border:1px solid rgba(139,115,85,0.12); border-radius:2px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.member-item.me { border-color:rgba(126,198,0,0.25); background:rgba(126,198,0,0.03); }
.member-name { font-size:14px; color:#e8d8b8; font-weight:700; }
.member-item.me .member-name::after { content:' ← YOU'; font-size:9px; letter-spacing:2px; color:#7ec600; margin-left:6px; }
.member-bio { font-size:11px; color:rgba(200,180,140,0.4); margin-top:3px; font-style:italic; }
.member-visits { font-family:'Bebas Neue',sans-serif; font-size:20px; color:rgba(200,180,140,0.4); white-space:nowrap; }
.member-visits span { font-size:10px; letter-spacing:1px; margin-left:2px; }
.member-met { font-size:9px; letter-spacing:2px; color:rgba(255,45,120,0.4); margin-top:3px; text-align:right; text-transform:uppercase; }
.empty-state { text-align:center; padding:28px 0; color:rgba(200,180,140,0.2); font-size:11px; letter-spacing:2px; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
.fade-in { animation:fadeIn 0.35s ease; }
.note { font-size:11px; color:rgba(200,180,140,0.25); text-align:center; margin-top:12px; line-height:1.7; }
.error-msg { font-size:12px; color:#ff2d78; margin-top:8px; letter-spacing:1px; }
.success-name { font-family:'Bebas Neue',sans-serif; font-size:32px; letter-spacing:3px; color:#e8d8b8; text-align:center; margin-bottom:4px; }
.success-count { font-family:'Bebas Neue',sans-serif; font-size:88px; line-height:1; color:#7ec600; text-shadow:0 0 50px rgba(126,198,0,0.4); text-align:center; }
.success-label { font-size:10px; letter-spacing:4px; color:rgba(200,180,140,0.35); text-align:center; text-transform:uppercase; margin-bottom:16px; }
.success-msg { font-size:14px; color:rgba(200,180,140,0.7); line-height:1.9; text-align:center; margin-bottom:16px; font-weight:700; white-space:pre-line; }
.ranking-row { display:flex; gap:8px; margin-bottom:14px; }
.ranking-box { flex:1; background:rgba(0,0,0,0.25); border:1px solid rgba(139,115,85,0.15); border-radius:2px; padding:12px 8px; text-align:center; }
.ranking-box-label { font-size:9px; letter-spacing:2px; color:rgba(200,180,140,0.3); text-transform:uppercase; margin-bottom:6px; }
.ranking-box-num { font-family:'Bebas Neue',sans-serif; font-size:36px; color:#ff2d78; line-height:1; }
.ranking-box-unit { font-size:10px; letter-spacing:2px; color:rgba(255,45,120,0.4); margin-top:2px; }
.ranking-box.no-data .ranking-box-num { font-size:20px; color:rgba(200,180,140,0.2); }
.last-visit-box { display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(0,0,0,0.25); border:1px solid rgba(139,115,85,0.15); border-radius:2px; padding:10px 16px; margin-bottom:14px; }
.last-visit-label { font-size:10px; letter-spacing:3px; color:rgba(200,180,140,0.3); text-transform:uppercase; }
.last-visit-date { font-family:'Bebas Neue',sans-serif; font-size:18px; color:rgba(200,180,140,0.6); letter-spacing:2px; }
.tonight-msg-card { background:rgba(126,198,0,0.06); border:1px solid rgba(126,198,0,0.2); border-radius:2px; padding:14px 16px; margin-bottom:16px; }
.tonight-msg-card::before { content:'今夜のメッセージ'; font-family:'Bebas Neue',sans-serif; font-size:10px; letter-spacing:3px; color:rgba(126,198,0,0.5); display:block; margin-bottom:6px; }
.tonight-msg-text { font-size:13px; color:#e8d8b8; line-height:1.8; }
.back-btn { background:none; border:none; color:rgba(200,180,140,0.4); font-size:12px; letter-spacing:2px; cursor:pointer; padding:0 0 20px 0; display:flex; align-items:center; gap:6px; transition:color 0.2s; }
.back-btn:hover { color:#e8d8b8; }
.history-nav { display:flex; gap:4px; margin-bottom:20px; }
.history-nav-btn { flex:1; background:transparent; border:1px solid rgba(139,115,85,0.2); border-radius:2px; padding:9px 4px; font-family:'Bebas Neue',sans-serif; font-size:12px; letter-spacing:2px; color:rgba(200,180,140,0.35); cursor:pointer; transition:all 0.15s; text-transform:uppercase; }
.history-nav-btn.active { border-color:#7ec600; color:#7ec600; background:rgba(126,198,0,0.05); }
.history-date-item { background:rgba(0,0,0,0.2); border:1px solid rgba(139,115,85,0.12); border-radius:2px; margin-bottom:6px; overflow:hidden; }
.history-date-header { padding:12px 16px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; transition:background 0.15s; }
.history-date-header:hover { background:rgba(139,115,85,0.06); }
.history-date-header.open { border-bottom:1px solid rgba(139,115,85,0.1); }
.history-date { font-size:13px; color:#e8d8b8; font-weight:700; }
.history-num { font-family:'Bebas Neue',sans-serif; font-size:16px; color:rgba(200,180,140,0.3); letter-spacing:1px; }
.history-date-people { padding:10px 16px 12px; display:flex; flex-direction:column; gap:6px; }
.history-person-name { font-size:12px; color:rgba(200,180,140,0.55); }
.history-person-bio { font-size:11px; color:rgba(200,180,140,0.3); font-style:italic; }
.history-no-one { font-size:11px; color:rgba(200,180,140,0.2); letter-spacing:1px; }
.people-item { background:rgba(0,0,0,0.2); border:1px solid rgba(139,115,85,0.12); border-radius:2px; padding:13px 16px; display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
.people-name { font-size:14px; color:#e8d8b8; font-weight:700; }
.people-count { font-family:'Bebas Neue',sans-serif; font-size:24px; color:#ff2d78; white-space:nowrap; }
.people-count span { font-size:10px; letter-spacing:1px; margin-left:2px; color:rgba(255,45,120,0.5); }
`;

function VisitDateItem({ dk, index, total, nickname }) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState([]);
  useEffect(() => {
    if (!open) return;
    (async () => {
      const entries = await getLogByDate(dk);
      const users   = await getAllUsers();
      setPeople(entries.filter(e => e.name !== nickname).map(e => ({ name: e.name, bio: users[e.name]?.bio || "" })));
    })();
  }, [open]);
  return (
    <div className="history-date-item">
      <div className={`history-date-header ${open?"open":""}`} onClick={() => setOpen(!open)}>
        <div className="history-date">{dk}</div>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div className="history-num">{index===0?<span style={{fontSize:"11px",color:"rgba(126,198,0,0.6)",letterSpacing:"2px"}}>LATEST</span>:`#${total-index}`}</div>
          <div style={{fontSize:"12px",color:"rgba(200,180,140,0.25)"}}>{open?"▲":"▼"}</div>
        </div>
      </div>
      {open && (
        <div className="history-date-people">
          {people.length===0
            ? <div className="history-no-one">その夜は一人でした</div>
            : people.map((p,i) => <div key={i}><div className="history-person-name">{p.name}</div>{p.bio&&<div className="history-person-bio">「{p.bio}」</div>}</div>)
          }
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen]                 = useState("loading");
  const [fromQR, setFromQR]                 = useState(false);
  const [nickname, setNickname]             = useState("");
  const [inputName, setInputName]           = useState("");
  const [inputPin, setInputPin]             = useState("");
  const [visitCount, setVisitCount]         = useState(0);
  const [tonightList, setTonightList]       = useState([]);
  const [alreadyChecked, setAlreadyChecked] = useState(false);
  const [checking, setChecking]             = useState(false);
  const [formErr, setFormErr]               = useState("");
  const [lastVisitDate, setLastVisitDate]   = useState(null);
  const [checkinMessage, setCheckinMessage] = useState("");
  const [tonightMessage, setTonightMessage] = useState("");
  const [myRankings, setMyRankings]         = useState({ total:null, year:null, month:null });
  const [bio, setBio]                       = useState("");
  const [bioInput, setBioInput]             = useState("");
  const [editingBio, setEditingBio]         = useState(false);
  const [historyTab, setHistoryTab]         = useState("visits");
  const [visitDates, setVisitDates]         = useState([]);
  const [myPeople, setMyPeople]             = useState([]);

  useEffect(() => {
    setFromQR(new URLSearchParams(window.location.search).has("checkin"));
    init();
  }, []);

  async function init() {
    const savedName = localStorage.getItem("by_nick");
    const savedPin  = localStorage.getItem("by_pin");
    if (savedName && savedPin) {
      const user = await getUser(savedName);
      if (user && user.pin === savedPin) {
        const tonight = await getTonightList();
        setNickname(savedName); setVisitCount(user.visits||0); setBio(user.bio||"");
        setTonightList(tonight); setAlreadyChecked(tonight.some(t => t.name===savedName));
        setScreen("profile"); return;
      }
    }
    setScreen("register");
  }

  async function handleRegister() {
    const name = inputName.trim(); const pin = inputPin.trim();
    if (!name) { setFormErr("ニックネームを入力してください"); return; }
    if (!/^\d{4}$/.test(pin)) { setFormErr("PINは数字4桁で入力してください"); return; }
    if (await getUser(name)) { setFormErr("そのニックネームはすでに使われています"); return; }
    await saveUser(name, { visits:0, pin, bio:"", since: toDateKey(new Date()) });
    localStorage.setItem("by_nick", name); localStorage.setItem("by_pin", pin);
    const tonight = await getTonightList();
    setNickname(name); setVisitCount(0); setBio(""); setFormErr("");
    setTonightList(tonight); setAlreadyChecked(false); setScreen("profile");
  }

  async function handleRestore() {
    const name = inputName.trim(); const pin = inputPin.trim();
    if (!name || !/^\d{4}$/.test(pin)) { setFormErr("ニックネームとPIN（数字4桁）を入力してください"); return; }
    const user = await getUser(name);
    if (!user || user.pin !== pin) { setFormErr("ニックネームまたはPINが違います"); return; }
    localStorage.setItem("by_nick", name); localStorage.setItem("by_pin", pin);
    const tonight = await getTonightList();
    setNickname(name); setVisitCount(user.visits||0); setBio(user.bio||""); setFormErr("");
    setTonightList(tonight); setAlreadyChecked(tonight.some(t => t.name===name)); setScreen("profile");
  }

  async function saveBio() {
    const newBio = bioInput.trim();
    await updateUser(nickname, { bio: newBio });
    setBio(newBio); setEditingBio(false);
    const tonight = await getTonightList();
    await saveTonightList(tonight.map(m => m.name===nickname ? {...m, bio:newBio} : m));
    setTonightList(await getTonightList());
    const log = await getAllLog();
    for (const [dk, entries] of Object.entries(log)) {
      if (entries.some(e => e.name===nickname))
        await saveLogByDate(dk, entries.map(e => e.name===nickname ? {...e, bio:newBio} : e));
    }
  }

 async function handleCheckin() {
  if (checking) return;
  setChecking(true);
  try {
    const [user, allLog, tonight] = await Promise.all([
      getUser(nickname),
      getAllLog(),
      getTonightList(),
    ]);
    if (!user) { setChecking(false); return; }

    const newCount = (user.visits || 0) + 1;
    const dk = toDateKey(new Date());

    // lastVisitDateをallLogから計算
    const lastDate = Object.entries(allLog)
      .filter(([k, entries]) => k !== dk && entries.some(e => e.name === nickname))
      .map(([k]) => k)
      .sort((a, b) => b.localeCompare(a))[0] || null;

    // rankingsをallLogから計算（今日分を手動で追加）
    const now = new Date();
    const yearCounts = {}; const monthCounts = {};
    Object.entries(allLog).forEach(([k, entries]) => {
      const parts = k.split("-");
      const year  = parts[0];
      const month = parts[0] + "-" + parts[1];
      if (year  === getYearKey(now))  entries.forEach(e => { yearCounts[e.name]  = (yearCounts[e.name]  || 0) + 1; });
      if (month === getMonthKey(now)) entries.forEach(e => { monthCounts[e.name] = (monthCounts[e.name] || 0) + 1; });
    });
    yearCounts[nickname]  = (yearCounts[nickname]  || 0) + 1;
    monthCounts[nickname] = (monthCounts[nickname] || 0) + 1;

    // updateUserを先に終わらせてからallUsers取得
    await updateUser(nickname, { visits: newCount });
    const users = await getAllUsers();
    const totalList = Object.entries(users)
      .map(([n, d]) => ({ name: n, count: d.visits || 0 }))
      .sort((a, b) => b.count - a.count);
    const rankings = {
      total: (totalList.findIndex(m => m.name === nickname) + 1) || null,
      year:  (Object.entries(yearCounts).sort((a,b) => b[1]-a[1]).findIndex(([n]) => n === nickname) + 1) || null,
      month: (Object.entries(monthCounts).sort((a,b) => b[1]-a[1]).findIndex(([n]) => n === nickname) + 1) || null,
    };

    // 書き込みデータ準備
    const existingEntries = allLog[dk] || [];
    const newEntries = existingEntries.find(e => e.name === nickname)
      ? existingEntries
      : [...existingEntries, { name: nickname, visits: newCount, time: new Date().toLocaleTimeString("ja-JP", {hour:"2-digit",minute:"2-digit"}) }];
    const newTonight = tonight.some(t => t.name === nickname)
      ? tonight
      : [...tonight, { name: nickname, visits: newCount, bio: user.bio || "" }];

    // 並列で書き込み＆取得
    const [msgs, tMsg] = await Promise.all([
      getMilestoneMessages(),
      getTonightMessage(),
      saveLogByDate(dk, newEntries),
      saveTonightList(newTonight),
    ]);

    const ciMsg = msgs[newCount] || "チェックイン完了！\n今夜もよろしくお願いします。";

    setVisitCount(newCount); setAlreadyChecked(true); setLastVisitDate(lastDate);
    setTonightList(newTonight); setCheckinMessage(ciMsg); setTonightMessage(tMsg);
    setMyRankings(rankings);
    setChecking(false);
    window.history.replaceState({}, "", "/");
    setScreen("success");
  } catch (e) {
    console.error(e);
    setChecking(false);
    setFormErr("エラーが発生しました。もう一度お試しください。");
  }
}

  async function openHistory() {
    setHistoryTab("visits");
    const dates  = await getMyVisitDates(nickname);
    const people = await getMyPeople(nickname);
    setVisitDates(dates); setMyPeople(people); setScreen("history");
  }

  const rank = getRank(visitCount);

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div className="logo">BACK<span>YARD</span></div>
          <div className="subtitle">{fromQR?"Check-in":"My Page"}</div>
        </div>
        <div className="main">

          {screen==="loading" && <div style={{textAlign:"center",padding:"60px 0",color:"rgba(200,180,140,0.25)",letterSpacing:"3px",fontSize:"11px"}}>LOADING...</div>}

          {screen==="register" && (
            <div className="card fade-in">
              <div className="card-title">WELCOME</div>
              <div className="card-desc">{"ニックネームと4桁PINを登録してください。\nスマホが変わってもPINで復元できます。"}</div>
              <div className="input-wrap"><label className="input-label">ニックネーム</label><input type="text" placeholder="例：まお" value={inputName} onChange={e=>{setInputName(e.target.value);setFormErr("");}} maxLength={20}/></div>
              <div className="input-wrap"><label className="input-label">4桁PIN（数字）</label><input type="password" placeholder="例：1234" value={inputPin} onChange={e=>{setInputPin(e.target.value);setFormErr("");}} maxLength={4} inputMode="numeric" onKeyDown={e=>e.key==="Enter"&&handleRegister()}/></div>
              {formErr&&<div className="error-msg">{formErr}</div>}
              <button className="btn-primary" onClick={handleRegister}>登録する</button>
              <button className="btn-outline" onClick={()=>{setInputName("");setInputPin("");setFormErr("");setScreen("restore");}}>すでに登録済みの方はこちら</button>
              <p className="note">※ データはクラウドに保存されます</p>
            </div>
          )}

          {screen==="restore" && (
            <div className="card fade-in">
              <div className="card-title">RESTORE</div>
              <div className="card-desc">登録済みのニックネームと4桁PINを入力してください。</div>
              <div className="input-wrap"><label className="input-label">ニックネーム</label><input type="text" placeholder="例：まお" value={inputName} onChange={e=>{setInputName(e.target.value);setFormErr("");}} maxLength={20}/></div>
              <div className="input-wrap"><label className="input-label">4桁PIN（数字）</label><input type="password" placeholder="例：1234" value={inputPin} onChange={e=>{setInputPin(e.target.value);setFormErr("");}} maxLength={4} inputMode="numeric" onKeyDown={e=>e.key==="Enter"&&handleRestore()}/></div>
              {formErr&&<div className="error-msg">{formErr}</div>}
              <button className="btn-primary" onClick={handleRestore}>復元する</button>
              <button className="btn-outline" onClick={()=>{setInputName("");setInputPin("");setFormErr("");setScreen("register");}}>新規登録はこちら</button>
            </div>
          )}

          {screen==="profile" && (
            <div className="fade-in">
              <div className="card green">
                <div className="profile-header">
                  <div><div className="profile-name">{nickname}</div><div className="profile-sub">Member</div><div className={`rank-badge ${rank.cls}`}>{rank.label}</div></div>
                  <div style={{textAlign:"right"}}><div className="big-count">{visitCount}</div><div className="big-label">visits</div></div>
                </div>
                {editingBio
                  ? <div className="bio-edit-row"><input type="text" placeholder="例：薬剤師やってます" value={bioInput} onChange={e=>setBioInput(e.target.value.slice(0,20))} onKeyDown={e=>e.key==="Enter"&&saveBio()} maxLength={20}/><span className="bio-chars">{bioInput.length}/20</span><button className="btn-bio-save" onClick={saveBio}>保存</button></div>
                  : <div className="bio-row">{bio?<div className="bio-display">「{bio}」</div>:<div className="bio-empty">一言を追加...</div>}<button className="btn-bio-edit" onClick={()=>{setBioInput(bio);setEditingBio(true);}}>{bio?"編集":"追加"}</button></div>
                }
                {fromQR && (
                  <div style={{marginBottom:"12px"}}>
                    {alreadyChecked
                      ? <div className="already-checked">✓ 今夜チェックイン済み</div>
                      : <button className="btn-checkin" onClick={handleCheckin} disabled={checking}>{checking?"...":"CHECK IN"}</button>
                    }
                  </div>
                )}
                <button className="btn-history" onClick={openHistory}>MY HISTORY →</button>
                <hr className="divider"/>
              </div>
              {/* チェックイン済みの時だけTONIGHT LISTを表示 */}
              {fromQR && alreadyChecked && (
                <>
                  <div className="section-title">TONIGHT<span className="section-count">{tonightList.length} people</span></div>
                  <div className="member-list">
                    {tonightList.length===0
                      ? <div className="empty-state">まだ誰もチェックインしていません</div>
                      : tonightList.map((m,i)=>(
                        <div key={i} className={`member-item ${m.name===nickname?"me":""}`}>
                          <div style={{flex:1}}><div className="member-name">{m.name}</div>{m.bio&&<div className="member-bio">「{m.bio}」</div>}</div>
                        </div>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
          )}

          {screen==="success" && (
            <div className="fade-in">
              <div className="card">
                <div className="success-name">{nickname}</div>
                <div className="success-count">{visitCount}</div>
                <div className="success-label">visits total</div>
                <div className="success-msg">{checkinMessage}</div>
                <div className="ranking-row">
                  <div className={`ranking-box ${!myRankings.month?"no-data":""}`}><div className="ranking-box-label">This Month</div><div className="ranking-box-num">{myRankings.month||"-"}</div><div className="ranking-box-unit">{myRankings.month?"位":""}</div></div>
                  <div className={`ranking-box ${!myRankings.year?"no-data":""}`}><div className="ranking-box-label">This Year</div><div className="ranking-box-num">{myRankings.year||"-"}</div><div className="ranking-box-unit">{myRankings.year?"位":""}</div></div>
                  <div className={`ranking-box ${!myRankings.total?"no-data":""}`}><div className="ranking-box-label">All Time</div><div className="ranking-box-num">{myRankings.total||"-"}</div><div className="ranking-box-unit">{myRankings.total?"位":""}</div></div>
                </div>
                {lastVisitDate&&<div className="last-visit-box"><div className="last-visit-label">Last Visit</div><div className="last-visit-date">{lastVisitDate}</div></div>}
                <div className={`rank-badge ${rank.cls}`} style={{display:"block",textAlign:"center",padding:"6px 0"}}>{rank.label}</div>
                <button className="btn-primary" style={{marginTop:"20px"}} onClick={()=>setScreen("profile")}>PROFILE →</button>
              </div>
              {tonightMessage&&<div className="tonight-msg-card"><div className="tonight-msg-text">{tonightMessage}</div></div>}
              <div className="section-title">TONIGHT<span className="section-count">{tonightList.length} people</span></div>
              <div className="member-list">
                {tonightList.map((m,i)=>(
                  <div key={i} className={`member-item ${m.name===nickname?"me":""}`}>
                    <div style={{flex:1}}><div className="member-name">{m.name}</div>{m.bio&&<div className="member-bio">「{m.bio}」</div>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {screen==="history" && (
            <div className="fade-in">
              <button className="back-btn" onClick={()=>setScreen("profile")}>← Back</button>
              <div className="card green">
                <div className="profile-header">
                  <div><div className="profile-name">{nickname}</div><div className="profile-sub">My History</div></div>
                  <div style={{textAlign:"right"}}><div className="big-count">{visitCount}</div><div className="big-label">visits</div></div>
                </div>
              </div>
              <div className="history-nav">
                <button className={`history-nav-btn ${historyTab==="visits"?"active":""}`} onClick={()=>setHistoryTab("visits")}>Visit Log</button>
                <button className={`history-nav-btn ${historyTab==="people"?"active":""}`} onClick={()=>setHistoryTab("people")}>Same Night</button>
              </div>
              {historyTab==="visits" && (visitDates.length===0
                ? <div className="empty-state">来店記録がありません</div>
                : visitDates.map((dk,i)=><VisitDateItem key={i} dk={dk} index={i} total={visitDates.length} nickname={nickname}/>)
              )}
              {historyTab==="people" && (myPeople.length===0
                ? <div className="empty-state">まだ記録がありません</div>
                : myPeople.map((p,i)=>(
                  <div key={i} className="people-item">
                    <div style={{flex:1}}><div className="people-name">{p.name}</div>{p.bio&&<div className="member-bio">「{p.bio}」</div>}</div>
                    <div className="people-count">{p.count}<span>nights</span></div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
