import os
import re
import shutil
import subprocess
import logging
from typing import List
from collections import Counter
from ..models import ProblemStatement

logger = logging.getLogger(__name__)

def escape_latex(text: str) -> str:
    """
    Escapes reserved characters in text for LaTeX compatibility.
    """
    if not text:
        return ""
        
    replacements = [
        ('â€"', ' - '),
        ('â€“', ' - '),
        ('â€”', ' - '),
        ('â€™', "'"),
        ('â€˜', "'"),
        ('â€œ', '"'),
        ('â€\x9d', '"'),
        ('â€', '"'),
        ('â€¢', ' • '),
        ('Ã©', 'e'),
        ('Ã', 'A'),
        ('\ufffd"', ' - '),
        ('"\ufffd', ' - '),
        ('\ufffd-', ' - '),
        ('-\ufffd', ' - '),
        ('\u2013', '-'),
        ('\u2014', '-'),
    ]
    for bad, good in replacements:
        text = text.replace(bad, good)
        
    # Fix numerical ranges (e.g. 0"6, 0-3, 1"3 km)
    text = re.sub(r'(\d+)\s*(?:[\ufffd\u2013\u2014]|â€["“”–—]|•\s*["”]?|\s*["”]\s*)\s*(\d+)', r'\1 - \2', text)
    text = text.replace('\ufffd', ' • ')
    
    # 1. Backslash first
    s = text.replace('\\', r'\textbackslash{}')
    
    # 2. Standard special chars
    s = s.replace('&', r'\&')
    s = s.replace('%', r'\%')
    s = s.replace('$', r'\$')
    s = s.replace('#', r'\#')
    s = s.replace('_', r'\_')
    s = s.replace('{', r'\{')
    s = s.replace('}', r'\}')
    s = s.replace('~', r'\textasciitilde{}')
    s = s.replace('^', r'\textasciicircum{}')
    s = s.replace('<', r'\textless{}')
    s = s.replace('>', r'\textgreater{}')
    
    # 3. Unicode glyphs & math symbols
    s = s.replace('“', '"').replace('”', '"')
    s = s.replace('‘', "'").replace('’', "'")
    s = s.replace('—', '---').replace('–', '--')
    s = s.replace('…', r'\dots{}')
    s = s.replace('°', r'$^\circ$')
    s = s.replace('±', r'$\pm$')
    s = s.replace('²', r'$^2$')
    s = s.replace('³', r'$^3$')
    s = s.replace('µ', r'$\mu$')
    s = s.replace('₹', r'Rs.~')
    s = s.replace('€', r'\texteuro{}')
    s = s.replace('©', r'\copyright{}')
    s = s.replace('®', r'\textregistered{}')
    s = s.replace('™', r'\texttrademark{}')
    s = s.replace('≥', r'$\ge$')
    s = s.replace('≤', r'$\le$')
    s = s.replace('≠', r'$\ne$')
    s = s.replace('≈', r'$\approx$')
    s = s.replace('×', r'$\times$')
    s = s.replace('÷', r'$\div$')
    s = s.replace('→', r'$\rightarrow$')
    s = s.replace('←', r'$\leftarrow$')
    
    return s

def format_url_latex(url: str) -> str:
    """Formats a URL as a clickable LaTeX hyperref link."""
    if not url:
        return ""
    clean_u = url.strip()
    if clean_u.startswith("http://") or clean_u.startswith("https://"):
        escaped_dest = clean_u.replace("\\", "/").replace("%", r"\%").replace("#", r"\#").replace("&", r"\&")
        escaped_label = escape_latex(clean_u)
        return r'\href{' + escaped_dest + r'}{\texttt{' + escaped_label + r'}}'
    return escape_latex(clean_u)

def format_description_to_latex(description: str) -> str:
    """
    Formats the problem description into structured LaTeX:
    - Bolds section headings (Background:, Description:, Expected Solution:, etc.)
    - Formats lettered/numbered items with hanging indents
    - Formats bullet points with bullet markers
    - Formats regular paragraphs with proper spacing
    """
    if not description:
        return ""
        
    latex_parts = []
    lines = description.split('\n')
    
    heading_pattern = re.compile(
        r'^(Background|Description|Problem Description|Expected Solution|Key Requirements|Objectives|Scope of Work|Deliverables|The solution should|The platform should|The system should|The proposed solution should include|The proposed system should|The solution must|The platform must):?\s*(.*)',
        re.IGNORECASE
    )
    
    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
            
        # 1. Check for Section Headings
        hm = heading_pattern.match(line_str)
        if hm:
            heading_name = hm.group(1).strip()
            rest_text = hm.group(2).strip()
            esc_heading = escape_latex(heading_name)
            if rest_text:
                esc_rest = escape_latex(rest_text)
                latex_parts.append(r"\vspace{0.18cm}\noindent\textbf{\color{sihnavy}" + esc_heading + r":}~\small " + esc_rest + r"\par\vspace{0.06cm}")
            else:
                latex_parts.append(r"\vspace{0.18cm}\noindent\textbf{\color{sihnavy}" + esc_heading + r":}\par\vspace{0.06cm}")
            continue
            
        # 2. Check for Sub-bullets (starts with • or - or *)
        if line_str.startswith(('•', '-', '*')):
            content = line_str.lstrip('•-* ').strip()
            esc_content = escape_latex(content)
            latex_parts.append(r"\noindent\hspace*{1.2em}\hangindent=2.4em\hangafter=1\textcolor{sihblue}{$\bullet$}~\small " + esc_content + r"\par\vspace{0.05cm}")
            continue
            
        # 3. Check for letter items (e.g. "a. ", "b. ", etc.)
        letter_match = re.match(r'^([a-z]\.)\s*(.*)', line_str, re.IGNORECASE)
        if letter_match:
            marker = letter_match.group(1)
            content = letter_match.group(2)
            esc_content = escape_latex(content)
            latex_parts.append(r"\noindent\hangindent=1.8em\hangafter=1\textbf{" + marker + r"}~\small " + esc_content + r"\par\vspace{0.06cm}")
            continue
            
        # 4. Check for numbered items (e.g. "1. ", "2. ", etc.)
        num_match = re.match(r'^(\d+\.)\s*(.*)', line_str)
        if num_match:
            marker = num_match.group(1)
            content = num_match.group(2)
            esc_content = escape_latex(content)
            latex_parts.append(r"\noindent\hangindent=1.8em\hangafter=1\textbf{" + marker + r"}~\small " + esc_content + r"\par\vspace{0.06cm}")
            continue
            
        # 5. Regular paragraph text
        esc_line = escape_latex(line_str)
        latex_parts.append(r"\noindent\small " + esc_line + r"\par\vspace{0.06cm}")
        
    return "\n".join(latex_parts)

def generate_latex_source(statements: List[ProblemStatement]) -> str:
    """
    Generates the complete LaTeX source code for SIH 2026 Problem Statements.
    """
    categories = Counter(ps.category for ps in statements)
    themes = Counter(ps.theme for ps in statements)
    
    tex = []
    tex.append(r"""\documentclass[10pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[margin=1.8cm, top=2.2cm, bottom=2.2cm]{geometry}
\usepackage{xcolor}
\usepackage{titlesec}
\usepackage{fancyhdr}
\usepackage{hyperref}
\usepackage{booktabs}
\usepackage{longtable}
\usepackage{array}
\usepackage{enumitem}
\usepackage{needspace}
\usepackage[most]{tcolorbox}
\tcbuselibrary{skins,breakable}

% Color Definitions
\definecolor{sihnavy}{HTML}{0B2545}
\definecolor{sihblue}{HTML}{134074}
\definecolor{sihaccent}{HTML}{8DA9C4}
\definecolor{softgray}{HTML}{F8FAFC}
\definecolor{bordergray}{HTML}{CBD5E1}
\definecolor{softwarecolor}{HTML}{0369A1}
\definecolor{hardwarecolor}{HTML}{C2410C}
\definecolor{darktext}{HTML}{1E293B}

% Hyperref setup
\hypersetup{
    colorlinks=true,
    linkcolor=sihblue,
    urlcolor=sihblue,
    citecolor=sihblue,
    pdftitle={Smart India Hackathon 2026 - Problem Statements},
    pdfauthor={SIH 2026 Extractor},
    pdfsubject={SIH 2026 Problem Statements Compendium}
}

% Page Header and Footer
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\color{sihblue}\textbf{Smart India Hackathon (SIH) 2026}}
\fancyhead[R]{\small\color{gray}Problem Statements Compendium}
\fancyfoot[L]{\small\color{gray}Source: sih.gov.in/sih2026PS}
\fancyfoot[R]{\small\color{sihblue}\textbf{Page \thepage}}
\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\footrulewidth}{0.4pt}

% Section Titles Styling
\titleformat{\section}{\Large\bfseries\color{sihnavy}}{\thesection}{1em}{}[\titlerule]
\titleformat{\subsection}{\large\bfseries\color{sihblue}}{\thesubsection}{1em}{}

% Box Styling
\tcbset{
    pscard/.style={
        enhanced,
        breakable,
        colback=softgray,
        colframe=bordergray,
        arc=2.5mm,
        boxrule=0.7pt,
        left=9pt,
        right=9pt,
        top=9pt,
        bottom=9pt,
        fonttitle=\bfseries,
        coltitle=white,
        colbacktitle=sihnavy,
        attach boxed title to top left={yshift=-2mm, xshift=4mm},
        boxed title style={arc=1.5mm, boxrule=0.5pt}
    }
}

\begin{document}

% ================= TITLE / COVER =================
\begin{center}
    \vspace*{0.5cm}
    {\Huge \textbf{\color{sihnavy}Smart India Hackathon 2026}}\\[0.4cm]
    {\LARGE \textbf{\color{sihblue}Complete Problem Statements Compendium}}\\[0.3cm]
    {\large \color{gray} Official Problem Statements Extracted from \url{https://sih.gov.in/sih2026PS}}\\[0.5cm]
    \rule{0.8\textwidth}{1pt}\\[0.4cm]
    {\large \textbf{Total Statements: } """ + str(len(statements)) + r""" \quad $\vert$ \quad \textbf{Software: } """ + str(categories.get('Software', 0)) + r""" \quad $\vert$ \quad \textbf{Hardware: } """ + str(categories.get('Hardware', 0)) + r"""}\\[0.2cm]
    {\small \color{gray} Generated on: \today}
    \vspace*{0.5cm}
\end{center}

\vspace{0.5cm}
\hrule
\vspace{0.5cm}

% ================= EXECUTIVE SUMMARY & STATISTICS =================
\section*{Overview \& Statistics}
\addcontentsline{toc}{section}{Overview \& Statistics}

\begin{minipage}[t]{0.48\textwidth}
\subsection*{Category Distribution}
\begin{tabular}{llr}
\toprule
\textbf{Category} & \textbf{Count} & \textbf{Share} \\
\midrule
""")
    
    for cat, count in categories.most_common():
        pct = (count / len(statements)) * 100 if statements else 0
        tex.append(f"{escape_latex(cat)} & {count} & {pct:.1f}\\% \\\\\n")
        
    tex.append(r"""\bottomrule
\end{tabular}
\end{minipage}
\hfill
\begin{minipage}[t]{0.48\textwidth}
\subsection*{Themes Breakdown}
\begin{tabular}{llr}
\toprule
\textbf{Theme} & \textbf{Count} & \textbf{Share} \\
\midrule
""")
    for theme, count in themes.most_common()[:8]:
        pct = (count / len(statements)) * 100 if statements else 0
        tex.append(f"{escape_latex(theme[:22])} & {count} & {pct:.1f}\\% \\\\\n")
        
    if len(themes) > 8:
        remaining_count = sum(c for t, c in themes.most_common()[8:])
        pct = (remaining_count / len(statements)) * 100
        tex.append(f"Other {len(themes)-8} Themes & {remaining_count} & {pct:.1f}\\% \\\\\n")
        
    tex.append(r"""\bottomrule
\end{tabular}
\end{minipage}

\vspace{0.8cm}
\newpage

% ================= TABLE OF CONTENTS =================
\tableofcontents
\newpage

% ================= PROBLEM STATEMENTS =================
\section{Problem Statements}
""")
    
    for idx, ps in enumerate(statements, start=1):
        cat_badge_color = "softwarecolor" if ps.category == "Software" else "hardwarecolor"
        short_title = ps.title[:75] + ("..." if len(ps.title) > 75 else "")
        
        tex.append(r"\needspace{6\baselineskip}")
        tex.append(r"\phantomsection")
        tex.append(r"\addcontentsline{toc}{subsection}{" + f"[{escape_latex(ps.code)}] {escape_latex(short_title)}" + r"}")
        
        formatted_desc = format_description_to_latex(ps.description)
        
        # Card Container
        tex.append(r"""
\begin{tcolorbox}[pscard, title={"\textbf{""" + escape_latex(ps.code) + r"""} \quad $\vert$ \quad """ + escape_latex(short_title) + r"""}]
\textbf{\large """ + escape_latex(ps.title) + r"""}\\[0.3cm]

\begin{tabular}{@{}ll@{}}
\textbf{Problem ID:} & """ + escape_latex(ps.id) + r""" \quad \textbf{Category:} \textcolor{""" + cat_badge_color + r"""}{\textbf{""" + escape_latex(ps.category) + r"""}} \quad \textbf{Theme:} \textbf{""" + escape_latex(ps.theme) + r"""} \\
\textbf{Organization:} & """ + escape_latex(ps.organization) + r""" \\
\textbf{Department:} & """ + escape_latex(ps.department) + r""" \\
\textbf{Submissions:} & """ + escape_latex(ps.submissions or "N/A") + r""" \quad \textbf{Deadline:} """ + escape_latex(ps.deadline or "N/A") + r""" \\
\end{tabular}

\vspace{0.2cm}
\hrule
\vspace{0.2cm}

\textbf{\color{sihnavy}Problem Statement Scope \& Details:}\\[0.15cm]
""" + formatted_desc + r"""
""")
        
        # Optional Links & Contact Info
        extras = []
        if ps.dataset_link:
            extras.append(r"\textbf{Dataset / Resources:} " + format_url_latex(ps.dataset_link))
        if ps.youtube_link:
            extras.append(r"\textbf{YouTube Video:} " + format_url_latex(ps.youtube_link))
        if ps.contact_info:
            extras.append(r"\textbf{Contact Info:} " + escape_latex(ps.contact_info))
            
        if extras:
            tex.append(r"""
\vspace{0.2cm}
\hrule
\vspace{0.2cm}
{\footnotesize
""" + r" \\ ".join(extras) + r"""
}
""")
            
        tex.append(r"\end{tcolorbox}")
        tex.append(r"\vspace{0.4cm}")
        
    tex.append(r"\end{document}")
    return "\n".join(tex)

def export_to_pdf(statements: List[ProblemStatement], output_pdf_path: str, keep_tex: bool = True) -> str:
    """
    Exports problem statements to a LaTeX .tex file and compiles it to PDF using MiKTeX pdflatex.
    """
    output_pdf_path = os.path.abspath(output_pdf_path)
    output_dir = os.path.dirname(output_pdf_path)
    os.makedirs(output_dir, exist_ok=True)
    
    base_name = os.path.splitext(os.path.basename(output_pdf_path))[0]
    tex_path = os.path.join(output_dir, f"{base_name}.tex")
    
    # 1. Generate LaTeX source
    logger.info(f"Generating LaTeX source code at '{tex_path}'...")
    latex_code = generate_latex_source(statements)
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(latex_code)
        
    # 2. Check for pdflatex
    pdflatex_cmd = shutil.which("pdflatex")
    if not pdflatex_cmd:
        potential_paths = [
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe"),
            os.path.expandvars(r"%PROGRAMFILES%\MiKTeX\miktex\bin\x64\pdflatex.exe"),
            os.path.expandvars(r"%PROGRAMFILES(X86)%\MiKTeX\miktex\bin\pdflatex.exe"),
        ]
        for p in potential_paths:
            if os.path.exists(p):
                pdflatex_cmd = p
                break
                
    if not pdflatex_cmd:
        logger.error("pdflatex executable not found in PATH or standard MiKTeX directories.")
        raise FileNotFoundError("MiKTeX pdflatex executable not found. LaTeX file saved at " + tex_path)

    logger.info(f"Found pdflatex at '{pdflatex_cmd}'. Compiling PDF...")
    
    # 3. Run pdflatex (Pass 1 and Pass 2 for TOC resolution)
    cmd = [pdflatex_cmd, "-interaction=nonstopmode", f"-output-directory={output_dir}", tex_path]
    
    p1 = subprocess.run(cmd, capture_output=True, text=True, cwd=output_dir)
    if p1.returncode != 0:
        logger.warning(f"pdflatex Pass 1 warning/code {p1.returncode}.")
        
    p2 = subprocess.run(cmd, capture_output=True, text=True, cwd=output_dir)
    
    expected_pdf = os.path.join(output_dir, f"{base_name}.pdf")
    if not os.path.exists(expected_pdf):
        log_file = os.path.join(output_dir, f"{base_name}.log")
        log_snippet = ""
        if os.path.exists(log_file):
            with open(log_file, "r", encoding="utf-8", errors="ignore") as lf:
                log_snippet = lf.read()[-1500:]
        raise RuntimeError(f"PDF compilation failed. Log:\n{log_snippet}")
        
    for ext in [".aux", ".out", ".toc"]:
        aux_f = os.path.join(output_dir, f"{base_name}{ext}")
        if os.path.exists(aux_f):
            try:
                os.remove(aux_f)
            except Exception:
                pass
                
    logger.info(f"Successfully generated PDF at '{expected_pdf}'")
    return expected_pdf
