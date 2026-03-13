# SMART-BITZ-AI - AI Business Intelligence Platform 🚀

**StartupDesk** is a next-generation AI-powered business intelligence and planning platform designed to help aspiring entrepreneurs, small business owners, and creators turn their ideas into actionable, data-driven, and highly detailed business plans. It acts as an AI co-founder, handling everything from market research and financial forecasting to supplier sourcing and marketing strategies.

![StartupDesk Dashboard](https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2015&q=80)

## 🌟 The Problem We Solve
Starting a business is overwhelming. Entrepreneurs often don't know where to begin, how much capital is required, who to source materials from, or how to market their product. StartupDesk solves this by leveraging generative AI to provide a clear, step-by-step master plan tailored to the user's exact budget, location, and interests.

---

## ✨ Core Features

### 1. 💡 Conversational AI Onboarding (SmartBiz Agent)
- Chat with our dedicated AI Agent to brainstorm ideas.
- Tell the AI your budget, city, and interests, and it will recommend the best viable business ideas specifically for your region.

### 2. 📊 Comprehensive Business Plans
Once an idea is selected, the system generates a massive, comprehensive business plan containing:
- **Investment & Revenue:** Detailed breakdown of required capital, projected monthly revenue, and break-even timelines.
- **Location & Setup:** Recommendations on shop size, area type, and exact setup requirements.
- **Workforce:** Required staff, skill levels, and estimated salaries.
- **Production Plan:** Step-by-step manufacturing or service delivery processes.
- **Growth Roadmap:** Actionable 30-day, 6-month, and long-term expansion plans.

### 3. 🌍 AI-Enriched Supplier Intelligence
- **Smart Product Mapping:** Select the product you want to build (e.g., "Masala Chai" or "Cotton T-Shirts").
- **Live AI Sourcing:** The system automatically analyzes the product and fetches verified suppliers from India and globally.
- **Key Metrics:** View minimum order quantities (MOQ), estimated costs, delivery times, and export readiness.
- **Pros/Cons & Comparison:** Compare up to 3 suppliers side-by-side to make informed sourcing decisions.

### 4. 💰 Advanced Financial Dashboards
- **Cash Flow Tracker:** Log actual expenses and let the AI automatically adjust your 12-month trajectory.
- **Pricing Strategy Calculator:** Real-time calculation of suggested retail prices based on competitor market data and desired profit margins.

### 5. 📢 AI Ad Campaign Generator
- Stop guessing what to post on social media. 
- Input your target audience and budget, and the AI will generate complete, platform-specific (Instagram, Facebook, LinkedIn) marketing campaigns, including ad copy, visual suggestions, and ROI projections.

### 6. 🔐 Secure & Modern Platform
- **Face Authentication:** Built-in biometric face authentication guard for sensitive areas like Financials and Cash Flow tracking.
- **Cloud Saves:** All generated business plans and progress are saved securely to Supabase.
- **Multi-Language Support:** Fully translated interface supporting English, Hindi (हिन्दी), and Marathi (मराठी).
- **PDF Export:** Download your entire business plan as a beautifully formatted PDF to share with investors or banks.

---

## 🛠️ Technology Architecture

StartupDesk uses a modern, high-performance decoupled architecture:

### Frontend (User Interface)
- **React 18** + **Vite** for lightning-fast module replacement.
- **TypeScript** for end-to-end type safety.
- **Tailwind CSS** + **shadcn/ui** for a premium, accessible, and responsive design system.
- **Recharts** for interactive financial data visualization.
- **Lucide React** for beautiful iconography.

### Backend (AI & Data Layer)
- **Python Flask Server:** Handles heavy auxiliary AI processing (like supplier intelligence and product keyword generation).
- **Supabase Edge Functions (Deno):** Runs secure, serverless backend logic for core business plan generation.
- **Supabase Database (PostgreSQL):** Robust relational database for users, business plans, and profiles.
- **Supabase Auth & RLS:** Secure JWT-based authentication with tight Row Level Security.
- **AI Models:** Powered by Llama 3 (via OpenRouter) and Google Gemini API for complex intelligence routing.

---

## 🚀 Local Development Setup

To run this project locally, you must run both the Python Flask backend and the React Vite frontend simultaneously.

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- A Supabase Project (with Database and Edge Functions configured)

### 1. Start the Flask Backend (AI Services)
The backend powers the dynamic product generation and AI supplier intelligence tabs.

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment (optional but highly recommended)
python -m venv venv
# On Mac/Linux: source venv/bin/activate
# On Windows: venv\Scripts\activate

# Install all required Python dependencies
pip install flask flask-cors google-generativeai python-dotenv requests openai

# Environment Variables
# Create a `.env` file inside the `backend/` folder and add your AI keys:
# OPENROUTER_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here

# Run the backend server
python app.py
```
*The Flask backend will run locally on `http://127.0.0.1:5000`.*

### 2. Start the Vite Frontend (React UI)
Open a new terminal window/tab to start the UI.

```bash
# From the root directory, install frontend dependencies
npm install

# Environment Variables
# Create a `.env.local` file in the root directory with your Supabase credentials
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start the dev server
npm run dev
```
*The React frontend will be accessible at `http://localhost:8080` (or the next available port).*

### 3. Deploying Supabase Edge Functions (Optional)
If you are deploying this project from scratch to a new Supabase instance, ensure you deploy the required Edge Functions:
```bash
# Requires Supabase CLI installed
supabase link --project-ref your_project_ref
supabase functions deploy generate-business-plan
supabase functions deploy suggest-ideas
```

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Build incredible things to help the world's next great founders.

## 📄 License
This project is open-source. Build freely!
