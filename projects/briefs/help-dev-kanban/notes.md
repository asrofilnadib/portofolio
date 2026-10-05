# Help Dev Kanban

Board kerja ITE di MyPAS. Route: `/help-dev/kanban`. Halaman memaksa HTTP supaya WebSocket `ws://` tersambung.

## Flow
1. PM atau anggota Help Dev buka board
2. Pilih divisi Development atau Operasional, plus tanggal
3. Project duduk di TBD, Running, atau Done
4. Task di-assign dengan drag-drop; PIC bisa lebih dari satu
5. Chat grup, presence, dan papan bergerak lewat WebSocket
6. Lampiran lewat FilePond
7. Route TV menampilkan board yang sama tanpa login
8. Penugasan bisa mengirim notifikasi WhatsApp

## Source
- `app/Http/Controllers/HelpDev/KanbanController.php`
- `routes/help_dev.php`
