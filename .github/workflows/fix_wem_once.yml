name: Fix WEM DB (run once)

on:
  workflow_dispatch:  # manual trigger only

jobs:
  fix-wem:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run WEM fix script
        run: python fix_wem_db.py

      - name: Commit fixed DB
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add spy_data.db
          git commit -m "fix: correct bad WEM rows from Thursday short-week bug"
          git push
