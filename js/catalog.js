import { getProducts, showToast, esc, getPriceUnit, formatPrice } from "./firebase.js";

let allProducts = [];
let filtered = [];
let sortMode = "new";

const filters = {
  search: "",
  type: "",
  priceRanges: [],
  condition: "",
  location: "",
  quantity: "",
};

const grid = document.getElementById("productGrid");

async function init() {
  renderSkeletons(9);
  try {
    allProducts = await getProducts();
    filtered = [...allProducts];
    renderGrid(filtered);
    populateSelects();
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div class="col-span-3 py-24 text-center text-gray-400 font-manrope text-sm">Ошибка загрузки товаров</div>`;
  }
}

function populateSelects() {
  const existingTypes = [
    ...document.querySelectorAll("#typeSelect option"),
  ].map((o) => o.value.toLowerCase());
  const dbTypes = [...new Set(allProducts.map((p) => p.type).filter(Boolean))];
  const typeEl = document.getElementById("typeSelect");
  dbTypes.forEach((t) => {
    if (!existingTypes.includes(t.toLowerCase())) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      typeEl?.appendChild(opt);
    }
  });
  fill(
    "conditionSelect",
    [...new Set(allProducts.map((p) => p.condition).filter(Boolean))],
    "Любое",
  );
  fill(
    "locationSelect",
    [...new Set(allProducts.map((p) => p.location).filter(Boolean))],
    "Любая",
  );
  fill("quantitySelect", ["до 50 шт", "50–200 шт", "200+ шт"], "Любое");
}

function fill(id, opts, placeholder) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML =
    `<option value="">${placeholder}</option>` +
    opts.map((o) => `<option value="${o}">${o}</option>`).join("");
}

function renderGrid(products) {
  if (!products.length) {
    grid.innerHTML = `<div class="col-span-3 py-24 text-center text-gray-400 font-manrope text-sm">Товары не найдены</div>`;
    return;
  }
  grid.innerHTML = products.map((p, i) => cardHTML(p, i)).join("");

  grid.querySelectorAll("[data-card]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-cart]")) return;
      const p = allProducts.find(x => x.id === card.dataset.card);
      if (p?.status === "продано") return;
      window.location.href = `product.html?id=${card.dataset.card}`;
    });
  });

  grid.querySelectorAll("[data-cart]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.cart;
      const p = allProducts.find(x => x.id === id);
      if (!p || p.status === "продано") return;
      const name = p.name || "";
      const price = formatPrice(p);
      const qty = p.quantity ? `, кол-во: ${p.quantity} шт.` : "";
      const cond = p.condition ? `, состояние: ${p.condition}` : "";
      const msg = encodeURIComponent(`Здравствуйте! Меня интересует товар: ${name}${price ? " (цена: " + price + ")" : ""}${qty}${cond}. Хочу узнать подробнее об оптовых условиях. Увидел(а) на сайте #ЧЁпоЧЁМ.`);
      window.open(`https://t.me/ChePo4em_1?text=${msg}`, "_blank");
    });
  });
}

function cardHTML(p, i) {
  const sold = p.status === "продано";
  const img = p.images?.[0];
  const delay = (i % 9) * 50;

  const badge = sold
    ? `<span class="text-[13px] font-regular uppercase px-2 py-2 bg-gray-400 text-white">Продано</span>`
    : `<span class="text-[13px] font-regular uppercase px-2 py-2 bg-[#FF6B00] text-white">Актуально</span>`;

  const locBadge = p.location
    ? `<span class="text-[13px] font-regular uppercase px-2 py-2 bg-[#3B3BFF] text-white">${esc(p.location)}</span>`
    : "";

  const imgEl = img
    ? `<img src="${esc(img)}" alt="${esc(p.name)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">`
    : `<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d1d1" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`;

  const cartIcon = `<img src="cart.svg" alt="купить" class="w-[20px] h-[20px]${sold ? " opacity-50" : ""}">`;

  const priceStr = formatPrice(p);
  const productType = p.type || p.category || "одежда";

  return `
<div data-card="${p.id}" class="group bg-white flex flex-col ${sold ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}" style="animation: fadeIn 0.4s ${delay}ms both">
  <div class="relative bg-gray-100 aspect-[3/4] overflow-hidden">
    ${sold ? `<div class="absolute inset-0 bg-white/40 z-10"></div>` : ""}
    ${imgEl}
    <div class="absolute top-2.5 left-2.5 flex gap-1 z-20">${badge}${locBadge}</div>
  </div>
  <div class="flex items-start justify-between gap-2 pt-2">
    <div class="flex flex-col">
      <div class="text-[13px] lowercase text-gray-400">${esc(productType)}</div>
      <div class="text-[14px] sm:text-[16px] font-bold mb-1 leading-snug">${esc(p.name)}</div>
      <div class="text-[16px] font-semibold">${esc(priceStr)}</div>
    </div>
    <button data-cart="${p.id}" ${sold ? "disabled" : ""}
      class="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${sold ? "bg-gray-400 cursor-not-allowed" : "bg-black"}"
      aria-label="Купить оптом">
      ${cartIcon}
    </button>
  </div>
</div>`;
}

function renderSkeletons(n) {
  grid.innerHTML = Array.from({ length: n })
    .map(
      () => `
<div class="bg-white flex flex-col animate-pulse">
  <div class="bg-gray-100 aspect-[3/4]"></div>
  <div class="px-3 py-3 space-y-2">
    <div class="h-2 bg-gray-100 rounded w-1/3"></div>
    <div class="h-4 bg-gray-100 rounded w-2/3"></div>
    <div class="h-3 bg-gray-100 rounded w-1/2"></div>
  </div>
</div>`,
    )
    .join("");
}

function applyFilters() {
  filtered = allProducts.filter((p) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchCat = p.category?.toLowerCase().includes(q);
      const matchType = p.type?.toLowerCase().includes(q);
      const matchLoc = p.location?.toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchType && !matchLoc) return false;
    }
    if (filters.type && p.type !== filters.type) return false;
    if (filters.priceRanges.length) {
      let unitPrice = Number(p.price) || 0;
      if (getPriceUnit(p) === "лот" && p.quantity && Number(p.quantity) > 0) {
        unitPrice = unitPrice / Number(p.quantity);
      }
      if (
        !filters.priceRanges.some((r) => {
          if (r === "under100") return unitPrice < 100;
          if (r === "100to500") return unitPrice >= 100 && unitPrice <= 500;
          if (r === "over500") return unitPrice > 500;
          return true;
        })
      )
        return false;
    }
    if (filters.condition && p.condition !== filters.condition) return false;
    if (filters.location && p.location !== filters.location) return false;
    if (filters.quantity) {
      const qty = Number(p.quantity) || 0;
      if (filters.quantity === "до 50 шт" && qty >= 50) return false;
      if (filters.quantity === "50–200 шт" && (qty < 50 || qty > 200))
        return false;
      if (filters.quantity === "200+ шт" && qty <= 200) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortMode === "cheap")
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortMode === "expensive")
      return (Number(b.price) || 0) - (Number(a.price) || 0);
    const da = a.createdAt?.seconds || 0,
      db = b.createdAt?.seconds || 0;
    return sortMode === "old" ? da - db : db - da;
  });
  renderGrid(filtered);
}

function resetFilters() {
  filters.type = filters.condition = filters.location = filters.quantity = "";
  filters.priceRanges = [];
  ["typeSelect", "conditionSelect", "locationSelect", "quantitySelect"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    },
  );
  document.querySelectorAll(".price-cb").forEach((cb) => (cb.checked = false));
  applyFilters();
}

function initAccordions() {
  document.querySelectorAll("[data-filter-trigger]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest("[data-filter-item]");
      const isOpen = item.dataset.open === "true";
      document.querySelectorAll("[data-filter-item]").forEach((i) => {
        i.dataset.open = "false";
        updateAccordion(i);
      });
      if (!isOpen) {
        item.dataset.open = "true";
        updateAccordion(item);
      }
    });
  });
}

function updateAccordion(item) {
  const open = item.dataset.open === "true";
  const content = item.querySelector("[data-filter-content]");
  const chevron = item.querySelector("[data-chevron]");
  if (content) content.style.display = open ? "block" : "none";
  if (chevron)
    chevron.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
}

function initSearch() {
  const wrap = document.getElementById("headerSearchWrap");
  const box = document.getElementById("headerSearchBox");
  const btn = document.getElementById("searchBtn");
  const input = document.getElementById("mainSearchInput");
  const closeBtn = document.getElementById("searchClose");
  const results = document.getElementById("searchResults");

  let isOpen = false;

  function open() {
    isOpen = true;
    box.style.width = window.innerWidth < 640 ? "min(220px, calc(100vw - 120px))" : "320px";
    closeBtn?.classList.remove("hidden");
    input?.focus();
  }

  function close() {
    isOpen = false;
    box.style.width = "32px";
    closeBtn?.classList.add("hidden");
    if (input) input.value = "";
    if (results) {
      results.classList.add("hidden");
      results.innerHTML = "";
    }
    if (filters.search) {
      filters.search = "";
      applyFilters();
    }
  }

  btn?.addEventListener("click", () => {
    if (!isOpen) open();
  });

  closeBtn?.addEventListener("click", close);

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  document.addEventListener("click", (e) => {
    if (isOpen && !wrap?.contains(e.target) && !input?.value.trim()) close();
  });

  input?.addEventListener("input", debounce(() => {
    filters.search = input.value.trim().toLowerCase();
    if (results) {
      results.classList.add("hidden");
      results.innerHTML = "";
    }
    applyFilters();
  }, 200));
}

function bindControls() {
  document
    .getElementById("typeSelect")
    ?.addEventListener("change", (e) => (filters.type = e.target.value));
  document
    .getElementById("conditionSelect")
    ?.addEventListener("change", (e) => (filters.condition = e.target.value));
  document
    .getElementById("locationSelect")
    ?.addEventListener("change", (e) => (filters.location = e.target.value));
  document
    .getElementById("quantitySelect")
    ?.addEventListener("change", (e) => (filters.quantity = e.target.value));
  document.querySelectorAll(".price-cb").forEach((cb) => {
    cb.addEventListener(
      "change",
      () =>
      (filters.priceRanges = [
        ...document.querySelectorAll(".price-cb:checked"),
      ].map((c) => c.value)),
    );
  });
  document
    .getElementById("applyFilters")
    ?.addEventListener("click", applyFilters);
  document
    .getElementById("resetFilters")
    ?.addEventListener("click", resetFilters);

  const sortBtn = document.getElementById("sortBtn");
  const sortMenu = document.getElementById("sortMenu");

  sortBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    sortMenu.classList.toggle("hidden");
  });

  document.querySelectorAll(".sort-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      sortMode = btn.dataset.sort;
      document
        .querySelectorAll(".sort-option")
        .forEach((b) => b.classList.remove("bg-gray-100", "font-extrabold"));
      btn.classList.add("bg-gray-100");
      sortMenu.classList.add("hidden");
      applyFilters();
    });
  });

  document.addEventListener("click", (e) => {
    if (!document.getElementById("sortDropdownWrap")?.contains(e.target)) {
      sortMenu?.classList.add("hidden");
    }
  });
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initAccordions();
  initSearch();
  bindControls();
  init();

  const mobileFilterBtn = document.getElementById("mobileFilterBtn");
  const mainSidebar = document.getElementById("mainSidebar");
  mobileFilterBtn?.addEventListener("click", () => {
    if (!mainSidebar) return;
    const isHidden = mainSidebar.classList.contains("hidden");
    mainSidebar.classList.toggle("hidden", !isHidden);
    mainSidebar.classList.toggle("lg:block", isHidden);
    if (isHidden) {
      mainSidebar.classList.remove("hidden");
      mainSidebar.style.display = "block";
    } else {
      mainSidebar.style.display = "";
      mainSidebar.classList.add("hidden");
    }
  });
});
