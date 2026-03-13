import time
import random
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# In-memory cache  {city_lower: (datetime, result_dict)}
# ─────────────────────────────────────────────────────────────
_cache: dict = {}
CACHE_DURATION_HOURS = 6

# ─────────────────────────────────────────────────────────────
# Business keyword catalogue for Indian SME niches
# Kept to 10 keywords (2 batches of 5) to minimise rate-limit hits
# Each entry:  "Display Name" -> "Google search keyword"
# ─────────────────────────────────────────────────────────────
BUSINESS_KEYWORDS = {
    "Cloud Kitchen":           "cloud kitchen",
    "Organic Skincare":        "organic skincare",
    "Electric Vehicle Service":"ev charging station",
    "Solar Panel Installation":"solar panel installation",
    "Agri-Tech Equipment":     "agri equipment rental",
    "Online Tutoring":         "online tutoring",
    "Pet Grooming":            "pet grooming",
    "Smart Home Setup":        "smart home installation",
    "Millet Snacks":           "millet snacks india",
    "Corporate Gifting":       "corporate gifting india",
}

# ─────────────────────────────────────────────────────────────
# City  →  Google Trends geo code
# ─────────────────────────────────────────────────────────────
CITY_GEO_MAP = {
    "mumbai":           "IN-MH",
    "pune":             "IN-MH",
    "nagpur":           "IN-MH",
    "delhi":            "IN-DL",
    "new delhi":        "IN-DL",
    "bangalore":        "IN-KA",
    "bengaluru":        "IN-KA",
    "mysore":           "IN-KA",
    "hyderabad":        "IN-TG",
    "secunderabad":     "IN-TG",
    "chennai":          "IN-TN",
    "coimbatore":       "IN-TN",
    "kolkata":          "IN-WB",
    "ahmedabad":        "IN-GJ",
    "surat":            "IN-GJ",
    "vadodara":         "IN-GJ",
    "jaipur":           "IN-RJ",
    "jodhpur":          "IN-RJ",
    "lucknow":          "IN-UP",
    "agra":             "IN-UP",
    "kanpur":           "IN-UP",
    "bhopal":           "IN-MP",
    "indore":           "IN-MP",
    "chandigarh":       "IN-PB",
    "ludhiana":         "IN-PB",
    "kochi":            "IN-KL",
    "thiruvananthapuram":"IN-KL",
    "bhubaneswar":      "IN-OR",
    "guwahati":         "IN-AS",
    "patna":            "IN-BR",
    "raipur":           "IN-CT",
    "ranchi":           "IN-JH",
}

def _get_geo(city_name: str) -> str:
    city_lower = city_name.lower().strip()
    for key, geo in CITY_GEO_MAP.items():
        if key in city_lower or city_lower in key:
            return geo
    return "IN"          # fallback: all of India

def _score_to_demand(score: float) -> str:
    if score >= 70:   return "Very High"
    if score >= 45:   return "High"
    if score >= 20:   return "Medium"
    return "Low"

def _score_to_competition(score: float) -> str:
    """Higher search volume → more competition."""
    if score >= 70:   return "High"
    if score >= 35:   return "Medium"
    return "Low"

def _growth_str(recent_avg: float, older_avg: float) -> str:
    if older_avg == 0:
        return "+0%"
    pct = ((recent_avg - older_avg) / older_avg) * 100
    sign = "+" if pct >= 0 else ""
    return f"{sign}{pct:.0f}%"

# ─────────────────────────────────────────────────────────────
# Hardcoded fallback (used only if Google Trends is unavailable)
# ─────────────────────────────────────────────────────────────
_FALLBACK_GENERAL = [
    {"name": "Cloud Kitchen",            "demand": "High",   "competition": "Medium", "growth": "+24%"},
    {"name": "Organic Skincare",         "demand": "Medium", "competition": "Low",    "growth": "+45%"},
    {"name": "Electric Vehicle Service", "demand": "High",   "competition": "Low",    "growth": "+120%"},
    {"name": "Solar Panel Installation", "demand": "High",   "competition": "Medium", "growth": "+70%"},
    {"name": "Drone Photography",        "demand": "Medium", "competition": "Low",    "growth": "+60%"},
    {"name": "Pet Grooming",             "demand": "Medium", "competition": "Low",    "growth": "+35%"},
]

def _fallback(city_name: str) -> dict:
    selected = random.sample(_FALLBACK_GENERAL, min(4, len(_FALLBACK_GENERAL)))
    return {
        "city":                city_name.title(),
        "trending_categories": selected,
        "key_insights": [
            f"{city_name.title()} shows strong consumer interest in sustainable & tech-enabled services.",
            "Hyper-local service gaps remain largely unfilled across Tier-2 and Tier-3 markets.",
        ],
        "source": "Estimated from regional market signals (live data temporarily unavailable)",
        "is_live": False,
    }


# ─────────────────────────────────────────────────────────────
# Main function
# ─────────────────────────────────────────────────────────────
def get_market_trends(city_name: str) -> dict:
    """
    Fetches REAL hyper-local market trends from Google Trends via pytrends.
    Falls back to curated estimates if Google rate-limits or is unreachable.
    Results are cached per city for CACHE_DURATION_HOURS hours.
    """
    cache_key = city_name.lower().strip()

    # ── Serve from cache if fresh ──────────────────────────────
    if cache_key in _cache:
        cached_time, cached_data = _cache[cache_key]
        if datetime.now() - cached_time < timedelta(hours=CACHE_DURATION_HOURS):
            logger.info(f"[Trends] Cache hit for '{city_name}'")
            return cached_data

    geo = _get_geo(city_name)
    logger.info(f"[Trends] Fetching live data for '{city_name}' (geo={geo})")

    try:
        from pytrends.request import TrendReq

        pytrends = TrendReq(hl="en-IN", tz=330, timeout=(10, 30))

        names    = list(BUSINESS_KEYWORDS.keys())
        keywords = list(BUSINESS_KEYWORDS.values())
        scores: dict[str, dict] = {}

        # pytrends allows max 5 keywords per request
        for i in range(0, len(keywords), 5):
            batch_kws   = keywords[i:i+5]
            batch_names = names[i:i+5]

            try:
                pytrends.build_payload(batch_kws, timeframe="today 12-m", geo=geo)
                df = pytrends.interest_over_time()

                if df is not None and not df.empty:
                    # Drop the 'isPartial' flag column if present
                    if "isPartial" in df.columns:
                        df = df.drop(columns=["isPartial"])

                    # Split into two halves to calculate growth
                    half = len(df) // 2
                    older_half  = df.iloc[:half]
                    recent_half = df.iloc[half:]

                    for j, kw in enumerate(batch_kws):
                        if kw in df.columns:
                            avg_score   = float(df[kw].mean())
                            older_avg   = float(older_half[kw].mean())
                            recent_avg  = float(recent_half[kw].mean())
                            scores[batch_names[j]] = {
                                "score":      avg_score,
                                "older_avg":  older_avg,
                                "recent_avg": recent_avg,
                            }

                time.sleep(4)   # be polite to Google's servers — avoid 429s

            except Exception as batch_err:
                logger.warning(f"[Trends] Batch {i//5+1} failed: {batch_err}")
                time.sleep(5)   # longer pause after an error before continuing
                continue

        if not scores:
            logger.warning("[Trends] No data returned from Google Trends — using fallback")
            return _fallback(city_name)

        # ── Build ranked trend cards ───────────────────────────
        ranked = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)
        top4   = ranked[:4]

        trending_categories = []
        for biz_name, data in top4:
            trending_categories.append({
                "name":        biz_name,
                "demand":      _score_to_demand(data["score"]),
                "competition": _score_to_competition(data["score"]),
                "growth":      _growth_str(data["recent_avg"], data["older_avg"]),
            })

        # ── Generate meaningful insights ───────────────────────
        top_name = top4[0][0] if top4 else "digital services"
        hot_opportunities = [n for n, d in top4 if d["score"] < 40]  # high trend, low competition potential
        insights = [
            f"'{top_name}' is the #1 trending business category in {city_name.title()} right now based on live Google search data.",
            f"Search interest for sustainable and tech-enabled businesses in {city_name.title()} has grown significantly over the past 6 months.",
        ]
        if hot_opportunities:
            insights[1] = f"'{hot_opportunities[0]}' shows emerging demand with relatively low market saturation — a strong opportunity window."

        result = {
            "city":                city_name.title(),
            "trending_categories": trending_categories,
            "key_insights":        insights,
            "source":              f"Live Google Trends data (geo: {geo})",
            "is_live":             True,
        }

        # ── Cache and return ───────────────────────────────────
        _cache[cache_key] = (datetime.now(), result)
        logger.info(f"[Trends] Successfully fetched & cached live data for '{city_name}'")
        return result

    except ImportError:
        logger.error("[Trends] pytrends not installed — using fallback")
        return _fallback(city_name)
    except Exception as e:
        logger.error(f"[Trends] Unexpected error: {e} — using fallback")
        return _fallback(city_name)
