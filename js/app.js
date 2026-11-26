import { api } from './api.js';
import { cart } from './cart.js';

const $ = (s) => document.querySelector(s);
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
// Placeholder foto otomatis jika image_url kosong
const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#FFF1E3"/><path d="M16 58c0-17 14-30 32-30s32 13 32 30c0 4-3 7-7 7H23c-4 0-7-3-7-7z" fill="#FF7A00"/><path d="M28 36l4 10M40 31l2 12M56 31l-2 12M68 36l-4 10" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>');

let products = [], settings = {}, requestId = null, submitting = false;

const isOpen = (p) => {
  const now = Date.now();
  return p.active && (!p.po_start || now >= new Date(p.po_start)) && (!p.po_end || now <= new Date(p.po_end)) && (!p.quota || p.sold < p.quota);
};
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }

/* ---------- Render produk ---------- */
function renderProducts() {
  $('#products').innerHTML = products.map(p => {
    const open = isOpen(p), q = cart.qty(p.id);
    return `<article class="card p-3 flex gap-3">
      <img src="${esc(p.image_url) || PLACEHOLDER}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'" alt="${esc(p.name)}" class="w-24 h-24 rounded-2xl object-cover shrink-0" loading="lazy">
      <div class="flex-1 min-w-0">
        <div class="flex gap-2 items-start"><h3 class="font-bold leading-tight">${esc(p.name)}</h3>
          ${p.bestseller ? '<span class="text-[11px] bg-orange-100 text-orange-600 rounded-full px-2 py-0.5 whitespace-nowrap">Best Seller</span>' : ''}</div>
        <p class="text-xs text-stone-500 mt-1">${esc(p.description)}</p>
        <p class="text-xs text-stone-500 mt-1">Isi ${p.pack} ${esc(p.unit)} · ${p.sold} terpesan${p.quota ? ' dari ' + p.quota : ''}</p>
        <div class="flex items-center justify-between mt-2">
          <b class="text-orange-500">${rp(p.price)}</b>
          ${open ? `<div class="flex items-center gap-2">
              ${q ? `<button class="qbtn minus" data-act="dec" data-id="${p.id}" aria-label="Kurang">−</button><span class="w-5 text-center font-bold">${q}</span>` : ''}
              <button class="qbtn" data-act="inc" data-id="${p.id}" aria-label="Tambah">+</button></div>`
            : '<span class="text-xs font-semibold text-stone-400">PO Telah Ditutup</span>'}
        </div></div></article>`;
  }).join('') || '<p class="text-center text-stone-500 py-10">Belum ada produk.</p>';
  renderBar();
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
    renderProducts(); startCountdown();
  } catch (e) { toast('Gagal memuat produk: ' + e.message); }
  finally { $('#loading').remove(); }
})();
