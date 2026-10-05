# Dashboard Catalog

Indeks dashboard Metabase per plant di MyPAS. Route: `/data-analyst/dashboard-catalog`.

## Flow
1. Viewer dengan permission `dashboard_catalog` buka matriks
2. Section: Production, Quality Control, Warehouse
3. Cell menyimpan link Metabase; klik membuka iframe (signed embed kalau secret terpasang)
4. Editor `dashboard_catalog_da` kelola grup, item, dan KPI
5. Tab IP Address: host, tabel, sheet, dan kredensial database terenkripsi (reveal / peek)

## Source
- `app/Http/Controllers/DataAnalyst/DashboardCatalogController.php`
- `app/Services/DataAnalyst/DashboardCatalogService.php`
