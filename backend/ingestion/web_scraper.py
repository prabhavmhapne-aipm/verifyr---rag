"""
Web Scraper — Verifyr

Two scrapers:
  AmazonScraper  — Firecrawl markdown fetch (1 credit/page) + GPT-4o-mini extraction
  PlaywrightScraper — headless Chromium for any review/article URL (0 credits)

ScraperRouter routes:
  amazon.de → AmazonScraper
  everything else → PlaywrightScraper

Isolation: this module has no imports from the existing RAG pipeline.
It does not affect pdf_processor.py, chunker.py, or any existing endpoint.
"""

import os
import re
import json
from urllib.parse import urlparse
from typing import Dict, Any, Optional

from scraper_utils import ContentCleaner, detect_language

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

AMAZON_DOMAINS = ["amazon.de"]

DEFAULT_MAX_PAGES = 3

# 1 credit per page (markdown only — no Firecrawl JSON extraction mode)
CREDITS_PER_PAGE = 1

# Per-site CSS selectors for known review / article sites
SITE_SELECTORS: Dict[str, list] = {
    "amazon.de":           ["#productDescription", "#feature-bullets", "#customer-reviews_feature_div", "[data-hook='review']", "#cm_cr-review_list"],
    "techradar.com":       [".article-body", ".article__body", ".text-copy"],
    "heise.de":            ["article .text", ".article-content", ".meldung_wrapper"],
    "chip.de":             [".article__content", ".article-content"],
    "trustedreviews.com":  [".article__content", ".review-verdict", ".chunk"],
    "outdoorgearlab.com":  [".article-body", ".entry-content"],
    "garmin.com":          [".specs-table", ".product-description", ".feature-desc"],
    "apple.com":           [".specs", ".feature-summary", ".section-content"],
    "rtings.com":          [".review-container", ".article-body"],
    "digitaltrends.com":   [".article-body", ".article__body-content"],
    "theverge.com":        [".duet--article--article-body-component", ".c-entry-content"],
    "wired.com":           [".article__chunks", ".body__inner-container"],
    "pcmag.com":           [".article-wrap", ".content-wrap"],
}

# Common GDPR / cookie-consent button selectors (tried in order, first match wins)
COOKIE_CONSENT_SELECTORS = [
    "#sp-cc-accept",                          # Amazon.de cookie consent
    "#onetrust-accept-btn-handler",           # OneTrust (most common)
    ".fc-cta-consent",                        # Funding Choices (Google)
    "button.sp_choice_type_11",               # SourcePoint
    "[aria-label='Alle akzeptieren']",
    "[aria-label='Accept all']",
    "[aria-label='Alle Cookies akzeptieren']",
    "button[id*='accept-all']",
    "button[class*='accept-all']",
    "button[id*='cookie-accept']",
    "button[class*='cookie-accept']",
    ".cookie-consent button",
    "#cookie-accept",
    "button#accept-all",
]


# ---------------------------------------------------------------------------
# ScraperRouter
# ---------------------------------------------------------------------------

class ScraperRouter:
    """
    Detects which scraper to use based on the URL domain.
      amazon.de  → "amazon"   (Firecrawl + GPT-4o-mini)
      everything → "playwright" (headless Chromium)
    """

    @staticmethod
    def detect(url: str) -> str:
        domain = urlparse(url).netloc.lower().lstrip("www.")
        if any(domain == d or domain.endswith("." + d) for d in AMAZON_DOMAINS):
            return "amazon"
        return "playwright"


# ---------------------------------------------------------------------------
# AmazonScraper
# ---------------------------------------------------------------------------

class AmazonScraper:
    """
    Scrapes Amazon.de product reviews in two steps:

    1. Firecrawl fetches raw markdown — 1 credit per page, no LLM involved
    2. GPT-4o-mini extracts structured data (rating, count, reviews) from the markdown

    Raw markdown is preserved in the output so it can be saved and inspected.
    Credits used: 1 per page (markdown only).
    """

    GPT_EXTRACTION_PROMPT = """You are extracting data from an Amazon product reviews page.
The input is raw markdown scraped from the page. The page may be in German or English — keep all text in its original language, do not translate anything.

Extract and return a JSON object with this exact structure:
{
  "product_title": "<product name from the page>",
  "overall_rating": <average star rating as a number, e.g. 4.7>,
  "total_review_count": <total number of ratings shown on the page, e.g. 424>,
  "reviews": [
    {
      "rating": <star rating 1-5>,
      "title": "<review headline in original language>",
      "body": "<complete review text in original language, not truncated>",
      "date": "<review date as shown>",
      "verified_purchase": <true or false>
    }
  ]
}

Rules:
- Extract EVERY review visible in the markdown — do not skip any
- Keep ALL text in the original language of the page (German OR English) — never translate
- overall_rating and total_review_count come from the page summary (e.g. "4,7 von 5" / "4.7 out of 5" and "424 Bewertungen" / "424 ratings")
- If a field is not found, use null
- Return only valid JSON, no explanation

Markdown content:
"""

    def __init__(self, api_key: str = None, max_pages: int = DEFAULT_MAX_PAGES):
        self.api_key = api_key or os.environ.get("FIRECRAWL_API_KEY")
        if not self.api_key:
            raise RuntimeError(
                "FIRECRAWL_API_KEY not set. Add it to your .env file."
            )
        self.max_pages = max_pages
        self._cleaner = ContentCleaner()

        try:
            from firecrawl import Firecrawl
            self._fc = Firecrawl(api_key=self.api_key)
        except ImportError:
            raise RuntimeError(
                "firecrawl-py is not installed. Run: "
                ".\\venv\\Scripts\\pip.exe install firecrawl-py"
            )

        try:
            from openai import OpenAI
            self._openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        except ImportError:
            raise RuntimeError("openai package not installed.")

    def scrape(self, url: str, language_override: Optional[str] = None) -> Dict[str, Any]:
        """
        Scrape Amazon reviews from the given URL.

        Returns:
            title, content, raw_markdown, amazon_rating, amazon_review_count,
            language, credits_used
        """
        pages_to_scrape = self._build_page_urls(url)
        raw_pages = []
        credits_used = 0

        # Step 1 — fetch raw markdown from each page
        for page_url in pages_to_scrape:
            markdown = self._fetch_markdown(page_url)
            credits_used += CREDITS_PER_PAGE
            if markdown:
                raw_pages.append(markdown)
            else:
                break  # no content returned — stop paginating

        if not raw_pages:
            raise ValueError(
                "Firecrawl returned no content. Check the URL points to an Amazon "
                "reviews page (e.g. /product-reviews/ASIN) and is accessible."
            )

        combined_markdown = "\n\n---PAGE BREAK---\n\n".join(raw_pages)

        # Step 2 — extract structured data with GPT-4o-mini
        extracted = self._extract_with_gpt(combined_markdown)

        product_title  = extracted.get("product_title") or "Amazon Reviews"
        overall_rating = extracted.get("overall_rating")
        review_count   = extracted.get("total_review_count")
        reviews        = extracted.get("reviews") or []

        if not reviews:
            raise ValueError(
                "GPT-4o-mini could not extract any reviews from the scraped content. "
                "The page may have rendered without review text — try a different URL or increase max_pages."
            )

        # Flatten reviews into readable content string for RAG chunking + sentiment
        content = self._flatten_reviews(reviews, product_title)
        content = self._cleaner.clean(content)
        self._cleaner.validate(content)

        language = language_override or detect_language(content)

        return {
            "title": product_title,
            "content": content,
            "raw_markdown": combined_markdown,
            "amazon_rating": float(overall_rating) if overall_rating is not None else None,
            "amazon_review_count": int(review_count) if review_count is not None else None,
            "language": language,
            "credits_used": credits_used,
            "review_date": None,   # Amazon pages have no single publish date
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_page_urls(self, base_url: str) -> list:
        """Build list of paginated review page URLs."""
        clean_url = base_url.split("?")[0].rstrip("/")
        # No sortBy param — avoids triggering Amazon bot detection
        return [
            f"{clean_url}?pageNumber={i}"
            for i in range(1, self.max_pages + 1)
        ]

    def _fetch_markdown(self, url: str) -> Optional[str]:
        """Fetch raw markdown from a single page via Firecrawl (1 credit)."""
        response = self._fc.scrape(
            url,
            formats=["markdown"],
            timeout=60000
            # only_main_content omitted — it can strip the reviews section on Amazon
        )
        if isinstance(response, dict):
            return response.get("markdown") or ""
        return getattr(response, "markdown", "") or ""

    def _extract_with_gpt(self, markdown: str) -> Dict[str, Any]:
        """Use GPT-4o-mini to extract structured review data from raw markdown."""
        # Limit to ~20000 chars to capture more reviews across multiple pages
        content_input = markdown[:20000] if len(markdown) > 20000 else markdown

        response = self._openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": self.GPT_EXTRACTION_PROMPT + content_input}
            ],
            response_format={"type": "json_object"},
            max_tokens=4000,
            temperature=0.0,
        )

        raw = response.choices[0].message.content
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def _flatten_reviews(self, reviews: list, product_title: str) -> str:
        """Convert list of review dicts into a readable plain text block."""
        lines = []

        if product_title:
            lines.append(f"Produkt: {product_title}")
            lines.append("")

        for i, review in enumerate(reviews, 1):
            rating   = review.get("rating", "")
            title    = (review.get("title") or "").strip()
            body     = (review.get("body") or "").strip()
            date     = review.get("date", "")
            verified = review.get("verified_purchase", False)

            parts = [f"Bewertung {i}:"]
            if rating:
                parts.append(f"Sterne: {rating}/5")
            if title:
                parts.append(f"Titel: {title}")
            if date:
                parts.append(f"Datum: {date}")
            if verified:
                parts.append("Verifizierter Kauf")
            if body:
                parts.append(body)

            lines.append("\n".join(parts))
            lines.append("")

        return "\n".join(lines)


# ---------------------------------------------------------------------------
# PlaywrightScraper
# ---------------------------------------------------------------------------

class PlaywrightScraper:
    """
    Scrapes any review page or article using headless Chromium (Playwright).

    - Handles GDPR / cookie-consent popups automatically
    - Uses per-site CSS selectors (SITE_SELECTORS) with fallback to largest block
    - Stealth user-agent + fixed viewport to reduce bot detection
    - Credits used: 0 (no Firecrawl)

    Supported: techradar.com, heise.de, chip.de, trustedreviews.com,
               outdoorgearlab.com, garmin.com, apple.com, and any other URL
               via the largest-block fallback.
    """

    def __init__(self):
        self._cleaner = ContentCleaner()

    def scrape(self, url: str, language_override: Optional[str] = None) -> Dict[str, Any]:
        try:
            from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
        except ImportError:
            raise RuntimeError(
                "playwright not installed. Run: "
                ".\\venv\\Scripts\\pip.exe install playwright && "
                ".\\venv\\Scripts\\playwright.exe install chromium"
            )

        domain = re.sub(r"^www\.", "", urlparse(url).netloc.lower())

        title = ""
        content = ""

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )
            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1366, "height": 768},
                locale="de-DE",
                extra_http_headers={
                    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                },
            )
            # Patch navigator.webdriver so Amazon doesn't detect headless Chrome
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )
            page = context.new_page()

            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(2000)

                # Amazon-specific: click through "Weiter shoppen" bot-detection gate
                # This gate appears before the actual page content loads
                page_text = page.locator("body").inner_text()
                if "Weiter shoppen" in page_text or "continue shopping" in page_text.lower():
                    try:
                        # Try clicking the gate link/button
                        gate_link = page.get_by_text("Weiter shoppen").first
                        if gate_link.is_visible(timeout=1000):
                            gate_link.click()
                            page.wait_for_load_state("domcontentloaded", timeout=15000)
                            page.wait_for_timeout(3000)
                    except Exception:
                        pass

                # Dismiss cookie-consent popup if present
                for selector in COOKIE_CONSENT_SELECTORS:
                    try:
                        btn = page.locator(selector).first
                        if btn.is_visible(timeout=500):
                            btn.click()
                            page.wait_for_timeout(1000)
                            break
                    except Exception:
                        continue

                # Wait for page to settle after consent click
                page.wait_for_timeout(2000)

                title = page.title() or ""
                review_date = self._extract_publish_date(page)

                # Try known per-site selectors first
                known = SITE_SELECTORS.get(domain, [])
                for selector in known:
                    try:
                        el = page.locator(selector).first
                        if el.is_visible(timeout=1000):
                            text = el.inner_text()
                            if len(text.split()) >= 100:
                                content = text
                                break
                    except Exception:
                        continue

                # Fallback: largest semantic content block
                if len(content.split()) < 100:
                    content = self._extract_largest_block(page)

            except PWTimeout:
                raise ValueError(f"Page timed out loading: {url}")
            finally:
                browser.close()

        content = self._cleaner.clean(content)
        self._cleaner.validate(content)

        language = language_override or detect_language(content)

        # If meta-tag extraction didn't find a date, try regex on the cleaned content
        if not review_date:
            review_date = self._regex_date(content[:3000])

        return {
            "title": title,
            "content": content,
            "raw_markdown": None,        # Playwright extracts text, not markdown
            "amazon_rating": None,
            "amazon_review_count": None,
            "language": language,
            "credits_used": 0,
            "review_date": review_date,
        }

    def _extract_largest_block(self, page) -> str:
        """Extract text from the largest semantic content block on the page."""
        candidates = [
            "article", "main", "[role='main']",
            ".content", ".post-content", ".entry-content",
            "#content", ".page-content", ".article",
        ]
        best = ""
        for selector in candidates:
            try:
                el = page.locator(selector).first
                if el.is_visible(timeout=500):
                    text = el.inner_text()
                    if len(text.split()) > len(best.split()):
                        best = text
            except Exception:
                continue

        if len(best.split()) >= 100:
            return best
        # Last resort — full body
        return page.locator("body").inner_text()

    def _extract_publish_date(self, page) -> Optional[str]:
        """Try to extract the article's publish date from HTML meta tags or <time> elements."""
        meta_selectors = [
            ("meta[property='article:published_time']", "content"),
            ("meta[name='date']", "content"),
            ("meta[name='publish-date']", "content"),
            ("meta[name='pubdate']", "content"),
            ("meta[property='og:updated_time']", "content"),
            ("meta[itemprop='datePublished']", "content"),
        ]
        for selector, attr in meta_selectors:
            try:
                el = page.locator(selector).first
                val = el.get_attribute(attr, timeout=500)
                if val:
                    parsed = self._parse_date_str(val.strip())
                    if parsed:
                        return parsed
            except Exception:
                continue

        # Try <time datetime="...">
        try:
            el = page.locator("time[datetime]").first
            val = el.get_attribute("datetime", timeout=500)
            if val:
                parsed = self._parse_date_str(val.strip())
                if parsed:
                    return parsed
        except Exception:
            pass

        # Fallback: regex on first 3000 chars of page text
        try:
            text = page.locator("body").inner_text()[:3000]
            return self._regex_date(text)
        except Exception:
            pass

        return None

    def _parse_date_str(self, val: str) -> Optional[str]:
        """Parse a date string (ISO, slash, or common EN formats) to YYYY-MM-DD."""
        from datetime import datetime as _dt
        # ISO: 2025-10-22T... or 2025-10-22
        m = re.match(r'(\d{4}-\d{2}-\d{2})', val)
        if m:
            return m.group(1)
        # Slash: 2025/10/22
        m = re.match(r'(\d{4})/(\d{2})/(\d{2})', val)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        # Common formats
        for fmt in ('%B %d, %Y', '%b %d, %Y', '%d %B %Y', '%d %b %Y', '%d/%m/%Y', '%m/%d/%Y'):
            try:
                return _dt.strptime(val[:20], fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
        return None

    def _regex_date(self, text: str) -> Optional[str]:
        """Try regex patterns to extract a publish date from article text."""
        # ISO-like: 2025-10-22
        m = re.search(r'\b(20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b', text)
        if m:
            return m.group(1)

        # English: January 22, 2026  /  Jan 22, 2026  /  22 January 2026
        months_en = {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12',
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10',
            'nov': '11', 'dec': '12',
        }
        # Month Day, Year
        m = re.search(
            r'\b(january|february|march|april|may|june|july|august|september|october|november|december'
            r'|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)'
            r'\.?\s+(\d{1,2}),?\s+(20\d\d)\b',
            text, re.IGNORECASE,
        )
        if m:
            month = months_en.get(m.group(1).lower())
            day = m.group(2).zfill(2)
            year = m.group(3)
            if month:
                return f'{year}-{month}-{day}'

        # Day Month Year (English)
        m = re.search(
            r'\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december'
            r'|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)'
            r'\.?\s+(20\d\d)\b',
            text, re.IGNORECASE,
        )
        if m:
            month = months_en.get(m.group(2).lower())
            day = m.group(1).zfill(2)
            year = m.group(3)
            if month:
                return f'{year}-{month}-{day}'

        # German: 22. Oktober 2025
        months_de = {
            'januar': '01', 'februar': '02', 'märz': '03', 'april': '04',
            'mai': '05', 'juni': '06', 'juli': '07', 'august': '08',
            'september': '09', 'oktober': '10', 'november': '11', 'dezember': '12',
        }
        m = re.search(
            r'\b(\d{1,2})\.\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)'
            r'\s+(20\d\d)\b',
            text, re.IGNORECASE,
        )
        if m:
            day = m.group(1).zfill(2)
            month = months_de.get(m.group(2).lower())
            year = m.group(3)
            if month:
                return f'{year}-{month}-{day}'

        return None
