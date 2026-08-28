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
        "domain": "nowcasting_optical_flow",
        "query": "all:\"precipitation nowcasting\" AND (all:\"optical flow\" OR all:\"deep learning\")",
        "category": "Precipitation Nowcasting & Optical Flow",
    },
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
    "User-Agent": "UFNS-Research-Harvester/4.1 (SIH Urban Flood Nowcasting System Research; contact: dev@vynex.local)"
}

downloaded_papers = []

print("=" * 80)
print("  UFNS RESEARCH PAPER HARVESTER — SEARCHING & DOWNLOADING PAPERS")
print("=" * 80)

for idx, q_info in enumerate(QUERIES, start=1):
    domain = q_info["domain"]
    q_str = q_info["query"]
    cat = q_info["category"]
    
    print(f"\n[{idx}/5] Searching arXiv for: {cat}...")
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
        print(f"  Error querying arXiv: {e}")
        time.sleep(3)
        continue
    
    root = ET.fromstring(xml_data)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    
    entries = root.findall("atom:entry", ns)
    print(f"  Found {len(entries)} matching publications.")
    
    for e_idx, entry in enumerate(entries, start=1):
        arxiv_id_elem = entry.find("atom:id", ns)
        arxiv_url = arxiv_id_elem.text if arxiv_id_elem is not None else ""
        arxiv_id = arxiv_url.split("/abs/")[-1]
        
        title_elem = entry.find("atom:title", ns)
        title = " ".join(title_elem.text.split()) if title_elem is not None else "Untitled"
        
        summary_elem = entry.find("atom:summary", ns)
        summary = " ".join(summary_elem.text.split()) if summary_elem is not None else ""
        
        authors = [a.find("atom:name", ns).text for a in entry.findall("atom:author", ns) if a.find("atom:name", ns) is not None]
        
        published_elem = entry.find("atom:published", ns)
        published = published_elem.text if published_elem is not None else ""
        
        pdf_url = ""
        for link in entry.findall("atom:link", ns):
            if link.attrib.get("title") == "pdf" or link.attrib.get("type") == "application/pdf":
                pdf_url = link.attrib.get("href", "")
                break
        if not pdf_url:
            pdf_url = f"http://arxiv.org/pdf/{arxiv_id}.pdf"
            
        print(f"    Paper {e_idx}: [{arxiv_id}] {title[:75]}...")
        print(f"    Authors: {', '.join(authors[:3])} et al. ({published[:4]})")
        
        # Save metadata and abstract
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
        
        # Save summary text
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
        
        # Download PDF if available
        pdf_file = RESEARCH_DIR / f"{domain}_{arxiv_id.replace('/', '_')}.pdf"
        if not pdf_file.exists():
            print(f"    Downloading PDF to {pdf_file.name}...")
            time.sleep(3) # Respect arXiv rate limits
            try:
                pdf_req = urllib.request.Request(pdf_url, headers=headers)
                with urllib.request.urlopen(pdf_req, timeout=60) as p_resp, open(pdf_file, "wb") as f_out:
                    f_out.write(p_resp.read())
                print(f"    ✓ Downloaded {pdf_file.name} ({pdf_file.stat().st_size // 1024} KB)")
            except Exception as pe:
                print(f"    Notice: PDF download skipped ({pe}); abstract and metadata stored.")
                
        downloaded_papers.append(paper_record)
        time.sleep(3)

# Index all downloaded papers
index_file = RESEARCH_DIR / "research_index.json"
index_file.write_text(json.dumps(downloaded_papers, indent=2), encoding="utf-8")

print("\n" + "=" * 80)
print(f"  HARVEST COMPLETE: {len(downloaded_papers)} Research Papers Downloaded and Indexed in /research")
print("=" * 80)
