import json
import logging
from .bi_service import _call_ai

logger = logging.getLogger(__name__)

def generate_business_plan(user_profile: dict, business: dict, product: dict = None) -> dict:
    """Generate a complete business plan using the AI service. Replaces the broken Edge Function."""
    
    system_prompt = '''You are an expert business advisor specializing in small-scale businesses and startups in India.
You create detailed, practical business plans for beginners with limited budgets.

RULES:
- Provide realistic, actionable advice based on Indian market conditions
- Avoid motivational or generic content
- Use simple language for beginners
- All costs and estimates should be in Indian Rupees (₹)
- Consider the specific city/region for location advice
- Provide specific, practical tips
- Focus on low-budget, high-impact strategies
'''

    product_focus = product.get("name") if product else "General"
    budget = user_profile.get("budget", 0)
    city = user_profile.get("city", "India")
    interest = user_profile.get("interest", "")
    experience = user_profile.get("experience", "Beginner")
    
    # We omit the exact supabase db raw materials linking here because the AI does a great job directly,
    # and we have the new EnrichedSupplierTab replacing static supplier lists anyway.
    
    user_prompt = f'''Create a highly tailored business plan for the following business idea.
CRITICAL INSTRUCTION: You MUST build the ENTIRE business plan specifically around the PRODUCT FOCUS. 
If the user selected a specific product (e.g., "Custom lipsticks" or "Pani Puri"), the raw materials, workforce, location, pricing, and marketing MUST be exactly tailored to creating and selling THAT specific product, NOT just the general business category.

BUSINESS: {business.get("name")}
PRODUCT FOCUS: {product_focus}
DESCRIPTION: {business.get("description")}
BUDGET: ₹{int(budget):,}
CITY: {city}
INTEREST: {interest}
EXPERIENCE: {experience}
INVESTMENT RANGE: {business.get("investmentRange")}

Generate a complete business plan in the following JSON format:
{{
  "rawMaterials": [
    {{
      "name": "Specific Material exactly for the PRODUCT FOCUS",
      "sourceType": "Where to source (local market/wholesale/online)",
      "estimatedCost": "₹X,XXX - ₹X,XXX/month",
      "tips": "Practical sourcing tip"
    }}
  ],
  "productionPlan": [
    {{
      "step": "Step Title (e.g., Making Masala, Wholesale Sourcing, Store Setup)",
      "description": "Detailed instructions on HOW to make the product. IF the business does NOT manufacture products, explain EXACTLY how to source the items wholesale and setup.",
      "costVsTime": "Cost/Time tradeoff"
    }}
  ],
  "workforce": [
    {{
      "role": "Job Role",
      "skillLevel": "Required skill level",
      "count": 1,
      "estimatedSalary": "₹X,XXX - ₹X,XXX/month"
    }}
  ],
  "location": {{
    "areaType": "Type of area recommended",
    "shopSize": "Size recommendation",
    "rentEstimate": "₹X,XXX - ₹X,XXX/month",
    "setupNeeds": ["Requirement 1", "Requirement 2"]
  }},
  "pricing": {{
    "costComponents": ["Raw Materials 40%", "Labor 20%"],
    "costPrice": "₹XX-XX per unit (average)",
    "marketPriceRange": "₹XX-XX per unit",
    "suggestedPrice": "₹XX-XX per unit",
    "profitMargin": "XX-XX% after all expenses"
  }},
  "marketing": {{
    "launchPlan": ["Week 1: ...", "Week 2: ..."],
    "onlineStrategies": ["Strategy 1", "Strategy 2"],
    "offlineStrategies": ["Strategy 1", "Strategy 2"],
    "lowBudgetIdeas": ["Idea 1", "Idea 2"]
  }},
  "growth": {{
    "month1to3": ["Action 1", "Action 2"],
    "month4to6": ["Action 1", "Action 2"],
    "expansionIdeas": ["Idea 1", "Idea 2"],
    "mistakesToAvoid": ["Mistake 1", "Mistake 2"]
  }}
}}

REQUIREMENTS:
- Provide at least 3 items in each array
- Make all advice specific to {city} and {interest} sector
- Tailor complexity to {experience} level
- Keep within the budget of ₹{int(budget):,}
- Return ONLY valid JSON, no additional text'''

    # Direct call, not using cached since this is highly personalized and core to the flow
    result = _call_ai(user_prompt, system_prompt)
    
    # Fallbacks in case AI fails
    if not result or "pricing" not in result:
        logger.warning("AI generation failed or returned invalid JSON, using fallback Plan with user components")
        result = {
            "rawMaterials": [{"name": f"{product_focus} components", "sourceType": "Local Market", "estimatedCost": "₹5,000/mo", "tips": "Negotiate locally"}],
            "productionPlan": [{"step": "Initial Setup", "description": "Set up your workspace and source materials.", "costVsTime": "High time investment initially"}],
            "workforce": [{"role": "Manager/Owner", "skillLevel": "Basic", "count": 1, "estimatedSalary": "Owner's Draw"}],
            "location": {"areaType": "Local Commercial", "shopSize": "100-200 sqft", "rentEstimate": "₹10,000/mo", "setupNeeds": ["Basic Furniture", "Signage"]},
            "pricing": {"costComponents": ["Materials 50%"], "costPrice": "Varies", "marketPriceRange": "Market Rate", "suggestedPrice": "Competitive", "profitMargin": "20-30%"},
            "marketing": {"launchPlan": ["Week 1: Soft Launch"], "onlineStrategies": ["WhatsApp Marketing"], "offlineStrategies": ["Flyers"], "lowBudgetIdeas": ["Word of mouth"]},
            "growth": {"month1to3": ["Establish operations"], "month4to6": ["Increase marketing"], "expansionIdeas": ["New branches"], "mistakesToAvoid": ["Overspending early"]}
        }
        
    return {
        "idea": business,
        "product": product,
        **result
    }
