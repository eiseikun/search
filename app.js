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
    lastSnapshot.push({ id: docSnap.id, ...docSnap.data() });
  });
  render();
});

// 追加・更新
window.addItem = async function () {

  const data = {
    main: Number(main.value),
    package: package.value,
    sub: sub.value,
    name: name.value,
    work: work.value,
    volume: volume.value,
    url: url.value,
    fav: Number(fav.value) || 0,
    ratingCount: Number(ratingCount.value) || 0,
    siteRating: Number(siteRating.value) || 0,
    authorRating: Number(authorRating.value) || 0,
    date: new Date().toLocaleDateString()
  };

  if (!data.main || !data.sub || !data.name || !data.work) {
    alert("必須項目入力");
    return;
  }

  if (editId) {
    await updateDoc(doc(db, "items", editId), data);
    editId = null;
  } else {
    await addDoc(colRef, data);
  }

  document.querySelectorAll("input").forEach(i => i.value = "");
};

// 削除
window.remove = async function (id) {
  if (!confirm("削除しますか？")) return;
  await deleteDoc(doc(db, "items", id));
};

// 編集
window.startEdit = function (id, ...vals) {
  const ids = ["main","package","sub","name","work","volume","url","fav","ratingCount","siteRating","authorRating"];
  ids.forEach((key, i) => document.getElementById(key).value = vals[i] || "");
  editId = id;
};

// 更新日更新
window.updateDate = async function (id) {
  await updateDoc(doc(db, "items", id), {
    date: new Date().toLocaleDateString()
  });
};

// 並び替え
window.sortBy = function (key) {
  currentSort = key;
  render();
};

// 詳細ON/OFF
window.toggleDetails = function () {
  showDetails = !showDetails;
  document.querySelectorAll(".detail").forEach(el => {
    el.style.display = showDetails ? "" : "none";
  });
};

// 描画
function render() {

  const list = document.getElementById("list");
  list.innerHTML = "";

  const keyword = search.value.toLowerCase();

  let filtered = lastSnapshot.filter(d =>
    d.name?.toLowerCase().includes(keyword) ||
    d.work?.toLowerCase().includes(keyword)
  );

  // 並び替え
  filtered.sort((a, b) => {
    if (currentSort === "sub") {
      const getStart = s => Number((s || "0").split("~")[0]);
      return getStart(a.sub) - getStart(b.sub);
    }
    return (a[currentSort] || 0) > (b[currentSort] || 0) ? 1 : -1;
  });

  resultCount.textContent = `${filtered.length}件`;

  filtered.forEach((d, i) => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${d.main}</td>
      <td>${d.package || ""}</td>
      <td>${d.sub}</td>
      <td>${d.name}</td>
      <td>${d.work}</td>
      <td>${d.volume || "-"}</td>
      <td>${d.url ? `<a href="${d.url}" target="_blank">リンク</a>` : "-"}</td>

      <td class="detail">${d.fav}</td>
      <td class="detail">${d.ratingCount}</td>
      <td class="detail">${d.siteRating}</td>
      <td class="detail">${d.authorRating}</td>
      <td class="detail">${d.date}</td>

      <td><button onclick="updateDate('${d.id}')">更新</button></td>
      <td><button onclick="startEdit('${d.id}','${d.main}','${d.package}','${d.sub}','${d.name}','${d.work}','${d.volume}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}','${d.authorRating}')">編集</button></td>
      <td><button onclick="remove('${d.id}')">削除</button></td>
    `;

    list.appendChild(tr);
  });
}
