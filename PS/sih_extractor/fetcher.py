import os
import ssl
import urllib.request
import logging

logger = logging.getLogger(__name__)

SIH_URL = "https://sih.gov.in/sih2026PS"

def fetch_html(url: str = SIH_URL, cache_file: str = "page_cache.html", force_refresh: bool = False) -> str:
    """
    Fetches the HTML content of the SIH Problem Statements page.
    If cache_file exists and not force_refresh, returns cached content.
    """
    if not force_refresh and os.path.exists(cache_file):
        logger.info(f"Loading cached HTML from '{cache_file}'...")
        with open(cache_file, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    logger.info(f"Fetching live HTML from '{url}'...")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    # Cache for subsequent runs
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            f.write(html)
        logger.info(f"Saved HTML cache to '{cache_file}' ({len(html)} bytes).")
    except Exception as e:
        logger.warning(f"Could not save cache: {e}")

    return html
