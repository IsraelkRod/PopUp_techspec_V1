# Data Sources & Provenance

Every dataset used in this analysis is cataloged here so that each finding is traceable to a
reliable source. **No source is used in a notebook until it appears in this table** with its URL,
producing agency, and retrieval date. Retrieval dates are filled in when the data is actually pulled.

## Primary source

| Field | Value |
|---|---|
| **Dataset** | SBIR/STTR Award Data (full award export) |
| **URL** | https://www.sbir.gov/awards  · data resources: https://www.sbir.gov/data-resources · API: https://www.sbir.gov/api |
| **Produced by** | U.S. Small Business Administration (SBA) — aggregates awards from all 11 participating agencies |
| **Coverage** | All SBIR/STTR awards; we filter `state == TX` and to the last ~10 award years |
| **Refresh** | Monthly |
| **Retrieved** | _pending — provided by user or pulled from SBIR.gov TX export_ |
| **Notes** | Two variants exist: "with abstract" (~290 MB) and "without abstract" (~65 MB). 10,000-record cap per web download; API or full-file download avoids this. |

### Confirmed schema (fields we rely on)
`firm, award_title, agency, branch, phase, program (SBIR/STTR), agency_tracking_number, contract,
proposal_award_date, contract_end_date, solicitation_number, solicitation_year, topic_code,
award_year, award_amount, duns, uei, hubzone_owned, socially_economically_disadvantaged,
women_owned, number_employees, company_url, address1, address2, city, state, zip, poc_name,
poc_title, poc_phone, poc_email, pi_name, pi_phone, pi_email, ri_name, ri_poc_name, ri_poc_phone,
research_area_keywords, abstract, award_link`

## Supplementary sources (approved one at a time)

| # | Question it answers | Dataset | Produced by | URL | Status |
|---|---|---|---|---|---|
| S1 | City/ZIP → Texas **county** | Census Geocoder / HUD-USPS ZIP-County crosswalk | U.S. Census Bureau / HUD | https://geocoding.geo.census.gov · https://www.huduser.gov/portal/datasets/usps_crosswalk.html | proposed (start here) |
| S2 | County/state **population** (per-capita) | Census population estimates (ACS / PEP) | U.S. Census Bureau | https://www.census.gov/programs-surveys/popest.html | proposed |
| S3 | **Commercialization / Phase III** & follow-on contracts | USAspending.gov award data | U.S. Treasury | https://www.usaspending.gov | proposed |
| S4 | **Still alive / active** registration | SAM.gov entity registration | U.S. GSA | https://sam.gov/content/entity-information | proposed |
| S5 | Job-market / economic context | BLS QCEW; Census County Business Patterns | BLS / U.S. Census | https://www.bls.gov/cew · https://www.census.gov/programs-surveys/cbp.html | proposed |

## Validation anchor (not a data source — a cross-check)
NC SBTDC report (Aug 2023) national ranking table lists **Texas** at rank #3: **247** Phase I
awards, **160** Phase II, **$241,174,349** total, **5.6%** of national. Our computed TX totals for
the comparable window should land near these figures; large deviations flag an ingest bug.
Source page: NC SBTDC — "North Carolina's SBIR/STTR Award Data Trends" (2023-08-07).
