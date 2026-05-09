import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const ADMIN_PASSWORD = "manabu3214";

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
async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  const result = {};
  snap.forEach(d => { result[d.id] = d.data(); });
  return result;
}
async function saveUser(name, data) { await setDoc(doc(db, "users", name), data); }
async function updateUser(name, data) { await updateDoc(doc(db, "users", name), data); }
async function deleteUser(name) { await deleteDoc(doc(db, "users", name)); }

async function getAllLog() {
  const snap = await getDocs(collection(db, "log"));
  const result = {};
  snap.forEach(d => { result[d.id] = d.data().entries || []; });
  return result;
}
async function getLogByDate(dk) {
  const snap = await getDoc(doc(db, "log", dk));
  return snap.exists() ? (snap.data().entries || []) : [];
}
async function saveLogByDate(dk, entries) { await setDoc(doc(db, "log", dk), { entries }); }
async function deleteLogByDate(dk) { await deleteDoc(doc(db, "log", dk)); }

function getTonightKey() { return "tonight_" + new Date().toDateString(); }
async function getTonightList() {
  const snap = await getDoc(doc(db, "tonight", getTonightKey()));
  return snap.exists() ? (snap.data().list || []) : [];
}
async function saveTonightList(list) { await setDoc(doc(db, "tonight", getTonightKey()), { list }); }
async function removeFromTonightList(name) {
  const list = await getTonightList();
  await saveTonightList(list.filter(m => m.name !== name));
}

async function getMilestoneMessages() {
  const snap = await getDoc(doc(db, "settings", "milestone_msgs"));
  return snap.exists() ? snap.data() : { ...DEFAULT_MILESTONE_MESSAGES };
}
async function saveMilestoneMessages(data) { await setDoc(doc(db, "settings", "milestone_msgs"), data); }
async function getTonightMessage() {
  const snap = await getDoc(doc(db, "settings", "tonight_msg"));
  return snap.exists() ? (snap.data().text || "") : "";
}
async function saveTonightMessage(text) { await setDoc(doc(db, "settings", "tonight_msg"), { text }); }

function toDateKey(d) {
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function getMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function getYearKey(d)  { return `${d.getFullYear()}`; }
function getPeriodLabel(period) {
  const now = new Date();
  if (period==="month") return `${now.getFullYear()}年${now.getMonth()+1}月`;
  if (period==="year")  return `${now.getFullYear()}年`;
  return "全期間";
}
async function buildRanking(period) {
  const users = await getAllUsers();
  const log   = await getAllLog();
  const now   = new Date();
  if (period==="total") {
    const list = Object.entries(users).map(([name,d])=>({name,count:d.visits||0})).sort((a,b)=>b.count-a.count);
    return { list, total: list.reduce((s,m)=>s+m.count,0) };
  }
  const counts = {};
  Object.entries(log).forEach(([dk,entries]) => {
    const d = new Date(dk.replace(/\//g,"-"));
    const match = period==="month" ? getMonthKey(d)===getMonthKey(now) : getYearKey(d)===getYearKey(now);
    if (match) entries.forEach(e => { counts[e.name]=(counts[e.name]||0)+1; });
  });
  const list = Object.entries(counts).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  return { list, total: list.reduce((s,m)=>s+m.count,0) };
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
.main { width:100%; max-width:420px; padding:24px 20px 0; }
.tab-bar { display:flex; width:100%; max-width:420px; margin-top:24px; gap:3px; padding:0 20px; }
.tab-btn { flex:1; background:transparent; border:1px solid rgba(139,115,85,0.2); border-radius:2px; padding:9px 2px; font-family:'Bebas Neue',sans-serif; font-size:11px; letter-spacing:1px; color:rgba(200,180,140,0.35); cursor:pointer; transition:all 0.15s; text-transform:uppercase; }
.tab-btn.active { border-color:#ff2d78; color:#ff2d78; background:rgba(255,45,120,0.06); }
.tab-btn:hover:not(.active) { border-color:rgba(139,115,85,0.4); color:rgba(200,180,140,0.6); }
.card { background:rgba(30,24,16,0.9); border:1px solid rgba(139,115,85,0.25); border-radius:2px; padding:22px; position:relative; overflow:hidden; margin-bottom:16px; }
.card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:#ff2d78; }
.card.green::before { background:#7ec600; }
.card-title { font-family:'Bebas Neue',sans-serif; font-size:18px; letter-spacing:4px; color:#e8d8b8; margin-bottom:6px; }
.card-desc { font-size:12px; color:rgba(200,180,140,0.45); margin-bottom:18px; line-height:1.8; }
.input-label { font-size:10px; letter-spacing:3px; color:rgba(200,180,140,0.4); text-transform:uppercase; margin-bottom:6px; display:block; }
.input-wrap { margin-bottom:14px; }
input,textarea { width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(139,115,85,0.3); border-radius:2px; padding:12px 14px; color:#e8d8b8; font-family:'Noto Sans JP',sans-serif; font-size:14px; outline:none; transition:border-color 0.2s; resize:none; }
input:focus,textarea:focus { border-color:#ff2d78; }
input::placeholder,textarea::placeholder { color:rgba(200,180,140,0.2); }
select { width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(139,115,85,0.3); border-radius:2px; padding:12px 14px; color:#e8d8b8; font-family:'Noto Sans JP',sans-serif; font-size:14px; outline:none; transition:border-color 0.2s; appearance:none; }
select:focus { border-color:#ff2d78; }
select option { background:#1e1810; }
.btn-primary { width:100%; background:#ff2d78; border:none; border-radius:2px; padding:13px; font-family:'Bebas Neue',sans-serif; font-size:17px; letter-spacing:4px; color:#fff; cursor:pointer; transition:all 0.15s; margin-top:6px; }
.btn-primary:hover { background:#ff4d8f; }
.btn-primary.green { background:#7ec600; color:#1a1410; }
.btn-primary.green:hover { background:#8fd600; }
.btn-sm { background:transparent; border:1px solid rgba(139,115,85,0.3); border-radius:2px; padding:6px 10px; font-family:'Bebas Neue',sans-serif; font-size:12px; letter-spacing:2px; color:rgba(200,180,140,0.5); cursor:pointer; transition:all 0.15s; white-space:nowrap; }
.btn-sm:hover { border-color:rgba(139,115,85,0.6); color:#e8d8b8; }
.btn-sm.danger { border-color:rgba(255,45,120,0.3); color:rgba(255,45,120,0.5); }
.btn-sm.danger:hover { border-color:#ff2d78; color:#ff2d78; background:rgba(255,45,120,0.05); }
.btn-sm.save { border-color:rgba(126,198,0,0.4); color:rgba(126,198,0,0.7); }
.btn-sm.save:hover { border-color:#7ec600; color:#7ec600; }
.error-msg { font-size:12px; color:#ff2d78; margin-top:8px; letter-spacing:1px; }
.back-btn { background:none; border:none; color:rgba(200,180,140,0.4); font-size:12px; letter-spacing:2px; cursor:pointer; padding:0 0 20px 0; display:flex; align-items:center; gap:6px; transition:color 0.2s; }
.back-btn:hover { color:#e8d8b8; }
.list { display:flex; flex-direction:column; gap:6px; }
.list-item { background:rgba(0,0,0,0.2); border:1px solid rgba(139,115,85,0.12); border-radius:2px; padding:12px 14px; }
.list-item-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.item-name { font-size:14px; color:#e8d8b8; font-weight:700; }
.item-sub { font-size:10px; color:rgba(200,180,140,0.3); margin-top:2px; letter-spacing:1px; }
.item-count { font-family:'Bebas Neue',sans-serif; font-size:20px; color:rgba(200,180,140,0.4); white-space:nowrap; }
.item-count span { font-size:10px; letter-spacing:1px; margin-left:2px; }
.item-actions { display:flex; gap:6px; margin-top:10px; flex-wrap:wrap; }
.edit-row { display:flex; gap:8px; align-items:center; margin-top:10px; }
.edit-row input { flex:1; padding:8px 12px; font-size:14px; }
.empty-state { text-align:center; padding:40px 0; color:rgba(200,180,140,0.2); font-size:11px; letter-spacing:2px; }
.stats-row { display:flex; gap:8px; margin-bottom:16px; }
.stat-box { flex:1; background:rgba(0,0,0,0.3); border:1px solid rgba(139,115,85,0.15); border-radius:2px; padding:14px 12px; text-align:center; }
.stat-num { font-family:'Bebas Neue',sans-serif; font-size:32px; color:#ff2d78; line-height:1; }
.stat-label { font-size:9px; letter-spacing:2px; color:rgba(200,180,140,0.35); text-transform:uppercase; margin-top:3px; }
.date-item { background:rgba(0,0,0,0.2); border:1px solid rgba(139,115,85,0.15); border-radius:2px; padding:13px 14px; display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; gap:8px; }
.date-item-left { cursor:pointer; flex:1; }
.date-item-left:hover .date-label { color:#ff2d78; }
.date-label { font-size:13px; color:#e8d8b8; font-weight:700; transition:color 0.15s; }
.date-count { font-family:'Bebas Neue',sans-serif; font-size:20px; color:rgba(200,180,140,0.4); }
.date-count span { font-size:10px; margin-left:2px; }
.add-record-form { background:rgba(0,0,0,0.25); border:1px solid rgba(126,198,0,0.2); border-radius:2px; padding:16px; margin-top:10px; }
.add-record-title { font-family:'Bebas Neue',sans-serif; font-size:13px; letter-spacing:3px; color:rgba(126,198,0,0.7); margin-bottom:12px; }
.add-record-row { display:flex; gap:8px; align-items:flex-end; }
.add-record-row select,.add-record-row input { flex:1; padding:9px 12px; font-size:14px; }
.divider { border:none; border-top:1px solid rgba(139,115,85,0.1); margin:12px 0; }
.tonight-msg-box { background:rgba(126,198,0,0.06); border:1px solid rgba(126,198,0,0.25); border-radius:2px; padding:16px; margin-bottom:16px; }
.tonight-msg-box::before { content:'今夜のメッセージ'; font-family:'Bebas Neue',sans-serif; font-size:10px; letter-spacing:3px; color:rgba(126,198,0,0.5); display:block; margin-bottom:8px; }
.tonight-msg-text { font-size:13px; color:#e8d8b8; line-height:1.8; }
.milestone-item { background:rgba(0,0,0,0.2); border:1px solid rgba(139,115,85,0.12); border-radius:2px; padding:14px; margin-bottom:8px; }
.milestone-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.milestone-num { font-family:'Bebas Neue',sans-serif; font-size:22px; color:#ff2d78; }
.milestone-num span { font-size:11px; letter-spacing:2px; color:rgba(255,45,120,0.5); margin-left:4px; }
.milestone-msg { font-size:13px; color:rgba(200,180,140,0.6); line-height:1.7; }
.milestone-edit { margin-top:10px; }
.milestone-edit textarea { min-height:60px; }
.rank-tabs { display:flex; gap:4px; margin-bottom:16px; }
.rank-tab { flex:1; background:transparent; border:1px solid rgba(139,115,85,0.2); border-radius:2px; padding:9px 4px; font-family:'Bebas Neue',sans-serif; font-size:12px; letter-spacing:2px; color:rgba(200,180,140,0.35); cursor:pointer; transition:all 0.15s; text-transform:uppercase; }
.rank-tab.active { border-color:#ff2d78; color:#ff2d78; background:rgba(255,45,120,0.05); }
.rank-item { display:flex; align-items:center; gap:12px; padding:12px 14px; background:rgba(0,0,0,0.2); border:1px solid rgba(139,115,85,0.12); border-radius:2px; margin-bottom:6px; }
.rank-item.top1 { border-color:rgba(255,215,0,0.3); background:rgba(255,215,0,0.03); }
.rank-item.top2 { border-color:rgba(192,192,192,0.2); }
.rank-item.top3 { border-color:rgba(205,127,50,0.2); }
.rank-num { font-family:'Bebas Neue',sans-serif; font-size:20px; color:rgba(200,180,140,0.25); width:26px; text-align:center; flex-shrink:0; }
.rank-item.top1 .rank-num { color:rgba(255,215,0,0.7); font-size:24px; }
.rank-item.top2 .rank-num { color:rgba(192,192,192,0.6); }
.rank-item.top3 .rank-num { color:rgba(205,127,50,0.6); }
.rank-name { font-size:14px; color:#e8d8b8; font-weight:700; flex:1; }
.rank-score { font-family:'Bebas Neue',sans-serif; font-size:20px; color:rgba(200,180,140,0.5); }
.rank-score span { font-size:10px; letter-spacing:1px; margin-left:2px; }
.total-visits-box { background:rgba(0,0,0,0.3); border:1px solid rgba(139,115,85,0.15); border-radius:2px; padding:14px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }
.total-visits-label { font-size:10px; letter-spacing:3px; color:rgba(200,180,140,0.35); text-transform:uppercase; }
.total-visits-period { font-size:11px; color:rgba(200,180,140,0.25); margin-top:3px; }
.total-visits-num { font-family:'Bebas Neue',sans-serif; font-size:44px; color:#ff2d78; line-height:1; }
.total-visits-unit { font-size:10px; letter-spacing:2px; color:rgba(255,45,120,0.4); text-align:right; margin-top:2px; }
.toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#7ec600; color:#1a1410; font-family:'Bebas Neue',sans-serif; font-size:14px; letter-spacing:3px; padding:12px 24px; border-radius:2px; animation:toastIn 0.3s ease; z-index:100; }
@keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(10px);}to{opacity:1;transform:translateX(-50%) translateY(0);} }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
.fade-in { animation:fadeIn 0.35s ease; }
`;

export default function App() {
  const [authed, setAuthed]               = useState(false);
  const [pass, setPass]                   = useState("");
  const [passErr, setPassErr]             = useState(false);
  const [tab, setTab]                     = useState("history");
  const [toast, setToast]                 = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dates, setDates]                 = useState([]);
  const [selectedDate, setSelectedDate]   = useState(null);
  const [dateDetail, setDateDetail]       = useState([]);
  const [addingRecord, setAddingRecord]   = useState(false);
  const [addName, setAddName]             = useState("");
  const [addTime, setAddTime]             = useState("19:00");
  const [members, setMembers]             = useState([]);
  const [editingName, setEditingName]     = useState(null);
  const [editCount, setEditCount]         = useState("");
  const [rankPeriod, setRankPeriod]       = useState("total");
  const [rankData, setRankData]           = useState({ list:[], total:0 });
  const [stats, setStats]                 = useState({ total:0, members:0, days:0 });
  const [tonightMsg, setTonightMsg]       = useState("");
  const [tonightMsgInput, setTonightMsgInput] = useState("");
  const [milestoneMessages, setMilestoneMessages] = useState({});
  const [editingMilestone, setEditingMilestone]   = useState(null);
  const [milestoneInput, setMilestoneInput]       = useState("");

  useEffect(() => { if (authed) { loadDates(); loadMembers(); } }, [authed]);
  useEffect(() => { if (authed && tab==="history") loadDates(); }, [tab]);
  useEffect(() => { if (authed && tab==="members") { loadMembers(); loadRanking(); } }, [tab]);
  useEffect(() => { if (authed && tab==="members") loadRanking(); }, [rankPeriod]);
  useEffect(() => { if (authed && tab==="messages") loadMessages(); }, [tab]);

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(""),2000); }

  async function loadDates() {
    const log   = await getAllLog();
    const users = await getAllUsers();
    const dateList = Object.entries(log).map(([dk,entries])=>({dk,count:entries.length})).sort((a,b)=>b.dk.localeCompare(a.dk));
    setDates(dateList);
    const totalVisits = Object.values(users).reduce((s,u)=>s+(u.visits||0),0);
    setStats({ total:totalVisits, members:Object.keys(users).length, days:dateList.length });
  }

  async function loadMembers() {
    const users = await getAllUsers();
    setMembers(Object.entries(users).map(([name,d])=>({name,visits:d.visits||0,since:d.since||""})).sort((a,b)=>b.visits-a.visits));
  }

  async function loadRanking() {
    const data = await buildRanking(rankPeriod);
    setRankData(data);
  }

  async function loadMessages() {
    const msg  = await getTonightMessage();
    const msgs = await getMilestoneMessages();
    setTonightMsg(msg); setTonightMsgInput(msg); setMilestoneMessages(msgs);
  }

  async function handleSaveTonightMsg() {
    await saveTonightMessage(tonightMsgInput.trim());
    setTonightMsg(tonightMsgInput.trim());
    showToast("今夜のメッセージを保存しました");
  }

  async function handleClearTonightMsg() {
    await saveTonightMessage("");
    setTonightMsg(""); setTonightMsgInput("");
    showToast("今夜のメッセージを削除しました");
  }

  async function handleSaveMilestone(count) {
    const updated = { ...milestoneMessages, [count]: milestoneInput.trim() };
    await saveMilestoneMessages(updated);
    setMilestoneMessages(updated); setEditingMilestone(null);
    showToast("保存しました");
  }

  async function selectDate(dk) {
    const entries = await getLogByDate(dk);
    setSelectedDate(dk); setDateDetail(entries); setAddingRecord(false); setAddName("");
  }

  async function deleteDate(dk) {
    if (confirmDelete?.type==="date" && confirmDelete?.key===dk) {
      await deleteLogByDate(dk);
      if (dk===toDateKey(new Date())) await saveTonightList([]);
      await loadDates(); setConfirmDelete(null); showToast("削除しました");
    } else { setConfirmDelete({type:"date",key:dk}); }
  }

  async function deleteRecord(dk, name) {
    if (confirmDelete?.type==="record" && confirmDelete?.key===dk && confirmDelete?.name===name) {
      const entries = (await getLogByDate(dk)).filter(e=>e.name!==name);
      if (entries.length===0) await deleteLogByDate(dk);
      else await saveLogByDate(dk, entries);
      if (dk===toDateKey(new Date())) await removeFromTonightList(name);
      setDateDetail(entries); await loadDates(); setConfirmDelete(null); showToast("削除しました");
    } else { setConfirmDelete({type:"record",key:dk,name}); }
  }

  async function addRecord(dk) {
    const name = addName.trim(); if (!name) return;
    const users = await getAllUsers();
    if (!users[name]) { showToast("未登録のメンバーです"); return; }
    const entries = await getLogByDate(dk);
    if (entries.find(e=>e.name===name)) { showToast("すでに記録があります"); return; }
    const newVisits = (users[name].visits||0)+1;
    await updateUser(name, { visits: newVisits });
    entries.push({ name, visits:newVisits, time:addTime });
    await saveLogByDate(dk, entries);
    setDateDetail(entries); setAddName(""); setAddingRecord(false);
    await loadDates(); await loadMembers(); showToast("追加しました");
  }

  async function saveEdit(name) {
    const count = parseInt(editCount);
    if (isNaN(count)||count<0) return;
    await updateUser(name, { visits:count });
    setEditingName(null); await loadMembers(); await loadDates(); showToast("更新しました");
  }

  async function deleteMember(name) {
    if (confirmDelete?.type==="member" && confirmDelete?.name===name) {
      await deleteUser(name);
      await removeFromTonightList(name);
      const log = await getAllLog();
      for (const [dk,entries] of Object.entries(log)) {
        const filtered = entries.filter(e=>e.name!==name);
        if (filtered.length===0) await deleteLogByDate(dk);
        else await saveLogByDate(dk, filtered);
      }
      await loadMembers(); await loadDates(); setConfirmDelete(null); showToast("削除しました");
    } else { setConfirmDelete({type:"member",name}); }
  }

  function login() {
    if (pass===ADMIN_PASSWORD) { setAuthed(true); setPassErr(false); }
    else { setPassErr(true); }
  }

  const milestoneKeys = Object.keys(DEFAULT_MILESTONE_MESSAGES).map(Number);

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div className="logo">BACK<span>YARD</span></div>
          <div className="subtitle">Admin</div>
        </div>

        {authed && (
          <div className="tab-bar">
            <button className={`tab-btn ${tab==="history"?"active":""}`} onClick={()=>setTab("history")}>履歴</button>
            <button className={`tab-btn ${tab==="members"?"active":""}`} onClick={()=>setTab("members")}>メンバー</button>
            <button className={`tab-btn ${tab==="messages"?"active":""}`} onClick={()=>setTab("messages")}>メッセージ</button>
          </div>
        )}

        <div className="main">

          {!authed && (
            <div className="card fade-in">
              <div className="card-title">ADMIN LOGIN</div>
              <div className="card-desc">管理者パスワードを入力してください。</div>
              <div className="input-wrap"><label className="input-label">パスワード</label><input type="password" placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);setPassErr(false);}} onKeyDown={e=>e.key==="Enter"&&login()}/></div>
              {passErr&&<div className="error-msg">パスワードが違います</div>}
              <button className="btn-primary" onClick={login}>ログイン</button>
            </div>
          )}

          {authed && tab==="history" && (
            <div className="fade-in">
              {selectedDate ? (
                <>
                  <button className="back-btn" onClick={()=>{setSelectedDate(null);setDateDetail([]);setAddingRecord(false);}}>← 日付一覧に戻る</button>
                  <div className="card"><div className="card-title">{selectedDate}</div><div className="card-desc">{dateDetail.length}人が来店しました</div></div>
                  <div className="list">
                    {dateDetail.map((m,i)=>(
                      <div key={i} className="list-item">
                        <div className="list-item-row">
                          <div><div className="item-name">{m.name}</div><div className="item-sub">{m.time} チェックイン / 累計 {m.visits}回</div></div>
                          {confirmDelete?.type==="record"&&confirmDelete?.key===selectedDate&&confirmDelete?.name===m.name
                            ?<><button className="btn-sm danger" onClick={()=>deleteRecord(selectedDate,m.name)}>本当に削除</button><button className="btn-sm" onClick={()=>setConfirmDelete(null)}>取消</button></>
                            :<button className="btn-sm danger" onClick={()=>deleteRecord(selectedDate,m.name)}>削除</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <hr className="divider" style={{marginTop:"16px"}}/>
                  {addingRecord ? (
                    <div className="add-record-form">
                      <div className="add-record-title">来店記録を追加</div>
                      <div className="add-record-row" style={{marginBottom:"8px"}}>
                        <select value={addName} onChange={e=>setAddName(e.target.value)}>
                          <option value="">メンバーを選択</option>
                          {members.filter(m=>!dateDetail.find(d=>d.name===m.name)).map((m,i)=><option key={i} value={m.name}>{m.name}（累計{m.visits}回）</option>)}
                        </select>
                      </div>
                      <div className="add-record-row">
                        <input type="text" placeholder="時刻 例：21:30" value={addTime} onChange={e=>setAddTime(e.target.value)} style={{flex:1}}/>
                        <button className="btn-sm save" onClick={()=>addRecord(selectedDate)}>追加</button>
                        <button className="btn-sm" onClick={()=>setAddingRecord(false)}>取消</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-sm save" style={{width:"100%",padding:"12px",marginTop:"4px",fontSize:"14px"}} onClick={()=>setAddingRecord(true)}>＋ 来店記録を追加</button>
                  )}
                </>
              ) : (
                <>
                  <div className="stats-row">
                    <div className="stat-box"><div className="stat-num">{stats.members}</div><div className="stat-label">Members</div></div>
                    <div className="stat-box"><div className="stat-num">{stats.total}</div><div className="stat-label">Total Visits</div></div>
                    <div className="stat-box"><div className="stat-num">{stats.days}</div><div className="stat-label">Days Open</div></div>
                  </div>
                  <div className="card"><div className="card-title">来店履歴</div><div className="card-desc">日付をタップで詳細・記録の追加。削除ボタンでその日の履歴をまるごと削除できます。</div></div>
                  {dates.length===0
                    ?<div className="empty-state">記録がありません</div>
                    :dates.map((d,i)=>(
                      <div key={i} className="date-item">
                        <div className="date-item-left" onClick={()=>selectDate(d.dk)}><div className="date-label">{d.dk}</div></div>
                        <div className="date-count">{d.count}<span>人</span></div>
                        {confirmDelete?.type==="date"&&confirmDelete?.key===d.dk
                          ?<><button className="btn-sm danger" onClick={()=>deleteDate(d.dk)}>本当に削除</button><button className="btn-sm" onClick={()=>setConfirmDelete(null)}>取消</button></>
                          :<button className="btn-sm danger" onClick={()=>deleteDate(d.dk)}>削除</button>}
                      </div>
                    ))
                  }
                </>
              )}
            </div>
          )}

          {authed && tab==="members" && (
            <div className="fade-in">
              <div className="card"><div className="card-title">ランキング</div></div>
              <div className="rank-tabs">
                <button className={`rank-tab ${rankPeriod==="month"?"active":""}`} onClick={()=>setRankPeriod("month")}>今月</button>
                <button className={`rank-tab ${rankPeriod==="year"?"active":""}`} onClick={()=>setRankPeriod("year")}>今年</button>
                <button className={`rank-tab ${rankPeriod==="total"?"active":""}`} onClick={()=>setRankPeriod("total")}>総合</button>
              </div>
              <div className="total-visits-box">
                <div><div className="total-visits-label">Total Visits</div><div className="total-visits-period">{getPeriodLabel(rankPeriod)}</div></div>
                <div style={{textAlign:"right"}}><div className="total-visits-num">{rankData.total}</div><div className="total-visits-unit">visits</div></div>
              </div>
              {rankData.list.length===0
                ?<div className="empty-state" style={{marginBottom:"32px"}}>データがありません</div>
                :rankData.list.map((m,i)=>(
                  <div key={i} className={`rank-item ${i===0?"top1":i===1?"top2":i===2?"top3":""}`}>
                    <div className="rank-num">{i+1}</div>
                    <div className="rank-name">{m.name}</div>
                    <div className="rank-score">{m.count}<span>visits</span></div>
                  </div>
                ))
              }
              <div className="card" style={{marginTop:"24px"}}><div className="card-title">メンバー管理</div><div className="card-desc">来店回数の修正・メンバーの削除ができます。</div></div>
              {members.length===0
                ?<div className="empty-state">メンバーがいません</div>
                :<div className="list">
                  {members.map((m,i)=>(
                    <div key={i} className="list-item">
                      <div className="list-item-row">
                        <div><div className="item-name">{m.name}</div><div className="item-sub">登録日: {m.since}</div></div>
                        <div className="item-count">{m.visits}<span>visits</span></div>
                      </div>
                      {editingName===m.name
                        ?<div className="edit-row"><input type="number" value={editCount} min="0" onChange={e=>setEditCount(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveEdit(m.name)}/><button className="btn-sm save" onClick={()=>saveEdit(m.name)}>保存</button><button className="btn-sm" onClick={()=>setEditingName(null)}>取消</button></div>
                        :<div className="item-actions">
                          <button className="btn-sm" onClick={()=>{setEditingName(m.name);setEditCount(String(m.visits));}}>回数を修正</button>
                          {confirmDelete?.type==="member"&&confirmDelete?.name===m.name
                            ?<><button className="btn-sm danger" onClick={()=>deleteMember(m.name)}>本当に削除</button><button className="btn-sm" onClick={()=>setConfirmDelete(null)}>取消</button></>
                            :<button className="btn-sm danger" onClick={()=>deleteMember(m.name)}>削除</button>}
                        </div>
                      }
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {authed && tab==="messages" && (
            <div className="fade-in">
              <div className="card green">
                <div className="card-title">今夜のメッセージ</div>
                <div className="card-desc">今夜チェックインした全員に表示されます。営業終了後は消しておくと次回に持ち越しません。</div>
                {tonightMsg&&<div className="tonight-msg-box"><div className="tonight-msg-text">{tonightMsg}</div></div>}
                <div className="input-wrap"><textarea rows={3} placeholder="例：今夜は闇カレーあります。23時ごろスタート！" value={tonightMsgInput} onChange={e=>setTonightMsgInput(e.target.value)}/></div>
                <button className="btn-primary green" onClick={handleSaveTonightMsg}>保存する</button>
                {tonightMsg&&<button className="btn-sm danger" style={{width:"100%",marginTop:"8px",padding:"10px"}} onClick={handleClearTonightMsg}>今夜のメッセージを削除</button>}
              </div>
              <div className="card"><div className="card-title">節目メッセージ</div><div className="card-desc">特定の来店回数に達したときに表示されるメッセージです。</div></div>
              {milestoneKeys.map(count=>(
                <div key={count} className="milestone-item">
                  <div className="milestone-header">
                    <div className="milestone-num">{count}<span>回目</span></div>
                    <button className="btn-sm" onClick={()=>editingMilestone===count?setEditingMilestone(null):(()=>{setEditingMilestone(count);setMilestoneInput(milestoneMessages[count]||"");})()}>{editingMilestone===count?"取消":"編集"}</button>
                  </div>
                  {editingMilestone===count
                    ?<div className="milestone-edit"><textarea rows={2} value={milestoneInput} onChange={e=>setMilestoneInput(e.target.value)} placeholder="メッセージを入力..."/><button className="btn-sm save" style={{marginTop:"8px"}} onClick={()=>handleSaveMilestone(count)}>保存</button></div>
                    :<div className="milestone-msg">{milestoneMessages[count]||"（未設定）"}</div>
                  }
                </div>
              ))}
            </div>
          )}

        </div>
        {toast&&<div className="toast">{toast}</div>}
      </div>
    </>
  );
}
