# Methodology

Every chart in this project carries the same four-part note so findings are defensible:

1. **Why this approach** — the analytical choice, in one paragraph.
2. **Source & who produced it** — dataset, URL, producing agency, retrieval date (see `SOURCES.md`).
3. **Transformations / assumptions** — filters, joins, geocoding rules, and any *proxy* used,
   stated explicitly with its limitation.
4. **Finding** — the takeaway.

## Global definitions & decisions
- **Geographic scope:** all of Texas (`state == TX`), statewide. No sub-state SBDC region filter.
- **Time window:** last ~10 award years (exact bounds set in `01_ingest_clean` from `award_year`).
- **"Award":** one row of the SBIR.gov export = one award (a Phase I or Phase II action). Dollars use
  `award_amount`; counts use rows.
- **"Firm" / unique company:** deduplicated on `uei` when present, else normalized `firm` name
  (uppercased, punctuation/whitespace/suffix-normalized) — because a company can appear under
  slightly different name spellings and across DUNS→UEI transition.
- **Phase:** normalized from `phase` to {Phase I, Phase II}. Phase III is **not** in SBIR.gov data
  (no SBIR funds flow in Phase III) — it is inferred separately via USAspending follow-on contracts.

## Known proxies & their limits (stated wherever used)
- **Company growth** → `number_employees` reported on awards over time. Limit: self-reported at
  award time, not a continuous series; treated as directional, not precise.
- **Commercialization** → presence of non-SBIR federal follow-on contracts (USAspending) and/or
  continued activity. Limit: private-sector commercialization (sales, VC, acquisition) is not fully
  visible in government data; we report what government sources can confirm and flag the rest as
  "not observable here."
- **Still alive** → active SAM.gov registration + recency of last award/contract. Limit: a firm can
  be alive without an active federal registration; absence is a signal, not proof of closure.
- **County** → geocoded from award `city`/`zip` (Census/HUD). Limit: HQ address, not where the work
  or jobs physically occurred.

## Per-capita normalization
Where the NC-style ranking or county comparison is shown, we add a per-capita view
(funding or awards ÷ Census population) alongside raw totals, because raw dollars structurally
favor large-population states/counties and understate per-resident intensity.

## Validation
- Record counts printed before/after each filter in `01_ingest_clean`.
- TX totals cross-checked against the NC SBTDC report anchor (see `SOURCES.md`).
- County geocoding spot-checked on known firms (e.g., a Houston HQ → Harris County).
- Commercialization/survival matches audited on a hand-picked firm sample before trusting aggregates.
