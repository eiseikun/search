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

// 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// コレクション
const colRef = collection(db, "items");
// ==============================
// 状態管理
// ==============================
let lastSnapshot = [];
let currentSort = "name";
let editId = null;

// ==============================
// 🔄 リアルタイム取得
// ==============================
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

// ==============================
// ➕ 追加 / 更新
// ==============================
window.addItem = async function () {
  const name = document.getElementById("name").value;
  const work = document.getElementById("work").value;
  const url = document.getElementById("url").value;

  if (!name || !work) return;

  if (editId) {
    // 更新
    await updateDoc(doc(db, "items", editId), {
      name,
      work,
      url
    });
    editId = null;
  } else {
    // 新規
    await addDoc(colRef, {
      name,
      work,
      url
    });
  }

  // 入力リセット
  document.getElementById("name").value = "";
  document.getElementById("work").value = "";
  document.getElementById("url").value = "";
};

// ==============================
// 🗑 削除
// ==============================
window.remove = async function (id) {
  await deleteDoc(doc(db, "items", id));
};

// ==============================
// ✏ 編集開始
// ==============================
window.startEdit = function (id, name, work, url) {
  document.getElementById("name").value = name;
  document.getElementById("work").value = work;
  document.getElementById("url").value = url;

  editId = id;
  document.querySelector(".input-box").classList.add("editing");
};

// ==============================
// 🔍 検索
// ==============================
window.searchNow = function () {
  render();
};

// Enterキーでも検索
document.getElementById("search").addEventListener("keypress", (e) => {
  if (e.key === "Enter") render();
});

// ==============================
// ↕ 並び替え
// ==============================
window.sortBy = function (key) {
  currentSort = key;
  render();
};

// ==============================
// 📋 描画
// ==============================
function render() {
  const list = document.getElementById("list");
  const resultCount = document.getElementById("resultCount");

  list.innerHTML = "";

  const keyword = document.getElementById("search").value.toLowerCase();

  let filtered = lastSnapshot.filter(d =>
    d.name.toLowerCase().includes(keyword) ||
    d.work.toLowerCase().includes(keyword)
  );

  // 並び替え
  filtered.sort((a, b) =>
    a[currentSort].localeCompare(b[currentSort])
  );

  // 件数表示
  if (keyword) {
    resultCount.textContent = `検索結果：${filtered.length}件`;
  } else {
    resultCount.textContent = `全件数：${filtered.length}件`;
  }

  // 0件
  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="5">該当するデータがありません</td></tr>`;
    return;
  }

  // 表示
  filtered.forEach(d => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${d.name}</td>
      <td>${d.work}</td>
      <td><a href="${d.url}" target="_blank">リンク</a></td>
      <td><button onclick="startEdit('${d.id}', '${d.name}', '${d.work}', '${d.url}')">編集</button></td>
      <td><button onclick="remove('${d.id}')">削除</button></td>
    `;

    list.appendChild(tr);
  });
}

