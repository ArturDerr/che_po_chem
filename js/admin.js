import {
  auth,
  addProduct, updateProduct, deleteProduct, getProducts,
  filesToBase64,
  showToast, esc,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "./firebase.js";

let products = [];
let editingId = null;
let pendingFiles = [];  // File objects waiting to be compressed
let existingImages = []; // base64 strings already saved (when editing)

// ---------- AUTH ----------
onAuthStateChanged(auth, user => {
  document.getElementById("loginSection").style.display = user ? "none" : "flex";
  document.getElementById("adminSection").style.display = user ? "block" : "none";
  if (user) loadProducts();
});

document.getElementById("loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.style.display = "none";
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch {
    errEl.textContent = "Неверный email или пароль";
    errEl.style.display = "block";
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", () => signOut(auth));

// ---------- LOAD ----------
async function loadProducts() {
  document.getElementById("productList").innerHTML =
    `<div class="text-sm text-gray-400 py-4 text-center animate-pulse">Загрузка...</div>`;
  products = await getProducts();
  renderProductList();
}

function renderProductList() {
  const list = document.getElementById("productList");
  if (!products.length) {
    list.innerHTML = `<div class="text-sm text-gray-400 py-8 text-center">Товаров пока нет</div>`;
    return;
  }
  list.innerHTML = products.map(p => {
    const img = p.images?.[0]
      ? `<img src="${p.images[0]}" class="w-44 h-40 object-cover bg-gray-100 rounded flex-shrink-0">`
      : `<div class="w-14 h-20 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center text-gray-300 text-[10px]">нет</div>`;
    const sold = p.status === "продано";
    return `
<div class="flex items-center gap-4 rounded p-0 mb-2">
  ${img}
  <div class="flex-1 min-w-0">
    <div class="font-bold text-sm truncate">${esc(p.name)}</div>
    <div class="text-xs text-gray-400 mt-0.5">${esc(p.category)} / ${esc(p.priceLabel || p.price + " Р/шт.")} / <span class="${sold ? 'text-red-400' : 'text-green-500'}">${esc(p.status || "актуально")}</span></div>
    <div class="text-xs text-gray-400">${esc(p.type || "")} ${p.location ? '· ' + esc(p.location) : ''}</div>
  </div>
  <div class="flex gap-2 flex-shrink-0">
    <button onclick="startEdit('${p.id}')" class="text-[11px] font-semibold px-3 py-1.5 hover:bg-black hover:text-white transition-colors rounded-sm">Ред.</button>
    <button onclick="removeProduct('${p.id}')" class="text-[11px] font-semibold text-black px-3 py-1.5 hover:opacity-80 transition-opacity rounded-sm">Уд.</button>
  </div>
</div>`;
  }).join("");
}

// ---------- FORM SUBMIT ----------
const form = document.getElementById("productForm");

form?.addEventListener("submit", async e => {
  e.preventDefault();
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.textContent = "Сохранение...";
  submitBtn.disabled = true;

  try {
    const data = {
      name: v("fName"),
      category: v("fCategory"),
      type: v("fType"),
      price: Number(v("fPrice")) || 0,
      priceLabel: v("fPrice") ? v("fPrice") + " Р/шт." : "",
      status: v("fStatus"),
      location: v("fLocation"),
      condition: v("fCondition"),
      quantity: Number(v("fQuantity")) || 0,
      description: v("fDescription"),
      characteristics: v("fChars").split("\n").map(s => s.trim()).filter(Boolean),
      extraInfo: v("fExtra"),
    };

    // Convert new files to base64 (filter out nulls from removed previews)
    const filesToProcess = pendingFiles.filter(Boolean);
    let newBase64 = [];
    if (filesToProcess.length) {
      showToast("Сжимаю фото...");
      newBase64 = await filesToBase64(filesToProcess);
    }

    // Merge with existing images (when editing)
    data.images = [...existingImages, ...newBase64];

    // Firestore can't handle >1MB per doc.
    // Warn if too many/big images (base64 string lengths)
    const totalSize = data.images.reduce((s, b) => s + b.length, 0);
    if (totalSize > 900_000) {
      showToast("⚠️ Слишком много фото — уменьши количество или размер");
      submitBtn.textContent = editingId ? "Сохранить изменения" : "Добавить товар";
      submitBtn.disabled = false;
      return;
    }

    if (editingId) {
      await updateProduct(editingId, data);
    } else {
      await addProduct(data);
    }

    showToast(editingId ? "Товар обновлён ✓" : "Товар добавлен ✓");
    resetForm();
    await loadProducts();
  } catch (err) {
    console.error(err);
    showToast("Ошибка: " + err.message);
  } finally {
    submitBtn.textContent = editingId ? "Сохранить изменения" : "Добавить товар";
    submitBtn.disabled = false;
  }
});

function v(id) { return document.getElementById(id)?.value?.trim() || ""; }

function resetForm() {
  form.reset();
  editingId = null;
  pendingFiles = [];
  existingImages = [];
  document.getElementById("previewList").innerHTML = "";
  document.getElementById("formTitle").textContent = "Добавить товар";
  document.getElementById("submitBtn").textContent = "Добавить товар";
  document.getElementById("cancelEdit").style.display = "none";
}

// ---------- EDIT ----------
window.startEdit = function (id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  editingId = id;
  existingImages = p.images ? [...p.images] : [];
  pendingFiles = [];

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal("fName", p.name || "");
  setVal("fCategory", p.category || "");
  setVal("fType", p.type || "");
  setVal("fPrice", p.price || "");
  setVal("fStatus", p.status || "актуально");
  setVal("fLocation", p.location || "");
  setVal("fCondition", p.condition || "");
  setVal("fQuantity", p.quantity || "");
  setVal("fDescription", p.description || "");
  setVal("fChars", (p.characteristics || []).join("\n"));
  setVal("fExtra", p.extraInfo || "");

  const formTitle = document.getElementById("formTitle");
  if (formTitle) formTitle.textContent = "Редактировать товар";
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.textContent = "Сохранить изменения";
  const cancelEdit = document.getElementById("cancelEdit");
  if (cancelEdit) cancelEdit.style.display = "inline-block";

  // Show existing image previews with remove buttons
  const preview = document.getElementById("previewList");
  preview.innerHTML = existingImages.map((src, i) => `
    <div class="relative w-20 h-24 flex-shrink-0">
      <img src="${src}" class="w-full h-full object-cover rounded-sm">
      <button type="button" onclick="removeExistingImage(${i})"
        class="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center text-xs leading-none">&times;</button>
    </div>`).join("");

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.removeExistingImage = function (index) {
  existingImages.splice(index, 1);
  // re-render previews
  const preview = document.getElementById("previewList");
  const existingDivs = [...preview.children].filter(el => !el.dataset.pending);
  existingDivs[index]?.remove();
  // rebuild all existing previews cleanly
  const pending = [...preview.querySelectorAll("[data-pending]")];
  preview.innerHTML = existingImages.map((src, i) => `
    <div class="relative w-20 h-24 flex-shrink-0">
      <img src="${src}" class="w-full h-full object-cover rounded-sm">
      <button type="button" onclick="removeExistingImage(${i})"
        class="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center text-xs leading-none">&times;</button>
    </div>`).join("");
  pending.forEach(el => preview.appendChild(el));
};

window.removeProduct = async function (id) {
  if (!confirm("Удалить товар?")) return;
  await deleteProduct(id);
  showToast("Товар удалён");
  await loadProducts();
};

document.getElementById("cancelEdit")?.addEventListener("click", resetForm);

// ---------- IMAGE UPLOAD (client-side, no Storage) ----------
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const previewList = document.getElementById("previewList");

uploadArea?.addEventListener("click", () => fileInput?.click());
uploadArea?.addEventListener("dragover", e => { e.preventDefault(); uploadArea.classList.add("border-black"); });
uploadArea?.addEventListener("dragleave", () => uploadArea.classList.remove("border-black"));
uploadArea?.addEventListener("drop", e => {
  e.preventDefault();
  uploadArea.classList.remove("border-black");
  handleFiles([...e.dataTransfer.files]);
});
fileInput?.addEventListener("change", () => { handleFiles([...fileInput.files]); fileInput.value = ""; });

function handleFiles(files) {
  files = files.filter(f => f.type.startsWith("image/"));
  if (!files.length) return;

  files.forEach(file => {
    pendingFiles.push(file);
    const idx = pendingFiles.length - 1;

    // Show preview immediately via FileReader
    const reader = new FileReader();
    reader.onload = ev => {
      const div = document.createElement("div");
      div.className = "relative w-20 h-24 flex-shrink-0";
      div.dataset.pending = idx;
      div.innerHTML = `
        <img src="${ev.target.result}" class="w-full h-full object-cover rounded-sm">
        <button type="button" onclick="removePendingImage(this, ${idx})"
          class="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center text-xs leading-none">&times;</button>
        <div class="absolute inset-0 bg-white/50 flex items-center justify-center text-[10px] text-gray-500 font-semibold">сжатие...</div>`;
      previewList.appendChild(div);

      // Show real compressed size estimate
      // (actual compression happens on save, preview is just original for speed)
      setTimeout(() => {
        const overlay = div.querySelector(".absolute.inset-0");
        if (overlay) overlay.remove();
      }, 400);
    };
    reader.readAsDataURL(file);
  });
}

window.removePendingImage = function (btn, idx) {
  pendingFiles[idx] = null; // null out (filter on save)
  btn.closest("[data-pending]").remove();
};

