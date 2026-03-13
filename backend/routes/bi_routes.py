"""
BI Routes Blueprint — /api/bi/* endpoints
Registered in app.py with a single register_blueprint() call.
ZERO changes to existing endpoints.
"""

from flask import Blueprint, request, jsonify
from services.bi_service import (
    research_product_intelligence,
    get_enriched_suppliers,
    get_product_materials,
    get_recipe_breakdown,
    get_business_products,
)
from services.plan_service import generate_business_plan
import logging

logger = logging.getLogger(__name__)

bi_bp = Blueprint("bi", __name__, url_prefix="/api/bi")


# ─── CORS preflight ───────────────────────────────────────────────────────────
@bi_bp.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@bi_bp.route("/research-product", methods=["POST", "OPTIONS"])
def research_product():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json() or {}
        business_type = data.get("business_type", "")
        product_name = data.get("product_name", "")

        if not business_type:
            return jsonify({"success": False, "error": "business_type is required"}), 400

        result = research_product_intelligence(business_type, product_name)
        return jsonify({"success": True, "data": result})

    except Exception as e:
        logger.error(f"research-product error: {e}")
        return jsonify({"success": False, "error": str(e), "fallback": True}), 500


@bi_bp.route("/enriched-suppliers", methods=["POST", "OPTIONS"])
def enriched_suppliers():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json() or {}
        business_type = data.get("business_type", "")
        product_name = data.get("product_name", "")
        city = data.get("city", "India")

        if not business_type or not product_name:
            return jsonify({"success": False, "error": "business_type and product_name required"}), 400

        result = get_enriched_suppliers(business_type, product_name, city)
        return jsonify({"success": True, "data": result})

    except Exception as e:
        logger.error(f"enriched-suppliers error: {e}")
        return jsonify({"success": False, "error": str(e), "fallback": True}), 500


@bi_bp.route("/product-materials", methods=["POST", "OPTIONS"])
def product_materials():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json() or {}
        business_type = data.get("business_type", "")
        product_name = data.get("product_name", "")

        if not business_type or not product_name:
            return jsonify({"success": False, "error": "business_type and product_name required"}), 400

        result = get_product_materials(business_type, product_name)
        return jsonify({"success": True, "data": result})

    except Exception as e:
        logger.error(f"product-materials error: {e}")
        return jsonify({"success": False, "error": str(e), "fallback": True}), 500


@bi_bp.route("/recipe-breakdown", methods=["POST", "OPTIONS"])
def recipe_breakdown():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json() or {}
        business_type = data.get("business_type", "")
        product_name = data.get("product_name", "")

        if not business_type or not product_name:
            return jsonify({"success": False, "error": "business_type and product_name required"}), 400

        result = get_recipe_breakdown(business_type, product_name)
        return jsonify({"success": True, "data": result})

    except Exception as e:
        logger.error(f"recipe-breakdown error: {e}")
        return jsonify({"success": False, "error": str(e), "fallback": True}), 500


@bi_bp.route("/product-list", methods=["POST", "OPTIONS"])
def product_list():
    """Return business-specific products — replaces broken Supabase edge function."""
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json() or {}
        business_name = data.get("businessName", "") or data.get("business_name", "")

        if not business_name:
            return jsonify({"success": False, "error": "businessName is required"}), 400

        result = get_business_products(business_name)
        # Return in the same format the frontend expects from the old edge function
        return jsonify({"success": True, "products": result.get("products", []), "data": result})

    except Exception as e:
        logger.error(f"product-list error: {e}")
        return jsonify({"success": False, "error": str(e), "products": []}), 500


@bi_bp.route("/generate-business-plan", methods=["POST", "OPTIONS"])
def complete_business_plan():
    """Generate a full business plan using the local backend to bypass Edge Function API Key issues."""
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    try:
        data = request.get_json() or {}
        user_profile = data.get("userProfile", {})
        selected_business = data.get("selectedBusiness", {})
        selected_product = data.get("selectedProduct", {})

        if not user_profile or not selected_business:
            return jsonify({"error": "userProfile and selectedBusiness are required"}), 400

        result = generate_business_plan(user_profile, selected_business, selected_product)
        
        if "error" in result:
             return jsonify(result), 500
             
        # The frontend expects the JSON to be at the root of the response
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Generate Business Plan error: {e}")
        return jsonify({"error": str(e)}), 500
