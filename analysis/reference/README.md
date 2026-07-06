# Design reference

The visual and structural model for this project is the **NC SBTDC** report:

> **"North Carolina's SBIR/STTR Award Data Trends"** — NC Small Business & Technology
> Development Center (NC SBTDC), posted **2023-08-07**.
> URL slug: `.../north-carolinas-sbir-sttr-award-data-trends/`

Drop the provided screenshot of this report here as `nc_sbtdc_report.png` so it's version-tracked
next to the notebooks. (It was supplied as an inline image and is referenced, not embedded, here.)

## Elements we replicate for Texas
1. **Headline stat framing** — "$X in the latest year, +Y% vs. ten years earlier; N companies via
   M Phase I & II awards." → written for TX.
2. **Bar chart** — "Number of Awards and Awarded Companies" over ~10 years, two series per year
   (Award Count, # of Firms). *(User ✅'d this chart.)* → Modules A/B.
3. **National ranking table** — Rank | State | Phase I Awards | Phase II Awards | Total Funding |
   % of National, with **TX highlighted** (NC report shows TX #3: 247 / 160 / $241M / 5.6%).
   → Module G, **plus a per-capita version** *(user annotation: "per capita basis")*.
4. **Agency-trend narrative** — e.g. NC's "HHS + DoD = 89% of awards; DoD +118% vs. HHS +11%."
   → TX equivalent in Module A.

## Texas-specific addition (not in the NC report)
- **"# of unique SBIR firms in TX by county"** *(user's top annotation)* → Module D, counting
  **distinct firms** per county (not award count).
