import html
import re
import logging
from typing import List
from bs4 import BeautifulSoup, Tag
from .models import ProblemStatement

logger = logging.getLogger(__name__)

def clean_mojibake(text: str) -> str:
    """
    Cleans common encoding artifacts, double-encoded UTF-8 sequences,
    and corrupted range dashes (e.g. 0â€"3 hour, 0"6 hr, 1"3 km).
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
        
    # Fix numerical ranges (e.g., 0"6, 0-3, 1"3 km, 0â€"3 hour)
    text = re.sub(r'(\d+)\s*(?:[\ufffd\u2013\u2014]|â€["“”–—]|•\s*["”]?|\s*["”]\s*)\s*(\d+)', r'\1 - \2', text)
    
    # Fix remaining standalone \ufffd (replacement char) -> bullet
    text = text.replace('\ufffd', ' • ')
    
    # Normalize dashes and spaces
    text = re.sub(r'\s*-\s*-\s*', ' - ', text)
    
    return text

def clean_text(raw: str) -> str:
    """
    Cleans raw HTML / text string, unescapes HTML entities,
    standardizes whitespace, bullets, headings, and linebreaks.
    """
    if not raw:
        return ""
    
    # Unescape HTML entities (e.g., &amp;, &#8226;)
    text = html.unescape(raw)
    
    # Clean mojibake and encoding glitches
    text = clean_mojibake(text)
    
    # Normalize unicode symbols and corrupted/replacement characters
    text = text.replace('&#8226;', ' • ')
    text = text.replace('\u2022', ' • ')
    text = text.replace('\xa0', ' ')
    text = text.replace('\u200b', '')
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    text = text.replace('“', '"').replace('”', '"')
    text = text.replace('‘', "'").replace('’', "'")
    
    # Separate major section headings onto their own lines
    headings = [
        "Background:", "Description:", "Problem Description:", "Expected Solution:",
        "Key Requirements:", "Objectives:", "Scope of Work:", "Deliverables:",
        "The solution should:", "The platform should:", "The system should:",
        "The proposed solution should include:", "The proposed system should:",
        "The solution must:", "The platform must:"
    ]
    for h in headings:
        pattern = re.compile(rf'(?<!\n)(?:[\.\s])\b({re.escape(h)})', re.IGNORECASE)
        text = pattern.sub(r'\n\n\1\n', text)

    # Break lettered list items (a., b., c., etc.) onto their own lines
    pattern_letters = re.compile(r'(?<!\n)(?<=[\.\:\s])\s*([a-z]\.)\s+', re.IGNORECASE)
    text = pattern_letters.sub(r'\n\1 ', text)
    
    # Break numbered list items (1., 2., 3., etc.) onto their own lines
    pattern_numbers = re.compile(r'(?<!\n)(?<=[\.\:\s])\s*(\d+\.)\s+')
    text = pattern_numbers.sub(r'\n\1 ', text)
    
    # Break bullets (•) onto their own lines
    pattern_bullets = re.compile(r'(?<!\n)\s*•\s*')
    text = pattern_bullets.sub(r'\n• ', text)

    # Clean multiple spaces within each line while preserving clean linebreaks
    cleaned_lines = []
    prev_empty = False
    for line in text.split('\n'):
        l = re.sub(r'[ \t]+', ' ', line).strip()
        if l:
            cleaned_lines.append(l)
            prev_empty = False
        elif not prev_empty:
            cleaned_lines.append('')
            prev_empty = True
            
    return '\n'.join(cleaned_lines).strip()

def extract_cell_html_text(cell: Tag) -> str:
    """
    Extracts text from a tag while preserving `<br>` as newlines
    and extracting href attributes from links.
    """
    for br in cell.find_all(['br', 'p', 'div']):
        br.replace_with('\n' + br.get_text() + '\n')
    
    return clean_text(cell.get_text())

def extract_links(cell: Tag) -> List[str]:
    """Extracts any non-empty hrefs from links in the cell."""
    links = []
    for a in cell.find_all('a'):
        href = a.get('href', '').strip()
        if href and href not in ('#', 'javascript:void(0)', ''):
            links.append(href)
    return links

def parse_problem_statements(html_content: str) -> List[ProblemStatement]:
    """
    Parses problem statements from the SIH page HTML content.
    Returns a list of ProblemStatement instances.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    table = soup.find('table', {'id': 'ProblemStatements'}) or soup.find('table')
    if not table:
        logger.error("No table found in HTML content!")
        return []
    
    tbody = table.find('tbody')
    rows = tbody.find_all('tr', recursive=False) if tbody else table.find_all('tr', recursive=False)
    
    data_rows = [r for r in rows if r.find_all('td', recursive=False)]
    logger.info(f"Found {len(data_rows)} problem statement rows in table.")
    
    statements: List[ProblemStatement] = []
    
    for row_idx, row in enumerate(data_rows, start=1):
        tds = row.find_all('td', recursive=False)
        if len(tds) < 4:
            continue
            
        try:
            s_no_raw = clean_text(tds[0].get_text())
            s_no = int(s_no_raw) if s_no_raw.isdigit() else row_idx
            
            org_main = clean_text(tds[1].get_text())
            category_main = clean_text(tds[3].get_text()) if len(tds) > 3 else ""
            code_main = clean_text(tds[4].get_text()) if len(tds) > 4 else ""
            submissions = clean_text(tds[5].get_text()) if len(tds) > 5 else ""
            theme_main = clean_text(tds[6].get_text()) if len(tds) > 6 else ""
            deadline = clean_text(tds[7].get_text()) if len(tds) > 7 else ""
            
            col2 = tds[2]
            title_tag = col2.find('a')
            title = clean_text(title_tag.get_text()) if title_tag else ""
            
            modal_data = {}
            nested_table = col2.find('table')
            if nested_table:
                for n_tr in nested_table.find_all('tr'):
                    cells = n_tr.find_all(['th', 'td'])
                    if len(cells) >= 2:
                        k = clean_text(cells[0].get_text()).lower()
                        v_cell = cells[1]
                        v_text = extract_cell_html_text(v_cell)
                        v_links = extract_links(v_cell)
                        
                        modal_data[k] = {
                            "text": v_text,
                            "links": v_links
                        }
            
            ps_id = modal_data.get('problem statement id', {}).get('text', '')
            if not ps_id:
                m = re.search(r'\d+', code_main)
                ps_id = m.group(0) if m else str(s_no)
                
            detailed_title = modal_data.get('problem statement title', {}).get('text', '')
            if detailed_title:
                title = detailed_title
                
            description = modal_data.get('description', {}).get('text', '')
            organization = modal_data.get('organization', {}).get('text', '') or org_main
            department = modal_data.get('department', {}).get('text', '') or organization
            category = modal_data.get('category', {}).get('text', '') or category_main
            theme = modal_data.get('theme', {}).get('text', '') or theme_main
            
            yt_info = modal_data.get('youtube link', {})
            yt_links = yt_info.get('links', [])
            yt_text = yt_info.get('text', '')
            youtube_link = yt_links[0] if yt_links else yt_text
            if youtube_link in (' ', 'N/A', 'NA', 'None', '-'):
                youtube_link = ""
                
            ds_info = modal_data.get('dataset link', {})
            ds_links = ds_info.get('links', [])
            ds_text = ds_info.get('text', '')
            dataset_link = ds_links[0] if (ds_links and not ds_text) else ds_text
            if dataset_link in (' ', 'N/A', 'NA', 'None', '-'):
                dataset_link = ""
                
            contact_info = modal_data.get('contact info', {}).get('text', '')
            if contact_info in (' ', 'N/A', 'NA', 'None', '-'):
                contact_info = ""
                
            ps = ProblemStatement(
                s_no=s_no,
                id=ps_id,
                code=code_main or f"SIH{ps_id}",
                title=title,
                category=category,
                theme=theme,
                organization=organization,
                department=department,
                description=description,
                youtube_link=youtube_link,
                dataset_link=dataset_link,
                contact_info=contact_info,
                submissions=submissions,
                deadline=deadline
            )
            statements.append(ps)
            
        except Exception as e:
            logger.warning(f"Error parsing row {row_idx}: {e}")
            continue
            
    logger.info(f"Successfully parsed {len(statements)} problem statements.")
    return statements
