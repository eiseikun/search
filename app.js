// =========================
// 🔥 Firebase初期化
// =========================
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

// =========================
// 📦 状態
// =========================
let lastSnapshot = [];
let editId = null;
let currentSort = "no";
let sortAsc = true;
let useColumnFilter = false;

const COLUMN_KEY = "column-settings";

// =========================
// 🔄 Firestore取得
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
    main: Number(v("main")) || 0,
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
// 📅 更新日
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
// 🔢 範囲ソート
// =========================
function parseRange(v){
  if(!v) return {start:0,end:0};
  v = String(v).trim();
  const p = v.split("-");
  return {
    start: Number(p[0]) || 0,
    end: p[1] ? Number(p[1]) : Number(p[0])
  };
}

// =========================
// 🖥️ 描画
// =========================
window.render = function(){

  const keyword = document.getElementById("search").value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    Object.values(d).some(v => String(v).toLowerCase().includes(keyword))
  );

  const nameCount = {};
  data.forEach(d => nameCount[d.name] = (nameCount[d.name] || 0) + 1);

  data.sort((a,b)=>{

    if (currentSort === "name") {
      const ca = nameCount[a.name] || 0;
      const cb = nameCount[b.name] || 0;
      if (ca !== cb) return sortAsc ? ca - cb : cb - ca;
      return String(a.name).localeCompare(String(b.name),'ja',{numeric:true});
    }

    if (currentSort === "sub") {
      const A = parseRange(a.sub);
      const B = parseRange(b.sub);
      return sortAsc ? A.start - B.start || A.end - B.end
                     : B.start - A.start || B.end - A.end;
    }

    let A = a[currentSort];
    let B = b[currentSort];

    return sortAsc
      ? String(A).localeCompare(String(B),'ja',{numeric:true})
      : String(B).localeCompare(String(A),'ja',{numeric:true});
  });

  document.getElementById("resultCount").textContent = `${data.length}件`;

  document.getElementById("list").innerHTML = data.map(d => `
<tr>
  <td>${d.no ?? "-"}</td>
  <td>${d.main}</td>
  <td>${d.package||""}</td>
  <td>${d.sub}</td>

  <td><div class="name-text" onclick="toggleName(this)">${d.name}</div></td>
  <td><div class="work-text">${d.work}</div></td>

  <td>${d.place||"-"}</td>
  <td>${d.url?`<a href="${d.url}" target="_blank">link</a>`:"-"}</td>

  <td>${d.fav}</td>
  <td>${d.ratingCount}</td>
  <td>${d.siteRating}</td>
  <td>${d.date}</td>

  <td><button onclick="updateDate('${d.id}')">更新</button></td>
  <td><button onclick="startEdit('${d.id}', '${d.main}','${d.package}','${d.sub}','${d.name}','${d.work}','${d.place}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}')">編集</button></td>
  <td><button onclick="remove('${d.id}')">削除</button></td>
</tr>
`).join("");

  setTimeout(() => {
    if (useColumnFilter) applyColumnVisibility();
    else showAllColumns();
  }, 0);
};

// =========================
// 🧩 列表示トグル（修正版）
// =========================
window.toggleColumnMode = () => {
  useColumnFilter = !useColumnFilter;

  const btn = document.getElementById("columnToggleBtn");
  if (btn) {
    btn.textContent = useColumnFilter ? "全表示" : "選択列のみ";
  }

  render();
};

// =========================
// 📊 列表示制御
// =========================
function applyColumnVisibility(){
  const checks = document.querySelectorAll("#columnModal input[type='checkbox']");

  checks.forEach(cb => {
    const colIndex = Number(cb.dataset.col);

    document.querySelectorAll(`td:nth-child(${colIndex}), th:nth-child(${colIndex})`)
      .forEach(el => {
        el.style.display = cb.checked ? "" : "none";
      });
  });
}

function showAllColumns(){
  document.querySelectorAll("th, td")
    .forEach(el => el.style.display = "");
}

// =========================
// 📂 管理ボタン（修正版）
// =========================
window.toggleTools = () => {
  const el = document.getElementById("tools");
  const isHidden = getComputedStyle(el).display === "none";
  el.style.display = isHidden ? "block" : "none";
};

// =========================
// 🧩 モーダル
// =========================
window.openModal = () => document.getElementById("modal").style.display = "block";
window.closeModal = () => document.getElementById("modal").style.display = "none";

window.openColumnModal = () => {
  document.getElementById("columnModal").style.display = "block";
  loadColumnSettings();
};

window.closeColumnModal = () => {
  document.getElementById("columnModal").style.display = "none";
};

// =========================
// 💾 列設定保存
// =========================
function saveColumnSettings(){
  const data = {};
  document.querySelectorAll("#columnModal input[type='checkbox']")
    .forEach(cb => {
      data[cb.dataset.col] = cb.checked;
    });

  localStorage.setItem(COLUMN_KEY, JSON.stringify(data));
}

function loadColumnSettings(){
  const saved = localStorage.getItem(COLUMN_KEY);
  if(!saved) return;

  const data = JSON.parse(saved);

  document.querySelectorAll("#columnModal input[type='checkbox']")
    .forEach(cb => {
      cb.checked = data[cb.dataset.col] ?? true;
    });
}

// 即保存
document.addEventListener("change", (e) => {
  if (e.target.matches("#columnModal input[type='checkbox']")) {
    saveColumnSettings();
    if (useColumnFilter) applyColumnVisibility();
  }
});

// =========================
// 👤 名前展開
// =========================
window.toggleName = el => el.classList.toggle("expanded");

// =========================
// 📂 CSV
// =========================
document.getElementById("csvBtn").addEventListener("click", importCSV);

async function importCSV(){
  const file = document.getElementById("csvFile").files[0];
  if(!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",");

  let maxNo = Math.max(0,...lastSnapshot.map(d=>d.no||0));

  for(let i=1;i<lines.length;i++){
    const v = lines[i].split(",");
    const obj = {};
    headers.forEach((h,j)=>obj[h]=v[j]);

    await addDoc(colRef,{
      no: ++maxNo,
      main:Number(obj.main)||0,
      package:obj.package,
      sub:obj.sub,
      name:obj.name,
      work:obj.work,
      place:obj.place,
      url:obj.url,
      fav:Number(obj.fav)||0,
      ratingCount:Number(obj.ratingCount)||0,
      siteRating:Number(obj.siteRating)||0,
      date:new Date().toLocaleDateString()
    });
  }
}

// =========================
// 🧹 全削除
// =========================
window.resetAll = async () => {
  if(!confirm("全削除？")) return;
  const snap = await getDocs(colRef);
  snap.forEach(d => deleteDoc(doc(db,"items",d.id)));
};
