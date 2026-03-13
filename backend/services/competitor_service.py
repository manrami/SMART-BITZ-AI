import os
import json
import logging
from openai import AsyncOpenAI, OpenAI

logger = logging.getLogger(__name__)

# Initialize OpenAI client using Groq (matching existing app.py setup)
api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("GROQ_API_KEY")
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=api_key
)

def analyze_competitor(competitor_query: str, industry: str):
    """
    Simulates a web scrape + AI analysis of a competitor.
    In a full production version, this would use BeautifulSoup/Selenium to scrape
    the competitor's website, then feed the text into an LLM for SWOT extraction.
    For this MVP extension, we use the LLM's internal knowledge base to generate
    a plausible analysis based on the name.
    """
    
    prompt = f"""
    You are an expert business strategy consultant. 
    Analyze the competitor "{competitor_query}" operating in the "{industry}" industry.
    
    Provide a concise, practical SWOT analysis. 
    Format the output as a clean JSON object with the following structure:
    {{
        "name": "Competitor Name",
        "industry": "Their primary industry",
        "strengths": ["stength 1", "strength 2", "strength 3"],
        "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
        "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
        "threats": ["threat 1", "threat 2", "threat 3"],
        "key_takeaway": "One sentence summary of how to beat them."
    }}
    
    Return ONLY valid JSON.
    """
    
    try:
        if not api_key:
            return get_fallback_analysis(competitor_query, industry)
            
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant", # or whatever model is currently set in app.py
            messages=[
                {"role": "system", "content": "You are a JSON-only response bot."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        result_str = completion.choices[0].message.content
        return json.loads(result_str)
        
    except Exception as e:
        logger.error(f"Error calling LLM for competitor analysis: {e}")
        return get_fallback_analysis(competitor_query, industry)


def get_fallback_analysis(name, industry):
    """Fallback if API fails."""
    return {
        "name": name.title(),
        "industry": industry.title(),
        "strengths": ["Brand recognition", "Established supply chain", "Large customer base"],
        "weaknesses": ["Slow to adapt to new trends", "High overhead costs", "Generic customer service"],
        "opportunities": ["Hyper-local targeting", "Better digital presence", "Personalized offerings"],
        "threats": ["Price wars", "New aggressive startups", "Changing consumer preferences"],
        "key_takeaway": "Focus on agility and superior customer service to win market share from them."
    }
