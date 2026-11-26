# Nael Food – Open PO

## Status build
Sudah jadi: halaman pelanggan (beranda, countdown, produk dinamis, keranjang, form, checkout, share WhatsApp), PWA, dan **seluruh API Google Apps Script** (produk, kategori, order, upload gambar, login admin).
Belum dibuat: halaman admin (`/admin/*`), chart, dan export. API-nya sudah siap dipakai halaman tersebut.

## Struktur Google Sheets (dibuat otomatis oleh `setup()`)
| Sheet | Kolom (tipe) |
|---|---|
| Products | id (text, PK), name, category (→ Categories.name), description, price (number), pack (number), unit, stock (number, opsional), active (boolean), bestseller (boolean), image_url, extra_images (text, pisah koma, maks 5), po_start (datetime), po_end (datetime), quota (number, 0 = tanpa batas) |
| Categories | id (text, PK), name |
| Orders | order_id (PK, `PO-YYYYMMDD-001`), created_at (datetime), name, whatsapp, division, notes, total (number), status (Baru/Diproses/Selesai/Dibatalkan), request_id (kunci anti-duplikat) |
| OrderItems | order_id (→ Orders), product_id (→ Products.id), product_name, qty, price, subtotal |
| Settings | key, value (admin_wa, admin_name, business_name, info_text) |
| Users | username (PK), password_hash (SHA-256 base64), role |

Relasi: Orders 1—N OrderItems; Products N—1 Categories; OrderItems N—1 Products. Struktur ini 1:1 dengan tabel SQL, jadi mudah pindah ke Supabase/MySQL/PostgreSQL: cukup ganti `js/api.js`.

## Endpoint API (JSON)
- `GET ?action=products | settings | categories`
- `GET ?action=orders&token=…` (admin)
- `POST {action:"order", request_id, name, whatsapp, division, notes, items:[{product_id, qty}]}`
- `POST {action:"login", username, password}` → token
- `POST {action:"saveProduct", token, product:{…}}` (tambah/edit), `deleteProduct {id}`
- `POST {action:"uploadImage", token, image:<base64>, mime, filename}` → url Drive
- Kirim POST sebagai teks biasa (tanpa header Content-Type) agar lolos CORS.

## Deploy dari nol
1. **Google Sheets**: buat spreadsheet baru → menu *Ekstensi → Apps Script*.
2. Tempel isi `backend/Code.gs` → simpan → pilih fungsi `setup` → *Jalankan* → izinkan akses (Sheets & Drive). Sheet dan data contoh terbentuk.
3. *Deploy → Deployment baru → Aplikasi web*: Jalankan sebagai **Saya**, akses **Siapa saja** → Deploy → salin URL `…/exec`.
4. Buka `js/api.js`, isi `API_URL` dengan URL tadi.
5. **GitHub Pages**: buat repo → upload semua file (kecuali `backend/` boleh) → *Settings → Pages → Branch main / root* → tunggu 1–2 menit.
6. Buka `https://USERNAME.github.io/REPO/`. Di Android: menu Chrome → *Install app*. Di iPhone: Safari → Bagikan → *Tambah ke Layar Utama*.
7. Ubah nomor WhatsApp admin di sheet **Settings** (`admin_wa`, format `62812…`).
8. Penting: ganti password admin (`admin123`) dengan menyimpan hash baru di sheet Users. Setiap mengubah Code.gs, buat deployment versi baru.

Produk yang ditambah di sheet Products langsung tampil di aplikasi tanpa deploy ulang.
Nael Food