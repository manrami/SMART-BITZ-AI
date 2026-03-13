// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    // Define global headers conditionally.
    // If there's no auth header (unauthenticated user), don't pass an Authorization header to the client
    // to avoid invalid token errors. Instead, the Anon key will be used by default for basic access.
    const globalHeaders = authHeader
      ? { headers: { Authorization: authHeader } }
      : {};

    const supabaseClient = createClient(
      // Supabase API URL - Env var exported by default.
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API Anon Key - Env var exported by default.
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      { global: globalHeaders },
    );

    const { businessName } = await req.json();

    if (!businessName) {
      throw new Error("Business Name is required");
    }

    console.log(`Fetching products for business: ${businessName}`);

    // 1. Get Business Definition ID - Try Exact Match First
    let { data: businessData, error: businessError } = await supabaseClient
      .from("business_definitions")
      .select("id, name")
      .ilike("name", businessName)
      .maybeSingle();

    // 2. Fuzzy/Keyword Matching Fallback
    if (!businessData) {
      const lowerName = businessName.toLowerCase();
      let searchCategory = "";

      if (
        lowerName.includes("food") ||
        lowerName.includes("stall") ||
        lowerName.includes("cart") ||
        lowerName.includes("puri") ||
        lowerName.includes("pav") ||
        lowerName.includes("snack") ||
        lowerName.includes("cafe")
      ) {
        searchCategory = "Street Food Stall";
      } else if (
        lowerName.includes("bake") ||
        lowerName.includes("cake") ||
        lowerName.includes("bread") ||
        lowerName.includes("pastry")
      ) {
        searchCategory = "Bakery";
      } else if (
        lowerName.includes("garment") ||
        lowerName.includes("cloth") ||
        lowerName.includes("apparel") ||
        lowerName.includes("boutique") ||
        lowerName.includes("tailor")
      ) {
        searchCategory = "Garment Manufacturing";
      }

      if (searchCategory) {
        console.log(`Fuzzy matched '${businessName}' to '${searchCategory}'`);
        const { data: fallbackData } = await supabaseClient
          .from("business_definitions")
          .select("id, name")
          .eq("name", searchCategory)
          .maybeSingle();

        if (fallbackData) {
          businessData = fallbackData;
        }
      }
    }

    // 3. Try to get products from DB first if business exists
    let products = [];
    if (businessData) {
      const { data: dbProducts, error: productsError } = await supabaseClient
        .from("products")
        .select("*")
        .eq("business_id", businessData.id);

      if (productsError) {
        console.error("DB Error fetching products:", productsError);
      } else if (dbProducts && dbProducts.length > 0) {
        products = dbProducts;
      }
    }

    // 4. If we found products in DB, return them immediately
    if (products.length > 0) {
      console.log(
        `Found ${products.length} products in DB for ${businessName}`,
      );
      return new Response(JSON.stringify({ products }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. If NO products found in DB, fallback to AI dynamic generation
    console.log(
      "No DB products found. Falling back to AI dynamic generation for:",
      businessName,
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const API_KEY = LOVABLE_API_KEY || OPENROUTER_API_KEY;

    if (!API_KEY) {
      console.warn("No AI API Key found, returning empty products.");
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const API_URL = LOVABLE_API_KEY
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

    const systemPrompt = `You are an expert business advisor. The user wants to start a business named "${businessName}". 
Research and generate a list of exactly 10 core products or services this business would sell, based on real-world industry data.
Respond ONLY with a valid JSON array of objects. Do not include any conversational text or markdown formatting before or after the JSON.
Format:
[
  {
    "name": "Product / Service Name",
    "description": "Overview of the product or service.",
    "avg_selling_price": 500
  }
]`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct",
        max_tokens: 2000,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate products for: ${businessName}` },
        ],
      }),
    });

    if (!response.ok) {
      console.error(
        "AI gateway error generating products",
        await response.text(),
      );
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (!content) {
      console.error("AI returned empty content");
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generatedProducts = [];
    try {
      // Extract JSON array from text
      const tempContent = content.trim();
      const firstBracket = tempContent.indexOf('[');
      const lastBracket = tempContent.lastIndexOf(']');

      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket >= firstBracket) {
        const jsonStr = tempContent.substring(firstBracket, lastBracket + 1);
        generatedProducts = JSON.parse(jsonStr);
      } else {
        generatedProducts = JSON.parse(tempContent);
      }
    } catch (initialParseError) {
      console.warn(
        "Initial JSON parse failed, attempting recovery...",
        initialParseError,
      );
      // Attempt to fix truncated JSON array
      try {
        let recoveredContent = content;
        const jsonMatch = content.match(/\[[\s\S]*/);
        if (jsonMatch) {
          recoveredContent = jsonMatch[0];
          const lastValidIndex = recoveredContent.lastIndexOf("}");
          if (lastValidIndex > -1) {
            recoveredContent =
              recoveredContent.substring(0, lastValidIndex + 1) + "\n]";
          }
        }
        generatedProducts = JSON.parse(recoveredContent);
      } catch (recoveryError) {
        console.error("Total failure to parse AI generated products:", content);
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    try {
      // Add unique mock IDs
      const formattedProducts = generatedProducts.map((p: any, i: number) => ({
        ...p,
        id: `dynamic-${Date.now()}-${i}`,
        business_id: businessData?.id || `dynamic-biz-${Date.now()}`,
      }));

      console.log(`AI generated ${formattedProducts.length} dynamic products.`);
      return new Response(JSON.stringify({ products: formattedProducts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Failed to parse AI generated products:", content);
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
