import json
import os
from datetime import datetime
from typing import List
from collections import Counter
from ..models import ProblemStatement

def export_to_json(statements: List[ProblemStatement], output_path: str) -> str:
    """
    Exports the problem statements to a structured JSON file with metadata.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    categories = Counter(ps.category for ps in statements)
    themes = Counter(ps.theme for ps in statements)
    organizations = Counter(ps.organization for ps in statements)
    
    payload = {
        "metadata": {
            "title": "Smart India Hackathon (SIH) 2026 Problem Statements",
            "source_url": "https://sih.gov.in/sih2026PS",
            "extracted_at": datetime.now().isoformat(),
            "total_problem_statements": len(statements),
            "statistics": {
                "by_category": dict(sorted(categories.items())),
                "by_theme": dict(sorted(themes.items())),
                "total_organizations": len(organizations)
            }
        },
        "problem_statements": [ps.to_dict() for ps in statements]
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        
    return output_path
