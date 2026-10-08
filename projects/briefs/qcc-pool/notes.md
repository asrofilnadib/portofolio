# QCC Pool

Kuis booth di auditorium MyPAS. Route publik: `/qcc-pool`. Admin: `/qcc-pool/admin`. Satu peserta, satu soal acak per booth.

## Flow
1. Admin buat acara, booth, dan soal
2. Peserta buka daftar acara, pilih booth
3. Tap kartu, dapat soal acak, jawab
4. Skor naik ke leaderboard acara

## Source
- `routes/qpool.php`
- `app/Http/Controllers/Qpool/`
