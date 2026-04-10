import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJmfV7Vow1e_VjOv06h-n27fWB5KK1l4o",
  authDomain: "search-management-date.firebaseapp.com",
  projectId: "search-management-date",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

let lastSnapshot = [];
let editId = null;
let showDetails = true;
let useColumnFilter = false;
let currentSort = "main";
let sortAsc = true;

/* モーダル */
window.openModal = () => modal.style.display = "block";
window.closeModal = () => modal.style.display = "none";

window.openColumnModal = () => {
  columnModal.style.display = "block";
  applyCheckboxState();
};
window.closeColumnModal = () => columnModal.style.display = "none";

/* データ取得 */
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  render();
});

/* 追加・更新 */
window.addItem = async () => {
  const val = id => document.getElementById(id).value;

  const data = {
    main: Number(val("main")),
    package: val("package"),
    sub: val("sub"),
    name: val("name"),
    work: val("work"),
    volume: val("volume"),
    url: val("url"),
    fav: Number(val("fav")) || 0,
    ratingCount: Number(val("ratingCount")) || 0,
    siteRating: Number(val("siteRating")) || 0,
    authorRating: Number(val("authorRating")) || 0,
    date: new Date().toLocaleDateString()
  };

  if (!data.main || !data.sub || !data.name || !data.work) return alert("必須項目入力");

  if (editId) {
    await updateDoc(doc(db, "items", editId), data);
    editId = null;
  } else {
    await addDoc(colRef, data);
  }

  document.querySelectorAll("#modal input").forEach(i => i.value = "");
  closeModal();
};

/* 削除 */
window.remove = async id => {
  if (!confirm("削除しますか？")) return;
  await deleteDoc(doc(db, "items", id));
};

/* 編集 */
window.startEdit = (id, ...vals) => {
  openModal();
  const keys = ["main","package","sub","name","work","volume","url","fav","ratingCount","siteRating","authorRating"];
  keys.forEach((k,i)=> document.getElementById(k).value = vals[i]||"");
  editId = id;
};

/* 更新日 */
window.updateDate = async id => {
  await updateDoc(doc(db,"items",id),{date:new Date().toLocaleDateString()});
};

/* ソート */
window.sortBy = key => {
  if (currentSort === key) sortAsc = !sortAsc;
  else { currentSort = key; sortAsc = true; }
  render();
};

/* 切替 */
window.toggleDetails = () => {
  useColumnFilter = !useColumnFilter;
  showDetails = !showDetails;
  render();
};

/* チェック保存 */
document.addEventListener("change", e=>{
  if(!e.target.dataset.col) return;

  const index = Number(e.target.dataset.col);
  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");

  if (e.target.checked) {
    const i = hidden.indexOf(index);
    if (i !== -1) hidden.splice(i,1);
  } else {
    if (!hidden.includes(index)) hidden.push(index);
  }

  localStorage.setItem("hiddenCols", JSON.stringify(hidden));
});

/* 列制御 */
function applyColumnVisibility(){
  const hidden = JSON.parse(localStorage.getItem("hiddenCols") || "[]");

  const rows = document.querySelectorAll("table tr"); // ← ここ重要

  rows.forEach(row=>{
    const cells = row.children;

    for (let i = 0; i < cells.length; i++){
      if (i === 0) continue; // No列は常に表示
      if (i >= cells.length - 3) continue; // 更新・編集・削除は表示

      cells[i].style.display = hidden.includes(i) ? "none" : "";
    }
  });
}

function showAllColumns(){
  document.querySelectorAll("table tr").forEach(row=>{
    Array.from(row.children).forEach(cell=>{
      cell.style.display = "";
    });
  });
}

function applyCheckboxState(){
  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");
  document.querySelectorAll("[data-col]").forEach(cb=>{
    cb.checked = !hidden.includes(Number(cb.dataset.col));
  });
}

/* 描画 */
window.render = function(){

  const keyword = search.value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    d.name?.toLowerCase().includes(keyword) ||
    d.work?.toLowerCase().includes(keyword)
  );

  data.sort((a,b)=>{
    let A = a[currentSort] || "";
    let B = b[currentSort] || "";
    if (A > B) return sortAsc ? 1 : -1;
    if (A < B) return sortAsc ? -1 : 1;
    return 0;
  });

  resultCount.textContent = `${data.length}件`;

  let html = "";
  data.forEach((d,i)=>{
    html += `
<tr>
<td>${i+1}</td>
<td>${d.main}</td>
<td>${d.package||""}</td>
<td>${d.sub}</td>
<td>${d.name}</td>
<td>${d.work}</td>
<td>${d.volume||"-"}</td>
<td>${d.url?`<a href="${d.url}" target="_blank">リンク</a>`:"-"}</td>

<td class="detail">${d.fav}</td>
<td class="detail">${d.ratingCount}</td>
<td class="detail">${d.siteRating}</td>
<td class="detail">${d.authorRating}</td>
<td class="detail">${d.date}</td>

<td><button onclick="updateDate('${d.id}')">更新</button></td>
<td><button onclick="startEdit('${d.id}','${d.main}','${d.package}','${d.sub}','${d.name}','${d.work}','${d.volume}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}','${d.authorRating}')">編集</button></td>
<td><button onclick="remove('${d.id}')">削除</button></td>
</tr>`;
  });

  list.innerHTML = html;

  if (useColumnFilter) applyColumnVisibility();
  else showAllColumns();

  document.querySelectorAll(".detail").forEach(el=>{
    el.style.display = showDetails ? "" : "none";
  });
};
