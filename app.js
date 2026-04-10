// データ取得
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJmfV7Vow1e_VjOv06h-n27fWB5KK1l4o",
  authDomain: "search-management-date.firebaseapp.com",
  projectId: "search-management-date",
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

let dataList = [];
let editId = null;
let sortKey = "";
let sortAsc = true;
let columnFiltered = false;

onSnapshot(colRef, snapshot => {
  dataList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

window.openModal = () => modal.style.display = "block";
window.closeModal = () => modal.style.display = "none";

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
    updated: Date.now() // 🔥 重要
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

window.render = () => {

  const keyword = document.getElementById("search").value.toLowerCase();

  let filtered = dataList.filter(d =>
    Object.values(d).join("").toLowerCase().includes(keyword)
  );

  if (sortKey) {
    filtered.sort((a,b)=>{
      let A = a[sortKey];
      let B = b[sortKey];

      if (!isNaN(A) && !isNaN(B)) return sortAsc ? A - B : B - A;

      return sortAsc
        ? (A+"").localeCompare(B,'ja')
        : (B+"").localeCompare(A,'ja');
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
    <td>${d.updated ? new Date(d.updated).toLocaleDateString() : ""}</td>
    <td>
      <button onclick="editItem('${d.id}')">編集</button>
      <button onclick="deleteItem('${d.id}')">削除</button>
    </td>
    `;

    list.appendChild(tr);
  });

  if (columnFiltered) applyColumnFilter();
};

window.sortBy = key => {
  if (sortKey === key) sortAsc = !sortAsc;
  else { sortKey = key; sortAsc = true; }
  render();
};

window.toggleDetails = () => {
  columnFiltered = !columnFiltered;
  if (!columnFiltered) {
    document.querySelectorAll("th,td").forEach(el=>el.style.display="");
    return;
  }
  applyColumnFilter();
};

function applyColumnFilter(){
  document.querySelectorAll(".column-toggle input").forEach(cb=>{
    const col = Number(cb.dataset.col);
    document.querySelectorAll(`th:nth-child(${col+1}),td:nth-child(${col+1})`)
      .forEach(el=>el.style.display=cb.checked?"":"none");
  });
}

window.editItem=id=>{
  const d=dataList.find(x=>x.id===id);
  editId=id;
  Object.keys(d).forEach(k=>{
    if(document.getElementById(k)) document.getElementById(k).value=d[k];
  });
  openModal();
};

window.deleteItem=async id=>{
  if(confirm("削除する？")){
    await deleteDoc(doc(db,"items",id));
  }
};
