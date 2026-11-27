// Modul bersama Admin Panel: session, API, navigasi, modal, helper.
import { API_URL } from '../js/api.js';
const KEY = 'nael_admin';

export const $ = (s) => document.querySelector(s);
export const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDT = (d) => d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
export const toLocalInput = (v) => { if (!v) return ''; const d = new Date(v); if (isNaN(d)) return ''; d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

/* ---------- Session (token berlaku 6 jam, sama dengan cache backend) ---------- */
export const session = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.exp > Date.now() ? s.token : null; } catch { return null; } };
export const me = () => { try { const x = JSON.parse(localStorage.getItem(KEY)) || {}; return { username: x.username, name: x.name, role: x.role || 'admin' }; } catch { return { role: 'admin' }; } };
export const requireLogin = () => { if (!session()) location.replace('login.html'); };
export const logout = () => {
  const t = session();
  if (t && API_URL) fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'logout', token: t }), keepalive: true }).catch(() => {}); // cabut token di server
  localStorage.removeItem(KEY); location.replace('login.html');
};

/* ---------- API ---------- */
async function req(params, body) {
  if (!API_URL) throw new Error('API_URL belum diisi di js/api.js');
  const res = body ? await fetch(API_URL, { method: 'POST', body: JSON.stringify(body) }) : await fetch(API_URL + '?' + new URLSearchParams(params));
  const j = await res.json();
  if (!j.ok) { if (/Sesi habis/.test(j.error)) logout(); throw new Error(j.error); }
  return j.data;
}
export const get = (action, extra = {}) => req({ action, token: session(), ...extra });
export const post = (body) => req({}, { token: session(), ...body });
export async function login(username, password) {
  const d = await req({}, { action: 'login', username, password });
  localStorage.setItem(KEY, JSON.stringify({ token: d.token, exp: Date.now() + 6 * 36e5 - 6e4, username: d.username, name: d.name, role: d.role }));
}

/* ---------- UI helpers ---------- */
const css = document.createElement('style');
css.textContent = `.btn{background:#FF7A00;color:#fff;border-radius:.8rem;padding:.55rem 1rem;font-weight:700;font-size:.875rem}
.btn:disabled{opacity:.5}.btn2{background:#f5f5f4;color:#44403c;border-radius:.8rem;padding:.55rem 1rem;font-weight:600;font-size:.875rem}
.btnr{color:#dc2626;font-weight:600;font-size:.875rem}.lbl{font-size:.75rem;color:#78716c;margin-bottom:.2rem;display:block}
@media(prefers-color-scheme:dark){.btn2{background:#404040;color:#e7e5e4}}`;
document.head.append(css);

export function toast(msg, bad) {
  const t = document.createElement('div');
  t.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-white text-sm px-4 py-2 rounded-xl shadow ' + (bad ? 'bg-red-600' : 'bg-stone-900');
  t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 3000);
}
export function openModal(html) {
  closeModal();
  const m = document.createElement('div'); m.id = 'modal';
  m.className = 'fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center';
  m.innerHTML = `<div class="w-full max-w-lg bg-white dark:bg-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) closeModal(); });
  document.body.append(m); return m;
}
export const closeModal = () => $('#modal')?.remove();

export function nav(active) {
  const L = [['dashboard', 'Dashboard'], ['products', 'Produk'], ['categories', 'Kategori'], ['orders', 'Order'], ['reports', 'Laporan'], ['print', 'Cetak'], ['users', 'Admin Users'], ['account', 'Akun']];
  document.body.insertAdjacentHTML('afterbegin', `<header class="sticky top-0 z-30 bg-orange-500 text-white">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
      <b class="text-lg shrink-0">Nael Food Admin</b>
      <nav class="flex gap-1 overflow-x-auto flex-1 text-sm">${L.map(([k, t]) =>
        `<a href="${k}.html" class="px-3 py-1.5 rounded-full whitespace-nowrap ${k === active ? 'bg-white text-orange-600 font-bold' : 'hover:bg-orange-600'}">${t}</a>`).join('')}</nav>
      <button id="btnLogout" class="text-sm font-semibold shrink-0">Keluar</button></div></header>`);
  $('#btnLogout').onclick = logout;
}

// Perkecil gambar di browser (JPEG, sisi terpanjang maks `max` px) -> base64 tanpa prefix, siap untuk uploadImage
export async function toBase64(file, max = 1000) {
  const bmp = await createImageBitmap(file), s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85).split(',')[1];
}
