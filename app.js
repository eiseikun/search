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
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⚠️ 自分のFirebase設定に変更
const firebaseConfig = {
  apiKey: "ここにAPIキー",
  authDomain: "ここにドメイン",
  projectId: "ここにID",
};

// 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// コレクション
const colRef = collection(db, "items");

// ==============================
// ➕ 追加
// ==============================
window.addItem = async function () {
  const name = document.getElementById("name").value;
  const work = document.getElementById("work").value;
  const url = document.getElementById("url").value;

  if (!name || !work) return;

  await addDoc(colRef, {
    name,
    work,
    url
  });

  // 入力リセット
  document.getElementById("name").value = "";
  document.getElementById("work").value = "";
  document.getElementById("url").value = "";
};

// ==============================
// 🗑 削除
// ==============================
async function remove(id) {
  await deleteDoc(doc(db, "items", id));
}

// ==============================
// 📋 表示（リアルタイム）
// ==============================
onSnapshot(colRef, (snapshot) => {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const keyword = document.getElementById("search").value.toLowerCase();

  snapshot.forEach((docSnap) => {
    const d = docSnap.data();
    const id = docSnap.id;

    if (
      d.name.toLowerCase().includes(keyword) ||
      d.work.toLowerCase().includes(keyword)
    ) {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${d.name}</td>
        <td>${d.work}</td>
        <td><a href="${d.url}" target="_blank">リンク</a></td>
        <td><button onclick="remove('${id}')">削除</button></td>
      `;

      list.appendChild(tr);
    }
  });
});

// ==============================
// 🔍 検索
// ==============================
document.getElementById("search").addEventListener("input", () => {
  location.reload(); // 簡易版（あとで改善OK）
});