# Dashboard Yield

Board yield Seasoning 2 / PRS2 di MyPAS. Route: `/seas2/dashboard-yield`.

## Flow
1. User buka board; akses dibatasi ke Seasoning 2
2. Resolver memilih window shift berjalan (1: 07–15, 2: 15–23, 3: 23–07, Asia/Jakarta)
3. Service baca counter PCS SLOC E003 dari koneksi `control_line_prs2`
4. Workcenter dipetakan ke line, lalu menit OFF dihitung per mesin
5. Hasil di-cache 30 detik per slot 30 menit
6. Board menandai ON / OFF / no production; Pareto per shift bisa difilter rentang tanggal
7. Mode TV untuk layar lantai

## Source
- `app/Http/Controllers/Seas2/Monitoring/DashboardYieldController.php`
- `app/Services/Seas2/DashboardYieldService.php`
- `app/Services/Seas2/DashboardYieldParetoService.php`
