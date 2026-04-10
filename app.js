import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
let sortKey = "";
let sortAsc = true;

// データ取得
onSnapshot(colRef, snapshot => {
  dataList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

// モーダル
window.openModal = () => modal.style.display = "block";
window.closeModal = () => modal.style.display = "none";

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

  if (!data.main || !data.work) {
    alert("必須：大分類・作品");
    return;
  }

  if (editId) {
    await updateDoc(doc(db,"items",editId), data);
    editId = null;
  } else {
    await addDoc(colRef, data);
  }

  closeModal();
};

// 表示
window.render = () => {

  const keyword = document.getElementById("search").value.toLowerCase();

  let filtered = dataList.filter(d =>
    ((d.main||"")+(d.package||"")+(d.sub||"")+(d.name||"")+(d.work||""))
    .toLowerCase().includes(keyword)
  );

  if (sortKey) {
    filtered.sort((a,b)=>{
      const A=(a[sortKey]||"")+"";
      const B=(b[sortKey]||"")+"";
      return sortAsc ? A.localeCompare(B,'ja') : B.localeCompare(A,'ja');
    });
  }

  const list = document.getElementById("list");
  list.innerHTML = "";

  filtered.forEach((d,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
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

// 並び替え
window.sortBy = key => {
  if (sortKey === key) sortAsc = !sortAsc;
  else { sortKey = key; sortAsc = true; }
  render();
};

// 列表示切替
window.toggleDetails = () => {
  columnFiltered = !columnFiltered;

  const btn = document.querySelector(".search-box button");

  if (!columnFiltered) {
    document.querySelectorAll("th,td").forEach(el=>el.style.display="");
    btn.textContent="選択列表示";
    return;
  }

  document.querySelectorAll(".column-toggle input").forEach(cb=>{
    const col=Number(cb.dataset.col);
    document.querySelectorAll(`th:nth-child(${col+1}),td:nth-child(${col+1})`)
      .forEach(el=>el.style.display=cb.checked?"":"none");
  });

  saveColumnSettings();
  btn.textContent="全表示";
};

// 列保存
function saveColumnSettings(){
  const s={};
  document.querySelectorAll(".column-toggle input").forEach(cb=>{
    s[cb.dataset.col]=cb.checked;
  });
  localStorage.setItem("columns",JSON.stringify(s));
}

// 列読込
function loadColumnSettings(){
  const s=JSON.parse(localStorage.getItem("columns")||"{}");
  document.querySelectorAll(".column-toggle input").forEach(cb=>{
    if(s[cb.dataset.col]!==undefined) cb.checked=s[cb.dataset.col];
  });
}

// 編集
window.editItem=id=>{
  const d=dataList.find(x=>x.id===id);
  editId=id;
  Object.keys(d).forEach(k=>{
    if(document.getElementById(k)) document.getElementById(k).value=d[k];
  });
  openModal();
};

// 削除
window.deleteItem=async id=>{
  if(confirm("削除する？")){
    await deleteDoc(doc(db,"items",id));
  }
};

// CSV取込
document.getElementById("fileInput").addEventListener("change", e=>{
  const file=e.target.files[0];
  const reader=new FileReader();

  reader.onload=async ev=>{
    const rows=ev.target.result.split("\n").slice(1);
    for(const row of rows){
      const c=row.split(",");
      if(!c[0]||!c[4]) continue;

      await addDoc(colRef,{
        main:c[0],package:c[1],sub:c[2],name:c[3],
        work:c[4],volume:c[5],url:c[6],
        fav:c[7],ratingCount:c[8],
        siteRating:c[9],authorRating:c[10],
        updated:new Date().toLocaleDateString()
      });
    }
    alert("CSV取込完了");
  };

  reader.readAsText(file);
});

// 初期
window.onload=()=>{
  loadColumnSettings();
  render();
};
