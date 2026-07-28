import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, updateDoc, getDocs, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= Firebase（既存データと同じ設定・コレクション） =================
const app = initializeApp({
  apiKey: "AIzaSyDJmfV7Vow1e_VjOv06h-n27fWB5KK1l4o",
  authDomain: "search-management-date.firebaseapp.com",
  projectId: "search-management-date",
});

const db = getFirestore(app);
const colRef = collection(db, "items");

// ================= 状態 =================
let lastSnapshot = [];
let loaded = false;
let editId = null;

let columnMode = false;

// ================= 並び替え（多段階ソート） =================
// sortLevels: [{key, asc, group}, ...] 上ほど優先度が高い
// group=true の場合、その値の出現回数でグループ化してから並べる（旧「名前固定」を一般化）
const columnDefs = [
  { key: "no", label: "No" },
  { key: "main", label: "大" },
  { key: "package", label: "パッケージ" },
  { key: "sub", label: "小" },
  { key: "name", label: "名前" },
  { key: "work", label: "作品" },
  { key: "place", label: "部分" },
  { key: "url", label: "URL" },
  { key: "fav", label: "⭐" },
  { key: "ratingCount", label: "評価数" },
  { key: "siteRating", label: "サイト評価" },
  { key: "selfRating", label: "自分評価" },
  { key: "comment", label: "コメント" },
  { key: "date", label: "更新日" },
];

function loadSortLevels(){
  try {
    const v = JSON.parse(localStorage.getItem("sortLevels") || "null");
    if (Array.isArray(v) && v.length) return v;
  } catch (e) { /* ignore */ }
  return [{ key: "no", asc: true, group: false }];
}
function saveSortLevels(){
  localStorage.setItem("sortLevels", JSON.stringify(sortLevels));
}

let sortLevels = loadSortLevels();
let workingLevels = []; // 並び替えモーダル編集中の一時データ
let multiAddMode = false; // ON中は見出しタップで段階追加（スマホ用のShift+クリック代替）

let searchTimer = null;
let confirmResolver = null;

// ================= localStorage（既存キーと互換） =================
function getHiddenCols(){
  return JSON.parse(localStorage.getItem("hiddenCols") || "[]");
}
function saveHiddenCols(v){
  localStorage.setItem("hiddenCols", JSON.stringify(v));
}

// ================= トースト =================
function showToast(message, type = ""){
  const area = document.getElementById("toastArea");
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.textContent = message;
  area.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

// ================= 確認モーダル =================
window.resolveConfirm = (result) => {
  document.getElementById("confirmModal").style.display = "none";
  if (confirmResolver) {
    confirmResolver(result);
    confirmResolver = null;
  }
};

function askConfirm(message, danger = true){
  return new Promise(resolve => {
    document.getElementById("confirmMessage").textContent = message;
    const okBtn = document.getElementById("confirmOkBtn");
    okBtn.className = "chip-btn " + (danger ? "danger" : "accent");
    document.getElementById("confirmModal").style.display = "block";
    confirmResolver = resolve;
  });
}

// ================= Firestore購読 =================
onSnapshot(colRef, snap => {
  lastSnapshot = [];
  snap.forEach(d => lastSnapshot.push({ id: d.id, ...d.data() }));
  loaded = true;
  render();
}, err => {
  showToast("データの読込に失敗しました: " + err.message, "error");
});

// ================= 保存（追加／編集） =================
window.addItem = async () => {
  const v = id => document.getElementById(id).value.trim();

  const mainVal = Number(v("main"));
  const workVal = v("work");

  if (!mainVal || !workVal) {
    showToast("「大分類」と「作品」は必須です", "error");
    return;
  }

  const data = {
    main: mainVal,
    package: v("package"),
    sub: v("sub"),
    name: v("name"),
    work: workVal,
    place: v("place"),
    url: v("url"),
    fav: Number(v("fav")) || 0,
    ratingCount: Number(v("ratingCount")) || 0,
    siteRating: Number(v("siteRating")) || 0,
    selfRating: Number(v("selfRating")) || 0,
    comment: v("comment") || "",
    date: new Date().toLocaleDateString()
  };

  try {
    if (editId) {
      // 編集時はNoを維持
      const existing = lastSnapshot.find(d => d.id === editId);
      if (existing) data.no = existing.no;
      await updateDoc(doc(db, "items", editId), data);
      showToast("更新しました", "success");
    } else {
      // 最新データ取得してmaxNo算出
      const snap = await getDocs(colRef);
      const dataList = snap.docs.map(d => d.data());
      const maxNo = Math.max(...dataList.map(d => d.no || 0), 0);
      data.no = maxNo + 1;
      await addDoc(colRef, data);
      showToast("追加しました", "success");
    }
    closeModal();
  } catch (err) {
    showToast("保存に失敗しました: " + err.message, "error");
  }
};

// ================= 削除 =================
window.remove = async id => {
  const ok = await askConfirm("この項目を削除しますか？この操作は取り消せません。");
  if (!ok) return;

  const target = lastSnapshot.find(d => d.id === id);
  if (!target) return;
  const deletedNo = target.no;

  try {
    await deleteDoc(doc(db, "items", id));

    // 削除後のNo詰め直し
    const snap = await getDocs(colRef);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const batch = writeBatch(db);

    data.forEach(d => {
      if (d.no > deletedNo) {
        batch.update(doc(db, "items", d.id), { no: d.no - 1 });
      }
    });

    await batch.commit();
    showToast("削除しました", "success");
  } catch (err) {
    showToast("削除に失敗しました: " + err.message, "error");
  }
};

// ================= 編集 =================
window.startEdit = (id, ...vals) => {
  openModal(true);
  const keys = ["main","package","sub","name","work","place","url","fav","ratingCount","siteRating","selfRating","comment"];
  keys.forEach((k, i) => {
    document.getElementById(k).value = vals[i] || "";
  });
  editId = id;
};

// ================= 評価バッジ =================
function rateBadge(val){
  const n = Number(val) || 0;
  const cls = n === 0 ? "rate-badge zero" : "rate-badge";
  return `<span class="${cls}">${n}</span>`;
}

function escapeAttr(v){
  return String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, " ");
}
function escapeHtml(v){
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ================= 検索（デバウンス） =================
window.onSearchInput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 180);
};

// ================= 描画 =================
window.render = function(){

  const keyword = document.getElementById("search").value.toLowerCase();

  let data = lastSnapshot.filter(d =>
    Object.values(d).some(v =>
      String(v).toLowerCase().includes(keyword)
    )
  );

  // 並び替え（多段階）
  data = data.sort(multiCompare);

  document.getElementById("resultCount").textContent = loaded ? `${data.length}件` : "";

  const list = document.getElementById("list");

  if (!loaded) {
    list.innerHTML = `<tr class="state-row"><td colspan="16">読み込み中…</td></tr>`;
    updateSortIndicators();
    return;
  }

  if (data.length === 0) {
    list.innerHTML = `<tr class="state-row"><td colspan="16">${
      lastSnapshot.length === 0 ? "まだ作品が登録されていません。「＋追加」から登録できます。" : "条件に一致する項目がありません。"
    }</td></tr>`;
    applyColumnVisibility();
    updateSortIndicators();
    return;
  }

  let html = "";
  data.forEach(d => {
    html += `
<tr>
<td>${d.no ?? "-"}</td>
<td>${escapeHtml(d.main)}</td>
<td>${escapeHtml(d.package || "")}</td>
<td>${escapeHtml(d.sub)}</td>
<td class="name-cell" onclick="toggleName(this)">${escapeHtml(d.name || "")}</td>
<td class="work-cell" onclick="toggleWork(this)">${escapeHtml(d.work)}</td>
<td>${escapeHtml(d.place || "-")}</td>
<td>${d.url ? `<a class="link-btn" href="${escapeAttr(d.url)}" target="_blank" rel="noopener">🔗</a>` : "-"}</td>
<td>${rateBadge(d.fav)}</td>
<td>${rateBadge(d.ratingCount)}</td>
<td>${rateBadge(d.siteRating)}</td>
<td>${rateBadge(d.selfRating)}</td>
<td class="comment-cell" onclick="toggleComment(this)">${escapeHtml(d.comment ?? "")}</td>
<td>${escapeHtml(d.date)}</td>
<td><button class="row-btn" onclick="startEdit('${d.id}','${escapeAttr(d.main)}','${escapeAttr(d.package)}','${escapeAttr(d.sub)}','${escapeAttr(d.name)}','${escapeAttr(d.work)}','${escapeAttr(d.place)}','${escapeAttr(d.url)}','${escapeAttr(d.fav)}','${escapeAttr(d.ratingCount)}','${escapeAttr(d.siteRating)}','${escapeAttr(d.selfRating)}','${escapeAttr(d.comment)}')">編集</button></td>
<td><button class="row-btn danger" onclick="remove('${d.id}')">削除</button></td>
</tr>`;
  });

  list.innerHTML = html;

  // 触れた行をハイライト
  document.querySelectorAll("#list tr").forEach(row => {
    row.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON" || e.target.tagName === "A") return;
      document.querySelectorAll("#list tr").forEach(r => r.classList.remove("active-row"));
      row.classList.add("active-row");
    });
  });

  applyColumnVisibility();
  updateSortIndicators();
};

// ================= 値の比較（数値／日付／文字列を自動判定） =================
function compareValues(A, B, key, asc){
  const numA = Number(A);
  const numB = Number(B);
  const isNum = !isNaN(numA) && !isNaN(numB);

  if (isNum) return asc ? numA - numB : numB - numA;

  if (key === "date") {
    return asc ? new Date(A) - new Date(B) : new Date(B) - new Date(A);
  }

  return asc
    ? String(A).localeCompare(String(B), "ja", { numeric: true })
    : String(B).localeCompare(String(A), "ja", { numeric: true });
}

// ================= 1つの並び替え条件で比較 =================
function levelCompare(a, b, level){
  if (level.group) {
    // 値の出現回数でグループ化（例：同じ「名前」をまとめる）
    const countMap = {};
    lastSnapshot.forEach(d => {
      const v = d[level.key] ?? "";
      countMap[v] = (countMap[v] || 0) + 1;
    });

    const va = a[level.key] ?? "";
    const vb = b[level.key] ?? "";
    const countA = countMap[va] || 0;
    const countB = countMap[vb] || 0;

    if (countA !== countB) {
      return level.asc ? countB - countA : countA - countB; // asc=多い順
    }
    // 同じ回数ならグループが崩れないよう値そのもので固定
    return compareValues(va, vb, level.key, true);
  }

  return compareValues(a[level.key] ?? "", b[level.key] ?? "", level.key, level.asc);
}

// ================= 多段階ソート（優先度順に比較） =================
function multiCompare(a, b){
  for (const level of sortLevels) {
    const c = levelCompare(a, b, level);
    if (c !== 0) return c;
  }
  return (a.no ?? 0) - (b.no ?? 0);
}

// ================= ソート表示矢印 =================
function updateSortIndicators(){
  document.querySelectorAll(".sort-indicator").forEach(el => el.textContent = "");

  sortLevels.forEach((level, i) => {
    const el = document.querySelector(`.sort-indicator[data-key="${level.key}"]`);
    if (!el) return;
    const arrow = level.asc ? "▲" : "▼";
    const order = sortLevels.length > 1 ? String(i + 1) : "";
    const groupMark = level.group ? "Ⓖ" : "";
    el.textContent = arrow + order + groupMark;
  });
}

// ================= 段階追加モード（スマホ用） =================
// ONの間は見出しタップが「追加」として扱われる（Shift+クリックと同じ効果）
window.toggleMultiAddMode = () => {
  multiAddMode = !multiAddMode;
  const btn = document.getElementById("multiAddBtn");
  btn.textContent = multiAddMode ? "🔗 段階追加 ON" : "🔗 段階追加";
  btn.classList.toggle("active", multiAddMode);
  showToast(multiAddMode ? "見出しをタップして条件を追加できます" : "通常モードに戻りました");
};

// ================= ヘッダークリックでソート =================
// 通常クリック：その列だけで単独ソート（既存の条件はリセット）
// Shift+クリック：既存の条件を残したまま、この列を段階として追加／切替
window.sortBy = (key, evt) => {
  const shift = !!(evt && evt.shiftKey) || multiAddMode;

  if (!shift) {
    if (sortLevels.length === 1 && sortLevels[0].key === key && !sortLevels[0].group) {
      sortLevels[0].asc = !sortLevels[0].asc;
    } else {
      sortLevels = [{ key, asc: true, group: false }];
    }
  } else {
    const existing = sortLevels.find(l => l.key === key);
    if (existing) {
      existing.asc = !existing.asc;
    } else {
      sortLevels.push({ key, asc: true, group: false });
    }
  }

  saveSortLevels();
  render();
};

// ================= 並び替え設定モーダル =================
window.openSortModal = () => {
  workingLevels = sortLevels.map(l => ({ ...l }));
  renderSortModal();
  document.getElementById("sortModal").style.display = "block";
  lockScroll();
};

window.closeSortModal = () => {
  document.getElementById("sortModal").style.display = "none";
  unlockScroll();
};

window.addSortLevel = () => {
  const usedKeys = workingLevels.map(l => l.key);
  const next = columnDefs.find(c => !usedKeys.includes(c.key)) || columnDefs[0];
  workingLevels.push({ key: next.key, asc: true, group: false });
  renderSortModal();
};

window.removeSortLevel = (i) => {
  workingLevels.splice(i, 1);
  renderSortModal();
};

window.moveSortLevel = (i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= workingLevels.length) return;
  [workingLevels[i], workingLevels[j]] = [workingLevels[j], workingLevels[i]];
  renderSortModal();
};

window.updateSortLevelKey = (i, key) => {
  workingLevels[i].key = key;
};

window.toggleSortLevelDir = (i) => {
  workingLevels[i].asc = !workingLevels[i].asc;
  renderSortModal();
};

window.toggleSortLevelGroup = (i) => {
  workingLevels[i].group = !workingLevels[i].group;
};

window.applySortLevels = () => {
  sortLevels = workingLevels.length
    ? workingLevels.map(l => ({ ...l }))
    : [{ key: "no", asc: true, group: false }];
  saveSortLevels();
  closeSortModal();
  render();
};

function renderSortModal(){
  const container = document.getElementById("sortLevelList");

  if (!workingLevels.length) {
    container.innerHTML = `<p class="empty-hint">条件がありません。「＋ 条件を追加」から作成してください。</p>`;
    return;
  }

  container.innerHTML = workingLevels.map((level, i) => `
    <div class="sort-level-row">
      <span class="sort-level-badge">${i + 1}</span>
      <select onchange="updateSortLevelKey(${i}, this.value)">
        ${columnDefs.map(c => `<option value="${c.key}" ${c.key === level.key ? "selected" : ""}>${c.label}</option>`).join("")}
      </select>
      <button class="chip-btn" onclick="toggleSortLevelDir(${i})">${level.asc ? "▲ 昇順/多い順" : "▼ 降順/少ない順"}</button>
      <label class="sort-group-toggle">
        <input type="checkbox" ${level.group ? "checked" : ""} onchange="toggleSortLevelGroup(${i})"> 件数でグループ化
      </label>
      <div class="sort-level-actions">
        <button class="icon-mini" onclick="moveSortLevel(${i},-1)" ${i === 0 ? "disabled" : ""} title="上へ">↑</button>
        <button class="icon-mini" onclick="moveSortLevel(${i},1)" ${i === workingLevels.length - 1 ? "disabled" : ""} title="下へ">↓</button>
        <button class="icon-mini danger" onclick="removeSortLevel(${i})" title="削除">✕</button>
      </div>
    </div>
  `).join("");
}

// ================= モーダル（追加／編集） =================
window.openModal = (isEdit = false) => {
  if (!isEdit) {
    editId = null;
    document.querySelectorAll("#modal input, #modal textarea").forEach(i => i.value = "");
  }
  document.getElementById("modalTitle").textContent = isEdit ? "作品を編集" : "新しい作品を追加";
  document.getElementById("modal").style.display = "block";
  lockScroll();
};

window.closeModal = () => {
  document.getElementById("modal").style.display = "none";
  editId = null;
  unlockScroll();
};

// ================= 列表示切替 =================
window.toggleDetails = () => {
  columnMode = !columnMode;
  const btn = document.getElementById("viewBtn");
  btn.textContent = columnMode ? "詳細表示" : "全表示";
  btn.classList.toggle("active", columnMode);
  applyColumnVisibility();
};

// ================= 列制御 =================
window.applyColumnVisibility = () => {
  const hidden = getHiddenCols();
  const rows = document.querySelectorAll("table tr");

  rows.forEach(row => {
    [...row.children].forEach((cell, i) => {
      if (!columnMode) {
        cell.style.display = "";
        return;
      }
      if (i === 14 || i === 15) {
        cell.style.display = "none";
        return;
      }
      cell.style.display = hidden.includes(i) ? "none" : "";
    });
  });
};

// ================= 列設定チェック =================
document.addEventListener("change", e => {
  if (!e.target.dataset.col) return;

  let hidden = getHiddenCols();
  const col = Number(e.target.dataset.col);

  if (e.target.checked) {
    hidden = hidden.filter(x => x !== col);
  } else {
    hidden.push(col);
  }

  saveHiddenCols(hidden);
  applyColumnVisibility();
});

function syncCheckbox(){
  const hidden = getHiddenCols();
  document.querySelectorAll("[data-col]").forEach(cb => {
    if (cb.tagName === "INPUT") cb.checked = !hidden.includes(Number(cb.dataset.col));
  });
}

window.setAllColumns = (show) => {
  const boxes = document.querySelectorAll('#columnModal input[data-col]');
  let hidden = getHiddenCols();
  boxes.forEach(cb => {
    cb.checked = show;
    const col = Number(cb.dataset.col);
    hidden = hidden.filter(x => x !== col);
    if (!show) hidden.push(col);
  });
  saveHiddenCols(hidden);
  applyColumnVisibility();
};

window.openColumnModal = () => {
  document.getElementById("columnModal").style.display = "block";
  syncCheckbox();
  lockScroll();
};

window.closeColumnModal = () => {
  document.getElementById("columnModal").style.display = "none";
  unlockScroll();
};

// ================= CSVファイル名表示 =================
window.onCsvFileChange = () => {
  const file = document.getElementById("csvFile").files[0];
  document.getElementById("csvFileName").textContent = file ? file.name : "未選択";
};

// ================= CSV（取込） =================
window.importCSV = async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) { showToast("ファイルを選択してください", "error"); return; }

  const text = await file.text();

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  });

  const snap = await getDocs(colRef);
  let localData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  let maxNo = Math.max(...localData.map(d => d.no || 0), 0);

  let updateCount = 0;
  let addCount = 0;

  for (const row of parsed.data) {

    const mainVal = Number(row.main);
    let subVal = (row.sub || "").trim();

    if (/^=".*"$/.test(subVal)) subVal = subVal.slice(2, -1);
    if (/^\d+\/\d+$/.test(subVal)) subVal = subVal.replace("/", "-");

    if (!mainVal) continue;

    const existing = localData.find(d => {
      const dMain = Number(d.main);
      const dSub = (d.sub || "").trim();
      if (subVal) return dMain === mainVal && dSub === subVal;
      return dMain === mainVal && !dSub;
    });

    let noVal = Number(row.no);
    if (!noVal || isNaN(noVal)) noVal = ++maxNo;

    if (existing) {
      noVal = existing.no;
    } else {
      noVal = noVal || ++maxNo;
    }

    const isChanged = existing && (
      (existing.package || "") !== (row.package || "") ||
      (existing.name || "") !== (row.name || "") ||
      (existing.work || "") !== (row.work || "") ||
      (existing.place || "") !== (row.place || "") ||
      (existing.url || "") !== (row.url || "") ||
      Number(existing.fav || 0) !== Number(row.fav || 0) ||
      Number(existing.ratingCount || 0) !== Number(row.ratingCount || 0) ||
      Number(existing.siteRating || 0) !== Number(row.siteRating || 0) ||
      Number(existing.selfRating || 0) !== Number(row.selfRating || 0) ||
      (existing.comment || "") !== (row.comment || "")
    );

    const data = {
      no: noVal,
      main: mainVal,
      package: row.package || "",
      sub: subVal,
      name: row.name,
      work: row.work,
      place: row.place || "",
      url: row.url || "",
      fav: Number(row.fav) || 0,
      ratingCount: Number(row.ratingCount) || 0,
      siteRating: Number(row.siteRating) || 0,
      selfRating: Number(row.selfRating) || 0,
      comment: row.comment || "",
      date: isChanged ? new Date().toLocaleDateString() : (existing?.date || "")
    };

    if (existing) {
      await updateDoc(doc(db, "items", existing.id), data);
      if (isChanged) updateCount++;
      Object.assign(existing, data);
    } else {
      const docRef = await addDoc(colRef, data);
      addCount++;
      localData.push({ id: docRef.id, ...data });
    }
  }

  showToast(`CSV取込が完了しました\n追加: ${addCount}件 / 更新: ${updateCount}件`, "success");
  document.getElementById("csvFile").value = "";
  document.getElementById("csvFileName").textContent = "未選択";
};

// ================= CSV（出力） =================
window.exportCSV = async () => {
  let data = [...lastSnapshot];

  if (data.length === 0) { showToast("データがありません", "error"); return; }

  data = data.sort(multiCompare);

  const headers = [
    "no","main","package","sub","name","work",
    "place","url","fav","ratingCount","siteRating","selfRating","comment"
  ];

  const csvBody = [
    headers.join(","),
    ...data.map(row =>
      headers.map(h => {
        let val = row[h];
        if (val === undefined || val === null) val = "";
        if (typeof val === "number") return val;

        val = String(val).replace(/"/g, '""');

        if (h === "sub") return `="${val}"`;
        if (h === "name") return `"${val}"`;
        return val;
      }).join(",")
    )
  ].join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvBody], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "export.csv";
  a.click();
  URL.revokeObjectURL(url);

  showToast("CSVを出力しました", "success");
};

// ================= 全削除 =================
window.resetAll = async () => {
  const ok = await askConfirm("全てのデータを削除します。この操作は取り消せません。本当によろしいですか？");
  if (!ok) return;

  try {
    const snap = await getDocs(colRef);
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "items", d.id))));
    showToast("全てのデータを削除しました", "success");
  } catch (err) {
    showToast("削除に失敗しました: " + err.message, "error");
  }
};

// ================= セル展開 =================
window.toggleName = (el) => el.classList.toggle("expanded");
window.toggleComment = (el) => el.classList.toggle("expanded");
window.toggleWork = (el) => el.classList.toggle("expanded");

// ================= 管理メニュー =================
window.toggleManage = () => {
  const area = document.getElementById("manageArea");
  const isOpen = area.style.display === "block";
  area.style.display = isOpen ? "none" : "block";
};

// ================= スクロールロック =================
function lockScroll(){ document.body.style.overflow = "hidden"; }
function unlockScroll(){ document.body.style.overflow = ""; }
