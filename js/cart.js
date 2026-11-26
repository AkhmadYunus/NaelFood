// State keranjang, disimpan di localStorage agar tidak hilang saat refresh.
const KEY = 'nael_cart';
let items = {};
try { items = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { items = {}; }
const save = () => localStorage.setItem(KEY, JSON.stringify(items));

export const cart = {
  qty: (id) => items[id] || 0,
  set(id, q) { q > 0 ? (items[id] = q) : delete items[id]; save(); },
  remove(id) { delete items[id]; save(); },
  clear() { items = {}; save(); },
  entries: () => Object.entries(items),
  count: () => Object.values(items).reduce((a, b) => a + b, 0),
  total: (products) => Object.entries(items).reduce((s, [id, q]) => s + q * (products.find(p => p.id === id)?.price || 0), 0),
};
