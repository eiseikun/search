// ==============================
// Firebase初期化
// ==============================
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

const db = getFirestore(app);
const colRef = collection(db, "items");

// ==============================
// 状態
// ==============================
let lastSnapshot = [];
let editId = null;
let currentSort = "no";
let sortAsc = true;
let useColumnFilter = false;

// ==============================
// Firestore
// ==============================
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  render();
});

// ==============================
// 追加・編集
// ==============================
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

  if (!data.name || !data.work) return alert("必須");

  if (editId) {
    const old = lastSnapshot.find(d => d.id === editId);
    data.no = old?.no ?? 1;
    await updateDoc(doc(db,"items",editId),data);
    editId = null;
  } else {
    data.no = maxNo + 1;
    await addDoc(colRef,data);
  }

  closeModal();
};

// ==============================
// 削除
// ==============================
window.remove = async id => {
  if (!confirm("削除？")) return;
  await deleteDoc(doc(db,"items",id));
};

// ==============================
// モーダル
// ==============================
window.openModal = () => document.getElementById("modal").style.display="block";
window.closeModal = () => document.getElementById("modal").style.display="none";

window.openColumnModal = () => {
  document.getElementById("columnModal").style.display="block";
};
window.closeColumnModal = () => {
  document.getElementById("columnModal").style.display="none";
};

// ★ここが修正ポイント（閉じれる保証）
window.addEventListener("click", e => {
  if (e.target.id === "columnModal") closeColumnModal();
  if (e.target.id === "modal") closeModal();
});

// ==============================
// 名前表示（クリック拡張）
// ==============================
window.toggleName = (el) => {
  el.classList.toggle("expanded");
};

// ==============================
// 作品2行はCSSで対応済み
// ==============================

// ==============================
// 描画
// ==============================
window.render = function(){
  const keyword = document.getElementById("search").value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    Object.values(d).some(v =>
      String(v).toLowerCase().includes(keyword)
    )
  );

  data.sort((a,b)=>{
    let A = a[currentSort] || "";
    let B = b[currentSort] || "";

    return sortAsc
      ? String(A).localeCompare(String(B), 'ja', { numeric:true })
      : String(B).localeCompare(String(A), 'ja', { numeric:true });
  });

  document.getElementById("resultCount").textContent = `${data.length}件`;

  let html = "";

  data.forEach(d=>{
    html += `
<tr>
<td>${d.no ?? "-"}</td>
<td>${d.main}</td>
<td>${d.package||""}</td>
<td>${d.sub}</td>

<td><div class="name-text" onclick="toggleName(this)">${d.name}</div></td>

<td><div class="work-text">${d.work}</div></td>

<td>${d.place||"-"}</td>
<td>${d.url?`<a href="${d.url}" target="_blank">リンク</a>`:"-"}</td>

<td>${d.fav}</td>
<td>${d.ratingCount}</td>
<td>${d.siteRating}</td>
<td>${d.date}</td>

<td><button onclick="updateDate('${d.id}')">更新</button></td>
<td><button onclick="startEdit('${d.id}', '${d.main}','${d.package}','${d.sub}','${d.name}','${d.work}','${d.place}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}')">編集</button></td>
<td><button onclick="remove('${d.id}')">削除</button></td>
</tr>`;
  });

  document.getElementById("list").innerHTML = html;
};
