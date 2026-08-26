# Smart India Hackathon (SIH) 2026 Problem Statement Extractor

A Python-based extractor and exporter that extracts problem statements from the official [SIH 2026 Portal](https://sih.gov.in/sih2026PS) and exports them into structured **Excel (.xlsx)**, **JSON (.json)**, and high-quality **PDF (compiled via MiKTeX / LaTeX)**.

---

## 📊 Summary of Extracted Data

- **Total Problem Statements:** 226
- **Software Problems:** 172
- **Hardware Problems:** 54
- **Themes:** 18
- **Participating Ministries & Organizations:** 30

---

## 📁 Output Artifacts Generated

Located in the [`outputs/`](outputs/) folder:
- 📄 **`sih_2026_problem_statements.xlsx`**: Multi-sheet workbook with:
  - *All Problem Statements*: 226 records with category highlights, word-wrapped descriptions, and auto-filters.
  - *Software*: 172 Software problem statements.
  - *Hardware*: 54 Hardware problem statements.
  - *Summary & Analytics*: Dashboard with distribution metrics by Category, Theme, and Ministry.
- 📄 **`sih_2026_problem_statements.json`**: Structured JSON payload with metadata, statistics summary, and full problem objects.
- 📄 **`sih_2026_problem_statements.pdf`**: Compendium compiled using MiKTeX `pdflatex` with an executive summary, hyperlinked Table of Contents, and styled cards.
- 📄 **`sih_2026_problem_statements.tex`**: Complete standalone LaTeX source code.

---

## 🚀 Quick Start

### 1. Installation
Ensure dependencies are installed:
```bash
pip install -r requirements.txt
```

### 2. Extract & Export All Formats
```bash
python extract.py --format all
```

### 3. Export Specific Formats
```bash
# Export only to Excel
python extract.py --format excel

# Export only to JSON
python extract.py --format json

# Export only to PDF (via MiKTeX pdflatex)
python extract.py --format pdf

# Export only LaTeX source code
python extract.py --format tex
```

### 4. Filter by Category or Theme
```bash
# Extract only Software problem statements
python extract.py --category Software

# Extract only Hardware problem statements
python extract.py --category Hardware

# Filter by Theme (e.g. Disaster Management, Agriculture, Healthcare, etc.)
python extract.py --theme "Disaster Management"

# Search keyword across titles and descriptions
python extract.py --search "blockchain"
```

### 5. Fetch Options
```bash
# Force fresh download from sih.gov.in (bypassing local cache)
python extract.py --refresh

# Specify custom output directory
python extract.py --output-dir my_custom_folder
```

---

## 🏗️ Architecture

```
SIH 2026/PS/
├── sih_extractor/
│   ├── __init__.py
│   ├── models.py            # ProblemStatement dataclass definition
│   ├── fetcher.py           # Robust network fetcher with SSL and caching
│   ├── parser.py            # DOM & nested modal parser with text normalization
│   ├── cli.py               # Command-line interface with summary tables
│   └── exporters/
│       ├── __init__.py
│       ├── json_exporter.py # Formats JSON with extraction metadata & counts
│       ├── excel_exporter.py# Multi-sheet styled Excel workbook generator
│       └── pdf_exporter.py  # LaTeX code generator & MiKTeX compiler
├── extract.py               # Main CLI entrypoint
├── requirements.txt         # Package requirements
├── outputs/                 # Output folder
│   ├── sih_2026_problem_statements.xlsx
│   ├── sih_2026_problem_statements.json
│   ├── sih_2026_problem_statements.pdf
│   └── sih_2026_problem_statements.tex
└── README.md
```
