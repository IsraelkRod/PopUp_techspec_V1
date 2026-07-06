# Texas SBIR/STTR Impact Analysis (10-Year)

A reproducible, source-traceable analysis of the impact of federal **SBIR/STTR** awards in
**Texas** over the last ~10 years, framed through a Small Business Development Center (SBDC) lens.
Built as **Google Colab notebooks**: every chart is followed by a plain-English "what this means"
and a **methodology + data-provenance** note, so every finding is defensible and traceable to a
reliable (government) source.

> This analytics project is **standalone** and unrelated to the POP UP app that otherwise lives in
> this repository. It lives entirely under `analysis/`.

## Design reference
Modeled on the **NC SBTDC "North Carolina's SBIR/STTR Award Data Trends"** report. See
[`reference/README.md`](reference/README.md) for the specific elements we replicate for Texas.

## How to run (Google Colab)
1. Open a notebook from `notebooks/` in Colab.
2. Run the first cell (`!pip install -q -r requirements.txt` / inline installs).
3. Mount Drive and point `DATA_DIR` at the folder holding the raw SBIR award export.
4. Run **`01_ingest_clean.ipynb` first** — it produces the cleaned, county-geocoded dataframe
   (`data/tx_sbir_clean.parquet`) that every other notebook reads.
5. Run any analysis notebook (A–G); each is independent once the clean file exists.

## Notebook order
| # | Notebook | Question it answers |
|---|---|---|
| 00 | `00_program_primer` | How SBIR/STTR Phases 0–III actually work (foundation) |
| 01 | `01_ingest_clean` | Load → filter to TX → geocode county → clean cached dataframe |
| A | `A_agency_trends` | How are the funding agencies developing? |
| B | `B_recipients` | Who are they investing in? |
| C | `C_company_growth` | Are the companies growing? |
| D | `D_geography_map` | Which Texas counties get the most? (+ unique firms, per-capita) |
| E | `E_phase_funnel_commercialization` | Where does funding convert to commercialized companies? |
| F | `F_survival_activity` | Are the companies still alive / past their contract? |
| G | `G_impact_benchmarking` | What's the real impact vs. US / national data? |

## Data & sources
- **Primary:** SBIR.gov award export (see `SOURCES.md`).
- **Supplementary (approved incrementally):** Census/HUD county crosswalk, USAspending.gov,
  SAM.gov, BLS/Census. Each is logged in `SOURCES.md` with URL, producing agency, and retrieval date.
- Analysis rationale + assumptions/limitations per module: `METHODOLOGY.md`.

## Status
- [x] Program primer (`00`) — complete, no data required
- [x] Ingest/clean (`01`) — **run on real data**: 9,734 TX awards → 3,394 in the 2016–2025 window,
  878 unique firms, $1.81B. Clean dataframe cached to `data/tx_sbir_clean.parquet`.
- [x] Module **A · Agency trends** — complete; 7 charts in `outputs/` (headline, awards+firms,
  dollars/yr, agency lines, agency $ share, SBIR vs STTR, phase mix).
- [x] Module **B · Recipients** — complete; 6 charts (top firms by count/$, awards-per-firm
  distribution, new-vs-returning, Lorenz/Gini concentration, demographic ownership).
- [ ] Modules **C, E, F, G** — award data (+ USAspending/SAM for E/F once approved)
- [ ] Module **D · Geography** — gated on approval of the county-crosswalk source (S1)

### Key findings so far (2016–2025, Texas)
- **$1.81B** across **3,394 awards** to **878 firms**; annual dollars roughly **doubled** over the window.
- **DoD ~56%** and **HHS ~25%** of dollars (**~81% combined**) — Texas mirrors the national mega-agency concentration.
- **SBIR ~86% / STTR ~14%** of dollars; **Phase I = ~66% of awards but Phase II = ~78% of dollars**.
- **Concentrated recipients:** Lynntech alone holds **335 awards**; top 10 firms = **~25% of dollars**
  (**Gini ≈ 0.71**). Median firm has 2 awards; **56 firms won 10+**.
- **Ownership:** woman-owned ~8–9%, disadvantaged ~9%, HUBZone ~2–3% of awards.
