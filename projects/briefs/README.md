# Portfolio Briefs — Asrofil @ PT PAS

Folder ini buat nyiapin case study portofolio (Competence / Works / Resume).

## Tier

| Tier | Systems | Deliverable |
|------|---------|-------------|
| **S** | TMS, Chatbot, Smart Lab, SCADA→Tablet, Psikotes, Command Center | Brief penuh + diagram + PPT + video demo |
| **A** | E-Cafe Invoice, GA Stock Opname, KAPAS, Logbook, TimbanginIN, P2H, KMS Form, Dashboard Seasoning 2, Dashboard Catalog, Help Dev Kanban, Form Seasoning 2, QCC Pool | Brief ringan + diagram + PPT seadaanya |
| **B** | Prayer | Screenshot doang |

Fokus utama: **S-tier**. A-tier seadaanya. B-tier cuma SS.

## Cara pakai (buat AI agent / diri sendiri)

1. Isi `{slug}/notes.md`.
2. Pakai prompt di `AGENT_PROMPT.md` kalau butuh AI ngisi brief.
3. Flowchart Mermaid sudah ada di `{slug}/diagram/flowchart.md`.
4. Copy Mermaid → [mermaid.ai](https://mermaid.ai) → Export → simpan `diagram/process.png`.
5. Turunin: diagram → PPT → video → page web.

## Pipeline per project

```
notes.md → diagram/ → ppt/ → video/ → case study page
```

## Slug map

| Slug | Name | Tier | Repo hint |
|------|------|------|-----------|
| `tms` | TMS | S | MyPAS |
| `chatbot` | Chatbot (Qdrant + Gemini) | S | MyPAS |
| `smart-lab` | Smart Lab (PA + Lab eksternal) | S | MyPAS |
| `scada-tablet` | SCADA to Tablet | S | MyPAS |
| `psikotes` | Psikotes (CV + Image Verification) | S | `/Project/psikotes` |
| `command-center` | Command Center CCTV Desktop | S | `/Project/command_center` |
| `ecafe-invoice` | E-Cafe Invoice (5-level approval) | A | MyPAS |
| `ga-stock-opname` | Stock Opname GA (TV websocket) | A | MyPAS |
| `kapas` | KAPAS | A | MyPAS |
| `logbook` | Logbook absensi | A | MyPAS |
| `timbangin` | TimbanginIN (Modbus) | A | MyPAS / node |
| `p2h` | P2H (MHE + downtime) | A | MyPAS |
| `kms-form` | KMS Form compliance | A | `/Project/compliance-form-app` |
| `prayer` | Prayer (masjid display) | B | MyPAS |
| `car-pool` | Car Pool (peminjaman mobil dinas) | A | MyPAS |
| `metal-detector` | Metal Detector Proses (QC Seasoning 2) | A | MyPAS |
| `dashboard-yield` | Dashboard Seasoning 2 (yield board) | A | MyPAS |
| `dashboard-catalog` | Dashboard Catalog (Metabase) | A | MyPAS |
| `help-dev-kanban` | Help Dev Kanban | A | MyPAS |
| `form-seasoning-2` | Form Seasoning 2 | A | MyPAS |
| `qcc-pool` | QCC Pool (booth quiz) | A | MyPAS |

## Flowcharts (Mermaid)

**Source Obsidian (rapih):**

```
/home/asrofil/Project/newpas-master/documentation/Asrofil/Portfolio-Flowcharts/
```

Buka `00-Index.md` sebagai MOC.

**Mirror di briefs:**

```
briefs/{slug}/diagram/flowchart.md
briefs/FLOWCHARTS-INDEX.md
```

Cara: buka file → copy blok `mermaid` (yang ada `theme: redux`) → paste ke mermaid.ai → Export → `diagram/process.png`.
