import { api } from './api.js';
import { cart } from './cart.js';

const $ = (s) => document.querySelector(s);
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
// Placeholder foto otomatis jika image_url kosong
const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#FFF1E3"/><path d="M16 58c0-17 14-30 32-30s32 13 32 30c0 4-3 7-7 7H23c-4 0-7-3-7-7z" fill="#FF7A00"/><path d="M28 36l4 10M40 31l2 12M56 31l-2 12M68 36l-4 10" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>');

let products = [], settings = {}, requestId = null, submitting = false;

// Status efektif PO: open | closed | soon. Harus sama dengan poState_ di backend.
const poState = (p) => {
  const st = p.po_status || 'open', now = Date.now();
  if (st === 'closed' || st === 'soon') return st;
  if (p.po_start && now < new Date(p.po_start)) return 'soon';
  if ((p.po_end && now > new Date(p.po_end)) || (p.quota && p.sold >= p.quota)) return 'closed';
  return 'open';
};
const gallery = (p) => [p.image_url, ...(p.extra_images || [])].filter(Boolean);   // foto utama + tambahan
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }

/* ---------- Render produk ---------- */
function renderProducts() {
  $('#products').innerHTML = products.map(p => {
    const st = poState(p), open = st === 'open', q = cart.qty(p.id), imgs = gallery(p);
    const tone = st === 'closed' ? 'opacity-50' : st === 'soon' ? 'grayscale !bg-stone-200 dark:!bg-neutral-700' : '';
    const pill = (t, c) => `<span class="text-[11px] ${c} rounded-full px-2 py-0.5 whitespace-nowrap">${t}</span>`;
    const badges = (st === 'closed' ? pill('PO Ditutup', 'bg-red-100 text-red-600') : st === 'soon' ? pill('Segera Hadir', 'bg-stone-300 text-stone-700') : '')
      + (p.bestseller && open ? pill('Best Seller', 'bg-orange-100 text-orange-600') : '');
    const img = `<img src="${esc(imgs[0]) || PLACEHOLDER}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'" alt="${esc(p.name)}" class="w-24 h-24 rounded-2xl object-cover" loading="lazy">`;
    // 1 foto: tampilan sama seperti sebelumnya. >1 foto: tap untuk membuka carousel
    const media = imgs.length > 1
      ? `<button data-act="gallery" data-id="${esc(p.id)}" class="relative shrink-0 self-start" aria-label="Lihat ${imgs.length} foto">${img}<span class="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white rounded-full px-1.5">1/${imgs.length}</span></button>`
      : `<div class="shrink-0 self-start">${img}</div>`;
    const actions = open
      ? `<div class="flex items-center gap-2">${q ? `<button class="qbtn minus" data-act="dec" data-id="${esc(p.id)}" aria-label="Kurang">−</button><span class="w-5 text-center font-bold">${q}</span>` : ''}
         <button class="qbtn" data-act="inc" data-id="${esc(p.id)}" aria-label="Tambah">+</button></div>`
      : `<div class="flex items-center gap-2">${st === 'soon' && p.po_start ? `<span class="text-xs text-stone-500">Mulai ${fmtDate(p.po_start)}</span>` : ''}
         <button class="qbtn" disabled aria-disabled="true" aria-label="Tidak tersedia">+</button></div>`;
    return `<article class="card p-3 flex gap-3 ${tone}">${media}
      <div class="flex-1 min-w-0">
        <div class="flex gap-2 items-start flex-wrap"><h3 class="font-bold leading-tight">${esc(p.name)}</h3>${badges}</div>
        <p class="text-xs text-stone-500 mt-1">${esc(p.description)}</p>
        <p class="text-xs text-stone-500 mt-1">Isi ${p.pack} ${esc(p.unit)} · ${p.sold} terpesan${p.quota ? ' dari ' + p.quota : ''}</p>
        <div class="flex items-center justify-between mt-2"><b class="text-orange-500">${rp(p.price)}</b>${actions}</div></div></article>`;
  }).join('') || '<p class="text-center text-stone-500 py-10">Belum ada produk.</p>';
  renderBar();
}

/* ---------- Carousel foto (geser / tombol / thumbnail) ---------- */
function openGallery(id) {
  const p = products.find(x => x.id === id), imgs = gallery(p), o = document.createElement('div');
  o.className = 'fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4';
  o.innerHTML = `<button data-close class="absolute top-4 right-4 text-white text-4xl leading-none" aria-label="Tutup">×</button>
    <div class="relative w-full max-w-md"><div id="gScroll" class="flex overflow-x-auto snap-x snap-mandatory rounded-2xl" style="scrollbar-width:none">
      ${imgs.map(u => `<img src="${esc(u)}" class="w-full shrink-0 snap-center aspect-square object-cover" alt="${esc(p.name)}">`).join('')}</div>
      <button data-nav="-1" class="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-10 h-10 text-xl" aria-label="Sebelumnya">‹</button>
      <button data-nav="1" class="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-10 h-10 text-xl" aria-label="Berikutnya">›</button></div>
    <div class="flex gap-2 mt-3 max-w-md overflow-x-auto">${imgs.map((u, i) => `<button data-i="${i}" class="shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-transparent"><img src="${esc(u)}" class="w-full h-full object-cover" alt=""></button>`).join('')}</div>
    <p class="text-white/80 text-sm mt-2">${esc(p.name)}</p>`;
  document.body.append(o);
  const sc = o.querySelector('#gScroll'), th = [...o.querySelectorAll('[data-i]')];
  const mark = () => { const i = Math.round(sc.scrollLeft / sc.clientWidth); th.forEach((t, k) => t.classList.toggle('border-orange-500', k === i)); };
  sc.addEventListener('scroll', mark); mark();
  o.addEventListener('click', (e) => {
    const t = e.target.closest('[data-i],[data-nav],[data-close]');
    if (e.target === o || (t && 'close' in t.dataset)) return o.remove();
    if (t?.dataset.i != null) sc.scrollTo({ left: t.dataset.i * sc.clientWidth, behavior: 'smooth' });
    if (t?.dataset.nav) sc.scrollBy({ left: t.dataset.nav * sc.clientWidth, behavior: 'smooth' });
  });
}

function renderBar() {
  const n = cart.count(), bar = $('#cartBar');
  bar.classList.toggle('hidden', n === 0);
  bar.innerHTML = `<span>${n} item</span><span>Lihat keranjang · ${rp(cart.total(products))}</span>`;
}

/* ---------- Countdown ---------- */
function startCountdown() {
  const ends = products.filter(p => p.po_end).map(p => new Date(p.po_end).getTime());
  const starts = products.filter(p => p.po_start).map(p => new Date(p.po_start).getTime());
  if (starts.length) $('#poStart').textContent = fmtDate(Math.min(...starts));
  if (!ends.length) return;
  const end = Math.max(...ends);
  $('#poEnd').textContent = fmtDate(end);
  const tick = () => {
    const ms = end - Date.now();
    if (ms <= 0) { $('#countdown').textContent = 'PO Telah Ditutup'; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
    $('#countdown').textContent = `${d}h ${h}j ${m}m ${s}d lagi`;
  };
  tick(); setInterval(tick, 1000);
}

/* ---------- Sheet: keranjang, form, sukses ---------- */
function openSheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').classList.remove('hidden'); }
function closeSheet() { $('#sheet').classList.add('hidden'); }

function showCart() {
  const rows = cart.entries().map(([id, q]) => {
    const p = products.find(x => x.id === id); if (!p) return '';
    return `<div class="flex items-center justify-between py-2 gap-2">
      <div class="min-w-0"><div class="font-semibold truncate">${esc(p.name)}</div><div class="text-xs text-stone-500">${rp(p.price)} × ${q} = ${rp(p.price * q)}</div></div>
      <div class="flex items-center gap-2"><button class="qbtn minus" data-act="dec" data-id="${id}">−</button><b>${q}</b><button class="qbtn" data-act="inc" data-id="${id}">+</button>
      <button class="text-red-500 text-sm px-1" data-act="del" data-id="${id}">Hapus</button></div></div>`;
  }).join('');
  if (!rows) return closeSheet();
  requestId = requestId || crypto.randomUUID(); // kunci anti-duplikat order
  openSheet(`<div class="flex justify-between items-center mb-2"><h2 class="font-extrabold text-lg">Keranjang</h2>
      <button data-act="clear" class="text-sm text-stone-500">Kosongkan</button></div>
    ${rows}
    <div class="flex justify-between font-extrabold py-3 border-t mt-2"><span>Total</span><span class="text-orange-500">${rp(cart.total(products))}</span></div>
    <div class="grid gap-3">
      <input id="fName" class="inp" placeholder="Nama pemesan *" maxlength="60">
      <input id="fWa" class="inp" placeholder="Nomor WhatsApp * (08xxxxxxxxxx)" inputmode="tel" maxlength="16">
      <input id="fDiv" class="inp" placeholder="Divisi / Departemen" maxlength="60">
      <textarea id="fNote" class="inp" rows="2" placeholder="Catatan pesanan" maxlength="200"></textarea>
      <p id="fErr" class="text-red-500 text-sm hidden"></p>
      <button id="btnOrder" data-act="order" class="bg-orange-500 text-white rounded-2xl py-3.5 font-bold disabled:opacity-50">Pesan Sekarang</button>
      <button data-act="close" class="text-sm text-stone-500">Tutup</button></div>`);
}

async function submitOrder() {
  if (submitting) return;
  const name = $('#fName').value.trim(), wa = $('#fWa').value.replace(/[\s-]/g, ''), err = $('#fErr');
  const fail = (m) => { err.textContent = m; err.classList.remove('hidden'); };
  if (!name) return fail('Nama wajib diisi.');
  if (!/^(\+62|62|0)8\d{7,12}$/.test(wa)) return fail('Nomor WhatsApp tidak valid.');
  if (!cart.count()) return fail('Pilih minimal satu produk.');
  submitting = true; $('#btnOrder').disabled = true; $('#btnOrder').textContent = 'Memproses…';
  try {
    const items = cart.entries().map(([product_id, qty]) => ({ product_id, qty }));
    const res = await api.createOrder({ request_id: requestId, name, whatsapp: wa, division: $('#fDiv').value.trim(), notes: $('#fNote').value.trim(), items });
    const lines = items.map(i => `- ${products.find(p => p.id === i.product_id).name} x${i.qty}`).join('\n');
    const total = cart.total(products);
    const msg = `Halo Kak ${settings.admin_name || 'Fina'},\n\nSaya ingin melakukan pemesanan:\n\n${lines}\n\nTotal:\n${rp(total)}\n\nNama:\n${name}\n\nNomor Order:\n${res.order_id}\n\nTerima kasih.`;
    cart.clear(); requestId = null; renderProducts();
    openSheet(`<div class="text-center"><h2 class="font-extrabold text-lg">Pesanan diterima</h2>
      <p class="text-stone-500 text-sm mt-1">Nomor order</p><p class="font-extrabold text-orange-500 text-xl">${esc(res.order_id)}</p>
      <pre class="text-left text-sm bg-stone-100 dark:bg-neutral-700 rounded-2xl p-3 mt-3 whitespace-pre-wrap">${esc(lines)}\n\nTotal: ${rp(total)}</pre>
      <a class="block bg-green-600 text-white rounded-2xl py-3.5 font-bold mt-4" target="_blank" rel="noopener"
         href="https://wa.me/${esc(settings.admin_wa)}?text=${encodeURIComponent(msg)}">Kirim ke WhatsApp Admin</a>
      <button data-act="close" class="text-sm text-stone-500 mt-3">Selesai</button></div>`);
  } catch (e) { fail(e.message); $('#btnOrder').disabled = false; $('#btnOrder').textContent = 'Pesan Sekarang'; }
  finally { submitting = false; }
}

/* ---------- Event delegation ---------- */
document.addEventListener('click', (e) => {
  if (e.target.id === 'sheet') return closeSheet();
  const btn = e.target.closest('[data-act], #cartBar'); if (!btn) return;
  if (btn.id === 'cartBar') return showCart();
  const { act, id } = btn.dataset, sheetOpen = !$('#sheet').classList.contains('hidden');
  if (act === 'gallery') return openGallery(id);
  if (act === 'inc') cart.set(id, cart.qty(id) + 1);
  if (act === 'dec') cart.set(id, cart.qty(id) - 1);
  if (act === 'del') cart.remove(id);
  if (act === 'clear') cart.clear();
  if (act === 'close') return closeSheet();
  if (act === 'order') return submitOrder();
  renderProducts();
  if (sheetOpen) showCart();
});

/* ---------- Init ---------- */
(async function init() {
  try {
    [products, settings] = await Promise.all([api.getProducts(), api.getSettings()]);
    if (settings.info_text) $('#info').textContent = settings.info_text;
    // Buang dari keranjang produk yang sudah tidak bisa dipesan (ditutup / segera hadir / dihapus)
    cart.entries().forEach(([id]) => { const p = products.find(x => x.id === id); if (!p || poState(p) !== 'open') cart.remove(id); });
    renderProducts(); startCountdown();
  } catch (e) { toast('Gagal memuat produk: ' + e.message); }
  finally { $('#loading').remove(); }
})();
