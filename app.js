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
let currentSort = "name";
let sortAsc = true;

/* モーダル */
window.openModal = () => modal.style.display = "block";
window.closeModal = () => modal.style.display = "none";

window.openColumnModal = () => {
  columnModal.style.display = "block";
  applyCheckboxState();
};
window.closeColumnModal = () => columnModal.style.display = "none";

/* Firestore */
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

  if (!data.name || !data.work) return alert("必須項目入力");

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
window.startEdit = (id, d) => {
  openModal();
  Object.keys(d).forEach(k=>{
    if(document.getElementById(k)) document.getElementById(k).value = d[k] || "";
  });
  editId = id;
};

/* ソート */
window.sortBy = key => {
  if (currentSort === key) sortAsc = !sortAsc;
  else { currentSort = key; sortAsc = true; }
  render();
};

/* 行展開 */
window.toggleRow = (el) => {
  const row = el.closest("tr").nextElementSibling;
  row.style.display = row.style.display === "table-row" ? "none" : "table-row";
};

/* 列設定 */
document.addEventListener("change", e=>{
  if(!e.target.dataset.col) return;
  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");

  if(e.target.checked){
    const i = hidden.indexOf(e.target.dataset.col);
    if(i !== -1) hidden.splice(i,1);
  }else{
    hidden.push(e.target.dataset.col);
  }

  localStorage.setItem("hiddenCols", JSON.stringify(hidden));
  render();
});

function applyCheckboxState(){
  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");
  document.querySelectorAll("[data-col]").forEach(cb=>{
    cb.checked = !hidden.includes(cb.dataset.col);
  });
}

/* 描画 */
window.render = function(){

  const keyword = search.value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    Object.values(d).some(v =>
      String(v).toLowerCase().includes(keyword)
    )
  );

  data.sort((a,b)=>{
    let A = a[currentSort];
    let B = b[currentSort];

    if (!isNaN(A) && !isNaN(B)) return sortAsc ? A-B : B-A;
    return sortAsc ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
  });

  resultCount.textContent = `${data.length}件`;

  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");

  let html = "";

  data.forEach((d,i)=>{
    html += `
<tr>
<td>${i+1}</td>
<td>${d.name}</td>
<td>${d.work}</td>
<td>${d.fav}</td>
<td><button onclick="toggleRow(this)">▶</button></td>
<td><button onclick='startEdit("${d.id}", ${JSON.stringify(d)})'>編集</button></td>
<td><button onclick="remove('${d.id}')">削除</button></td>
</tr>

<tr class="detail-row">
<td colspan="7">
  <div class="detail-box">
    ${!hidden.includes("main") ? `大: ${d.main}<br>`:""}
    ${!hidden.includes("sub") ? `小: ${d.sub}<br>`:""}
    ${!hidden.includes("package") ? `パッケージ: ${d.package || "-"}<br>`:""}
    ${!hidden.includes("volume") ? `ボリューム: ${d.volume || "-"}<br>`:""}
    ${!hidden.includes("url") ? `URL: ${d.url ? `<a href="${d.url}" target="_blank">リンク</a>`:"-"}<br>`:""}
    ${!hidden.includes("ratingCount") ? `評価数: ${d.ratingCount}<br>`:""}
    ${!hidden.includes("siteRating") ? `サイト: ${d.siteRating}<br>`:""}
    ${!hidden.includes("authorRating") ? `同人物: ${d.authorRating}<br>`:""}
    ${!hidden.includes("date") ? `更新日: ${d.date}<br>`:""}
  </div>
</td>
</tr>
`;
  });

  list.innerHTML = html;
};
