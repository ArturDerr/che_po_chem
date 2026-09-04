// ============================================
// Firebase Initialization & Shared Helpers
// Images stored as Base64 in Firestore (no Storage needed)
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwMC1-72orSOP0VB-mWbroq00gNp4jpNA",
  authDomain: "opte-ee7a6.firebaseapp.com",
  projectId: "opte-ee7a6",
  storageBucket: "opte-ee7a6.firebasestorage.app",
  messagingSenderId: "880945377353",
  appId: "1:880945377353:web:08c50749177c249ea68f98"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ---- Firestore CRUD ----
async function getProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getProduct(id) {
  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function addProduct(data) {
  const ref = await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

async function updateProduct(id, data) {
  await updateDoc(doc(db, "products", id), data);
}

async function deleteProduct(id) {
  await deleteDoc(doc(db, "products", id));
}

// ---- Image → Base64 (Canvas compress) ----
// Max 900px wide/tall, JPEG 0.72 quality — ~80–150 KB each
function compressImage(file, maxPx = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = ev => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxPx || h > maxPx) {
          if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else        { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Convert array of File objects → array of base64 strings
async function filesToBase64(files) {
  const results = [];
  for (const file of files) {
    const b64 = await compressImage(file);
    results.push(b64);
  }
  return results;
}

// ---- UI Helpers ----
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("opacity-0", "translate-y-2");
  t.classList.add("opacity-100", "translate-y-0");
  setTimeout(() => {
    t.classList.add("opacity-0", "translate-y-2");
    t.classList.remove("opacity-100", "translate-y-0");
  }, 3000);
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export {
  db, auth,
  getProducts, getProduct, addProduct, updateProduct, deleteProduct,
  filesToBase64,
  showToast, esc,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
};
