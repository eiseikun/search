// ==============================
// 🔥 Firebase 初期化
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⚠️ 自分のFirebase設定に変更
const firebaseConfig = {
  apiKey: "AIzaSyDJmfV7Vow1e_VjOv06h-n27fWB5KK1l4o",
  authDomain: "search-management-date.firebaseapp.com",
  projectId: "search-management-date",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

// 状態
let lastSnapshot = [];
let editId = null;
let showDetails = true;
let currentSort = "main";

// データ取得
onSnapshot(colRef, (snapshot) => {
  lastSnapshot = [];

  snapshot.forEach(docSnap => {
    lastSnapshot.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  render();
});

// 追加 / 更新
window.addItem = async function () {

  const main = Number(document.getElementById("main").value);
  const sub = document.getElementById("sub").value;

  const name = document.getElementById("name").value;
  const work = document.getElementById("work").value;
  const url = document.getElementById("url").value;

  const fav = Number(document.getElementById("fav").value) || 0;
  const ratingCount = Number(document.getElementById("ratingCount").value) || 0;
  const siteRating = Number(document.getElementById("siteRating").value) || 0;
  const authorRating = Number(document.getElementById("authorRating").value) || 0;

  const now = new Date().toLocaleDateString();

  if (!main || !sub || !name || !work) {
    alert("必須項目を入力してください");
    return;
  }

  const data = {
    main, sub, name, work, url,
    fav, ratingCount, siteRating, authorRating,
    date: now
  };

  if (editId) {
    await updateDoc(doc(db, "items", editId), data);
    editId = null;
  } else {
    await addDoc(colRef, data);
  }

  document.querySelector(".input-box").classList.remove("editing");

  document.querySelectorAll("input").forEach(i => i.value = "");
};

// 削除
window.remove = async function (id) {
  if (!confirm("削除しますか？")) return;
  await deleteDoc(doc(db, "items", id));
};

// 編集
window.startEdit = function (id, ...vals) {
  const ids = ["main","sub","name","work","url","fav","ratingCount","siteRating","authorRating"];
  ids.forEach((key, i) => {
    document.getElementById(key).value = vals[i] || "";
  });

  editId = id;
  document.querySelector(".input-box").classList.add("editing");
};

// 検索
window.searchNow = function () { render(); };

document.getElementById("search").addEventListener("keypress", (e) => {
  if (e.key === "Enter") render();
});

// 並び替え
window.sortBy = function (key) {
  currentSort = key;
  render();
};

// 折りたたみ
window.toggleColumns = function () {
  showDetails = !showDetails;

  document.querySelectorAll(".detail").forEach(el => {
    el.style.display = showDetails ? "" : "none";
  });
};

// 描画
function render() {
  const list = document.getElementById("list");
  const resultCount = document.getElementById("resultCount");

  list.innerHTML = "";

  const keyword = document.getElementById("search").value.toLowerCase();

  let filtered = lastSnapshot.filter(d =>
    d.name.toLowerCase().includes(keyword) ||
    d.work.toLowerCase().includes(keyword)
  );

  // 並び替え（分類専用）
  filtered.sort((a, b) => {

    if (a.main !== b.main) return a.main - b.main;

    const getStart = (s) => Number((s || "0").split("~")[0]);

    return getStart(a.sub) - getStart(b.sub);
  });

  resultCount.textContent = keyword
    ? `検索結果：${filtered.length}件`
    : `全件数：${filtered.length}件`;

  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="13">データなし</td></tr>`;
    return;
  }

  filtered.forEach((d, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${d.main}</td>
      <td>${d.sub}</td>
      <td>${d.name}</td>
      <td>${d.work}</td>
      <td>${d.url ? `<a href="${d.url}" target="_blank">リンク</a>` : "-"}</td>

      <td class="detail">${d.fav}</td>
      <td class="detail">${d.ratingCount}</td>
      <td class="detail">${d.siteRating}</td>
      <td class="detail">${d.authorRating}</td>
      <td class="detail">${d.date}</td>

      <td><button onclick="startEdit('${d.id}','${d.main}','${d.sub}','${d.name}','${d.work}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}','${d.authorRating}')">編集</button></td>
      <td><button onclick="remove('${d.id}')">削除</button></td>
    `;

    list.appendChild(tr);
  });
}
