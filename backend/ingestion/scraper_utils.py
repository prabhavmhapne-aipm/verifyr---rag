"""
Scraper Utilities — Verifyr Web Scraping Pipeline

ContentCleaner: normalises raw scraped text (encoding, whitespace, min word check)
JSONSaver: saves structured review JSON to data/raw/<product_id>/reviews/

Isolation: this module has no imports from the existing RAG pipeline.
It does not affect pdf_processor.py, chunker.py, or any existing endpoint.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse


# ---------------------------------------------------------------------------
# Language detection (optional — graceful fallback if langdetect not installed)
# ---------------------------------------------------------------------------
try:
    from langdetect import detect as _detect_lang
    _LANGDETECT_AVAILABLE = True
except ImportError:
    _LANGDETECT_AVAILABLE = False


def detect_language(text: str) -> str:
    """Return 'de' or 'en'. Falls back to 'de' if langdetect unavailable or uncertain."""
    if not _LANGDETECT_AVAILABLE or not text or len(text.split()) < 20:
        return "de"
    try:
        lang = _detect_lang(text[:2000])
        return lang if lang in ("de", "en") else "de"
    except Exception:
        return "de"


# ---------------------------------------------------------------------------
# ContentCleaner
# ---------------------------------------------------------------------------

MIN_WORD_COUNT = 100


class ContentCleaner:
    """
    Normalises text scraped from external sources.

    Does NOT touch HTML parsing or DOM extraction — that is the scraper's job.
    Input is already plain text (e.g. review bodies concatenated by AmazonScraper).
    """

    def clean(self, text: str) -> str:
        """Normalise encoding, collapse whitespace, strip control characters."""
        if not text:
            return ""

        # Normalise common encoding artifacts
        replacements = {
            "\u00e4": "ä", "\u00f6": "ö", "\u00fc": "ü",
            "\u00c4": "Ä", "\u00d6": "Ö", "\u00dc": "Ü",
            "\u00df": "ß", "\u2019": "'", "\u201c": '"', "\u201d": '"',
            "\u2013": "–", "\u2014": "—", "\u00a0": " ",
        }
        for bad, good in replacements.items():
            text = text.replace(bad, good)

        # Strip control characters (keep newlines and tabs)
        text = re.sub(r"[^\S\n\t ]+", " ", text)

        # Collapse excessive blank lines
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    def validate(self, text: str) -> None:
        """Raise ValueError if text is too short to be useful."""
        word_count = len(text.split())
        if word_count < MIN_WORD_COUNT:
            raise ValueError(
                f"Content too short: {word_count} words (minimum {MIN_WORD_COUNT}). "
                "Scrape returned insufficient text — check the URL or Firecrawl schema."
            )


# ---------------------------------------------------------------------------
# JSONSaver
# ---------------------------------------------------------------------------

class JSONSaver:
    """
    Saves a scraped review as a structured JSON file under
    data/raw/<product_id>/reviews/<filename>.json

    Filename convention: <source_domain>_review_<DDMMYYYY>.json
    e.g. amazon.de_review_20032026.json
    """

    def __init__(self, data_root: Optional[Path] = None):
        if data_root is None:
            # Resolve relative to project root (two levels up from this file)
            data_root = Path(__file__).parent.parent.parent / "data" / "raw"
        self.data_root = data_root

    def _build_filename(self, source_url: str, doc_type: str, review_date: Optional[str] = None) -> str:
        domain = urlparse(source_url).netloc.lower()
        # Strip www. prefix
        domain = re.sub(r"^www\.", "", domain)
        if review_date:
            try:
                dt = datetime.strptime(review_date, "%Y-%m-%d")
                date_str = dt.strftime("%d%m%Y")
            except ValueError:
                date_str = datetime.now().strftime("%d%m%Y")
        else:
            date_str = datetime.now().strftime("%d%m%Y")
        return f"{domain}_{doc_type}_{date_str}.json"

    def _reviews_dir(self, product_id: str) -> Path:
        return self.data_root / product_id / "reviews"

    def save(
        self,
        product_id: str,
        source_url: str,
        source_name: str,
        doc_type: str,
        content: str,
        language: str,
        scraper_used: str,
        title: str = "",
        review_date: Optional[str] = None,
        amazon_rating: Optional[float] = None,
        amazon_review_count: Optional[int] = None,
        amazon_price: Optional[str] = None,
        product_url: Optional[str] = None,
        raw_markdown: Optional[str] = None,
        sentiment: Optional[dict] = None,
        force: bool = False,
    ) -> Path:
        """
        Build and save the JSON file. Returns the saved file path.
        Raises FileExistsError if file already exists and force=False.
        """
        reviews_dir = self._reviews_dir(product_id)
        reviews_dir.mkdir(parents=True, exist_ok=True)

        filename = self._build_filename(source_url, doc_type, review_date)
        file_path = reviews_dir / filename

        if file_path.exists() and not force:
            raise FileExistsError(
                f"File already exists: {file_path}. Use force=true to overwrite."
            )

        payload = {
            "product_id": product_id,
            "source_url": source_url,
            "source_name": source_name,
            "doc_type": doc_type,
            "language": language,
            "scraped_date": datetime.now().strftime("%Y-%m-%d"),
            "title": title,
            "content": content,
        }

        if review_date is not None:
            payload["review_date"] = review_date

        if amazon_rating is not None:
            payload["amazon_rating"] = amazon_rating
        if amazon_review_count is not None:
            payload["amazon_review_count"] = amazon_review_count
        if amazon_price is not None:
            payload["amazon_price"] = amazon_price
        if product_url is not None:
            payload["product_url"] = product_url
        if raw_markdown is not None:
            payload["raw_markdown"] = raw_markdown
        if sentiment is not None:
            payload["sentiment"] = sentiment

        file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        # Invalidate sentiment cache so next request re-runs analysis
        cache_file = reviews_dir / "_sentiment_cache.json"
        if cache_file.exists():
            cache_file.unlink()

        return file_path
