import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==============================
// Firebase
// ==============================
const app = initializeApp({
  apiKey: "AIzaSyDJmfV7Vow1e_VjOv06h-n27fWB5KK1l4o",
  authDomain: "search-management-date.firebaseapp.com",
  projectId: "search-management-date",
});

const db = getFirestore(app);
const colRef = collection(db, "items");

// ==============================
// 状態
// ==============================
let lastSnapshot = [];
let editId = null;

let columnMode = false;

let currentSort = "no";
let sortAsc = true;

// ==============================
// Firestore
// ==============================
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  render();
});

// ==============================
// 追加 / 編集
// ==============================
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

  if (!data.name || !data.work) return alert("必須項目");

  if (editId) {
    await updateDoc(doc(db, "items", editId), data);
    editId = null;
  } else {
    await addDoc(colRef, data);
  }

  document.querySelectorAll("#modal input").forEach(i => i.value = "");
  closeModal();
};

// ==============================
// 削除
// ==============================
window.remove = async id => {
  if (!confirm("削除？")) return;
  await deleteDoc(doc(db, "items", id));
};

// ==============================
// 編集
// ==============================
window.startEdit = (id, ...vals) => {
  openModal();
  const keys = ["main","package","sub","name","work","place","url","fav","ratingCount","siteRating"];
  keys.forEach((k,i)=> document.getElementById(k).value = vals[i] || "");
  editId = id;
};

// ==============================
// 更新日
// ==============================
window.updateDate = async id => {
  await updateDoc(doc(db, "items", id), {
    date: new Date().toLocaleDateString()
  });
};

// ==============================
// 検索＋描画
// ==============================
window.render = function(){

  const keyword = document.getElementById("search").value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    Object.values(d).some(v =>
      String(v).toLowerCase().includes(keyword)
    )
  );

  // =========================
  // ソート
  // =========================
  data = data.sort((a, b) => {

    let A = a[currentSort];
    let B = b[currentSort];

    if (A == null) A = "";
    if (B == null) B = "";

    const numA = Number(A);
    const numB = Number(B);
    const isNum = !isNaN(numA) && !isNaN(numB);

    if (isNum && A !== "" && B !== "") {
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

  data.forEach(d => {
    html += `
<tr>
<td>${d.no ?? "-"}</td>
<td>${d.main}</td>
<td>${d.package || ""}</td>
<td>${d.sub}</td>
<td>${d.name}</td>
<td>${d.work}</td>
<td>${d.place || "-"}</td>
<td>${d.url ? `<a href="${d.url}" target="_blank">🔗</a>` : "-"}</td>
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

  applyColumnVisibility();
};

// ==============================
// ソート
// ==============================
window.sortBy = (key) => {
  if (currentSort === key) {
    sortAsc = !sortAsc;
  } else {
    currentSort = key;
    sortAsc = true;
  }
  render();
};

// ==============================
// 列表示トグル
// ==============================
window.toggleDetails = () => {
  columnMode = !columnMode;
  applyColumnVisibility();
};

// ==============================
// 列表示制御
// ==============================
function getHiddenCols(){
  return JSON.parse(localStorage.getItem("hiddenCols") || "[]");
}

function applyColumnVisibility(){

  const hidden = getHiddenCols();
  const rows = document.querySelectorAll("table tr");

  rows.forEach(row => {
    [...row.children].forEach((cell, i) => {

      if (i === 0 || i >= row.children.length - 3) return;

      if (!columnMode) {
        cell.style.display = "";
      } else {
        cell.style.display = hidden.includes(i) ? "none" : "";
      }
    });
  });
}

// ==============================
// チェック保存
// ==============================
document.addEventListener("change", e => {
  if (!e.target.dataset.col) return;

  const col = Number(e.target.dataset.col);
  let hidden = getHiddenCols();

  if (e.target.checked) {
    hidden = hidden.filter(x => x !== col);
  } else {
    hidden.push(col);
  }

  localStorage.setItem("hiddenCols", JSON.stringify(hidden));
});

// ==============================
// チェック同期
// ==============================
function syncCheckbox(){
  const hidden = getHiddenCols();
  document.querySelectorAll("[data-col]").forEach(cb => {
    cb.checked = !hidden.includes(Number(cb.dataset.col));
  });
}

window.openColumnModal = () => {
  document.getElementById("columnModal").style.display = "block";
  syncCheckbox();
};

window.closeColumnModal = () => {
  document.getElementById("columnModal").style.display = "none";
};

// ==============================
// モーダル
// ==============================
window.openModal = () =>
  document.getElementById("modal").style.display = "block";

window.closeModal = () =>
  document.getElementById("modal").style.display = "none";

// ==============================
// CSV削除
// ==============================
window.resetAll = async () => {
  if (!confirm("全削除？")) return;
  const snap = await getDocs(colRef);
  snap.forEach(d => deleteDoc(doc(db, "items", d.id)));
};
