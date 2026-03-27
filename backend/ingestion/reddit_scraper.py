"""
Reddit Scraper for Verifyr

Fetches Reddit posts/comments for a product and generates LLM sentiment analysis.
Saves results to data/raw/<product_id>/reddit/reddit_analysis_<DDMMYYYY>.json

Usage (CLI):
    python backend/ingestion/reddit_scraper.py --product-id apple_watch_series11_2025 --product-name "Apple Watch Series 11"
"""

import json
import os
import sys
import argparse
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import requests

# ============================================================================
# Subreddit mapping
# ============================================================================

def get_subreddits_for_product(product_id: str) -> list:
    """Map product_id to the dedicated community subreddits."""
    pid = product_id.lower()
    if "apple_watch" in pid:
        return ["AppleWatch"]
    elif "garmin" in pid:
        return ["Garmin"]
    elif "oura_ring" in pid:
        return ["ouraring"]
    elif "whoop" in pid:
        return ["whoop"]
    elif "ringconn" in pid:
        return ["RingConn"]
    elif "amazfit" in pid:
        return ["amazfit"]
    else:
        return ["AppleWatch", "Garmin", "ouraring", "whoop", "RingConn", "amazfit"]


# ============================================================================
# Fetch Reddit posts
# ============================================================================

HEADERS = {
    "User-Agent": "Verifyr/1.0 Reddit Community Aggregator"
}


def _fetch_subreddit_search(search_term: str, subreddit: str, limit: int = 10) -> list:
    """Search within a specific subreddit."""
    url = f"https://www.reddit.com/r/{subreddit}/search.json"
    params = {
        "q": search_term,
        "restrict_sr": "1",
        "sort": "relevance",
        "t": "year",
        "limit": limit
    }
    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            return []
        data = resp.json()
        posts = []
        for item in data.get("data", {}).get("children", []):
            pd = item.get("data", {})
            permalink = pd.get("permalink", "")
            posts.append({
                "title": pd.get("title", ""),
                "subreddit": f"r/{pd.get('subreddit', subreddit)}",
                "subreddit_url": f"https://www.reddit.com/r/{pd.get('subreddit', subreddit)}/",
                "url": f"https://www.reddit.com{permalink}" if permalink else "",
                "score": pd.get("score", 0),
                "num_comments": pd.get("num_comments", 0),
                "selftext": (pd.get("selftext") or "")[:400],
                "created_utc": pd.get("created_utc", 0),
            })
        return posts
    except Exception:
        return []


def _fetch_global_search(search_term: str, limit: int = 15) -> list:
    """Global Reddit search (all subreddits)."""
    url = "https://www.reddit.com/search.json"
    params = {
        "q": search_term,
        "sort": "relevance",
        "t": "year",
        "limit": limit,
        "type": "link"
    }
    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            return []
        data = resp.json()
        posts = []
        for item in data.get("data", {}).get("children", []):
            pd = item.get("data", {})
            permalink = pd.get("permalink", "")
            posts.append({
                "title": pd.get("title", ""),
                "subreddit": f"r/{pd.get('subreddit', '')}",
                "subreddit_url": f"https://www.reddit.com/r/{pd.get('subreddit', '')}/",
                "url": f"https://www.reddit.com{permalink}" if permalink else "",
                "score": pd.get("score", 0),
                "num_comments": pd.get("num_comments", 0),
                "selftext": (pd.get("selftext") or "")[:400],
                "created_utc": pd.get("created_utc", 0),
            })
        return posts
    except Exception:
        return []


def fetch_reddit_posts(product_id: str, search_term: str, max_posts: int = 30, subreddits: list = None) -> tuple:
    """
    Fetch Reddit posts by searching within the product's dedicated subreddits.
    subreddits: list from products_metadata.json; falls back to hardcoded mapping if not provided.
    Returns (posts_list, searched_subreddits_list).
    """
    if not subreddits:
        subreddits = get_subreddits_for_product(product_id)
    all_posts = []
    posts_per_sr = max(10, max_posts // len(subreddits))

    for sr in subreddits:
        posts = _fetch_subreddit_search(search_term, sr, limit=posts_per_sr)
        all_posts.extend(posts)
        time.sleep(0.5)  # Be polite to Reddit API

    # Deduplicate by URL, sort by score
    seen_urls = set()
    unique = []
    for p in sorted(all_posts, key=lambda x: x["score"], reverse=True):
        if p["url"] and p["url"] not in seen_urls:
            seen_urls.add(p["url"])
            unique.append(p)

    return unique[:max_posts], subreddits


# ============================================================================
# LLM Sentiment Analysis
# ============================================================================

def analyze_with_llm(posts: list, product_name: str, openai_api_key: str) -> dict:
    """
    Use GPT-4o-mini to analyze Reddit post sentiment for the product.
    Returns structured sentiment data.
    """
    from openai import OpenAI
    client = OpenAI(api_key=openai_api_key)

    # Build corpus from post titles + selftext
    corpus_parts = []
    for p in posts[:20]:
        entry = f"[{p['subreddit']}] {p['title']}"
        if p.get("selftext") and len(p["selftext"].strip()) > 30:
            entry += f"\n{p['selftext'][:300]}"
        corpus_parts.append(entry)

    corpus = "\n\n---\n\n".join(corpus_parts[:15])

    if not corpus.strip():
        return _empty_sentiment()

    prompt = f"""Analysiere die folgenden Reddit-Beiträge über "{product_name}" und erstelle ein JSON-Objekt.

{{
  "positive_pct": <Ganzzahl 0-100>,
  "neutral_pct": <Ganzzahl 0-100>,
  "negative_pct": <Ganzzahl 0-100>,
  "summary": "<1-2 Sätze auf Deutsch: Gesamteinschätzung der Reddit-Community>",
  "summary_en": "<same summary in English>",
  "pros": ["<3-5 kurze Phrasen auf Deutsch: gelobte Aspekte>"],
  "pros_en": ["<same in English>"],
  "cons": ["<3-5 kurze Phrasen auf Deutsch: kritisierte Aspekte>"],
  "cons_en": ["<same in English>"],
  "common_topics": ["<3-5 häufig diskutierte Themen>"]
}}

Reddit-Beiträge:
{corpus}

Antworte nur mit dem JSON-Objekt, kein Markdown."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=700
        )
        content = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])
        return json.loads(content)
    except Exception as e:
        print(f"⚠️  LLM analysis error: {e}")
        return _empty_sentiment()


def _empty_sentiment() -> dict:
    return {
        "positive_pct": 0,
        "neutral_pct": 100,
        "negative_pct": 0,
        "summary": "Keine ausreichenden Reddit-Daten verfügbar.",
        "summary_en": "Insufficient Reddit data available.",
        "pros": [],
        "pros_en": [],
        "cons": [],
        "cons_en": [],
        "common_topics": []
    }


# ============================================================================
# Main scrape function
# ============================================================================

def scrape_reddit_for_product(
    product_id: str,
    product_name: str,
    data_root: Path,
    openai_api_key: Optional[str] = None,
    max_posts: int = 30,
    subreddits: list = None
) -> dict:
    """
    Full pipeline: fetch Reddit posts → LLM sentiment analysis → save JSON.

    Returns the saved analysis dict.
    Raises RuntimeError if no posts found and no existing data.
    """
    print(f"🔍 Fetching Reddit posts for: {product_name}")
    posts, searched_subreddits = fetch_reddit_posts(product_id, product_name, max_posts=max_posts, subreddits=subreddits)
    print(f"   Found {len(posts)} posts across: {searched_subreddits}")

    if not posts:
        raise RuntimeError(
            f"No Reddit posts found for '{product_name}'. "
            "Try a different search term or check your internet connection."
        )

    # Subreddits with actual results (subset of searched)
    subreddits_found = sorted(set(p["subreddit"] for p in posts if p["subreddit"]))

    # Top posts for frontend display (top 8 by score)
    top_posts = [
        {
            "title": p["title"],
            "url": p["url"],
            "subreddit": p["subreddit"],
            "subreddit_url": p["subreddit_url"],
            "score": p["score"],
            "num_comments": p["num_comments"]
        }
        for p in posts[:8]
    ]

    # LLM sentiment
    sentiment = {}
    if openai_api_key:
        print("   Running LLM sentiment analysis...")
        sentiment = analyze_with_llm(posts, product_name, openai_api_key)
    else:
        print("   ⚠️  No OpenAI API key — skipping LLM analysis")
        sentiment = _empty_sentiment()

    # Build result
    today = datetime.now().strftime("%d%m%Y")
    result = {
        "product_id": product_id,
        "product_name": product_name,
        "scraped_date": datetime.now().isoformat(),
        "post_count": len(posts),
        "searched_subreddits": [f"r/{sr}" for sr in searched_subreddits],
        "subreddits_found": subreddits_found,
        "top_posts": top_posts,
        "sentiment": sentiment
    }

    # Save to data/raw/<product_id>/reddit/
    reddit_dir = data_root / product_id / "reddit"
    reddit_dir.mkdir(parents=True, exist_ok=True)
    out_path = reddit_dir / f"reddit_analysis_{today}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ Saved: {out_path}")

    return result


# ============================================================================
# CLI entry point
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape Reddit sentiment for a Verifyr product")
    parser.add_argument("--product-id", required=True, help="Product ID (folder name in data/raw/)")
    parser.add_argument("--product-name", required=True, help="Human-readable product name for search")
    parser.add_argument("--max-posts", type=int, default=30, help="Max posts to fetch (default: 30)")
    args = parser.parse_args()

    data_root = Path(__file__).parent.parent.parent / "data" / "raw"
    openai_key = os.environ.get("OPENAI_API_KEY")

    result = scrape_reddit_for_product(
        product_id=args.product_id,
        product_name=args.product_name,
        data_root=data_root,
        openai_api_key=openai_key,
        max_posts=args.max_posts
    )

    print(f"\n📊 Sentiment: {result['sentiment'].get('positive_pct')}% positive")
    print(f"📝 Summary: {result['sentiment'].get('summary')}")
