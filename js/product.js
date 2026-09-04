import { getProduct, getProducts, showToast, esc } from "./firebase.js";

const params = new URLSearchParams(location.search);
const productId = params.get("id");

async function init() {
  if (!productId) { window.location.href = "index.html"; return; }

  const p = await getProduct(productId);
  if (!p) { window.location.href = "index.html"; return; }

  document.title = `${p.name} — #ЧЁпоЧЁМ`;

  // --- Gallery ---
  const thumbStrip = document.getElementById("thumbStrip");
  const slider = document.getElementById("gallerySlider");
  const slideCounter = document.getElementById("slideCounter");
  const slideDots = document.getElementById("slideDots");
  const prevBtn = document.getElementById("prevSlideBtn");
  const nextBtn = document.getElementById("nextSlideBtn");
  const images = p.images?.length ? p.images : [];

  let currentSlide = 0;

  if (images.length) {
    slider.innerHTML = images.map((url, i) => `
      <div class="w-full h-full flex-shrink-0 snap-center flex items-center justify-center bg-gray-100" data-slide="${i}">
        <img src="${esc(url)}" alt="${esc(p.name)} - фото ${i + 1}" class="w-full h-full object-cover">
      </div>
    `).join("");

    if (images.length > 1) {
      if (slideCounter) {
        slideCounter.classList.remove("hidden");
        slideCounter.textContent = `1 / ${images.length}`;
      }
      if (prevBtn) prevBtn.classList.remove("hidden");
      if (nextBtn) nextBtn.classList.remove("hidden");
      if (slideDots) {
        slideDots.classList.remove("hidden");
        slideDots.innerHTML = images.map((_, i) => `
          <button data-dot="${i}" class="h-2 rounded-full transition-all duration-200 ${i === 0 ? 'bg-white w-4' : 'bg-white/50 w-2'}" aria-label="Фото ${i + 1}"></button>
        `).join("");
      }
    }

    thumbStrip.innerHTML = images.map((url, i) => `
      <img src="${esc(url)}" data-idx="${i}" alt="фото ${i + 1}"
        class="thumb w-20 h-24 flex-shrink-0 object-cover cursor-pointer border-2 ${i === 0 ? 'border-black' : 'border-transparent'} bg-gray-100 transition-all duration-200">`
    ).join("");

    const updateActiveUI = (idx) => {
      currentSlide = idx;
      thumbStrip.querySelectorAll(".thumb").forEach((t, i) => {
        if (i === idx) {
          t.classList.replace("border-transparent", "border-black");
          t.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        } else {
          t.classList.replace("border-black", "border-transparent");
        }
      });
      if (slideCounter && images.length > 1) {
        slideCounter.textContent = `${idx + 1} / ${images.length}`;
      }
      if (slideDots) {
        slideDots.querySelectorAll("[data-dot]").forEach((dot, i) => {
          if (i === idx) {
            dot.className = "w-4 h-2 rounded-full bg-white transition-all duration-200";
          } else {
            dot.className = "w-2 h-2 rounded-full bg-white/50 transition-all duration-200";
          }
        });
      }
    };

    const goToSlide = (idx) => {
      if (idx < 0) idx = images.length - 1;
      if (idx >= images.length) idx = 0;
      slider.scrollTo({
        left: slider.offsetWidth * idx,
        behavior: "smooth"
      });
      updateActiveUI(idx);
    };

    prevBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      goToSlide(currentSlide - 1);
    });

    nextBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      goToSlide(currentSlide + 1);
    });

    slideDots?.querySelectorAll("[data-dot]").forEach(dot => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        goToSlide(parseInt(dot.dataset.dot, 10));
      });
    });

    thumbStrip.querySelectorAll(".thumb").forEach(th => {
      th.addEventListener("click", () => {
        goToSlide(parseInt(th.dataset.idx, 10));
      });
    });

    let scrollTimeout;
    slider.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const idx = Math.round(slider.scrollLeft / slider.offsetWidth);
        if (!isNaN(idx) && idx >= 0 && idx < images.length && idx !== currentSlide) {
          updateActiveUI(idx);
        }
      }, 50);
    });
  } else {
    slider.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#d1d1d1" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`;
    thumbStrip.innerHTML = "";
  }

  if (p.status === "продано") {
    const buyBtn = document.getElementById("buyBtn");
    if (buyBtn) {
      buyBtn.textContent = "РАСПРОДАНО";
      buyBtn.classList.remove("bg-black", "hover:opacity-80");
      buyBtn.classList.add("bg-gray-400", "cursor-not-allowed", "pointer-events-none");
    }
  }

  // --- Info ---
  document.getElementById("prodCategory").textContent = p.category || "одежда";
  document.getElementById("prodName").textContent = p.name;
  document.getElementById("prodPrice").textContent = p.price ? p.price + " ₽/шт." : "";
  document.getElementById("prodDescription").textContent = p.description || "";

  // --- Characteristics ---
  const charList = document.getElementById("charList");
  if (p.characteristics?.length) {
    charList.innerHTML = p.characteristics.map(c => `<li class="text-[13px] text-gray-600 leading-relaxed">${esc(c)}</li>`).join("");
  } else {
    charList.innerHTML = `<li class="text-[13px] text-gray-400">Не указано</li>`;
  }

  // --- Extra info ---
  document.getElementById("extraInfo").textContent = p.extraInfo || "Не указано";

  // --- Buy button ---
  const name = p.name || "";
  const category = p.category || "";
  const price = p.price ? p.price + " ₽/шт." : "";
  const msg = encodeURIComponent(
    `Здравствуйте! Меня интересует товар: ${name}` +
    (category ? ` (${category})` : "") +
    (price ? `, цена: ${price}` : "") +
    `. Хочу узнать подробнее об оптовых условиях. Увидел(а) на сайте #ЧЁпоЧЁМ.`
  );
  document.getElementById("buyBtn").href = `https://t.me/ChePo4em_1?text=${msg}`;

  // --- Accordion logic ---
  document.querySelectorAll("[data-acc-trigger]").forEach(btn => {
    const item = btn.closest("[data-acc]");
    const content = item?.querySelector("[data-acc-content]");
    const icon = btn.querySelector("[data-acc-icon]");
    btn.addEventListener("click", () => {
      const open = item.dataset.open === "true";
      item.dataset.open = open ? "false" : "true";
      if (content) content.style.display = open ? "none" : "block";
      if (icon) icon.textContent = open ? "+" : "×";
    });
  });

  // --- Related products ---
  loadRelated(p);
}

async function loadRelated(current) {
  try {
    const all = await getProducts();
    const related = all.filter(p => p.id !== current.id && (p.category === current.category || p.type === current.type)).slice(0, 4);
    const grid = document.getElementById("relatedGrid");
    if (!related.length) { document.getElementById("relatedSection").style.display = "none"; return; }
    
    grid.innerHTML = related.map((p, i) => {
      const sold = p.status === "продано";
      const img = p.images?.[0];
      const delay = (i % 4) * 50;

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

      return `
<div data-card="${p.id}" class="group bg-white flex flex-col ${sold ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}" style="animation: fadeIn 0.4s ${delay}ms both">
  <div class="relative bg-gray-100 aspect-[3/4] overflow-hidden">
    ${sold ? `<div class="absolute inset-0 bg-white/40 z-10"></div>` : ""}
    ${imgEl}
    <div class="absolute top-2.5 left-2.5 flex gap-1 z-20">${badge}${locBadge}</div>
  </div>
  <div class="flex items-start justify-between gap-2 pt-2">
    <div class="flex flex-col">
      <div class="text-[13px] lowercase text-gray-400">${esc(p.category || "одежда")}</div>
      <div class="text-[16px] font-bold lowercase mb-1">${esc(p.name)}</div>
      <div class="text-[16px] font-semibold">${p.price ? p.price + " ₽/шт." : ""}</div>
    </div>
    <button data-cart="${p.id}" ${sold ? "disabled" : ""}
      class="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${sold ? "bg-gray-400 cursor-not-allowed" : "bg-black"}"
      aria-label="Купить оптом">
      ${cartIcon}
    </button>
  </div>
</div>`;
    }).join("");

    // Карточки - переход на страницу товара (если не распродано)
    grid.querySelectorAll("[data-card]").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-cart]")) return;
        const p = related.find(x => x.id === card.dataset.card);
        if (p?.status === "продано") return;
        window.location.href = `product.html?id=${card.dataset.card}`;
      });
    });

    // Кнопка корзины в карточке
    grid.querySelectorAll("[data-cart]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.cart;
        const p = related.find((x) => x.id === id);
        if (!p || p.status === "продано") return;
        const name = p.name || "";
        const price = p.price ? p.price + " ₽/шт." : "";
        const msg = encodeURIComponent(`Здравствуйте! Меня интересует товар: ${name}${price ? " (цена: " + price + ")" : ""}. Хочу узнать подробнее об оптовых условиях. Увидел(а) на сайте #ЧЁпоЧЁМ.`);
        window.open(`https://t.me/ChePo4em_1?text=${msg}`, "_blank");
      });
    });
  } catch (e) {
    document.getElementById("relatedSection").style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", init);
