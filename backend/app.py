import os
import json
import requests
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from supabase_db import fetch_suppliers_from_db
from supabase import create_client, Client

# ===== CONFIG =====
# Load environment variables explicitly from parent directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname((__file__))), '.env')
if os.path.exists(dotenv_path):
    print(f"Loading .env from: {dotenv_path}")
    load_dotenv(dotenv_path, override=True)
else:
    print("WARNING: .env file not found in parent directory")
    load_dotenv() # Fallback to default behavior

app = Flask(__name__)
# Allow CORS for valid origins - allow all for development
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── BI Blueprint (non-breaking extension) ──
try:
    sys.path.insert(0, os.path.dirname(__file__))
    from routes.bi_routes import bi_bp
    app.register_blueprint(bi_bp)
    print("BI Blueprint registered at /api/bi/*")
except Exception as _bi_err:
    print(f"WARNING: BI Blueprint failed to load (non-critical): {_bi_err}")

# --- QUOTA PROTECTION: Mock Mode for testing ---
MOCK_AI = os.getenv("MOCK_AI", "False").lower() == "true"
print(f"DEBUG: MOCK_AI MODE: {MOCK_AI} (from env: {os.getenv('MOCK_AI')})")

# Groq Configuration (replaces OpenRouter — fast, free, OpenAI-compatible)
groq_api_key = os.getenv("GROQ_API_KEY")
client = OpenAI(
  base_url="https://api.groq.com/openai/v1",
  api_key=groq_api_key,
)


# Groq model name for llama 3.1 8B
MODEL_NAME = "llama-3.1-8b-instant"

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Configure logging
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("backend_debug.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase_client: Client = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("Supabase credentials not found in environment")

DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")

# ===== STEP FLOW =====
STEP_FLOW = [
    "ASK_IDEA",
    "ASK_BUDGET",
    "ASK_LOCATION_PREFERENCE",
    "ASK_CUSTOM_LOCATION",
    "CONFIRM_LOCATION",
    "GENERATE_RECOMMENDATIONS",
    "RAW_MATERIALS",
    "SUPPLIER_GUIDANCE",
    "PRODUCT_PLANNING",
    "SELLING_GUIDE",
    "PRICING",
    "MARKETING",
    "GROWTH",
    "DASHBOARD_MODE"
]

# ===== GOVT DATA FETCH (data.gov.in) =====
def fetch_food_processing_msme():
    """
    Dataset:
    UDYAM Registration (MSME Registration) - List of MSME Registered Units
    Ministry of Micro, Small and Medium Enterprises
    
    Priority:
    1. Try Supabase database (if configured)
    2. Try government API (if key available)
    3. Fall back to dummy data
    """
    
    # PRIORITY 1: Try Supabase database first
    db_data = fetch_suppliers_from_db()
    if db_data:
        print("DEBUG: Using supplier data from Supabase database")
        return db_data
    
    # PRIORITY 2: Try real government API if key is available
    if DATA_GOV_API_KEY and DATA_GOV_API_KEY != "your_api_key_here":
        url = "https://api.data.gov.in/resource/2c1fd4a5-67c7-4672-a2c6-a0a76c2f00da"
        params = {
            "api-key": DATA_GOV_API_KEY,
            "format": "json",
            "limit": 50
        }
        try:
            r = requests.get(url, params=params, timeout=6)
            r.raise_for_status()
            print("DEBUG: Using supplier data from government API")
            return r.json()
        except Exception as e:
            print(f"DEBUG: Government API failed: {e}")
            pass  # Fall through to dummy data
    
    # PRIORITY 3: Fall back to comprehensive dummy data
    print("DEBUG: Using hardcoded dummy supplier data")
    return {
        "records": [
            # Food & Beverages Suppliers
            {
                "EnterpriseName": "Shree Krishna Food Products",
                "District": "MUMBAI",
                "State": "MAHARASHTRA",
                "EnterpriseType": "Small",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "10712",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2022-03-15",
                "social_category": "General",
                "contact_phone": "+91 22 2345 6789",
                "contact_email": "info@skfoodproducts.com"
            },
            {
                "EnterpriseName": "Annapurna Spices & Masala",
                "District": "DELHI",
                "State": "DELHI",
                "EnterpriseType": "Micro",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "10751",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2021-08-20",
                "social_category": "General",
                "contact_phone": "+91 11 4567 8901",
                "contact_email": "sales@annapurnaspices.in"
            },
            {
                "EnterpriseName": "Fresh Valley Organic Foods",
                "District": "BANGALORE",
                "State": "KARNATAKA",
                "EnterpriseType": "Small",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "10320",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2023-01-10",
                "social_category": "General",
                "contact_phone": "+91 80 2234 5678",
                "contact_email": "contact@freshvalley.co.in"
            },
            {
                "EnterpriseName": "Golden Harvest Flour Mills",
                "District": "LUDHIANA",
                "State": "PUNJAB",
                "EnterpriseType": "Medium",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "10611",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2020-05-12",
                "social_category": "General",
                "contact_phone": "+91 161 234 5678",
                "contact_email": "info@goldenharvest.com"
            },
            {
                "EnterpriseName": "Dairy Fresh Products Ltd",
                "District": "PUNE",
                "State": "MAHARASHTRA",
                "EnterpriseType": "Small",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "10501",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2021-11-25",
                "social_category": "General",
                "contact_phone": "+91 20 3456 7890",
                "contact_email": "orders@dairyfresh.in"
            },
            
            # Textile & Clothing Suppliers
            {
                "EnterpriseName": "Rajasthan Handloom Exports",
                "District": "JAIPUR",
                "State": "RAJASTHAN",
                "EnterpriseType": "Small",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "13201",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2019-07-18",
                "social_category": "General",
                "contact_phone": "+91 141 234 5678",
                "contact_email": "export@rajhandloom.com"
            },
            {
                "EnterpriseName": "Cotton Craft Textiles",
                "District": "COIMBATORE",
                "State": "TAMIL NADU",
                "EnterpriseType": "Medium",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "13101",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2018-03-22",
                "social_category": "General",
                "contact_phone": "+91 422 345 6789",
                "contact_email": "sales@cottoncraft.co.in"
            },
            {
                "EnterpriseName": "Fashion Forward Garments",
                "District": "SURAT",
                "State": "GUJARAT",
                "EnterpriseType": "Small",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "14101",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2022-09-05",
                "social_category": "General",
                "contact_phone": "+91 261 456 7890",
                "contact_email": "info@fashionforward.in"
            },
            
            # Electronics & Technology
            {
                "EnterpriseName": "TechVision Electronics",
                "District": "NOIDA",
                "State": "UTTAR PRADESH",
                "EnterpriseType": "Small",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "26401",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2021-06-14",
                "social_category": "General",
                "contact_phone": "+91 120 567 8901",
                "contact_email": "contact@techvision.in"
            },
            {
                "EnterpriseName": "Smart Components India",
                "District": "CHENNAI",
                "State": "TAMIL NADU",
                "EnterpriseType": "Medium",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "26110",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2020-02-28",
                "social_category": "General",
                "contact_phone": "+91 44 2345 6789",
                "contact_email": "sales@smartcomponents.co.in"
            },
            
            # Agriculture & Raw Materials
            {
                "EnterpriseName": "Green Fields Agro Suppliers",
                "District": "NASHIK",
                "State": "MAHARASHTRA",
                "EnterpriseType": "Micro",
                "MajorActivity": "Services",
                "NIC5DigitCode": "01110",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2022-04-10",
                "social_category": "General",
                "contact_phone": "+91 253 234 5678",
                "contact_email": "info@greenfields.in"
            },
            {
                "EnterpriseName": "Organic Harvest Co-operative",
                "District": "INDORE",
                "State": "MADHYA PRADESH",
                "EnterpriseType": "Small",
                "MajorActivity": "Services",
                "NIC5DigitCode": "01130",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2021-12-05",
                "social_category": "General",
                "contact_phone": "+91 731 345 6789",
                "contact_email": "contact@organicharvest.co.in"
            },
            
            # Packaging & Industrial
            {
                "EnterpriseName": "EcoPack Solutions",
                "District": "AHMEDABAD",
                "State": "GUJARAT",
                "EnterpriseType": "Small",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "17021",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2023-02-18",
                "social_category": "General",
                "contact_phone": "+91 79 4567 8901",
                "contact_email": "sales@ecopack.in"
            },
            {
                "EnterpriseName": "Prime Plastic Industries",
                "District": "KOLKATA",
                "State": "WEST BENGAL",
                "EnterpriseType": "Medium",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "22201",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2019-10-30",
                "social_category": "General",
                "contact_phone": "+91 33 2345 6789",
                "contact_email": "info@primeplastic.com"
            },
            
            # Export Partners
            {
                "EnterpriseName": "Global Trade Solutions",
                "District": "MUMBAI",
                "State": "MAHARASHTRA",
                "EnterpriseType": "Small",
                "MajorActivity": "Services",
                "NIC5DigitCode": "46900",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2020-08-15",
                "social_category": "General",
                "contact_phone": "+91 22 6789 0123",
                "contact_email": "export@globaltradesolutions.in"
            },
            {
                "EnterpriseName": "India Export Hub",
                "District": "DELHI",
                "State": "DELHI",
                "EnterpriseType": "Medium",
                "MajorActivity": "Services",
                "NIC5DigitCode": "52291",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2018-11-20",
                "social_category": "General",
                "contact_phone": "+91 11 5678 9012",
                "contact_email": "contact@indiaexporthub.com"
            },
            
            # Handicrafts & Artisan
            {
                "EnterpriseName": "Heritage Handicrafts",
                "District": "VARANASI",
                "State": "UTTAR PRADESH",
                "EnterpriseType": "Micro",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "32120",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2021-05-08",
                "social_category": "OBC",
                "contact_phone": "+91 542 234 5678",
                "contact_email": "sales@heritagehandicrafts.in"
            },
            {
                "EnterpriseName": "Artisan Collective India",
                "District": "JAIPUR",
                "State": "RAJASTHAN",
                "EnterpriseType": "Small",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "31091",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2022-07-22",
                "social_category": "General",
                "contact_phone": "+91 141 345 6789",
                "contact_email": "info@artisancollective.co.in"
            },
            
            # Health & Beauty
            {
                "EnterpriseName": "Ayurvedic Wellness Products",
                "District": "KERALA",
                "State": "KERALA",
                "EnterpriseType": "Small",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "21001",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2020-12-10",
                "social_category": "General",
                "contact_phone": "+91 484 456 7890",
                "contact_email": "contact@ayurvedicwellness.in"
            },
            {
                "EnterpriseName": "Natural Beauty Cosmetics",
                "District": "HYDERABAD",
                "State": "TELANGANA",
                "EnterpriseType": "Micro",
                "MajorActivity": "Manufacturing",
                "NIC5DigitCode": "20423",
                "WhetherProdCommenced": "YES",
                "RegistrationDate": "2023-03-15",
                "social_category": "General",
                "contact_phone": "+91 40 2345 6789",
                "contact_email": "sales@naturalbeauty.co.in"
            }
        ]
    }


# ===== AI AGENT PROMPT =====
SMARTBIZ_AGENT_PROMPT = """
AGENT NAME:
SmartBiz AI – Intelligent Business Startup Advisor

AGENT ROLE:
You are a friendly, professional, and empathetic business startup advisor with deep expertise in Indian business ecosystems. Your goal is to simplify the startup process for beginners and provide expert guidance through intelligent conversation.

You are NOT a rigid chatbot. You are a knowledgeable mentor who:
- Understands context and conversation flow
- Answers questions directly and thoroughly
- Adapts to the user's knowledge level
- Provides actionable, practical advice
- Uses real-world examples and analogies

--------------------------------------------------
OPERATING MODES
--------------------------------------------------

You operate in TWO modes based on user intent:

**MODE 1: GUIDED FLOW** (Default for structured onboarding)
- Follow the CURRENT_STEP provided by the system
- Ask one question at a time for data collection steps
- Guide user through the complete business planning process
- Collect: idea, budget, location, materials, suppliers, pricing, marketing, growth

**MODE 2: ADVISOR MODE** (For questions and exploration)
- Activated when user asks specific questions (How, What, Where, Why, Can you)
- Provide detailed, expert answers with examples
- Reference government schemes, portals, and verified data
- Still maintain context of their business plan
- Gently guide back to the flow after answering

**INTENT DETECTION & STEP COMPLETION:**
Detect user intent from their message and determine if the current step is completed.

- **Question Intent**: "How do I...", "What is...", "Where can I...", "Why should...", "Can you explain..."
  → Switch to ADVISOR MODE, answer thoroughly.
  → `step_completed`: false (unless they ALSO provided the answer)

- **Answer Intent**: Direct response to your data collection question (budget amount, location name, yes/no)
  → Stay in GUIDED FLOW.
  → `step_completed`: true (if valid answer provided)

- **Multiple Info**: User provides answers for multiple steps
  → Extract all info.
  → `step_completed`: true

--------------------------------------------------
JSON OUTPUT FORMAT (STRICT)
--------------------------------------------------

Your response MUST be valid JSON:
```json
{
  "reply": "Your natural, conversational response here. For questions, be detailed. For data collection, be concise.",
  "extracted_info": {
    "ASK_IDEA": "bakery business",
    "ASK_BUDGET": "5 lakhs",
    "ASK_LOCATION_PREFERENCE": "Mumbai"
  },
  "step_completed": true | false,
  "comparison_data": [] // Only populate for supplier/material steps with REAL_TIME_DATA
}
```

**Rules:**
- NO asterisks (*) in reply text - use dashes (-) for lists
- Extract ALL information user provides into extracted_info
- Use exact STEP_FLOW names as keys in extracted_info
- `step_completed` MUST be true ONLY if the user has satisfactorily answered the `CURRENT_STEP` question.
- If user asks a side question, set `step_completed`: false and answer the question.
- comparison_data only for RAW_MATERIALS, SUPPLIER_GUIDANCE, SELLING_GUIDE steps

--------------------------------------------------
STEP FLOW (Reference Only)
--------------------------------------------------

1. ASK_IDEA → "Do you have a business idea in mind?"
2. ASK_BUDGET → "What's your approximate budget?"
3. ASK_LOCATION_PREFERENCE → "Do you have a location in mind?"
4. ASK_CUSTOM_LOCATION → "Which city/area?"
5. CONFIRM_LOCATION → "Proceed with this location?"
6. RAW_MATERIALS → Detailed guidance on materials needed
7. SUPPLIER_GUIDANCE → Supplier recommendations with data
8. PRODUCT_PLANNING → Product development advice
9. SELLING_GUIDE → Sales channels and strategies
10. PRICING → Pricing strategy and calculations
11. MARKETING → Marketing plan and tactics
12. GROWTH → Scaling and expansion guidance
13. DASHBOARD_MODE → Ongoing Q&A and optimization

--------------------------------------------------
TONE & PERSONALITY
--------------------------------------------------

- **Warm & Encouraging**: "That's a fantastic idea!"
- **Expert but Accessible**: Explain jargon, use simple language
- **Practical & Action-Oriented**: Always give next steps
- **Culturally Aware**: Understand Indian business context
- **Patient & Supportive**: Beginners need extra care
- **Honest & Realistic**: Don't overpromise, set proper expectations

--------------------------------------------------
EXAMPLES OF GOOD RESPONSES
--------------------------------------------------

**User asks: "How do I register my business?"**
Good Response: "Great question! In India, you have several options depending on your business type. For most small businesses, I recommend starting with Udyam Registration (MSME) - it's free and gives you access to government benefits. Here's the process: 1) Visit udyamregistration.gov.in, 2) Register with your Aadhaar, 3) Fill in basic business details, 4) Get instant registration. For a bakery, this is perfect. You can also consider Sole Proprietorship (simplest) or Private Limited (if you want to raise funds later). Which route interests you more, or should we continue planning your bakery first?"

**User says: "I want to start a cloud kitchen in Bangalore with 3 lakh budget"**
Good Response: "Excellent! Cloud kitchens are booming in Bangalore - smart choice. I've noted: Business idea: Cloud Kitchen, Location: Bangalore, Budget: ₹3 lakhs. That's a solid starting budget for a cloud kitchen. Now, before we dive into the details, have you thought about what cuisine or food category you want to focus on? This will help us plan your kitchen setup and suppliers better."

--------------------------------------------------
FINAL INSTRUCTION
--------------------------------------------------

Be intelligent, contextual, and helpful. Answer questions thoroughly. Guide gently. Use data wisely. Make the user feel supported and confident in their business journey.

Remember: You're not just collecting data - you're building their confidence and knowledge as an entrepreneur.

# The word JSON must appear in this prompt for json_object format to work.
"""

# ===== MAIN ENDPOINT =====
@app.route("/api/smartbiz-agent", methods=["POST"])
def smartbiz_agent():
    data = request.json or {}
    user_message = data.get("message", "")
    state = data.get("state")

    if not state:
        state = {"step_index": 0, "answers": {}}

    current_step = STEP_FLOW[state["step_index"]]
    real_time_data = None

    # Fetch real-time data for advisory steps that need it
    if current_step in ["RAW_MATERIALS", "SUPPLIER_GUIDANCE", "SELLING_GUIDE"]:
        real_time_data = fetch_food_processing_msme()
        print(f"DEBUG: Fetched real_time_data for {current_step}")

    if MOCK_AI:
        # Simulated mentor response for testing UI/Flow
        print("--- RUNNING IN MOCK MODE (NO API COST) ---")
        mock_replies = {
            "ASK_IDEA": "That sounds like a great starting point! Before we dive in, what's your approximate budget for this business?",
            "ASK_BUDGET": "I see. Budgeting is crucial! Now, do you have a specific location or area in mind where you want to set things up?",
            "ASK_LOCATION_PREFERENCE": "Excellent! Location can make or break a business. Please tell me the exact city or area you're thinking of.",
            "ASK_CUSTOM_LOCATION": "Got it. Anand is a vibrant area! Should we proceed with this location or would you like to consider somewhere else?",
            "GENERATE_RECOMMENDATIONS": "Based on what you've told me, I have some great business ideas for you. Would you like to see them?",
            "SUPPLIER_GUIDANCE": "Great! I've found some officially registered suppliers from government data that might help you. These are verified MSME enterprises that could be potential suppliers or partners for your business.",
        }
        reply_text = mock_replies.get(current_step, f"I've noted that. Let's move to the next phase: {current_step}. Ready?")
        
        # Add mock comparison data for supplier-related steps
        mock_comparison_data = []
        mock_recommendations = []
        
        if current_step == "GENERATE_RECOMMENDATIONS":
            mock_recommendations = [
                {
                    "id": "mock-1",
                    "name": "Organic Cafe",
                    "description": "A cozy cafe serving organic snacks and beverages.",
                    "investmentRange": "₹4,00,000 - ₹6,00,000",
                    "expectedRevenue": "₹80,000/month",
                    "profitMargin": "20-30%",
                    "riskLevel": "Medium",
                    "breakEvenTime": "8-12 months",
                    "icon": "☕"
                }
            ]

        if current_step in ["RAW_MATERIALS", "SUPPLIER_GUIDANCE", "SELLING_GUIDE"]:
            mock_comparison_data = [
                {
                    "name": "Devani Reverence India",
                    "location": "GHAZIABAD, UTTAR PRADESH",
                    "type": "Micro",
                    "activity": "Manufacturing",
                    "status": "Active",
                    "price": "Approx ₹55/kg",
                    "contact": "Dist: GHAZIABAD"
                }
            ]
        
        if user_message:
            state["answers"][current_step] = user_message
            # Simple mock increment
            state["step_index"] = min(state["step_index"] + 1, len(STEP_FLOW) - 1)
            
        return jsonify({
            "reply": reply_text, 
            "state": state, 
            "comparison_data": mock_comparison_data,
            "recommendations": mock_recommendations
        })

    # Default fallback
    reply_text = "I'm having a little trouble connecting to my brain right now, but don't worry! Could you try again in a moment?"
    extracted_info = {}
    comparison_data = []

    # Build prompt
    prompt = f"""
SYSTEM_PROMPT:
{SMARTBIZ_AGENT_PROMPT}

CURRENT_STEP:
{current_step}

USER_LATEST_MESSAGE:
"{user_message}"

USER_PREVIOUS_ANSWERS:
{state["answers"]}

REAL_TIME_DATA:
{real_time_data}
"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": prompt}],
            model=MODEL_NAME,
            response_format={"type": "json_object"}
        )
        content = chat_completion.choices[0].message.content.strip()
        
        import json
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        
        recommendations = []
        
        if json_match:
            ai_data = json.loads(json_match.group(0))
            print(f"DEBUG: AI Output JSON for {current_step}: {ai_data}")
            reply_text = ai_data.get("reply", "")
            extracted_info = ai_data.get("extracted_info", {})
            comparison_data = ai_data.get("comparison_data", [])
            step_completed = ai_data.get("step_completed", False)
            
            # Save message to answers if not extracted but detected as completed
            if user_message and current_step not in extracted_info and step_completed:
                state["answers"][current_step] = user_message
                
            # Update state with all extracted keys
            for step, val in extracted_info.items():
                if step in STEP_FLOW:
                    state["answers"][step] = val
                    
            # Logic to generate recommendations if we reached that step and user confirmed
            # Or if the AI thinks we are there.
            # We must be careful: if the user just answered "CONFIRM_LOCATION", the NEXT step is GENERATE_RECOMMENDATIONS.
            # So if step_completed is YES for CONFIRM_LOCATION, we increment step.
            # Then if the NEW step is GENERATE_RECOMMENDATIONS, we should generate them.
            
            should_advance = step_completed
            
            # Advance step_index past already answered steps
            while should_advance and state["step_index"] < len(STEP_FLOW) - 1:
                # Store current step as answered if not already
                if current_step not in state["answers"] and user_message:
                     state["answers"][current_step] = user_message

                state["step_index"] += 1
                next_step_name = STEP_FLOW[state["step_index"]]
                
                # If we just landed on GENERATE_RECOMMENDATIONS, generate them!
                if next_step_name == "GENERATE_RECOMMENDATIONS":
                    # Generate recommendations using user profile
                    user_profile = {
                        "budget": state["answers"].get("ASK_BUDGET", "500000"),
                        "city": state["answers"].get("ASK_CUSTOM_LOCATION") or state["answers"].get("ASK_LOCATION_PREFERENCE") or "India",
                        "interest": state["answers"].get("ASK_IDEA", "General Business"),
                        "experience": "Beginner" # Default
                    }
                    recommendations = _generate_recommendations_logic(user_profile)
                    # We might want to auto-advance past this step or wait for user to say "Show me more"
                    # For now, let's stop here so user sees them.
                    should_advance = False 
                    break

                if next_step_name in state["answers"]:
                    # Skip if already answered
                    continue
                else:
                    break
        else:
            # Fallback if not JSON
            reply_text = content
            if user_message:
                state["answers"][current_step] = user_message
            state["step_index"] = min(state["step_index"] + 1, len(STEP_FLOW) - 1)

    except Exception as e:
        import traceback
        print(f"ERROR in smartbiz_agent: {str(e)}")
        # Check if it was a rate limit error to provide better feedback
        if "rate_limit" in str(e).lower():
            reply_text = "I've been talking a bit too much today and hit my daily limit! I need a short break. Please try again soon or switch to Mock Mode in settings."
        
    return jsonify({
        "reply": reply_text,
        "state": state,
        "comparison_data": comparison_data,
        "recommendations": recommendations or []
    })

# ===== MARKETPLACE ENDPOINTS =====
def map_nic_to_category(nic_code_2_digit):
    """
    Maps NIC 2 Digit Code to Frontend Categories.
    Based on NIC 2008 Classification.
    """
    # Map of NIC 2-digit -> Category
    # Reference: http://mospi.nic.in/classification/national-industrial-classification
    
    code = str(nic_code_2_digit).strip()
    
    # Food & Beverages: 10, 11, 12
    if code in ["10", "11", "12"]: return "Food & Beverages"
    
    # Clothing & Textiles: 13, 14, 15
    if code in ["13", "14", "15"]: return "Clothing & Textiles"
    
    # Electronics: 26, 27
    if code in ["26", "27"]: return "Electronics"
    
    # Agriculture: 01, 02, 03
    if code in ["01", "02", "03"]: return "Agriculture"
    
    # Industrial: 
    # 16-18 (Wood, Paper)
    # 19-23 (Petroleum, Chemicals, Pharma, Rubber, Plastic)
    # 24-25 (Metals)
    # 28 (Machinery)
    # 29-30 (Transport)
    # 33 (Repair), 35-39 (Utilities/Waste Management/Remediation) - Map to Industrial
    if code in ["16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "28", "29", "30", "33", "35", "36", "37", "38", "39"]: return "Industrial"
    
    # Health & Beauty specific override if needed, but 20/21 cover chemicals/pharma which are often industrial.
    # Let's map 21 (Pharma) to Health & Beauty
    if code == "21": return "Health & Beauty"
    
    # Handicrafts: 31 (Furniture), 32 (Other manufacturing)
    if code in ["31", "32"]: return "Handicrafts"
    
    # Services Range (45-99)
    try:
        code_int = int(code)
        if code_int >= 45: return "Services"
        if 10 <= code_int <= 33: return "Industrial" # Fallback for unmapped manufacturing
    except:
        pass
    
    return "Other"

@app.route("/api/marketplace/gov-listings", methods=["GET"])
def get_gov_listings():
    """
    Fetches verified MSME listings from government data and formats them
    for the marketplace.
    """
    try:
        data = fetch_food_processing_msme()
        listings = []
        
        if data and "records" in data:
            for record in data["records"]:
                # Map MSME record to Marketplace Listing format
                listing_id = f"gov-{record.get('dics_code', '0')}-{record.get('nic_5_digit_code', '0')}"
                
                # Determine listing type based on activity
                activity = record.get("MajorActivity", "Services").upper()
                
                # Fix: The API key is likely 'NIC5DigitCode' or similar. 
                # We need to handle potential case variations and extraction.
                # Example value might be "10712" or "10 - Food..." or "1) 77291"
                raw_nic = str(record.get("NIC5DigitCode", record.get("nic_5_digit_code", ""))).strip()
                
                # Extract code using Regex
                import re
                # Try to find a 5-digit code first (e.g., 77291 from "1) 77291")
                match = re.search(r'\b(\d{5})\b', raw_nic)
                if match:
                    nic_code_found = match.group(1)
                    nic_2_digit = nic_code_found[:2]
                else:
                    # Fallback: look for exactly 2 digits if 5 not found (e.g., "10")
                    match_2 = re.search(r'\b(\d{2})\b', raw_nic)
                    if match_2:
                         nic_2_digit = match_2.group(1)
                    else:
                         nic_2_digit = "00"
                
                print(f"DEBUG: Enterprise={record.get('EnterpriseName')} | RawNIC={raw_nic} | 2Digit={nic_2_digit} | Act={activity}")
                
                mapped_category = map_nic_to_category(nic_2_digit)
                
                # STRICT LOGIC SPLIT based on mapped category
                # 1. Raw Materials (buy): Agriculture, Industrial (Chemicals, Metals, etc.)
                if mapped_category in ["Agriculture", "Industrial", "Chemicals"]:
                    listing_type = "buy" # Shows in "Raw Materials" tab
                    title_prefix = "Supplier: "
                    category = mapped_category
                    desc_text = f"Verified Supplier of {mapped_category} & Raw Materials. available for bulk procurement."
                
                # 2. Finished Goods (sell): Food, Textiles, Electronics, Handicrafts, Health & Beauty
                elif mapped_category in ["Food & Beverages", "Clothing & Textiles", "Electronics", "Handicrafts", "Health & Beauty"]:
                    listing_type = "sell" # Shows in "For Sale" tab
                    title_prefix = "Manufacturer: "
                    category = mapped_category
                    desc_text = f"Verified Manufacturer of {mapped_category}. Available for bulk orders."

                # 3. Export Partners (export): Services
                else: 
                     # Services/Trading -> Map to Export Partners
                    listing_type = "export"
                    title_prefix = "Export Partner: "
                    # Use mapped category if available (e.g., specific service industry), otherwise fallback to Services
                    category = mapped_category if mapped_category != "Other" else "Services"
                    desc_text = "Verified Service Provider. Potential partner for export/logistics."
                
                listings.append({
                    "id": listing_id,
                    "user_id": "gov_verified",
                    "title": f"{title_prefix}{record.get('EnterpriseName', 'Verified Enterprise')}",
                    "description": f"{desc_text} Registered under {record.get('social_category', 'General')} category. Location: {record.get('District', '')}.",
                    "category": category,
                    "listing_type": listing_type,
                    "price_range": "Contact for Quotes",
                    "quantity": "Bulk Available",
                    "location": f"{record.get('District', '')}, {record.get('State', '')}",
                    "contact_info": "Verified Government Record",
                    "status": "active",
                    "created_at": record.get("RegistrationDate", ""),
                    "is_gov_verified": True,
                    "debug_nic": f"{raw_nic}|{nic_2_digit}"
                })
                
        return jsonify(listings)
    except Exception as e:
        print(f"Error fetching gov listings: {e}")
        return jsonify([])

# ===== RECOMMENDATIONS ENDPOINT (Workaround for Supabase Edge Function) =====
@app.route("/api/recommendations", methods=["POST"])
def generate_recommendations():
    """
    Generate business recommendations based on user profile.
    This is a temporary workaround while Supabase Edge Functions are being deployed.
    """
    try:
        data = request.json or {}
        user_profile = data.get("userProfile", {})
        
        if not user_profile:
            return jsonify({"error": "User profile is required"}), 400
            
        ideas = _generate_recommendations_logic(user_profile)
        return jsonify({"ideas": ideas})
        
    except Exception as e:
        print(f"ERROR in generate_recommendations: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def _generate_recommendations_logic(user_profile):
    """
    Internal helper logic to generate recommendations.
    Returns a list of idea objects.
    """
    budget = user_profile.get("budget", "")
    city = user_profile.get("city", "")
    interest = user_profile.get("interest", "")
    experience = user_profile.get("experience", "Beginner")
    
    system_prompt = """You are an expert business advisor specializing in small-scale businesses and startups in India. 
You provide practical, realistic advice for beginners with limited budgets.

RULES:
- Always give structured output with clear data
- Use practical, realistic advice based on Indian market conditions
- Avoid motivational or generic content
- Focus on small-scale, low-budget businesses
- Provide estimates and ranges, not exact numbers
- Use simple language for beginners
- Consider the user's budget, location, and interest area"""

    user_prompt = f"""Based on the following user profile, recommend exactly 3 realistic business ideas that match their budget and interests.

USER PROFILE:
- Budget: ₹{budget}
- City/Region: {city}
- Interest Area: {interest}
- Experience Level: {experience}

For each business idea, provide the following in valid JSON format:
{{
"ideas": [
    {{
    "id": "unique-id-lowercase",
    "name": "Business Name",
    "description": "Brief 1-2 sentence description",
    "investmentRange": "₹X,XX,XXX - ₹X,XX,XXX",
    "expectedRevenue": "₹X,XX,XXX - ₹X,XX,XXX/month",
    "profitMargin": "XX-XX%",
    "riskLevel": "Low" | "Medium" | "High",
    "breakEvenTime": "X-X months",
    "icon": "emoji representing the business"
    }}
]
}}

IMPORTANT:
- All ideas must be within the user's budget range
- Tailor recommendations to their interest area ({interest})
- Consider market conditions in {city}
- Adjust complexity based on experience level ({experience})
- Return ONLY valid JSON, no additional text"""

    # Call OpenRouter AI
    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        model=MODEL_NAME,
        response_format={"type": "json_object"}
    )
    
    content = chat_completion.choices[0].message.content.strip()
    print(f"DEBUG: AI response for recommendations: {content}")
    
    # Parse the JSON from the response
    import json
    import re
    json_match = re.search(r'\{[\s\S]*\}', content)
    if not json_match:
        raise ValueError("Failed to parse AI response as JSON")
    
    data = json.loads(json_match.group(0))
    return data.get("ideas", [])

# ===== NEW FEATURE ENDPOINTS =====

# ===== BUDGET PREDICTION ENDPOINT =====
@app.route("/api/predict-budget", methods=["POST"])
def predict_budget():
    """
    Predicts required budget for a business idea using AI.
    Returns budget breakdown and feasibility analysis.
    """
    data = request.json or {}
    business_idea = data.get("idea", "")
    user_budget = data.get("user_budget")
    
    if not business_idea:
        return jsonify({"error": "Business idea is required"}), 400
    
    if MOCK_AI:
        # Mock response for testing
        predicted = 500000
        return jsonify({
            "predicted_budget": predicted,
            "budget_breakdown": {
                "infrastructure": 150000,
                "equipment": 100000,
                "inventory": 80000,
                "marketing": 50000,
                "licenses": 20000,
                "working_capital": 100000
            },
            "feasibility": {
                "status": "feasible" if user_budget and user_budget >= predicted else "challenging",
                "gap": max(0, predicted - (user_budget or 0)),
                "optimization_suggestions": [
                    "Start with a smaller space to reduce infrastructure costs",
                    "Buy used equipment initially to save 30-40%",
                    "Use digital marketing instead of traditional advertising"
                ],
                "scaling_strategy": "Focus on organic growth in first 6 months, then expand with profits"
            }
        })
    
    try:
        system_prompt = """You are a financial advisor specializing in Indian startup budgeting.
Provide realistic budget estimates based on current market conditions in India.
Consider all necessary expenses including infrastructure, equipment, inventory, licenses, marketing, and working capital."""

        user_prompt = f"""Analyze this business idea and predict the required budget with detailed breakdown:

Business Idea: {business_idea}

Provide response in this JSON format:
{{
  "predicted_budget": <total amount in INR>,
  "budget_breakdown": {{
    "infrastructure": <amount>,
    "equipment": <amount>,
    "inventory": <amount>,
    "marketing": <amount>,
    "licenses": <amount>,
    "working_capital": <amount>
  }},
  "business_type": "<type>",
  "scale": "<small/medium/large>",
  "location_factor": "<urban/suburban/rural>"
}}

Be realistic and consider Indian market conditions."""

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME,
            response_format={"type": "json_object"}
        )
        
        content = chat_completion.choices[0].message.content.strip()
        import json, re
        json_match = re.search(r'\{[\s\S]*\}', content)
        
        if json_match:
            ai_data = json.loads(json_match.group(0))
            predicted = ai_data.get("predicted_budget", 500000)
            
            # Calculate feasibility if user budget provided
            feasibility = {}
            if user_budget:
                gap = predicted - user_budget
                if gap <= 0:
                    feasibility = {
                        "status": "feasible",
                        "gap": 0,
                        "optimization_suggestions": [],
                        "scaling_strategy": f"With ₹{user_budget - predicted:,.0f} extra budget, consider: Premium location, Better equipment, Larger inventory, Aggressive marketing campaign"
                    }
                elif gap <= predicted * 0.2:  # Within 20%
                    feasibility = {
                        "status": "feasible",
                        "gap": gap,
                        "optimization_suggestions": [
                            "Negotiate better rates with suppliers",
                            "Start with essential equipment only",
                            "Use cost-effective marketing channels"
                        ],
                        "scaling_strategy": "Start lean and scale gradually with revenue"
                    }
                else:
                    feasibility = {
                        "status": "challenging",
                        "gap": gap,
                        "optimization_suggestions": [
                            "Consider a smaller scale initially",
                            "Look for used/refurbished equipment",
                            "Partner with someone to share costs",
                            "Explore government schemes and loans",
                            "Start from home to save infrastructure costs"
                        ],
                        "scaling_strategy": "Build a phased approach - start minimal viable business and expand"
                    }
            
            return jsonify({
                "predicted_budget": predicted,
                "budget_breakdown": ai_data.get("budget_breakdown", {}),
                "business_type": ai_data.get("business_type", "General"),
                "feasibility": feasibility
            })
        
        return jsonify({"error": "Failed to parse AI response"}), 500
        
    except Exception as e:
        print(f"ERROR in predict_budget: {str(e)}")
        return jsonify({"error": "Budget prediction failed"}), 500


# ===== MARKET RESEARCH LINKS ENDPOINT =====
@app.route("/api/market-research", methods=["POST"])
def get_market_research():
    """
    Returns categorized market research links based on business type and location.
    Data comes from the database (seeded during migration).
    """
    data = request.json or {}
    business_type = data.get("business_type", "All")
    location = data.get("location", "India")
    
    # In a real implementation, this would query the Supabase database
    # For now, return structured data that frontend can use
    
    return jsonify({
        "links": [
            {
                "category": "government_schemes",
                "items": [
                    {"title": "MSME - Ministry of Micro, Small and Medium Enterprises", "url": "https://msme.gov.in/", "verified": True},
                    {"title": "Startup India", "url": "https://www.startupindia.gov.in/", "verified": True},
                    {"title": "DGFT - Directorate General of Foreign Trade", "url": "https://dgft.gov.in/", "verified": True},
                    {"title": "GeM - Government e-Marketplace", "url": "https://gem.gov.in/", "verified": True},
                    {"title": "Udyam Registration Portal", "url": "https://udyamregistration.gov.in/", "verified": True}
                ]
            },
            {
                "category": "market_trends",
                "items": [
                    {"title": "IBEF - India Brand Equity Foundation", "url": "https://www.ibef.org/", "verified": True},
                    {"title": "NITI Aayog", "url": "https://www.niti.gov.in/", "verified": True}
                ]
            },
            {
                "category": "product_research",
                "items": [
                    {"title": "CSIR - Council of Scientific & Industrial Research", "url": "https://www.csir.res.in/", "verified": True}
                ]
            },
            {
                "category": "industry_reports",
                "items": [
                    {"title": "Ministry of Commerce & Industry", "url": "https://commerce.gov.in/", "verified": True},
                    {"title": "RBI - Reserve Bank of India", "url": "https://www.rbi.org.in/", "verified": True}
                ]
            }
        ]
    })


# ===== RAW MATERIALS IDENTIFICATION ENDPOINT =====
@app.route("/api/identify-raw-materials", methods=["POST"])
def identify_raw_materials():
    """
    Uses AI to identify required raw materials based on business type.
    Returns materials list and supplier platform recommendations.
    """
    data = request.json or {}
    business_type = data.get("business_type", "")
    business_details = data.get("details", "")
    
    if not business_type:
        return jsonify({"error": "Business type is required"}), 400
    
    if MOCK_AI:
        return jsonify({
            "raw_materials": [
                {"name": "Flour", "specification": "Wheat flour, 50kg bags", "estimated_cost": "₹1,500-2,000 per bag"},
                {"name": "Sugar", "specification": "Refined sugar, 25kg bags", "estimated_cost": "₹1,000-1,200 per bag"},
                {"name": "Packaging Materials", "specification": "Food-grade boxes and bags", "estimated_cost": "₹5,000-10,000 monthly"}
            ],
            "supplier_platforms": [
                {"name": "IndiaMART", "url": "https://www.indiamart.com/", "type": "B2B Marketplace"},
                {"name": "TradeIndia", "url": "https://www.tradeindia.com/", "type": "B2B Marketplace"},
                {"name": "MSME Suppliers", "url": "/marketplace", "type": "Government Verified"}
            ]
        })
    
    try:
        system_prompt = """You are a supply chain expert for Indian businesses.
Identify raw materials needed for the business and provide realistic cost estimates."""

        user_prompt = f"""Identify raw materials needed for this business:

Business Type: {business_type}
Details: {business_details}

Provide response in JSON format:
{{
  "raw_materials": [
    {{
      "name": "Material name",
      "specification": "Details and quantity",
      "estimated_cost": "₹X,XXX - ₹X,XXX per unit"
    }}
  ]
}}

List 5-8 essential raw materials with realistic Indian market prices."""

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME,
            response_format={"type": "json_object"}
        )
        
        content = chat_completion.choices[0].message.content.strip()
        import json, re
        json_match = re.search(r'\{[\s\S]*\}', content)
        
        if json_match:
            ai_data = json.loads(json_match.group(0))
            return jsonify({
                "raw_materials": ai_data.get("raw_materials", []),
                "supplier_platforms": [
                    {"name": "IndiaMART", "url": "https://www.indiamart.com/", "type": "B2B Marketplace"},
                    {"name": "TradeIndia", "url": "https://www.tradeindia.com/", "type": "B2B Marketplace"},
                    {"name": "Alibaba India", "url": "https://www.alibaba.com/", "type": "International B2B"},
                    {"name": "MSME Suppliers", "url": "/marketplace", "type": "Government Verified"}
                ]
            })
        
        return jsonify({"error": "Failed to parse AI response"}), 500
        
    except Exception as e:
        print(f"ERROR in identify_raw_materials: {str(e)}")
        return jsonify({"error": "Raw material identification failed"}), 500


# ===== ADVERTISEMENT GENERATION ENDPOINT =====
@app.route("/api/generate-advertisements", methods=["POST"])
def generate_advertisements():
    """
    Generates 2-3 advertisement templates with captions, hashtags, and posting strategy.
    """
    data = request.json or {}
    business_type = data.get("business_type", "")
    business_name = data.get("business_name", "")
    details = data.get("details", "")
    
    if not business_type:
        return jsonify({"error": "Business type is required"}), 400
    
    if MOCK_AI:
        return jsonify({
            "templates": [
                {
                    "id": "template-1",
                    "design_concept": "Modern minimalist with product showcase",
                    "caption": f"🎉 Introducing {business_name or 'Your Business'}! Quality products at affordable prices. Visit us today! 🛍️",
                    "hashtags": ["#NewBusiness", "#LocalBusiness", "#SmallBusiness", "#ShopLocal", "#SupportLocal"],
                    "target_audience": "Local community, age 25-45, interested in quality products",
                    "posting_schedule": "Monday & Thursday, 10:00 AM - 11:00 AM",
                    "platform": "Instagram & Facebook"
                },
                {
                    "id": "template-2",
                    "design_concept": "Vibrant colors with customer testimonials",
                    "caption": "💯 Join hundreds of happy customers! Limited time offer - 20% off on first purchase! 🎁",
                    "hashtags": ["#SpecialOffer", "#Discount", "#QualityProducts", "#CustomerFirst"],
                    "target_audience": "Deal seekers, age 20-50, value-conscious shoppers",
                    "posting_schedule": "Wednesday & Saturday, 6:00 PM - 7:00 PM",
                    "platform": "Instagram Stories & Posts"
                }
            ],
            "posting_strategy": {
                "frequency": "3-4 posts per week",
                "best_times": ["10:00 AM", "6:00 PM", "8:00 PM"],
                "content_mix": "60% product showcase, 30% customer stories, 10% behind-the-scenes"
            }
        })
    
    try:
        system_prompt = """You are a social media marketing expert specializing in small business advertising in India.
Create engaging, culturally relevant ad content that resonates with Indian audiences."""

        user_prompt = f"""Create 2-3 advertisement templates for this business:

Business Type: {business_type}
Business Name: {business_name}
Details: {details}

Provide response in JSON format:
{{
  "templates": [
    {{
      "id": "template-1",
      "design_concept": "Brief description of visual design",
      "caption": "Engaging caption text (50-100 words)",
      "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
      "target_audience": "Description of ideal audience",
      "posting_schedule": "Best days and times",
      "platform": "Recommended platform"
    }}
  ],
  "posting_strategy": {{
    "frequency": "Posts per week",
    "best_times": ["time1", "time2"],
    "content_mix": "Percentage breakdown"
  }}
}}

Make captions engaging, use relevant emojis, and include Indian market context."""

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME,
            response_format={"type": "json_object"}
        )
        
        content = chat_completion.choices[0].message.content.strip()
        import json, re
        json_match = re.search(r'\{[\s\S]*\}', content)
        
        if json_match:
            ai_data = json.loads(json_match.group(0))
            return jsonify(ai_data)
        
        return jsonify({"error": "Failed to parse AI response"}), 500
        
    except Exception as e:
        print(f"ERROR in generate_advertisements: {str(e)}")
        return jsonify({"error": "Advertisement generation failed"}), 500


# ===== SOCIAL MEDIA ANALYTICS ENDPOINT =====
@app.route("/api/analyze-social-media", methods=["POST"])
def analyze_social_media():
    """
    Analyzes social media account and provides AI-powered marketing suggestions.
    """
    data = request.json or {}
    platform = data.get("platform", "")
    username = data.get("username", "")
    business_type = data.get("business_type", "")
    
    if not platform or not username:
        return jsonify({"error": "Platform and username are required"}), 400
    
    # Note: Real implementation would use social media APIs
    # For now, provide AI-generated suggestions based on business type
    
    if MOCK_AI:
        return jsonify({
            "posting_patterns": {
                "recommended_frequency": "4-5 posts per week",
                "best_times": ["10:00 AM", "2:00 PM", "7:00 PM"],
                "engagement_peak": "Evenings 6-9 PM",
                "top_content_types": ["Reels", "Carousel Posts", "Stories"]
            },
            "ai_suggestions": {
                "content_ideas": [
                    "Behind-the-scenes of your business operations",
                    "Customer testimonials and success stories",
                    "Product demonstrations and tutorials",
                    "Industry tips and educational content",
                    "Special offers and promotions"
                ],
                "hashtag_strategy": [
                    "Use 10-15 hashtags per post",
                    "Mix of popular and niche hashtags",
                    "Create a branded hashtag",
                    "Research competitor hashtags"
                ],
                "growth_tips": [
                    "Post consistently at optimal times",
                    "Engage with followers within 1 hour of posting",
                    "Collaborate with micro-influencers in your niche",
                    "Use Instagram Reels for maximum reach",
                    "Run targeted ads for local audience"
                ]
            },
            "weekly_strategy": {
                "monday": {"content": "Motivational post or week preview", "type": "Post", "time": "10:00 AM"},
                "tuesday": {"content": "Product showcase or tutorial", "type": "Reel", "time": "2:00 PM"},
                "wednesday": {"content": "Customer testimonial", "type": "Carousel", "time": "7:00 PM"},
                "thursday": {"content": "Behind-the-scenes", "type": "Story", "time": "6:00 PM"},
                "friday": {"content": "Weekend offer or promotion", "type": "Post", "time": "5:00 PM"},
                "saturday": {"content": "Engaging question or poll", "type": "Story", "time": "11:00 AM"},
                "sunday": {"content": "Week recap or community highlight", "type": "Carousel", "time": "8:00 PM"}
            }
        })
    
    try:
        system_prompt = """You are a social media growth strategist specializing in Indian small businesses.
Provide actionable, data-driven marketing strategies tailored to the Indian market."""

        user_prompt = f"""Analyze and provide marketing strategy for:

Platform: {platform}
Username: @{username}
Business Type: {business_type}

Provide response in JSON format:
{{
  "posting_patterns": {{
    "recommended_frequency": "X posts per week",
    "best_times": ["time1", "time2", "time3"],
    "engagement_peak": "Description",
    "top_content_types": ["type1", "type2", "type3"]
  }},
  "ai_suggestions": {{
    "content_ideas": ["idea1", "idea2", "idea3", "idea4", "idea5"],
    "hashtag_strategy": ["tip1", "tip2", "tip3"],
    "growth_tips": ["tip1", "tip2", "tip3", "tip4", "tip5"]
  }},
  "weekly_strategy": {{
    "monday": {{"content": "...", "type": "Post/Reel/Story", "time": "HH:MM AM/PM"}},
    "tuesday": {{"content": "...", "type": "...", "time": "..."}},
    ...
  }}
}}

Focus on practical, achievable strategies for small businesses in India."""

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME,
            response_format={"type": "json_object"}
        )
        
        content = chat_completion.choices[0].message.content.strip()
        import json, re
        json_match = re.search(r'\{[\s\S]*\}', content)
        
        if json_match:
            ai_data = json.loads(json_match.group(0))
            return jsonify(ai_data)
        
        return jsonify({"error": "Failed to parse AI response"}), 500
        
    except Exception as e:
        print(f"ERROR in analyze_social_media: {str(e)}")
        return jsonify({"error": "Social media analysis failed"}), 500


# ===== BUSINESS NAME GENERATION ENDPOINT =====
@app.route("/api/generate-business-names", methods=["POST"])
def generate_business_names():
    """
    Generates creative business name suggestions based on business idea and industry.
    Returns categorized names with taglines.
    """
    data = request.json or {}
    business_idea = data.get("business_idea", "")
    industry = data.get("industry", "")
    
    if not business_idea and not industry:
        return jsonify({"error": "Business idea or industry is required"}), 400
    
    if MOCK_AI:
        return jsonify({
            "suggestions": [
                {
                    "name": "FreshBite Kitchen",
                    "category": "Professional",
                    "tagline": "Healthy meals delivered fresh to your door",
                    "domain_available": True
                },
                {
                    "name": "NutriNest",
                    "category": "Creative",
                    "tagline": "Your nest for nutritious living",
                    "domain_available": False
                },
                {
                    "name": "FlavorHub",
                    "category": "Trendy",
                    "tagline": "Where flavors meet convenience",
                    "domain_available": True
                },
                {
                    "name": "The Wellness Table",
                    "category": "Premium",
                    "tagline": "Elevated dining for health-conscious professionals",
                    "domain_available": True
                },
                {
                    "name": "GreenPlate Co.",
                    "category": "Professional",
                    "tagline": "Sustainable meals for modern lifestyles",
                    "domain_available": False
                }
            ]
        })
    
    try:
        system_prompt = """You are a creative branding expert specializing in Indian business naming.
Create memorable, unique business names that resonate with the target market.
Consider cultural relevance, pronunciation, and brand potential."""

        user_prompt = f"""Generate 5-10 unique business name suggestions for:

Business Idea: {business_idea}
Industry: {industry}

Provide response in JSON format:
{{
  "suggestions": [
    {{
      "name": "Business Name",
      "category": "Professional/Creative/Trendy/Premium",
      "tagline": "Short compelling tagline (8-12 words)",
      "domain_available": true/false (estimate)
    }}
  ]
}}

Requirements:
- Names should be memorable and easy to pronounce
- Mix different categories (Professional, Creative, Trendy, Premium)
- Taglines should capture the essence of the business
- Consider Indian market context
- Avoid generic or overused names"""

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME,
            response_format={"type": "json_object"}
        )
        
        content = chat_completion.choices[0].message.content.strip()
        import json, re
        json_match = re.search(r'\{[\s\S]*\}', content)
        
        if json_match:
            ai_data = json.loads(json_match.group(0))
            return jsonify(ai_data)
        
        return jsonify({"error": "Failed to parse AI response"}), 500
        
    except Exception as e:
        print(f"ERROR in generate_business_names: {str(e)}")
        return jsonify({"error": "Business name generation failed"}), 500


# ===== CHAT TITLE GENERATION ENDPOINT =====
@app.route("/api/generate-chat-title", methods=["POST"])
def generate_chat_title():
    """
    Generates a contextual chat title based on first few messages.
    """
    data = request.json or {}
    messages = data.get("messages", "")
    
    if not messages:
        return jsonify({"title": "New Conversation"})
    
    if MOCK_AI:
        return jsonify({"title": "Business Startup Planning"})
    
    try:
        system_prompt = """You are a chat title generator. Create short, descriptive titles (3-6 words) for business conversations."""

        user_prompt = f"""Based on these conversation messages, generate a short, descriptive title (3-6 words max):

Messages: {messages[:500]}

Return ONLY the title, nothing else. Examples:
- "Bakery Startup Planning"
- "Organic Farming Budget Strategy"
- "Clothing Brand Marketing Plan"
"""

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME
        )
        
        title = chat_completion.choices[0].message.content.strip()
        # Remove quotes if present
        title = title.strip('"').strip("'")
        
        return jsonify({"title": title})
        
    except Exception as e:
        print(f"ERROR in generate_chat_title: {str(e)}")
        return jsonify({"title": "New Conversation"})


# ===== NEW FEATURES ENDPOINTS =====

# 1. GENERATE AD POSTS ENDPOINT
@app.route("/api/generate-ad-posts", methods=["POST"])
def generate_ad_posts():
    """
    Generates 2-3 AI-powered social media ad posts for marketing.
    """
    data = request.json or {}
    business_name = data.get("business_name", "Your Business")
    business_type = data.get("business_type", "General")
    target_audience = data.get("target_audience", "General Public")
    tone = data.get("tone", "Professional")
    
    if MOCK_AI:
        return jsonify({
            "ads": [
                {
                    "type": "Promotional Launch",
                    "headline": f"Grand Opening of {business_name}!",
                    "caption": f"We are excited to bring you the best {business_type} in town. Quality. Trust. Excellence.",
                    "cta": "Visit us today!",
                    "hashtags": "#NewBusiness #StartupIndia #Quality",
                    "suggested_time": "9:00 AM - 11:00 AM (Peak engagement)"
                },
                {
                    "type": "Problem-Solution",
                    "headline": f"Looking for reliable {business_type}?",
                    "caption": f"At {business_name}, we provide affordable and quality solutions tailored for you.",
                    "cta": "DM us now!",
                    "hashtags": "#Solutions #Affordable #TrustUs",
                    "suggested_time": "6:00 PM - 8:00 PM (Evening engagement)"
                },
                {
                    "type": "Trust Building",
                    "headline": f"Why Choose {business_name}?",
                    "caption": "✔ High Quality\n✔ Affordable Pricing\n✔ Fast Delivery\n✔ Customer Satisfaction Guaranteed",
                    "cta": "Follow us for updates!",
                    "hashtags": "#TrustWorthy #QualityFirst #CustomerFirst",
                    "suggested_time": "12:00 PM - 2:00 PM (Lunch break)"
                }
            ]
        })
    
    try:
        system_prompt = """You are a social media marketing expert. Create engaging, professional ad posts for small businesses in India.
Return ONLY a valid JSON array, no markdown formatting."""
        
        user_prompt = f"""Create 3 social media ad posts for:
Business: {business_name}
Type: {business_type}
Audience: {target_audience}
Tone: {tone}

Generate 3 different ad types:
1. Promotional Launch Post
2. Problem-Solution Post
3. Trust Building Post

For each ad, provide:
- type
- headline (catchy, max 10 words)
- caption (engaging, 2-3 lines)
- cta (call to action)
- hashtags (5-7 relevant hashtags)
- suggested_time (best time to post)

Return ONLY valid JSON array of ads in this exact format:
[{{"type": "...", "headline": "...", "caption": "...", "cta": "...", "hashtags": "...", "suggested_time": "..."}}]"""

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME
        )
        
        content = chat_completion.choices[0].message.content
        print(f"DEBUG: AI Response for ads: {content[:200]}...")
        
        # Clean up the response - remove markdown code blocks if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        # Parse JSON
        ads = json.loads(content)
        
        # Ensure it's a list
        if not isinstance(ads, list):
            ads = [ads]
        
        return jsonify({"ads": ads})
        
    except json.JSONDecodeError as e:
        print(f"JSON ERROR in generate_ad_posts: {str(e)}")
        print(f"Content was: {content}")
        # Return fallback ads
        return jsonify({
            "ads": [
                {
                    "type": "Promotional Launch",
                    "headline": f"Introducing {business_name}!",
                    "caption": f"Discover the best {business_type} experience. Quality meets affordability.",
                    "cta": "Visit us today!",
                    "hashtags": "#NewBusiness #Quality #StartupIndia",
                    "suggested_time": "9:00 AM - 11:00 AM"
                },
                {
                    "type": "Problem-Solution",
                    "headline": f"Need {business_type}? We've Got You!",
                    "caption": f"{business_name} offers reliable solutions tailored to your needs.",
                    "cta": "Contact us now!",
                    "hashtags": "#Solutions #Reliable #CustomerFirst",
                    "suggested_time": "6:00 PM - 8:00 PM"
                },
                {
                    "type": "Trust Building",
                    "headline": f"Why {business_name}?",
                    "caption": "✔ Quality Assured\\n✔ Best Prices\\n✔ Happy Customers",
                    "cta": "Follow for updates!",
                    "hashtags": "#Trusted #QualityFirst #Excellence",
                    "suggested_time": "12:00 PM - 2:00 PM"
                }
            ]
        })
    except Exception as e:
        print(f"ERROR in generate_ad_posts: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate ad posts: {str(e)}"}), 500



# 2. AWARD POINTS ENDPOINT
@app.route("/api/award-points", methods=["POST"])
def award_points_endpoint():
    """
    Awards points to a user for completing activities.
    """
    data = request.json or {}
    user_id = data.get("user_id")
    activity_type = data.get("activity_type")
    points = data.get("points", 0)
    description = data.get("description", "")
    
    if not user_id or not activity_type:
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        # Call the database function to award points
        supabase_client.rpc("award_points", {
            "p_user_id": user_id,
            "p_activity_type": activity_type,
            "p_points": points,
            "p_description": description
        }).execute()
        
        return jsonify({"success": True, "points_awarded": points})
        
    except Exception as e:
        print(f"ERROR in award_points: {str(e)}")
        return jsonify({"error": "Failed to award points"}), 500


# 3. GET LEADERBOARD ENDPOINT
@app.route("/api/get-leaderboard", methods=["GET"])
def get_leaderboard():
    """
    Returns the top users by points for the leaderboard.
    """
    try:
        limit = request.args.get("limit", 50, type=int)
        
        response = supabase_client.table("user_points") \
            .select("*, user_profiles(full_name, business_name, industry)") \
            .order("total_points", desc=True) \
            .limit(limit) \
            .execute()
        
        return jsonify({"leaderboard": response.data})
        
    except Exception as e:
        print(f"ERROR in get_leaderboard: {str(e)}")
        return jsonify({"error": "Failed to fetch leaderboard"}), 500


# 4. GENERATE SUCCESS GUIDE ENDPOINT
@app.route("/api/generate-success-guide", methods=["POST"])
def generate_success_guide():
    """
    Generates a personalized success guide based on business type.
    """
    data = request.json or {}
    business_type = data.get("business_type", "General")
    business_stage = data.get("business_stage", "Idea")
    
    if MOCK_AI:
        return jsonify({
            "weekly_goals": [
                "Set up social media profiles",
                "Create first marketing post",
                "Research 3 competitors",
                "Define target customer"
            ],
            "marketing_checklist": [
                "Create Google My Business listing",
                "Set up WhatsApp Business",
                "Design basic logo",
                "Prepare launch announcement"
            ],
            "cost_control_checklist": [
                "Track all expenses daily",
                "Set monthly budget limits",
                "Negotiate with suppliers",
                "Avoid unnecessary purchases"
            ],
            "growth_strategies": [
                "Focus on customer retention",
                "Collect customer feedback",
                "Offer referral incentives",
                "Expand product/service range gradually"
            ],
            "export_readiness": [
                "Research export regulations",
                "Identify potential markets",
                "Get export licenses",
                "Find logistics partners"
            ]
        })
    
    try:
        system_prompt = """You are a business mentor for Indian startups. Create practical, actionable success guides."""
        
        user_prompt = f"""Create a personalized success guide for:
Business Type: {business_type}
Stage: {business_stage}

Provide specific, actionable items for:
1. weekly_goals (4-5 items)
2. marketing_checklist (4-5 items)
3. cost_control_checklist (4-5 items)
4. growth_strategies (4-5 items)
5. export_readiness (4-5 items)

Make it specific to {business_type} businesses in India.
Return ONLY valid JSON."""

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_NAME
        )
        
        content = chat_completion.choices[0].message.content
        guide = json.loads(content)
        
        return jsonify(guide)
        
    except Exception as e:
        print(f"ERROR in generate_success_guide: {str(e)}")
        return jsonify({"error": "Failed to generate success guide"}), 500


# 6. GET USER PROGRESS ENDPOINT
@app.route("/api/get-user-progress", methods=["GET"])
def get_user_progress():
    """
    Returns user progress metrics.
    """
    user_id = request.args.get("user_id")
    
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400
    
    try:
        response = supabase_client.table("user_progress") \
            .select("*") \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        return jsonify({"progress": response.data})
        
    except Exception as e:
        print(f"ERROR in get_user_progress: {str(e)}")
        return jsonify({"error": "Failed to fetch progress"}), 500


# ===== AD PERSISTENCE ENDPOINTS =====

# 7. SAVE PLAN ADS ENDPOINT
# 7. SAVE PLAN ADS ENDPOINT
@app.route("/api/save-plan-ads", methods=["POST"])
def save_plan_ads():
    """
    Save generated ads for a specific business plan.
    Handles both JSON data (legacy) and Multipart/Form-Data (with images).
    """
    logger.info("=== SAVE PLAN ADS ENDPOINT CALLED ===")
    
    # Check if Supabase client is available
    if not supabase_client:
        logger.error("Supabase client not initialized")
        return jsonify({"error": "Database connection not available"}), 500
    
    try:
        user_id = None
        plan_id = None
        plan_name = None
        ads = []
        replace_existing = False
        
        # Determine if request is JSON or Multipart
        if request.is_json:
            logger.info("Processing JSON request")
            data = request.json
            user_id = data.get("user_id")
            plan_id = data.get("plan_id")
            plan_name = data.get("plan_name")
            ads = data.get("ads", [])
            replace_existing = data.get("replace_existing", False)
        else:
            logger.info("Processing Multipart request")
            user_id = request.form.get("user_id")
            plan_id = request.form.get("plan_id")
            plan_name = request.form.get("plan_name")
            ads_json = request.form.get("ad_data", "[]")
            try:
                ads = json.loads(ads_json)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to decode ad_data JSON: {e}")
                return jsonify({"error": "Invalid ad_data JSON"}), 400
                
        if not user_id or not plan_id or not plan_name:
            logger.error(f"Missing required fields - user_id:{user_id}, plan_id:{plan_id}, plan_name:{plan_name}")
            return jsonify({"error": "Missing required fields"}), 400
        
        # Insert new ads
        saved_ads = []
        
        for i, ad in enumerate(ads):
            try:
                image_url = ad.get("image_url", "")
                
                # Check if there is an image uploaded for this ad
                # The frontend sends images with keys like 'image_0', 'image_1', etc.
                # corresponding to the index in the filtered 'ads' array
                if not request.is_json:
                    image_file = request.files.get(f"image_{i}")
                    if image_file:
                        try:
                            file_ext = image_file.filename.split('.')[-1] if '.' in image_file.filename else 'png'
                            file_path = f"{user_id}/{plan_id}/{uuid.uuid4()}.{file_ext}"
                            file_content = image_file.read()
                            
                            logger.info(f"Uploading image for ad {i} to {file_path}")
                            
                            # Upload to Supabase Storage
                            # Initialize storage client if separate, or use supabase_client.storage
                            # Note: Supabase Python client syntax for storage:
                            storage_response = supabase_client.storage.from_("ad-creatives").upload(
                                path=file_path,
                                file=file_content,
                                file_options={"content-type": f"image/{file_ext}"}
                            )
                            
                            # Get Public URL
                            # The upload response object might not contain the public URL directly
                            # We construct it or request it
                            
                            # With supabase-py, getting public URL:
                            public_url_response = supabase_client.storage.from_("ad-creatives").get_public_url(file_path)
                            
                            # public_url_response is usually a string or object with publicURL
                            if isinstance(public_url_response, str):
                                image_url = public_url_response
                            elif isinstance(public_url_response, dict) and 'publicURL' in public_url_response: # Older versions
                                print(f"Public URL dict key found: {public_url_response}") # Debugging
                                image_url = public_url_response['publicURL'] 
                            else: # Newer versions might return just the URL string
                                image_url = str(public_url_response)

                            logger.info(f"Image uploaded successfully: {image_url}")
                            
                        except Exception as upload_error:
                            logger.error(f"Failed to upload image for ad {i}: {upload_error}")
                            # Continue saving ad without image if upload fails
                            pass

                ad_data = {
                    "user_id": user_id,
                    "plan_id": plan_id,
                    "plan_name": plan_name,
                    "ad_type": ad.get("type", "General"),
                    "headline": ad.get("headline", ""),
                    "caption": ad.get("caption", ""),
                    "cta": ad.get("cta", ""),
                    "hashtags": ad.get("hashtags", ""),
                    "suggested_time": ad.get("suggested_time", ""),
                    "image_data": ad.get("image_data", ""), # Legacy field
                    "image_url": image_url, # New field
                    "is_favorite": False,
                    "is_archived": False
                }
                
                logger.debug(f"Inserting ad {i+1}/{len(ads)}: {ad_data.get('headline')}")
                
                response = supabase_client.table("plan_ads") \
                    .insert(ad_data) \
                    .execute()
                
                if response.data:
                    saved_ads.append(response.data[0])
                    logger.info(f"Ad {i+1} saved successfully, ID: {response.data[0]['id']}")
                    
            except Exception as insert_error:
                logger.error(f"Failed to insert ad {i+1}: {type(insert_error).__name__}: {insert_error}")
                import traceback
                logger.error(traceback.format_exc())
                # Don't raise, try to save other ads
                # raise insert_error

        # Award points for ad generation (first time only system)
        try:
             # Basic points logic - can be expanded
             pass
        except Exception:
             pass
        
        return jsonify({
            "success": True,
            "ads": saved_ads,
            "message": f"Saved {len(saved_ads)} ads successfully"
        })
        
    except Exception as e:
        logger.error(f"CRITICAL ERROR in save_plan_ads: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to save ads: {str(e)}"}), 500


# 8. GET PLAN ADS ENDPOINT
@app.route("/api/get-plan-ads/<plan_id>", methods=["GET"])
def get_plan_ads(plan_id):
    """
    Retrieve all non-archived ads for a specific business plan.
    """
    # Check if Supabase client is available
    if not supabase_client:
        print("ERROR: Supabase client not initialized")
        return jsonify({"error": "Database connection not available"}), 500
    
    user_id = request.args.get("user_id")
    
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400
    
    try:
        query = supabase_client.table("plan_ads") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("is_archived", False)
            
        # Only filter by plan_id if it's not "all"
        if plan_id.lower() != "all":
            query = query.eq("plan_id", plan_id)
            
        response = query.order("created_at", {"ascending": False}).execute()
        
        # Log successful fetch
        print(f"Fetched {len(response.data) if response.data else 0} ads for user {user_id}")
        
        return jsonify({
            "success": True,
            "ads": response.data or [],
            "count": len(response.data) if response.data else 0
        })
        
    except Exception as e:
        print(f"CRITICAL ERROR in get_plan_ads: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return the actual error to the frontend for debugging
        return jsonify({"error": f"Failed to fetch ads: {str(e)}"}), 500


# 9. DELETE PLAN AD ENDPOINT
@app.route("/api/delete-plan-ad/<ad_id>", methods=["DELETE"])
def delete_plan_ad(ad_id):
    """
    Delete a specific ad (soft delete by archiving).
    """
    user_id = request.args.get("user_id")
    
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400
    
    try:
        # Soft delete by setting is_archived to true
        response = supabase_client.table("plan_ads") \
            .update({"is_archived": True}) \
            .eq("id", ad_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if response.data:
            return jsonify({
                "success": True,
                "message": "Ad deleted successfully"
            })
        else:
            return jsonify({"error": "Ad not found"}), 404
        
    except Exception as e:
        print(f"ERROR in delete_plan_ad: {str(e)}")
        return jsonify({"error": "Failed to delete ad"}), 500


# 10. TOGGLE FAVORITE AD ENDPOINT
@app.route("/api/toggle-favorite-ad/<ad_id>", methods=["PATCH"])
def toggle_favorite_ad(ad_id):
    """
    Toggle favorite status of an ad.
    """
    user_id = request.args.get("user_id")
    
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400
    
    try:
        # Get current favorite status
        current = supabase_client.table("plan_ads") \
            .select("is_favorite") \
            .eq("id", ad_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not current.data:
            return jsonify({"error": "Ad not found"}), 404
        
        # Toggle the status
        new_status = not current.data.get("is_favorite", False)
        
        response = supabase_client.table("plan_ads") \
            .update({"is_favorite": new_status}) \
            .eq("id", ad_id) \
            .eq("user_id", user_id) \
            .execute()
        
        return jsonify({
            "success": True,
            "is_favorite": new_status,
            "message": "Favorite status updated"
        })
        
    except Exception as e:
        print(f"ERROR in toggle_favorite_ad: {str(e)}")
        return jsonify({"error": "Failed to toggle favorite"}), 500



# 11. UPDATE USER PROFILE ENDPOINT
@app.route("/api/update-user-profile", methods=["POST"])
def update_user_profile():
    """
    Update or create user profile.
    """
    try:
        data = request.json
        if not data:
             return jsonify({"error": "No data provided"}), 400
             
        user_id = data.get("user_id")
        full_name = data.get("full_name")
        phone = data.get("phone")
        business_name = data.get("business_name")
        industry = data.get("industry")
        
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
            
        # Prepare profile data
        profile_data = {
            "user_id": user_id,
            "full_name": full_name,
            "phone": phone,
            "business_name": business_name,
            "industry": industry,
            "updated_at": "now()"
        }
        
        # Upsert profile (Insert or Update)
        response = supabase_client.table("user_profiles").upsert(
            profile_data, on_conflict="user_id"
        ).execute()
        
        if response.data:
            return jsonify({
                "success": True,
                "profile": response.data[0],
                "message": "Profile updated successfully"
            })
        else:
             # If upsert doesn't return data, fetch it manually to confirm
             fetch_profile = supabase_client.table("user_profiles").select("*").eq("user_id", user_id).execute()
             if fetch_profile.data:
                 return jsonify({
                    "success": True,
                    "profile": fetch_profile.data[0],
                    "message": "Profile updated successfully"
                })
             return jsonify({"error": "Failed to update profile (no data returned)"}), 500

    except Exception as e:
        print(f"ERROR in update_user_profile: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 500


# ==========================================
# ADVANCED FEATURES EXTENSIONS (NON-BREAKING)
# ==========================================

import base64
from services.pitch_deck_service import create_pitch_deck, create_bank_loan_pdf
from services.trends_service import get_market_trends

@app.route("/api/generate-pitch-deck", methods=["POST"])
def api_generate_pitch_deck():
    """
    Receives a BusinessPlan JSON and returns base64 encoded PPTX and PDF files.
    """
    try:
        data = request.json or {}
        business_plan = data.get("business_plan")
        if not business_plan:
            return jsonify({"error": "Business plan data is required"}), 400
            
        pptx_bytes = create_pitch_deck(business_plan)
        pdf_bytes = create_bank_loan_pdf(business_plan)
        
        pptx_b64 = base64.b64encode(pptx_bytes).decode('utf-8')
        pdf_b64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return jsonify({
            "success": True,
            "pptx_base64": pptx_b64,
            "pdf_base64": pdf_b64,
            "message": "Pitch deck generated successfully"
        })
        
    except Exception as e:
        import traceback
        logger.error(f"Error generation pitch deck: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route("/api/market-trends", methods=["GET"])
def api_market_trends():
    """
    Returns simulated hyper-local market trends for a user's city.
    """
    try:
        city = request.args.get("city", "India")
        trends_data = get_market_trends(city)
        return jsonify({
            "success": True,
            "data": trends_data
        })
    except Exception as e:
        logger.error(f"Error fetching market trends: {str(e)}")
        return jsonify({"error": str(e)}), 500
@app.route("/api/analyze-competitor", methods=["POST"])
def api_analyze_competitor():
    """
    Analyzes a competitor url or name using AI and generates a SWOT matrix.
    """
    try:
        data = request.json or {}
        competitor_query = data.get("competitor")
        industry = data.get("industry", "general")
        
        if not competitor_query:
            return jsonify({"error": "Competitor name or URL is required"}), 400
            
        from services.competitor_service import analyze_competitor
        analysis = analyze_competitor(competitor_query, industry)
        
        return jsonify({
            "success": True,
            "data": analysis
        })
    except Exception as e:
        logger.error(f"Error analyzing competitor: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
