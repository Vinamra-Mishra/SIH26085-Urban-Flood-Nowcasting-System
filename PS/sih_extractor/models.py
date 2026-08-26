from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any

@dataclass
class ProblemStatement:
    s_no: int
    id: str                  # e.g. "26001"
    code: str                # e.g. "SIH26001"
    title: str               # e.g. "AI-Based early warning and landslide Risk Monitoring System in NER"
    category: str            # e.g. "Software" or "Hardware"
    theme: str               # e.g. "Disaster Management"
    organization: str        # e.g. "Ministry of Development of North Eastern Region (MDoNER)"
    department: str          # e.g. "Ministry of Development of North Eastern Region (MDoNER)"
    description: str         # Full problem description text
    youtube_link: str = ""   # YouTube video URL or note
    dataset_link: str = ""   # Dataset link or instructions
    contact_info: str = ""   # Contact email / info
    submissions: str = ""    # e.g. "0/500"
    deadline: str = ""       # e.g. "20 September 2026"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
