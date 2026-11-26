// Lapisan API. Frontend HANYA bicara lewat file ini.
// Pindah ke Supabase/MySQL nanti = ganti isi file ini saja.
export const API_URL = 'https://script.google.com/macros/s/AKfycbzIadOdlvuCvwbsHZ-Z8wMgoGZOCNlOKtyorVFNkgmtLLTkO5UFybYkFXstEukVO6JIxg/exec'; // <- tempel URL Web App Google Apps Script di sini

const PH = (n) => ({ id: 'P' + n, active: true, category: 'Gyoza', image_url: '', bestseller: false, po_start: '', po_end: '', quota: 0, sold: 0 });
const DEMO = {  // data contoh, dipakai hanya jika API_URL masih kosong
  products: [
    { ...PH(1), name: 'Gyoza Udang & Ayam', price: 38000, pack: 10, unit: 'pcs', description: 'Isian udang dan ayam, juicy.', bestseller: true, sold: 12 },
    { ...PH(2), name: 'Gyoza Ayam & Jahe', price: 38000, pack: 10, unit: 'pcs', description: 'Ayam dengan aroma jahe hangat.', sold: 7 },
    { ...PH(3), name: 'Kuotie Mini', price: 33000, pack: 10, unit: 'pcs', category: 'Kuotie', description: 'Kuotie mungil, garing di bawah.', sold: 5 },
    { ...PH(4), name: 'Lumpia Kulit Tahu Isi Ayam', price: 38000, pack: 8, unit: 'pcs', category: 'Lumpia', description: 'Kulit tahu renyah isi ayam.', sold: 9 },
  ],
  settings: { admin_wa: '6281234567890', admin_name: 'Fina', info_text: 'Home Made by Nael Food. Tanpa pengawet, aman untuk anak-anak.' },
};

async function call(params = {}, body) {
  if (!API_URL) return demo(params, body);
  const res = body
    ? await fetch(API_URL, { method: 'POST', body: JSON.stringify(body) }) // text/plain: tanpa preflight CORS
    : await fetch(API_URL + '?' + new URLSearchParams(params));
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Terjadi kesalahan');
  return json.data;
}

function demo(params, body) {
  if (params.action === 'products') return DEMO.products;
  if (params.action === 'settings') return DEMO.settings;
  if (body?.action === 'order') return { order_id: 'PO-DEMO-001' };
  return [];
}

export const api = {
  getProducts: () => call({ action: 'products' }),
  getSettings: () => call({ action: 'settings' }),
  createOrder: (order) => call({}, { action: 'order', ...order }),
};
