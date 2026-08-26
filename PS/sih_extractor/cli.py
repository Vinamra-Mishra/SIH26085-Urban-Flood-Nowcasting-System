import argparse
import sys
import os
import logging
from typing import List
from collections import Counter

from .fetcher import fetch_html, SIH_URL
from .parser import parse_problem_statements
from .models import ProblemStatement
from .exporters import export_to_json, export_to_excel, export_to_pdf

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    HAS_RICH = True
except ImportError:
    HAS_RICH = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sih_extractor")

def print_banner():
    if HAS_RICH:
        try:
            console = Console()
            console.print(Panel.fit(
                "[bold cyan]Smart India Hackathon (SIH) 2026[/bold cyan]\n"
                "[bold white]Problem Statement Extractor & Exporter[/bold white]\n"
                "[dim]Formats: Excel (.xlsx) | JSON (.json) | PDF via MiKTeX (.pdf, .tex)[/dim]",
                border_style="bright_blue"
            ))
            return
        except Exception:
            pass
    print("=" * 60)
    print(" Smart India Hackathon (SIH) 2026 - Extractor & Exporter")
    print(" Formats: Excel (.xlsx) | JSON (.json) | PDF (.pdf, .tex)")
    print("=" * 60)

def print_summary_table(statements: List[ProblemStatement]):
    if not statements:
        print("No statements to summarize.")
        return

    cats = Counter(p.category for p in statements)
    themes = Counter(p.theme for p in statements)

    if HAS_RICH:
        try:
            console = Console()
            table = Table(title="Extraction Summary & Statistics", show_header=True, header_style="bold magenta")
            table.add_column("Metric", style="cyan", width=30)
            table.add_column("Value", style="green")

            table.add_row("Total Problem Statements", str(len(statements)))
            for cat, cnt in cats.most_common():
                table.add_row(f"Category: {cat}", str(cnt))
            table.add_row("Total Themes", str(len(themes)))
            table.add_row("Total Ministries/Orgs", str(len(set(p.organization for p in statements))))
            console.print(table)
            return
        except Exception:
            pass

    print("\n--- Summary ---")
    print(f"Total Statements: {len(statements)}")
    for cat, cnt in cats.most_common():
        print(f"  Category [{cat}]: {cnt}")
    print(f"Total Themes: {len(themes)}")
    print(f"Total Ministries/Orgs: {len(set(p.organization for p in statements))}")

def run_cli():
    parser = argparse.ArgumentParser(
        description="Extract and export SIH 2026 Problem Statements to Excel, JSON, and PDF (via MiKTeX)."
    )
    parser.add_argument(
        "--format",
        choices=["all", "excel", "json", "pdf", "tex"],
        default="all",
        help="Export format (default: all)"
    )
    parser.add_argument(
        "--output-dir",
        default="outputs",
        help="Directory to save exported files (default: outputs)"
    )
    parser.add_argument(
        "--cache-file",
        default="page.html",
        help="Path to local HTML file cache (default: page.html)"
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Force re-fetching live webpage from sih.gov.in"
    )
    parser.add_argument(
        "--category",
        type=str,
        help="Filter by category ('Software' or 'Hardware')"
    )
    parser.add_argument(
        "--theme",
        type=str,
        help="Filter by theme (e.g. 'Disaster Management')"
    )
    parser.add_argument(
        "--search",
        type=str,
        help="Search keyword in title, theme, or description"
    )

    args = parser.parse_args()
    print_banner()

    # 1. Fetch
    html_content = fetch_html(
        url=SIH_URL,
        cache_file=args.cache_file,
        force_refresh=args.refresh
    )

    # 2. Parse
    statements = parse_problem_statements(html_content)
    if not statements:
        logger.error("No problem statements could be parsed.")
        sys.exit(1)

    # 3. Filter if requested
    if args.category:
        cat_lower = args.category.strip().lower()
        statements = [p for p in statements if cat_lower in p.category.lower()]
        logger.info(f"Filtered by category '{args.category}': {len(statements)} remaining.")

    if args.theme:
        theme_lower = args.theme.strip().lower()
        statements = [p for p in statements if theme_lower in p.theme.lower()]
        logger.info(f"Filtered by theme '{args.theme}': {len(statements)} remaining.")

    if args.search:
        kw = args.search.strip().lower()
        statements = [
            p for p in statements
            if kw in p.title.lower() or kw in p.description.lower() or kw in p.theme.lower() or kw in p.organization.lower()
        ]
        logger.info(f"Filtered by search keyword '{args.search}': {len(statements)} remaining.")

    print_summary_table(statements)

    os.makedirs(args.output_dir, exist_ok=True)
    prefix = "sih_2026_problem_statements"

    exported_files = []

    # 4. Export JSON
    if args.format in ("all", "json"):
        json_path = os.path.join(args.output_dir, f"{prefix}.json")
        res = export_to_json(statements, json_path)
        exported_files.append(("JSON", res))

    # 5. Export Excel
    if args.format in ("all", "excel"):
        xlsx_path = os.path.join(args.output_dir, f"{prefix}.xlsx")
        res = export_to_excel(statements, xlsx_path)
        exported_files.append(("Excel", res))

    # 6. Export PDF / TeX
    if args.format in ("all", "pdf", "tex"):
        pdf_path = os.path.join(args.output_dir, f"{prefix}.pdf")
        try:
            res = export_to_pdf(statements, pdf_path)
            exported_files.append(("PDF (via MiKTeX)", res))
            tex_path = os.path.join(args.output_dir, f"{prefix}.tex")
            if os.path.exists(tex_path):
                exported_files.append(("LaTeX Source", tex_path))
        except Exception as e:
            logger.error(f"Failed to generate PDF via MiKTeX: {e}")
            tex_path = os.path.join(args.output_dir, f"{prefix}.tex")
            if os.path.exists(tex_path):
                exported_files.append(("LaTeX Source (Generated)", tex_path))

    # Output report
    print("\n[OK] Extraction and Export Completed Successfully!")
    for fmt, path in exported_files:
        size_kb = os.path.getsize(path) / 1024 if os.path.exists(path) else 0
        print(f"  * {fmt:20s}: {path} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    run_cli()
