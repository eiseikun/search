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
let currentSort = "main";

// モーダル
window.openModal = () => modal.style.display = "block";
window.closeModal = () => modal.style.display = "none";

// データ取得
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  render();
});

// 追加・更新
window.addItem = async () => {

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

  document.querySelectorAll("#modal input").forEach(i => i.value = "");
  closeModal();
};

// 削除
window.remove = async id => {
  if (!confirm("削除しますか？")) return;
  await deleteDoc(doc(db, "items", id));
};

// 編集
window.startEdit = (id, ...vals) => {
  openModal();
  const keys = ["main","package","sub","name","work","volume","url","fav","ratingCount","siteRating","authorRating"];
  keys.forEach((k,i)=> document.getElementById(k).value = vals[i]||"");
  editId = id;
};

// 更新日
window.updateDate = async id => {
  await updateDoc(doc(db,"items",id),{date:new Date().toLocaleDateString()});
};

// ソート
window.sortBy = key => {
  currentSort = key;
  render();
};

// 詳細
window.toggleDetails = () => {
  showDetails = !showDetails;
  document.querySelectorAll(".detail").forEach(el=>{
    el.style.display = showDetails ? "" : "none";
  });
};

// 列ON/OFF
window.toggleColumn = index => {
  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");
  hidden.includes(index)
    ? hidden.splice(hidden.indexOf(index),1)
    : hidden.push(index);
  localStorage.setItem("hiddenCols", JSON.stringify(hidden));
  applyColumnVisibility();
};

function applyColumnVisibility(){
  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");
  document.querySelectorAll("table tr").forEach(row=>{
    [...row.children].forEach((cell,i)=>{
      cell.style.display = hidden.includes(i) ? "none" : "";
    });
  });
}

// チェック反映
function applyCheckboxState(){
  const hidden = JSON.parse(localStorage.getItem("hiddenCols")||"[]");
  document.querySelectorAll("[data-col]").forEach(cb=>{
    cb.checked = !hidden.includes(Number(cb.dataset.col));
  });
}

// 描画
window.render = function(){

  const keyword = search.value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    d.name?.toLowerCase().includes(keyword) ||
    d.work?.toLowerCase().includes(keyword)
  );

  data.sort((a,b)=>{
    if(currentSort==="sub"){
      const f = s=>Number((s||"0").split("~")[0]);
      return f(a.sub)-f(b.sub);
    }
    return (a[currentSort]||0)>(b[currentSort]||0)?1:-1;
  });

  resultCount.textContent = `${data.length}件`;

  list.innerHTML = "";

  data.forEach((d,i)=>{
    list.innerHTML += `
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

  applyColumnVisibility();
  applyCheckboxState();
};
