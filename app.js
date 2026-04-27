import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc, getDocs, writeBatch
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
  "place","url","fav","ratingCount","siteRating","selfRating","comment","date"
];

// ================= 状態 =================
let lastSnapshot = [];
let editId = null;

let columnMode = false;
let currentSort = "no";
let sortAsc = true;
let primarySort = null; // 最優先キー
let nameSortAsc = true;
let subSortKey = "no";
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

  // 🔥 最新データ取得してmaxNo算出
  const snap = await getDocs(colRef);
  const dataList = snap.docs.map(d => d.data());
  const maxNo = Math.max(...dataList.map(d => d.no || 0), 0);

  const data = {
    no: maxNo + 1, // ← ここが重要
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
    selfRating: Number(v("selfRating")) || 0,
    comment: v("comment") || "",
    date: new Date().toLocaleDateString()
  };

  if (!data.main || !data.work) return alert("必須項目を入力してください");

  if (editId) {
    // 🔥 編集時はNo維持
    const existing = lastSnapshot.find(d => d.id === editId);
    if (existing) data.no = existing.no;

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

  // 🔥 削除対象取得
  const target = lastSnapshot.find(d => d.id === id);
  if (!target) return;

  const deletedNo = target.no;

  // 🔥 削除
  await deleteDoc(doc(db, "items", id));

  // 🔥 最新データ取り直し（超重要）
  const snap = await getDocs(colRef);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const batch = writeBatch(db);

  data.forEach(d => {
    if (d.no > deletedNo) {
      const ref = doc(db, "items", d.id);
      batch.update(ref, { no: d.no - 1 });
    }
  });

  await batch.commit();
};
// ================= 編集 =================
window.startEdit = (id,...vals) => {
  openModal();
  const keys = ["main","package","sub","name","work","place","url","fav","ratingCount","siteRating","selfRating","comment"];
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
  // 👑 名前固定ONのとき（最優先）
  // =========================
 if (primarySort === "name") {

  const countMap = {};
  lastSnapshot.forEach(d => {
    const n = d.name || "";
    countMap[n] = (countMap[n] || 0) + 1;
  });

  const countA = countMap[a.name || ""] || 0;
  const countB = countMap[b.name || ""] || 0;

  // 👇ここ重要（nameSortAscに変更）
  if (countA !== countB) {
    return nameSortAsc ? countB - countA : countA - countB;
  }

  // 👇サブソートは subSortKey を使う
let A = a[subSortKey] ?? "";
let B = b[subSortKey] ?? "";

  const numA = Number(A);
  const numB = Number(B);
  const isNum = !isNaN(numA) && !isNaN(numB);

  if (isNum) {
    return sortAsc ? numA - numB : numB - numA;
  }

  return String(A).localeCompare(String(B), "ja", { numeric: true });
}

  // =========================
  // 👤 名前単体ソート（通常）
  // =========================
  if (currentSort === "name") {

    const countMap = {};

    lastSnapshot.forEach(d => {
      const n = d.name || "";
      countMap[n] = (countMap[n] || 0) + 1;
    });

    const countA = countMap[a.name || ""] || 0;
    const countB = countMap[b.name || ""] || 0;

    if (countA !== countB) {
  return nameSortAsc ? countB - countA : countA - countB;
}

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
<td>${d.selfRating ?? ""}</td>
<td class="comment-cell" onclick="toggleComment(this)">
  ${d.comment ?? ""}
</td>
<td>${d.date}</td>

<td><button onclick="startEdit('${d.id}','${d.main}','${d.package}','${d.sub}','${d.name}','${d.work}','${d.place}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}','${d.selfRating}','${d.comment}')">編集</button></td>
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
window.sortBy = (key) => {

  // 👤 名前クリック
 if (key === "name") {
  if (currentSort === "name") {
    nameSortAsc = !nameSortAsc;
  } else {
    currentSort = "name";
    nameSortAsc = true;
  }
  render();
  return;
}

  // 👑 名前固定中
  if (primarySort === "name") {

    // 👉 サブソートとして扱う
    if (subSortKey === key) {
      sortAsc = !sortAsc;
    } else {
      subSortKey = key;
      sortAsc = true;
    }
    render();
    return;
  }
  // 🟢 通常動作
  if (currentSort === key) {
    sortAsc = !sortAsc;
  } else {
    currentSort = key;
    sortAsc = true;
  }

  render();
};

window.togglePrimaryName = () => {
  if (primarySort === "name") {
    primarySort = null;
  } else {
    primarySort = "name";
  }

  document.getElementById("primaryBtn").textContent =
    primarySort === "name" ? "名前固定ON" : "名前固定OFF";

  render();
};
// ================= モーダル =================
window.openModal = ()=>{
  modal.style.display="block";
  lockScroll(); // ←追加
};

window.closeModal = ()=>{
  modal.style.display="none";
  unlockScroll(); // ←追加
};

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
      if (i === 14 || i === 15) {
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
  lockScroll(); // ←追加
};

window.closeColumnModal = ()=>{
  columnModal.style.display="none";
  unlockScroll(); // ←追加
};

// ================= CSV（完全安定版） =================
window.importCSV = async () => {
  const file = csvFile.files[0];
  if (!file) return alert("ファイルなし");

  const text = await file.text();

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  });

  // 🔥 ここが超重要（最新データ取得）
  const snap = await getDocs(colRef);
  let localData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let maxNo = Math.max(...localData.map(d => d.no || 0), 0);

  let updateCount = 0;
  let addCount = 0;

  for (const row of parsed.data) {

    const mainVal = Number(row.main);
    let subVal = (row.sub || "").trim();

// 🔥 ="xxx" を外す
if (/^=".*"$/.test(subVal)) {
  subVal = subVal.slice(2, -1);
}

// 🔥 念のため
if (/^\d+\/\d+$/.test(subVal)) {
  subVal = subVal.replace("/", "-");
}



    if (!mainVal) continue;

    // 🔥 最新データで判定
    const existing = localData.find(d => {

      const dMain = Number(d.main);
      const dSub = (d.sub || "").trim();

      if (subVal) {
        return dMain === mainVal && dSub === subVal;
      }
      return dMain === mainVal && !dSub;
    });

    // 🔥 No制御
    let noVal = Number(row.no);

// Noが無い or 不正なら自動採番
if (!noVal || isNaN(noVal)) {
  noVal = ++maxNo;
}

    if (existing) {
      noVal = existing.no;
    } else {
      noVal = noVal || ++maxNo;
    }

    const data = {
      no: noVal,
      main: mainVal,
      package: row.package || "",
      sub: subVal,
      name: row.name,
      work: row.work,
      place: row.place || "",
      url: row.url || "",
      fav: Number(row.fav) || 0,
      ratingCount: Number(row.ratingCount) || 0,
      siteRating: Number(row.siteRating) || 0,
      selfRating: Number(row.selfRating) || 0,
      comment: row.comment || "",
      date: new Date().toLocaleDateString()
    };

    if (existing) {
      await updateDoc(doc(db, "items", existing.id), data);
      updateCount++;

      // 🔥 ローカル更新
      Object.assign(existing, data);

    } else {
      const docRef = await addDoc(colRef, data);
      addCount++;

      // 🔥 ローカル追加
      localData.push({ id: docRef.id, ...data });
    }
  }

  alert(`CSV完了\n追加: ${addCount}件\n更新: ${updateCount}件`);
};
// ================= CSV（出力） =================
window.exportCSV = async () => {

  let data = [...lastSnapshot]; // ←ここ変更

  if (data.length === 0) return alert("データなし");

  // 🔥 renderと同じ条件で並び替え
  data = data.sort((a, b) => {

  if (currentSort === "name") {

    const countMap = {};
    lastSnapshot.forEach(d => {
      const n = d.name || "";
      countMap[n] = (countMap[n] || 0) + 1;
    });

    const countA = countMap[a.name || ""] || 0;
    const countB = countMap[b.name || ""] || 0;

    if (countA !== countB) {
      return sortAsc ? countB - countA : countA - countB;
    }

    return String(a.name).localeCompare(String(b.name), "ja", { numeric: true });
  }

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

  const headers = [
    "no","main","package","sub","name","work",
    "place","url","fav","ratingCount","siteRating","selfRating","comment"
  ];

  const csvBody = [
    headers.join(","),

    ...data.map(row =>
      headers.map(h => {

  let val = row[h];

  if (val === undefined || val === null) val = "";

  // 数値はそのまま
  if (typeof val === "number") return val;

  val = String(val);

  // ダブルクォートエスケープ
  val = val.replace(/"/g, '""');

  // 🔥 sub保護（Excel対策）
if (h === "sub") {
  return `="${val}"`;
}

// 🔥 name保護（カンマ対策）
if (h === "name") {
  return `"${val}"`;
}
  return val;

}).join(",")
    )
  ].join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvBody], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "export.csv";
  a.click();

  URL.revokeObjectURL(url);
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

// ================= 名前全表示 =================
window.toggleName = (el) => {
  el.classList.toggle("expanded");
};
// ================= コメント全表示 =================
window.toggleComment = (el) => {
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

// ================= スクロールロック =================
function lockScroll() {
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  document.body.style.overflow = "";
}
