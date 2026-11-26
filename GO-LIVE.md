# Nael Food – Panduan Go Live

Kerjakan **berurutan**. Jangan lanjut ke langkah berikutnya sebelum langkah sebelumnya lolos.

## 0. Persiapan (sebelum apa pun)
- [ ] Salin Spreadsheet produksi: **File → Buat salinan** → simpan satu salinan sebagai cadangan awal.
- [ ] Pastikan spreadsheet **tidak dibagikan ke publik** (Bagikan → hanya Anda). API berjalan atas nama pemilik, jadi sheet tetap privat.
- [ ] Salin `backend/Code.gs` versi terbaru ke Apps Script, lalu **Deploy → Kelola deployment → Edit → Versi baru → Deploy**. URL `/exec` tetap sama.
- [ ] Pastikan `API_URL` di `js/api.js` terisi URL `/exec` tersebut.

## 1. Setup GitHub Repository
```bash
cd nael-food
git init && git branch -M main
git add . && git commit -m "Nael Food v1.0"
git remote add origin https://github.com/USERNAME/nael-food.git
git push -u origin main
```
- Repo **publik** (GitHub Pages gratis butuh repo publik). Aman karena tidak ada rahasia di kode: yang melindungi admin adalah login + token di backend.
- Jangan upload: file `.xlsx`/`.csv` hasil export, foto pelanggan, atau ID spreadsheet backup yang sudah Anda isi.

## 2. Deploy ke GitHub Pages
1. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
2. Tunggu 1–3 menit. Alamat: `https://USERNAME.github.io/nael-food/`.
3. Uji: `/index.html` memuat produk asli, `/admin/login.html` terbuka. Semua path sudah relatif, jadi aman di sub-folder.

## 3. Custom Domain (opsional)
1. Beli domain, lalu di DNS tambahkan:
   - Subdomain (mis. `po.namadomain.com`): **CNAME** → `USERNAME.github.io`.
   - Domain utama: **A** record ke `185.199.108.153`, `.109.153`, `.110.153`, `.111.153` (cek ulang di dokumentasi GitHub Pages).
2. Repo → Settings → Pages → **Custom domain** → isi domain → Save → centang **Enforce HTTPS** (tunggu sertifikat terbit).
3. Setelah domain aktif, ulangi uji PWA (langkah 5), karena alamat berubah = aplikasi terinstal harus dipasang ulang.

## 4. Optimasi Mobile
Sudah diterapkan: input 16px (tidak zoom di iPhone), tombol +/− 44px, tombol keranjang aman dari home bar, ikon PNG, meta iOS.
- [ ] Uji di HP asli (Android + iPhone): scroll, tombol keranjang, keyboard tidak menutup form checkout.
- [ ] Jalankan **Lighthouse** (Chrome DevTools → mode Mobile). Target: Performance ≥ 80, PWA lolos.
- [ ] **Sangat disarankan sebelum trafik besar:** Tailwind lewat CDN (`cdn.tailwindcss.com`) ditujukan untuk pengembangan dan memperlambat load awal. Ganti dengan CSS hasil build:
  ```bash
  npm i -D tailwindcss@3
  npx tailwindcss init   # content: ["./*.html","./admin/*.html","./js/*.js","./admin/*.js"]; darkMode:"media"
  # buat css/tw.css berisi 3 baris: @tailwind base; @tailwind components; @tailwind utilities;
  npx tailwindcss -i css/tw.css -o css/tailwind.css --minify
  ```
  Lalu di setiap HTML ganti dua tag `<script>` Tailwind dengan `<link rel="stylesheet" href="css/tailwind.css">` (di `admin/` pakai `../css/tailwind.css`), dan hapus `cdn.tailwindcss.com` dari `CDN` di `service-worker.js`. Ulangi build setiap kali mengubah kelas Tailwind.

## 5. Aktivasi PWA & Service Worker
Sudah diperbarui (`service-worker.js` v2): halaman pelanggan di-cache, **admin dan API tidak pernah di-cache**, order (POST) tidak disentuh.
1. Deploy, buka situs di Chrome HP → menu **Instal aplikasi**. iPhone: Safari → Bagikan → **Tambah ke Layar Utama**.
2. DevTools → Application → Service Workers: status *activated*; Manifest: tanpa error.
3. Matikan internet → buka ulang aplikasi: tampilan harus tetap muncul (produk butuh internet).
4. **Setiap rilis, naikkan `VERSION`** di `service-worker.js` (`v2` → `v3`). Tanpa itu pengguna bisa melihat versi lama.
5. Sisa SW lama saat uji: DevTools → Application → Storage → **Clear site data**.

## 6. Backup & Restore
**Backup otomatis (sekali setup):** Apps Script → pilih fungsi `installBackupTrigger` → Jalankan. Backup harian ~01.00 ke folder Drive `NaelFood-Backup` (14 terakhir disimpan). Uji sekali dengan menjalankan `backupSpreadsheet` dan cek foldernya.
**Backup manual:** sebelum setiap Open PO dan sebelum update backend, jalankan `backupSpreadsheet`.
**Restore:**
1. Buka file backup di Drive, salin ID dari URL (`/d/ID/edit`).
2. Di `Code.gs`, isi `BACKUP_FILE_ID` pada `restoreFromBackup()`, jalankan. Fungsi ini membuat backup kondisi sekarang dulu, lalu menimpa 6 sheet dengan isi backup.
3. Cek Orders, Products, Users, lalu kembalikan `BACKUP_FILE_ID` ke placeholder.
- Foto produk ada di Drive folder `NaelFood-Images`; jangan hapus folder ini. Backup spreadsheet hanya menyimpan URL-nya.
- Latihan restore **sekali** di salinan spreadsheet sebelum go live.

## 7. Ganti Password Admin Default
1. Login `admin` / `admin123` → menu **Akun** → isi password baru (min. 10 karakter, unik) → Simpan. Anda otomatis keluar.
2. Login dengan password baru; pastikan `admin123` **ditolak**.
3. Simpan password di password manager. Setelah 5 kali salah, login dikunci 15 menit.
4. Jangan menjalankan `setup()` lagi setelah live (ia hanya mengisi data awal jika sheet kosong, tapi hindari risikonya).

## 8. Validasi Keamanan Dasar
- [ ] Buka `API_URL?action=orders` di browser → harus `Sesi habis` / error, **bukan** data order.
- [ ] Buka `/admin/dashboard.html` tanpa login → langsung pindah ke login.
- [ ] Klik Keluar lalu tekan Back → tidak bisa melihat data.
- [ ] Coba order dengan harga diubah lewat DevTools: total di Sheets tetap memakai harga server.
- [ ] Coba kirim order 2× cepat: hanya 1 order tersimpan (anti duplikat).
- [ ] Coba nama berisi `<script>` atau `=1+1`: tersimpan sebagai teks aman, tidak dieksekusi.
- [ ] Order setelah tanggal tutup PO / melebihi kuota → ditolak.
- [ ] Spreadsheet & folder `NaelFood-Backup` tidak publik. Folder `NaelFood-Images` memang publik-per-link (agar foto tampil).
- Batasan yang perlu diketahui: password di-hash SHA-256 tanpa salt (cukup untuk toko kecil, tapi pakai password panjang); token admin dikirim lewat URL pada pembacaan data, jangan bagikan tangkapan layar/URL admin; hanya 1 akun admin yang disiapkan. Jangan pakai komputer umum untuk login admin.

## 9. Checklist UAT (isi bersama 2–3 orang nyata)
**Pelanggan**
- [ ] Beranda menampilkan banner, tanggal PO, countdown benar
- [ ] Semua produk + foto + harga tampil sesuai Sheets
- [ ] Tambah/kurang jumlah, keranjang, hapus item, kosongkan
- [ ] Validasi: nama kosong, WA salah, keranjang kosong
- [ ] Checkout sukses → nomor `PO-YYYYMMDD-001` benar & berurutan
- [ ] Tombol WhatsApp membuka chat dengan format pesan benar
- [ ] PO ditutup / kuota habis → tombol nonaktif, pesan "PO Telah Ditutup"
- [ ] Android Chrome, iPhone Safari, mode gelap, jaringan lambat
**Admin**
- [ ] Login/logout, password baru berfungsi
- [ ] Tambah/edit/hapus/nonaktifkan produk → langsung terlihat di halaman pelanggan
- [ ] Upload foto (JPG/PNG/WEBP; >5 MB ditolak; preview muncul)
- [ ] Tambah/edit/hapus kategori
- [ ] Order masuk, detail benar, ubah status ke 4 status
- [ ] Dashboard & Laporan angka cocok dengan hitungan manual dari Sheets
- [ ] Export Excel/CSV terbuka rapi di Excel/HP (nomor WA tidak berubah)
- [ ] Backup otomatis terbentuk di Drive

## 10. Checklist Rilis Produksi
- [ ] Langkah 0–9 selesai & UAT tanpa bug kritis
- [ ] Data uji dihapus dari Orders & OrderItems (sisakan baris header); produk contoh diganti produk asli
- [ ] `admin_wa`, `admin_name`, `info_text` di sheet Settings sudah benar (nomor format `62812…`)
- [ ] Tanggal Open PO & kuota tiap produk terisi
- [ ] Backup manual dibuat tepat sebelum rilis
- [ ] `VERSION` service worker dinaikkan, di-push ke `main`
- [ ] Tes akhir di HP: pesan 1 order nyata → cek Sheets → ubah statusnya → hapus order uji
- [ ] Bagikan link ke pelanggan

**Rollback jika bermasalah:** frontend → `git revert` commit terakhir lalu push (naikkan `VERSION` SW). Backend → Deploy → Kelola deployment → pilih versi sebelumnya. Data → langkah Restore (bagian 6).

**Setelah rilis (hari 1–3):** pantau sheet Orders, cek email "Apps Script failure" bila ada, dan pastikan backup harian terbuat.
