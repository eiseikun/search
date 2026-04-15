import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= Firebase =================
const app = initializeApp({
  apiKey: "AIzaSyDJmfV7Vow1e_VjOv06h-n27fWB5KK1l4o",
  authDomain: "search-management-date.firebaseapp.com",
  projectId: "search-management-date",
});

const db = getFirestore(app);
const colRef = collection(db, "items");

// ================= 列 =================
const columns = [
  "no","main","package","sub","name","work",
  "place","url","fav","ratingCount","siteRating","date"
];

// ================= 状態 =================
let lastSnapshot = [];
let editId = null;

let columnMode = false;
let currentSort = "no";
let sortAsc = true;

// ================= localStorage =================
function getHiddenCols(){
  return JSON.parse(localStorage.getItem("hiddenCols") || "[]");
}
function saveHiddenCols(v){
  localStorage.setItem("hiddenCols", JSON.stringify(v));
}

// ================= Firestore =================
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  render();
});

// ================= 保存 =================
window.addItem = async () => {
  const v = id => document.getElementById(id).value;

  const data = {
    no: 0,
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

  if (!data.main || !data.work) return alert("必須項目を入力してください");

  if (editId) {
    await updateDoc(doc(db,"items",editId), data);
  } else {
    await addDoc(colRef, data);
  }

  document.querySelectorAll("#modal input").forEach(i => i.value = "");
  closeModal();
};

// ================= 削除 =================
window.remove = async id => {
  if (!confirm("削除？")) return;
  await deleteDoc(doc(db,"items",id));
};

// ================= 編集 =================
window.startEdit = (id,...vals) => {
  openModal();
  const keys = ["main","package","sub","name","work","place","url","fav","ratingCount","siteRating"];
  keys.forEach((k,i)=>{
    document.getElementById(k).value = vals[i] || "";
  });
  editId = id;
};

// ================= 描画 =================
window.render = function(){

  const keyword = document.getElementById("search").value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    Object.values(d).some(v =>
      String(v).toLowerCase().includes(keyword)
    )
  );
// ソート
data = data.sort((a, b) => {

  // =========================
  // 👤 名前ソート（出現回数順）
  // =========================
  if (currentSort === "name") {

    const countMap = {};

    // 出現回数を事前計算
    lastSnapshot.forEach(d => {
      const n = d.name || "";
      countMap[n] = (countMap[n] || 0) + 1;
    });

    const countA = countMap[a.name || ""] || 0;
    const countB = countMap[b.name || ""] || 0;

    // 多い順が基本
    if (countA !== countB) {
      return sortAsc
        ? countB - countA   // 多い → 少ない
        : countA - countB;  // 少ない → 多い
    }

    // 同数なら名前順で安定化
    return String(a.name).localeCompare(String(b.name), "ja", { numeric: true });
  }

  // =========================
  // 通常ソート
  // =========================
  let A = a[currentSort] ?? "";
  let B = b[currentSort] ?? "";

  const numA = Number(A);
  const numB = Number(B);
  const isNum = !isNaN(numA) && !isNaN(numB);

  if (isNum) {
    return sortAsc ? numA - numB : numB - numA;
  }

  if (currentSort === "date") {
    return sortAsc
      ? new Date(A) - new Date(B)
      : new Date(B) - new Date(A);
  }

  return sortAsc
    ? String(A).localeCompare(String(B), "ja", { numeric: true })
    : String(B).localeCompare(String(A), "ja", { numeric: true });
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
<td class="name-cell" onclick="toggleName(this)">
  ${d.name || ""}
</td>
<td>${d.work}</td>
<td>${d.place||"-"}</td>
<td>
  ${d.url 
    ? `<a href="${d.url}" target="_blank">🔗</a>` 
    : "-"}
</td>
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
// 触れたところが分かる
document.querySelectorAll("#list tr").forEach(row => {
  row.addEventListener("click", (e) => {
    // ボタンやリンクは無視
    if (e.target.tagName === "BUTTON" || e.target.tagName === "A") return;
    document.querySelectorAll("#list tr").forEach(r => {
      r.classList.remove("active-row");
    });
    row.classList.add("active-row");
  });
});
  applyColumnVisibility();
};

// ================= ソート =================
window.sortBy = (key)=>{
  if(currentSort === key) sortAsc = !sortAsc;
  else { currentSort = key; sortAsc = true; }
  render();
};

// ================= モーダル =================
window.openModal = ()=>modal.style.display="block";
window.closeModal = ()=>modal.style.display="none";

// ================= 列表示 =================
window.toggleDetails = () => {
  columnMode = !columnMode;

  const btn = document.getElementById("viewBtn");
  if (btn) {
    btn.textContent = columnMode ? "詳細表示" : "全表示";
  }

  applyColumnVisibility();
};

// ================= 列制御 =================
window.applyColumnVisibility = () => {

  const hidden = getHiddenCols();
  const rows = document.querySelectorAll("table tr");

  rows.forEach(row=>{
    [...row.children].forEach((cell,i)=>{

      // 全表示モード
      if (!columnMode) {
        cell.style.display = "";
        return;
      }

      // 🔥 追加：操作列は強制非表示
      if (i === 12 || i === 13 || i === 14) {
        cell.style.display = "none";
        return;
      }

      // 通常の列制御
      cell.style.display = hidden.includes(i) ? "none" : "";
    });
  });
};

// ================= チェック =================
document.addEventListener("change", e=>{
  if(!e.target.dataset.col) return;

  let hidden = getHiddenCols();
  const col = Number(e.target.dataset.col);

  if(e.target.checked){
    hidden = hidden.filter(x=>x!==col);
  }else{
    hidden.push(col);
  }

  saveHiddenCols(hidden);
  // 🔥 追加（即反映）
  applyColumnVisibility();
});

// ================= チェック同期 =================
function syncCheckbox(){
  const hidden = getHiddenCols();

  document.querySelectorAll("[data-col]").forEach(cb=>{
    cb.checked = !hidden.includes(Number(cb.dataset.col));
  });
}

window.openColumnModal = ()=>{
  columnModal.style.display="block";
  syncCheckbox();
};

window.closeColumnModal = ()=>{
  columnModal.style.display="none";
};

// ================= CSV（完全差分 + 爆速Batch + 1000件対応） =================
import {
  writeBatch,
  getDocs,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.importCSV = async () => {
  const file = csvFile.files[0];
  if (!file) return alert("ファイルなし");

  const text = await file.text();

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  });

  // 🔥 最新データ取得
  const snap = await getDocs(colRef);
  let localData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let maxNo = Math.max(...localData.map(d => d.no || 0), 0);

  let updateCount = 0;
  let addCount = 0;
  let skipCount = 0;

  // 🔥 batch制御
  const BATCH_SIZE = 500;
  let batch = writeBatch(db);
  let opCount = 0;
  let batchPromises = [];

  for (const row of parsed.data) {

    const mainVal = Number(row.main);
    const subVal = (row.sub || "").trim();

    if (!mainVal) continue;

    // 🔥 既存判定
    const existing = localData.find(d => {
      const dMain = Number(d.main);
      const dSub = (d.sub || "").trim();

      if (subVal) return dMain === mainVal && dSub === subVal;
      return dMain === mainVal && !dSub;
    });

    // 🔥 No制御
    let noVal = Number(row.no);
    if (existing) {
      noVal = existing.no;
    } else {
      noVal = noVal || ++maxNo;
    }

    // 🔥 正規化（型・空白統一）
    const data = {
      no: noVal,
      main: mainVal,
      package: (row.package || "").trim(),
      sub: subVal,
      name: (row.name || "").trim(),
      work: (row.work || "").trim(),
      place: (row.place || "").trim(),
      url: (row.url || "").trim(),
      fav: Number(row.fav) || 0,
      ratingCount: Number(row.ratingCount) || 0,
      siteRating: Number(row.siteRating) || 0,
      date: new Date().toLocaleDateString()
    };

    // =========================
    // 🔥 完全差分チェック
    // =========================
    let isChanged = false;

    if (!existing) {
      isChanged = true;
    } else {
      isChanged =
        existing.no !== data.no ||
        Number(existing.main) !== data.main ||
        (existing.package || "").trim() !== data.package ||
        (existing.sub || "").trim() !== data.sub ||
        (existing.name || "").trim() !== data.name ||
        (existing.work || "").trim() !== data.work ||
        (existing.place || "").trim() !== data.place ||
        (existing.url || "").trim() !== data.url ||
        Number(existing.fav) !== data.fav ||
        Number(existing.ratingCount) !== data.ratingCount ||
        Number(existing.siteRating) !== data.siteRating;
    }

    // 🔥 変更なしはスキップ（これが最重要）
    if (!isChanged) {
      skipCount++;
      continue;
    }

    // =========================
    // 🔥 書き込み（Batch）
    // =========================
    if (existing) {
      batch.update(doc(db, "items", existing.id), data);
      updateCount++;

      Object.assign(existing, data);

    } else {
      const newRef = doc(colRef);
      batch.set(newRef, data);
      addCount++;

      localData.push({ id: newRef.id, ...data });
    }

    opCount++;

    // 🔥 500件ごとにcommit
    if (opCount === BATCH_SIZE) {
      batchPromises.push(batch.commit());
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  // 🔥 残りcommit
  if (opCount > 0) {
    batchPromises.push(batch.commit());
  }

  // 🔥 全実行
  await Promise.all(batchPromises);

  alert(
`CSV完了（差分のみ）
追加: ${addCount}件
更新: ${updateCount}件
変更なし: ${skipCount}件`
  );
};

// ================= 全削除（完全修正版） =================
window.resetAll = async () => {
  if (!confirm("全削除？")) return;

  const snap = await getDocs(colRef);

  await Promise.all(
    snap.docs.map(d =>
      deleteDoc(doc(db, "items", d.id))
    )
  );
};

// ================= 更新日 =================
window.updateDate = async id=>{
  await updateDoc(doc(db,"items",id),{
    date:new Date().toLocaleDateString()
  });
};
// ================= 名前全表示 =================
window.toggleName = (el) => {
  el.classList.toggle("expanded");
};
// ================= 管理メニュー =================
window.toggleManage = () => {
  const area = document.getElementById("manageArea");
  const btn = document.getElementById("manageBtn");

  const isOpen = area.style.display === "block";

  area.style.display = isOpen ? "none" : "block";
  btn.textContent = isOpen ? "⚙️" : "閉じる";
};


