import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= Firebase =================
const app = initializeApp({
  apiKey: "AIzaSyDJmfV7Vow1e_VjOv06h-n27fWB5KK1l4o",
  authDomain: "search-management-date.firebaseapp.com",
  projectId: "search-management-date",
});

const db = getFirestore(app);
const colRef = collection(db, "items");

// ================= 状態 =================
let lastSnapshot = [];
let editId = null;

let columnMode = false;

let currentSort = "no";
let sortAsc = true;

// ================= 列定義（超重要） =================
const columns = [
  "no","main","package","sub","name","work",
  "place","url","fav","ratingCount","siteRating","date"
];

// ================= Firestore =================
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  render();
});

// ================= 保存 =================
window.addItem = async () => {
  const v = id => document.getElementById(id).value;

  const data = {
    no: 0,
    main: Number(v("main")),
    package: v("package"),
    sub: v("sub"),
    name: v("name"),
    work: v("work"),
    place: v("place"),
    url: v("url"),
    fav: Number(v("fav")) || 0,
    ratingCount: Number(v("ratingCount")) || 0,
    siteRating: Number(v("siteRating")) || 0,
    date: new Date().toLocaleDateString()
  };

  if (!data.name || !data.work) return alert("必須");

  if (editId) {
    await updateDoc(doc(db,"items",editId), data);
  } else {
    await addDoc(colRef, data);
  }

  document.querySelectorAll("#modal input").forEach(i => i.value = "");
  closeModal();
};

// ================= 削除 =================
window.remove = async id => {
  if (!confirm("削除？")) return;
  await deleteDoc(doc(db,"items",id));
};

// ================= 編集 =================
window.startEdit = (id,...vals) => {
  openModal();
  const keys = ["main","package","sub","name","work","place","url","fav","ratingCount","siteRating"];
  keys.forEach((k,i)=>document.getElementById(k).value = vals[i]||"");
  editId = id;
};

// ================= 描画 =================
window.render = function(){

  const keyword = document.getElementById("search").value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    Object.values(d).some(v =>
      String(v).toLowerCase().includes(keyword)
    )
  );

 // ===== ソート =====
data = data.sort((a, b) => {

  // =========================
  // 👤 名前：出現回数ソート（多い順）
  // =========================
  if (currentSort === "name") {

    // 出現回数カウント
    const nameCount = {};
    data.forEach(d => {
      const n = d.name || "";
      nameCount[n] = (nameCount[n] || 0) + 1;
    });

    const countA = nameCount[a.name || ""] || 0;
    const countB = nameCount[b.name || ""] || 0;

    // 🔥 多い順が基本
    if (countA !== countB) {
      return sortAsc
        ? countB - countA   // 多い→少ない
        : countA - countB;  // 少ない→多い
    }

    // 同じ件数なら名前順
    return sortAsc
      ? String(a.name).localeCompare(String(b.name), "ja", { numeric: true })
      : String(b.name).localeCompare(String(a.name), "ja", { numeric: true });
  }

  // =========================
  // 通常ソート
  // =========================
  let A = a[currentSort] ?? "";
  let B = b[currentSort] ?? "";

  const numA = Number(A);
  const numB = Number(B);
  const isNum = !isNaN(numA) && !isNaN(numB);

  if (isNum) {
    return sortAsc ? numA - numB : numB - numA;
  }

  if (currentSort === "date") {
    return sortAsc
      ? new Date(A) - new Date(B)
      : new Date(B) - new Date(A);
  }

  return sortAsc
    ? String(A).localeCompare(String(B), "ja", { numeric: true })
    : String(B).localeCompare(String(A), "ja", { numeric: true });
});
  document.getElementById("resultCount").textContent = `${data.length}件`;

  let html = "";

  data.forEach(d=>{
    html += `
<tr>
<td>${d.no ?? "-"}</td>
<td>${d.main}</td>
<td>${d.package||""}</td>
<td>${d.sub}</td>
<td>${d.name}</td>
<td>${d.work}</td>
<td>${d.place||"-"}</td>
<td>${d.url ? "🔗" : "-"}</td>
<td>${d.fav}</td>
<td>${d.ratingCount}</td>
<td>${d.siteRating}</td>
<td>${d.date}</td>

<td><button onclick="updateDate('${d.id}')">更新</button></td>
<td><button onclick="startEdit('${d.id}','${d.main}','${d.package}','${d.sub}','${d.name}','${d.work}','${d.place}','${d.url}','${d.fav}','${d.ratingCount}','${d.siteRating}')">編集</button></td>
<td><button onclick="remove('${d.id}')">削除</button></td>
</tr>`;
  });

  document.getElementById("list").innerHTML = html;
};

// ================= ソート =================
window.sortBy = (key)=>{
  if(currentSort === key) sortAsc = !sortAsc;
  else { currentSort = key; sortAsc = true; }
  render();
};

// ================= モーダル =================
window.openModal = ()=>document.getElementById("modal").style.display="block";
window.closeModal = ()=>document.getElementById("modal").style.display="none";

window.openColumnModal = ()=>document.getElementById("columnModal").style.display="block";
window.closeColumnModal = ()=>document.getElementById("columnModal").style.display="none";

// ================= 列表示 =================
window.toggleDetails = ()=>{ columnMode = !columnMode; };

// ================= 全削除 =================
window.resetAll = async ()=>{
  if(!confirm("全削除？")) return;
  const snap = await getDocs(colRef);
  snap.forEach(d=>deleteDoc(doc(db,"items",d.id)));
};
// ================= ファイルの取り込み =================
window.importCSV = async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("ファイル選択してください");

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  const headers = lines[0].split(",");

  let maxNo = 0;
  lastSnapshot.forEach(d => {
    if (d.no > maxNo) maxNo = d.no;
  });

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");

    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = values[j];
    });

    const data = {
      no: Number(obj.no) || ++maxNo,
      main: Number(obj.main),
      package: obj.package || "",
      sub: obj.sub || "",
      name: obj.name,
      work: obj.work,
      place: obj.place || "",
      url: obj.url || "",
      fav: Number(obj.fav) || 0,
      ratingCount: Number(obj.ratingCount) || 0,
      siteRating: Number(obj.siteRating) || 0,
      date: new Date().toLocaleDateString()
    };

    if (!data.name || !data.work) continue;

    await addDoc(colRef, data);
  }

  alert("CSV取込完了");
};
document.getElementById("csvBtn").addEventListener("click", importCSV);
