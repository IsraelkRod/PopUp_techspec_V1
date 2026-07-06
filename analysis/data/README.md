# data/

Put the raw SBIR/STTR award export here (e.g. `sbir_award_data.csv` or `.xlsx`).
Derived/cached files (`tx_sbir_clean.parquet`, county crosswalks, etc.) are written here by the
notebooks. Everything except this README and `.gitignore` is git-ignored — see `.gitignore`.

In Google Colab, either upload the file here or point `DATA_DIR` (set in `01_ingest_clean`) at a
Google Drive folder that holds it.
