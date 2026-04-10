import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "search-management-date.firebaseapp.com",
  projectId: "search-management-date",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

let dataList = [];
let editId = null;
let columnFiltered = false;

// データ取得
onSnapshot(colRef, snapshot => {
  dataList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

// モーダル
window.openModal = () => {
  document.getElementById("modal").style.display = "block";
};

window.closeModal = () => {
  document.getElementById("modal").style.display = "none";
};

// 保存
window.addItem = async () => {

  const val = id => document.getElementById(id).value;

  const data = {
    main: val("main"),
    package: val("package"),
    sub: val("sub"),
    name: val("name"),
    work: val("work"),
    volume: val("volume"),
    url: val("url"),
    fav: val("fav"),
    ratingCount: val("ratingCount"),
    siteRating: val("siteRating"),
    authorRating: val("authorRating"),
    updated: new Date().toLocaleDateString()
  };

  // 必須チェック
  if (!data.main || !data.work) {
    alert("必須項目：大分類・作品");
    return;
  }

  if (editId) {
    await updateDoc(doc(db, "items", editId), data);
    editId = null;
  } else {
    await addDoc(colRef, data);
  }

  closeModal();
};

// 表示
window.render = () => {

  const keyword = document.getElementById("search").value.toLowerCase();

  const list = document.getElementById("list");
  list.innerHTML = "";

  let filtered = dataList.filter(d =>
    Object.values(d).some(v =>
      String(v).toLowerCase().includes(keyword)
    )
  );

  filtered.forEach((d, i) => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${d.main||""}</td>
      <td>${d.package||""}</td>
      <td>${d.sub||""}</td>
      <td>${d.name||""}</td>
      <td>${d.work||""}</td>
      <td>${d.volume||""}</td>
      <td><a href="${d.url||"#"}" target="_blank">🔗</a></td>
      <td>${d.fav||""}</td>
      <td>${d.ratingCount||""}</td>
      <td>${d.siteRating||""}</td>
      <td>${d.authorRating||""}</td>
      <td>${d.updated||""}</td>
      <td><button onclick="editItem('${d.id}')">編集</button></td>
      <td><button onclick="deleteItem('${d.id}')">削除</button></td>
    `;

    list.appendChild(tr);
  });
};

// 編集
window.editItem = (id) => {
  const d = dataList.find(x => x.id === id);
  editId = id;

  Object.keys(d).forEach(k=>{
    if(document.getElementById(k)){
      document.getElementById(k).value = d[k];
    }
  });

  openModal();
};

// 削除
window.deleteItem = async (id) => {
  if(confirm("削除する？")){
    await deleteDoc(doc(db,"items",id));
  }
};

// 表示切替ボタン
window.toggleDetails = () => {

  columnFiltered = !columnFiltered;

  const btn = document.querySelector(".search-box button");

  if (!columnFiltered) {
    document.querySelectorAll("th, td").forEach(el => {
      el.style.display = "";
    });
    btn.textContent = "選択列表示";
    return;
  }

  document.querySelectorAll(".column-toggle input").forEach(cb => {
    const col = Number(cb.dataset.col);

    document.querySelectorAll(`th:nth-child(${col+1}), td:nth-child(${col+1})`)
      .forEach(el => {
        el.style.display = cb.checked ? "" : "none";
      });
  });

  btn.textContent = "全表示";
};

// 初期
window.onload = () => render();
