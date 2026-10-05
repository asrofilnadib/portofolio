# Form Seasoning 2

Keluarga form produksi Seasoning 2 di MyPAS. Satu project, banyak sheet. Route di bawah `/seas2/produksi`.

## Forms
- Laporan Mixer Tepung — `/seas2/produksi/mixer-tepung` (FRM-PS2-002-003)
- Laporan Produksi Mixer Tepung (Trial) — `/seas2/produksi/mixer-tepung/form-shift` (preview 1 shift, baris dummy + PDF)
- Laporan Produksi Dicer Bawang — `/seas2/produksi/dicer-bawang/form` (FRM-PS2-002-008)
- Laporan Produksi Garnish — `/seas2/produksi/garnish` (FRM-PS2-002-001), plus master varian/user dan chart
- Laporan Parameter Produksi Seasoning Garnish — `/seas2/produksi/param-proses-garnish/form` (FRM-PS2-002-046)
- Laporan Produksi Higienitas Pekerja — `/seas2/produksi/higienitas-pekerja/form` (FRM-PS2-006-002)
- Laporan Produksi Magnetic Trap — `/seas2/produksi/magnetic-trap/form` (FRM-PS2-002-006, standar gauss 10000)
- Laporan Produksi Pengayak Tepung — `/seas2/produksi/pengayak-tepung/form` (FRM-PS2-002-016)
- Laporan Produksi Pengayakan Garnish — `/seas2/produksi/pengayakan-garnish/form` (FRM-PS2-002-010)

## Flow
1. Operator pilih form dari menu Seas 2
2. Tanggal produksi dan shift terisi otomatis (jam 00:00–06:59 masih tanggal kemarin)
3. Isi sheet sesuai nomor dokumen resmi
4. Simpan, lalu buka daftar laporan
5. Export PDF dengan header yang sama seperti form kertas
