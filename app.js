import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJmfV7Vow1e_VjOv06h-n27fWB5KK1l4o",
  authDomain: "search-management-date.firebaseapp.com",
  projectId: "search-management-date",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

let lastSnapshot = [];
let editId = null;
let currentSort = "no";
let sortAsc = true;
let useColumnFilter = false;

// =========================
// 🔄 Firestore
// =========================
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  render();
});

// =========================
// ➕ 追加 / 編集
// =========================
window.addItem = async () => {
  const v = id => document.getElementById(id).value;

  let maxNo = Math.max(0, ...lastSnapshot.map(d => d.no || 0));

  const data = {
    main: Number(v("main")),
    package: v("package"),
    sub: v("sub"),
    name: v("name"),
    work: v("work"),
    place: v("place"),
    url: v("url"),
    fav: Number(v("fav")) || 0,
    ratingCount: Number(v("ratingCount")) || 0,
    siteRating: Number(v("siteRating")) || 0,
    date: new Date().toLocaleDateString()
  };

  if (!data.name || !data.work) return alert("必須項目");

  if (editId) {
    const old = lastSnapshot.find(d => d.id === editId);
    data.no = old?.no ?? 1;
    await updateDoc(doc(db, "items", editId), data);
    editId = null;
  } else {
    data.no = maxNo + 1;
    await addDoc(colRef, data);
  }

  document.querySelectorAll("#modal input").forEach(i => i.value = "");
  closeModal();
};

// =========================
// 🗑️ 削除
// =========================
window.remove = async id => {
  if (!confirm("削除？")) return;
  await deleteDoc(doc(db, "items", id));
};

// =========================
// ✏️ 編集
// =========================
window.startEdit = (id, ...vals) => {
  openModal();
  const keys = ["main","package","sub","name","work","place","url","fav","ratingCount","siteRating"];
  keys.forEach((k,i)=>document.getElementById(k).value = vals[i] || "");
  editId = id;
};

// =========================
// 📅 更新
// =========================
window.updateDate = async id => {
  await updateDoc(doc(db,"items",id), {
    date: new Date().toLocaleDateString()
  });
};

// =========================
// 🔀 ソート
// =========================
window.sortBy = key => {
  if (currentSort === key) sortAsc = !sortAsc;
  else { currentSort = key; sortAsc = true; }
  render();
};

// =========================
// 🖥️ 描画
// =========================
window.render = function(){
  const keyword = document.getElementById("search").value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    Object.values(d).some(v => String(v).toLowerCase().includes(keyword))
  );

  document.getElementById("resultCount").textContent = `${data.length}件`;

  document.getElementById("list").innerHTML = data.map(d =>
  `<tr>
    <td>${d.no ?? "-"}</td>
    <td>${d.main}</td>
    <td>${d.package||""}</td>
    <td>${d.sub}</td>
    <td>${d.name}</td>
    <td>${d.work}</td>
    <td>${d.place||"-"}</td>
    <td>${d.url?`<a href="${d.url}" target="_blank">🔗</a>`:"-"}</td>
    <td>${d.fav}</td>
    <td>${d.ratingCount}</td>
    <td>${d.siteRating}</td>
    <td>${d.date}</td>
    <td><button onclick="updateDate('${d.id}')">更新</button></td>
    <td><button onclick="startEdit('${d.id}','${d.main}','${d.package}','${d.sub}','${d.name}','${d.work}','${d.place}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}')">編集</button></td>
    <td><button onclick="remove('${d.id}')">削除</button></td>
  </tr>`
  ).join("");
};

// =========================
// 🧩 モーダル制御（ここが重要）
// =========================
window.openModal = () => {
  document.getElementById("modal").style.display = "block";
};

window.closeModal = () => {
  document.getElementById("modal").style.display = "none";
};

window.openColumnModal = () => {
  document.getElementById("columnModal").style.display = "block";
};

window.closeColumnModal = () => {
  document.getElementById("columnModal").style.display = "none";
};

// 背景クリックでも閉じる
window.onclick = e => {
  if (e.target.id === "modal") closeModal();
  if (e.target.id === "columnModal") closeColumnModal();
};

// =========================
// その他
// =========================
window.toggleTools = () => {
  const el = document.getElementById("tools");
  el.style.display = el.style.display === "block" ? "none" : "block";
};

window.toggleDetails = () => {
  useColumnFilter = !useColumnFilter;
  render();
};
