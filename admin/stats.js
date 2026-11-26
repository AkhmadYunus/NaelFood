// Modul analitik + export. Dipakai oleh dashboard.html, reports.html, orders.html.
// Aturan: omzet & produk terjual TIDAK menghitung order berstatus "Dibatalkan".
import { get } from './admin.js';

export const STATUS = ['Baru', 'Diproses', 'Selesai', 'Dibatalkan'];
export const loadData = async () => {
  const [orders, items] = await Promise.all([get('orders'), get('orderItems')]);
  return { orders, items };
};

/* ---------- Tanggal (zona waktu lokal) ---------- */
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const monthKey = (d) => dayKey(d).slice(0, 7);
export const yearKey = (d) => dayKey(d).slice(0, 4);
export const inRange = (o, from, to) => { const k = dayKey(o.created_at); return (!from || k >= from) && (!to || k <= to); };
export function presetRange(p) {            // day | week (Senin–Minggu) | month | year
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  if (p === 'day') return [dayKey(n), dayKey(n)];
  if (p === 'week') { const s = new Date(n); s.setDate(n.getDate() - ((n.getDay() + 6) % 7)); const e = new Date(s); e.setDate(s.getDate() + 6); return [dayKey(s), dayKey(e)]; }
  if (p === 'month') return [dayKey(new Date(y, m, 1)), dayKey(new Date(y, m + 1, 0))];
  if (p === 'year') return [`${y}-01-01`, `${y}-12-31`];
  return ['', ''];
}

/* ---------- Agregasi ---------- */
export const valid = (orders) => orders.filter(o => o.status !== 'Dibatalkan');
export const waKey = (w) => String(w || '').replace(/\D/g, '').replace(/^0/, '62'); // identitas customer = nomor WA
export const qtyByOrder = (items) => { const m = {}; items.forEach(i => { m[i.order_id] = (m[i.order_id] || 0) + Number(i.qty); }); return m; };

export function groupBy(orders, keyFn, qty) {   // -> [{key, orders, omzet, qty}] urut kronologis
  const m = {};
  orders.forEach(o => { const k = keyFn(o.created_at); m[k] ??= { orders: 0, omzet: 0, qty: 0 }; m[k].orders++; m[k].omzet += Number(o.total); m[k].qty += qty[o.order_id] || 0; });
  return Object.keys(m).sort().map(k => ({ key: k, ...m[k] }));
}
export function topProducts(orders, items) {
  const ids = new Set(orders.map(o => o.order_id)), m = {};
  items.filter(i => ids.has(i.order_id)).forEach(i => { m[i.product_name] ??= { name: i.product_name, qty: 0, omzet: 0 }; m[i.product_name].qty += Number(i.qty); m[i.product_name].omzet += Number(i.subtotal); });
  return Object.values(m).sort((a, b) => b.qty - a.qty);
}
export function topCustomers(orders) {
  const m = {};
  orders.forEach(o => { const k = waKey(o.whatsapp) || o.name; m[k] ??= { key: k, name: o.name, wa: o.whatsapp, orders: 0, omzet: 0 }; m[k].orders++; m[k].omzet += Number(o.total); });
  return Object.values(m).sort((a, b) => b.orders - a.orders || b.omzet - a.omzet);
}

/* ---------- Export (butuh SheetJS global `XLSX` dimuat di halaman) ---------- */
export const orderRows = (orders, items) => orders.map(o => ({
  'No Order': o.order_id, 'Tanggal': new Date(o.created_at).toLocaleString('id-ID'), 'Nama': o.name, 'WhatsApp': String(o.whatsapp),
  'Divisi': o.division, 'Catatan': o.notes,
  'Produk': items.filter(i => i.order_id === o.order_id).map(i => `${i.product_name} x${i.qty}`).join('; '),
  'Total': Number(o.total), 'Status': o.status,
}));
export const soldRows = (orders, items) => topProducts(valid(orders), items).map(p => ({ 'Produk': p.name, 'Qty Terjual': p.qty, 'Omzet': p.omzet }));

export function download(rows, fmt, name) {   // fmt: 'xlsx' | 'csv'. return false jika tidak ada data
  if (!rows.length) return false;
  const ws = XLSX.utils.json_to_sheet(rows), file = `${name}-${dayKey(new Date())}`;
  if (fmt === 'csv') {
    const blob = new Blob(['\ufeff' + XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8' }); // BOM agar Excel membaca UTF-8
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file + '.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } else {
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); XLSX.writeFile(wb, file + '.xlsx');
  }
  return true;
}
