// ==============================
// 🔥 Firebase 初期化
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");


// ==============================
// 📦 状態管理
// ==============================
let lastSnapshot = [];
let editId = null;

let currentSort = "no";
let sortAsc = true;

let useColumnFilter = false; // ← 列表示切替（これだけ使う）


// ==============================
// 🔄 Firestore リアルタイム取得
// ==============================
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  render();
});


// ==============================
// ➕ 追加 / ✏️ 編集
// ==============================
window.addItem = async () => {
  const val = id => document.getElementById(id).value;

  let maxNo = 0;
  lastSnapshot.forEach(d => {
    if (d.no && d.no > maxNo) maxNo = d.no;
  });

  const data = {
    main: Number(val("main")),
    package: val("package"),
    sub: val("sub"),
    name: val("name"),
    work: val("work"),
    place: val("place"),
    url: val("url"),
    fav: Number(val("fav")) || 0,
    ratingCount: Number(val("ratingCount")) || 0,
    siteRating: Number(val("siteRating")) || 0,
    date: new Date().toLocaleDateString()
  };

  if (!data.name || !data.work) return alert("必須項目入力");

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


// ==============================
// 🗑️ 削除
// ==============================
window.remove = async id => {
  if (!confirm("削除しますか？")) return;
  await deleteDoc(doc(db, "items", id));
};


// ==============================
// ✏️ 編集開始
// ==============================
window.startEdit = (id, ...vals) => {
  openModal();
  const keys = ["main","package","sub","name","work","place","url","fav","ratingCount","siteRating"];
  keys.forEach((k,i)=> document.getElementById(k).value = vals[i]||"");
  editId = id;
};


// ==============================
// 📅 更新日更新
// ==============================
window.updateDate = async id => {
  await updateDoc(doc(db,"items",id),{
    date:new Date().toLocaleDateString()
  });
};


// ==============================
// 🔀 ソート切替
// ==============================
window.sortBy = key => {
  if (currentSort === key) sortAsc = !sortAsc;
  else {
    currentSort = key;
    sortAsc = true;
  }
  render();
};


// ==============================
// 🔢 範囲パース（sub用）
// ==============================
function parseRange(val) {
  if (!val) return { start: 0, end: 0 };

  val = String(val).trim();

  const parts = val.split("-");
  const start = Number(parts[0].trim()) || 0;
  const end = parts[1] ? Number(parts[1].trim()) : start;

  return { start, end };
}


// ==============================
// 🖥️ 描画
// ==============================
window.render = function(){

  const keyword = document.getElementById("search").value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    Object.values(d).some(v =>
      String(v).toLowerCase().includes(keyword)
    )
  );
// ==============================
// 👤 名前ごとの件数カウント
// ==============================
const nameCount = {};

data.forEach(d => {
  const n = d.name || "";
  nameCount[n] = (nameCount[n] || 0) + 1;
});
  // 🔥 ソート処理
  data.sort((a,b)=>{
    // ==============================
  // 👤 名前ソート（件数順）
  // ==============================
  if (currentSort === "name") {

    const countA = nameCount[a.name] || 0;
    const countB = nameCount[b.name] || 0;

    // 件数で比較
    if (countA !== countB) {
      return sortAsc ? countA - countB : countB - countA;
    }

    // 同じ件数なら名前で自然順
    return sortAsc
      ? String(a.name).localeCompare(String(b.name), 'ja', { numeric: true })
      : String(b.name).localeCompare(String(a.name), 'ja', { numeric: true });
  }

  // ==============================
  // 小（範囲ソート）
  // ==============================
  if (currentSort === "sub") {
    const A = parseRange(a.sub);
    const B = parseRange(b.sub);

    if (A.start !== B.start) {
      return sortAsc ? A.start - B.start : B.start - A.start;
    }

    return sortAsc ? A.end - B.end : B.end - A.end;
  }

  // ==============================
  // 通常ソート
  // ==============================
  let A = a[currentSort];
  let B = b[currentSort];

  if (!isNaN(A) && !isNaN(B)) {
    return sortAsc ? A - B : B - A;
  }

  return sortAsc
    ? String(A).localeCompare(String(B), 'ja', { numeric: true })
    : String(B).localeCompare(String(A), 'ja', { numeric: true });
});
   

  resultCount.textContent = `${data.length}件`;

  let html = "";

  data.forEach(d=>{
    html += `
<tr>
<td>${d.no ?? "-"}</td>
<td>${d.main}</td>
<td>${d.package||""}</td>
<td>${d.sub}</td>
<td><div class="name-text" onclick="toggleName(this)">
    ${d.name}
  </div>
</td>
<td><div class="work-text">${d.work}</div></td>
<td>${d.place||"-"}</td>
<td>${d.url?`<a href="${d.url}" target="_blank">リンク</a>`:"-"}</td>
<td>${d.fav}</td>
<td>${d.ratingCount}</td>
<td>${d.siteRating}</td>
<td>${d.date}</td>

<td><button onclick="updateDate('${d.id}')">更新</button></td>
<td><button onclick="startEdit('${d.id}','${d.main}','${d.package}','${d.sub}','${d.name}','${d.work}','${d.place}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}')">編集</button></td>
<td><button onclick="remove('${d.id}')">削除</button></td>
</tr>`;
  });

  document.getElementById("list").innerHTML = html;

  // 🔥 列表示制御
  if (useColumnFilter) applyColumnVisibility();
  else showAllColumns();
};


// ==============================
// 📂 CSV取込
// ==============================
async function importCSV() {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("ファイル選択して");

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  const headers = lines[0].split(",");

  let maxNo = 0;
  lastSnapshot.forEach(d => {
    if (d.no && d.no > maxNo) maxNo = d.no;
  });

  let count = 0;

  for (let i = 1; i < lines.length; i++){
    const values = parseCSVLine(lines[i]);

    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = values[j] || "";
    });

    const data = {
      no: Number(obj.no) || ++maxNo,
      main: Number(obj.main),
      package: obj.package,
      sub: obj.sub,
      name: obj.name,
      work: obj.work,
      place: obj.place,
      url: obj.url,
      fav: Number(obj.fav) || 0,
      ratingCount: Number(obj.ratingCount) || 0,
      siteRating: Number(obj.siteRating) || 0,
      date: new Date().toLocaleDateString()
    };

    if (!data.name || !data.work) continue;

    await addDoc(colRef, data);
    count++;

    await new Promise(r => setTimeout(r, 20));
  }

  alert(`CSV取り込み完了：${count}件`);
}


// ==============================
// CSV解析
// ==============================
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++){
    const char = line[i];

    if (char === '"'){
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes){
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}


// ==============================
// 🔘 ボタン接続
// ==============================
document.getElementById("csvBtn").addEventListener("click", importCSV);
window.importCSV = importCSV;


// ==============================
// 🧹 全削除
// ==============================
window.resetAll = async () => {
  if (!confirm("全部削除します。本当にOK？")) return;

  const snapshot = await getDocs(colRef);
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, "items", d.id));
  }

  alert("全削除完了");
};


// ==============================
// 🪟 モーダル
// ==============================
window.openModal = () => {
  document.getElementById("modal").style.display = "block";
};

window.closeModal = () => {
  document.getElementById("modal").style.display = "none";
};

window.openColumnModal = () => {
  document.getElementById("columnModal").style.display = "block";
  applyCheckboxState();
};

window.closeColumnModal = () => {
  document.getElementById("columnModal").style.display = "none";
};


// ==============================
// 👁️ 列表示切替
// ==============================
window.toggleDetails = () => {
  useColumnFilter = !useColumnFilter;
  render();
};


// ==============================
// 📊 列表示制御
// ==============================
function applyColumnVisibility(){
  const hidden = JSON.parse(localStorage.getItem("hiddenCols") || "[]");

  document.querySelectorAll("table tr").forEach(row=>{
    const cells = row.children;

    for (let i = 0; i < cells.length; i++){

      if (i === 0) continue; // No固定
      if (i >= cells.length - 3) continue; // 操作ボタン

      cells[i].style.display = hidden.includes(i) ? "none" : "";
    }
  });
}

function showAllColumns(){
  document.querySelectorAll("table tr").forEach(row=>{
    Array.from(row.children).forEach(cell=>{
      cell.style.display = "";
    });
  });
}

function applyCheckboxState(){
  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");
  document.querySelectorAll("[data-col]").forEach(cb=>{
    cb.checked = !hidden.includes(Number(cb.dataset.col));
  });
}


// ==============================
// 💾 チェック保存
// ==============================
document.addEventListener("change", e=>{
  if(!e.target.dataset.col) return;

  const index = Number(e.target.dataset.col);
  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");

  if (e.target.checked) {
    const i = hidden.indexOf(index);
    if (i !== -1) hidden.splice(i,1);
  } else {
    if (!hidden.includes(index)) hidden.push(index);
  }

  localStorage.setItem("hiddenCols", JSON.stringify(hidden));
});
/* ==============================
   👤 名前クリック表示
============================== */
window.openNameModal = (text) => {
  document.getElementById("nameModalText").textContent = text;
  document.getElementById("nameModal").style.display = "block";
};
/* ==============================
   👤 名前 展開トグル
============================== */
window.toggleName = (el) => {
  el.classList.toggle("expanded");
};

window.closeNameModal = () => {
  document.getElementById("nameModal").style.display = "none";
};
