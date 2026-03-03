# StartupDesk - AI Business Intelligence Platform 🚀

**StartupDesk** is a comprehensive, AI-powered business intelligence and planning platform designed to help entrepreneurs turn ideas into actionable, data-driven business plans. From financial forecasting to real-world supplier intelligence, StartupDesk acts as your AI co-founder.

![StartupDesk Dashboard](https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2015&q=80)

## ✨ Key Features

- **💡 AI Business Idea Generation:** Get personalized business recommendations based on your budget, city, location, and interests.
- **📊 Comprehensive Business Plans:** Automatically generate detailed business plans including investment requirements, revenue forecasts, break-even analysis, and marketing strategies.
- **🌍 AI-Enriched Supplier Intelligence:** Find real, verified suppliers for your business. The AI automatically suggests required raw materials/equipment based on your business type and gives you detailed supplier comparisons, pros/cons, delivery times, and MOQs.
- **💰 Financial Dashboards & Cash Flow:** Interactive charts visualizing pricing strategy, monthly cash flow, and cost breakdowns.
- **📢 AI Ad Campaign Generator:** Automatically generate professional, platform-specific social media advertisements and marketing strategies.
- **🔐 Secure Authentication:** Seamless user authentication and saved cloud profiles powered by Supabase.
- **🌐 Multi-Language Support:** Full translation support for English, Hindi (हिन्दी), and Marathi (मराठी).

## 🛠️ Technology Stack

**Frontend:**
- **React 18** + **Vite**
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui** for stunning, responsive UI components
- **Lucide React** for icons
- **Recharts** for interactive financial data visualization

**Backend & AI Services:**
- **Python Flask** for auxiliary AI processing routes
- **Supabase** (PostgreSQL Database, Edge Functions, Authentication, Row Level Security)
- **OpenRouter API (Llama 3/Mistral models)** & **Google Gemini API** for intelligent data generation

---

## 🚀 Getting Started

To run this project locally, you will need to start both the Python Flask backend and the React Vite frontend.

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- A Supabase Project (with Database and Edge Functions configured)

### 1. Start the Flask Backend (AI Services)

The backend handles the AI-powered product mapping, supplier intelligence, and recommendation generation.

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install flask flask-cors google-generativeai python-dotenv requests openai

# Create a .env file inside the backend folder and add your AI keys:
# OPENROUTER_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here

# Run the backend server
python app.py
```
*The backend will run on `http://127.0.0.1:5000`.*

### 2. Start the Vite Frontend (React UI)

Open a new terminal window/tab:

```bash
# From the root directory, install frontend dependencies
npm install

# Create a .env.local file in the root directory with your Supabase credentials
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start the dev server
npm run dev
```
*The frontend will run on `http://localhost:8080` (or next available port).*

### 3. Supabase Edge Functions & Database (Optional Setup)
If you are deploying this from scratch, ensure your Supabase database has the required tables (`profiles`, `saved_business_plans`, `plan_ads`, etc.) and that Edge Functions are built and deployed via the Supabase CLI:
```bash
supabase functions deploy generate-business-plan
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source.
