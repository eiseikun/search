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
let currentSort = "name";
let sortAsc = true;

/* Firestore */
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  render();
});

/* 追加 */
window.addItem = async () => {
  const val = id => document.getElementById(id).value;

  let maxNo = 0;
  lastSnapshot.forEach(d => {
    if (d.no && d.no > maxNo) maxNo = d.no;
  });

  // 🔥 ここ重要
  const data = {
    main: Number(val("main")),
    package: val("package"),
    sub: val("sub"),
    name: val("name"),
    work: val("work"),
    place: val("place"),
    url: val("url"),
    fav: Number(val("fav")) || 0,
    ratingCount: Number(val("ratingCount")) || 0,
    siteRating: Number(val("siteRating")) || 0,
    date: new Date().toLocaleDateString()
  };

  if (!data.name || !data.work) return alert("必須項目入力");

  if (editId) {
    // ✅ 編集時はNoを維持
    const old = lastSnapshot.find(d => d.id === editId);
    data.no = old?.no ?? 1;

    await updateDoc(doc(db, "items", editId), data);
    editId = null;

  } else {
    // ✅ 新規時だけNoを振る
    data.no = maxNo + 1;

    await addDoc(colRef, data);
  }

  document.querySelectorAll("#modal input").forEach(i => i.value = "");
  modal.style.display = "none";
};

/* 削除 */
window.remove = async id => {
  if (!confirm("削除しますか？")) return;
  await deleteDoc(doc(db, "items", id));
};

/* 編集 */
window.startEdit = (id, ...vals) => {
  modal.style.display = "block";
  const keys = ["main","package","sub","name","work","place","url","fav","ratingCount","siteRating"];
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

  let html = "";

  data.forEach((d,i)=>{
    html += `
<tr>
<td>${d.no ?? "-"}</td>
<td>${d.main}</td>
<td>${d.package||""}</td>
<td>${d.sub}</td>
<td>${d.name}</td>
<td><div class="work-text">${d.work}</div></td>
<td>${d.place||"-"}</td>
<td>${d.url?`<a href="${d.url}" target="_blank">リンク</a>`:"-"}</td>
<td>${d.fav}</td>
<td>${d.ratingCount}</td>
<td>${d.siteRating}</td>
<td class="detail">${d.date}</td>

<td><button onclick="updateDate('${d.id}')">更新</button></td>
<td><button onclick="startEdit('${d.id}','${d.main}','${d.package}','${d.sub}','${d.name}','${d.work}','${d.place}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}')">編集</button></td>
<td><button onclick="remove('${d.id}')">削除</button></td>
</tr>`;
  });

  list.innerHTML = html;
};



window.importCSV = async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("ファイル選択して");

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  const headers = lines[0].split(",");

  let maxNo = 0;
  lastSnapshot.forEach(d => {
    if (d.no && d.no > maxNo) maxNo = d.no;
  });

  let count = 0;

  for (let i = 1; i < lines.length; i++){

    const values = parseCSVLine(lines[i]);

    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = values[j] || "";
    });

    // 🔥 ここログ確認
    console.log(obj);

    const data = {
      no: ++maxNo,

      main: Number(obj.main),
      package: obj.package,
      sub: obj.sub,
      name: obj.name,
      work: obj.work,

      // 🔥 修正（ここ重要）
      place: obj.place,

      url: obj.url,
      fav: Number(obj.fav) || 0,
      ratingCount: Number(obj.ratingCount) || 0,
      siteRating: Number(obj.siteRating) || 0,
      date: new Date().toLocaleDateString()
    };

    // 🔥 念のためチェック
    if (!data.name || !data.work){
      console.log("スキップ:", obj);
      continue;
    }

    await addDoc(colRef, data);
    count++;

    await new Promise(r => setTimeout(r, 30));
  }

  alert(`CSV取り込み完了：${count}件`);
};
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++){
    const char = line[i];

    if (char === '"'){
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes){
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
