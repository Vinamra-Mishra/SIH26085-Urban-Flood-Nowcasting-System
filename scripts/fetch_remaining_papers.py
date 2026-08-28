import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path

RESEARCH_DIR = Path(r"c:\Users\vkmuk\OneDrive\Documents\Project\SIH 2026\research")
RESEARCH_DIR.mkdir(parents=True, exist_ok=True)

QUERIES = [
    {
        "domain": "shallow_water_hydrostatics",
        "query": "all:\"shallow water equations\" AND (all:\"hydrostatic reconstruction\" OR all:\"well-balanced\")",
        "category": "2D SWE & Hydrostatic Reconstruction",
    },
    {
        "domain": "urban_1d_2d_swmm_coupling",
        "query": "all:\"urban flood\" AND (all:\"hydrodynamic\" OR all:\"sewer\" OR all:\"drainage\")",
        "category": "1D/2D Urban SWMM Coupling & Surcharge",
    },
    {
        "domain": "friction_infiltration_microtopo",
        "query": "all:\"flood inundation\" AND (all:\"Manning\" OR all:\"infiltration\" OR all:\"subgrid\")",
        "category": "Infiltration, Friction & Microtopography",
    },
    {
        "domain": "hazard_evacuation_routing",
        "query": "all:\"flood\" AND (all:\"evacuation\" OR all:\"routing\" OR all:\"hazard\")",
        "category": "Dynamic Evacuation & D x V Road Hazard",
    },
]

headers = {
    "User-Agent": "UFNS-Scientific-Researcher/4.1 (SIH Urban Flood Research)"
}

downloaded_papers = []

for q_info in QUERIES:
    domain = q_info["domain"]
    q_str = q_info["query"]
    cat = q_info["category"]
    
    print(f"Searching arXiv for: {cat}...")
    params = {
        "search_query": q_str,
        "start": 0,
        "max_results": 2,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }
    url = f"http://export.arxiv.org/api/query?{urllib.parse.urlencode(params)}"
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            xml_data = resp.read().decode("utf-8")
    except Exception as e:
        print(f"Error querying arXiv: {e}")
        time.sleep(3)
        continue
        
    root = ET.fromstring(xml_data)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entries = root.findall("atom:entry", ns)
    
    for entry in entries:
        arxiv_id_elem = entry.find("atom:id", ns)
        arxiv_url = arxiv_id_elem.text if arxiv_id_elem is not None else ""
        arxiv_id = arxiv_url.split("/abs/")[-1]
        
        title_elem = entry.find("atom:title", ns)
        title = " ".join(title_elem.text.split()) if title_elem is not None else "Untitled"
        
        summary_elem = entry.find("atom:summary", ns)
        summary = " ".join(summary_elem.text.split()) if summary_elem is not None else ""
        
        authors = [a.find("atom:name", ns).text for a in entry.findall("atom:author", ns) if a.find("atom:name", ns) is not None]
        published = entry.find("atom:published", ns).text if entry.find("atom:published", ns) is not None else ""
        
        pdf_url = f"http://arxiv.org/pdf/{arxiv_id}.pdf"
        
        print(f"  [{arxiv_id}] {title}")
        
        paper_record = {
            "arxiv_id": arxiv_id,
            "title": title,
            "authors": authors,
            "published": published,
            "category": cat,
            "domain": domain,
            "abstract": summary,
            "pdf_url": pdf_url,
            "arxiv_url": arxiv_url,
        }
        
        meta_file = RESEARCH_DIR / f"{domain}_{arxiv_id.replace('/', '_')}.json"
        meta_file.write_text(json.dumps(paper_record, indent=2), encoding="utf-8")
        
        summary_md = RESEARCH_DIR / f"{domain}_{arxiv_id.replace('/', '_')}_summary.md"
        summary_md.write_text(
            f"# {title}\n\n"
            f"**Authors:** {', '.join(authors)}\n"
            f"**Published:** {published}\n"
            f"**ArXiv ID:** [{arxiv_id}]({arxiv_url})\n"
            f"**Category:** {cat}\n\n"
            f"## Abstract\n\n{summary}\n",
            encoding="utf-8"
        )
        
        pdf_file = RESEARCH_DIR / f"{domain}_{arxiv_id.replace('/', '_')}.pdf"
        if not pdf_file.exists():
            print(f"  Downloading PDF: {pdf_file.name}...")
            time.sleep(3)
            try:
                pdf_req = urllib.request.Request(pdf_url, headers=headers)
                with urllib.request.urlopen(pdf_req, timeout=60) as p_resp, open(pdf_file, "wb") as f_out:
                    f_out.write(p_resp.read())
                print(f"  ✓ Saved {pdf_file.name}")
            except Exception as pe:
                print(f"  PDF download notice: {pe}")
                
        downloaded_papers.append(paper_record)
        time.sleep(3)

print("Harvest of all scientific categories complete.")
