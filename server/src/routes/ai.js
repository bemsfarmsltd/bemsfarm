const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// ── SMARTER DIETARY RULES (Differentiated by need) ─────────
const DIETARY_RULES = {
  diabetes: {
    healthNote:
      "Diabetes management requires low glycemic index foods that release energy slowly. High-fiber foods like beans help stabilize blood sugar levels.",
    mealTip:
      "Try beans and vegetable soup: cook brown beans with ugu leaves, fresh tomatoes, and minimal palm oil. Eat with brown rice for stable blood sugar.",
    priorities: {
      beans: "HIGH",
      ugu: "HIGH",
      tomatoes: "HIGH",
      ofada_rice: "MEDIUM",
      groundnut: "LOW",
      palm_oil: "AVOID",
    },
    avoidReasons: { palm_oil: "High saturated fat worsens insulin resistance" },
  },
  weight_loss: {
    healthNote:
      "For weight loss, focus on high-fiber, high-protein, low-calorie foods that keep you full longer and reduce unhealthy snacking.",
    mealTip:
      "Make a filling beans and vegetable stew: cook beans slowly with ugu leaves, tomatoes, and minimal oil. This high-protein, high-fiber meal keeps you full for hours.",
    priorities: {
      beans: "HIGH",
      ugu: "HIGH",
      tomatoes: "HIGH",
      ofada_rice: "MEDIUM",
      groundnut: "LOW",
      palm_oil: "MINIMIZE",
    },
    avoidReasons: {
      garri: "High calorie, low satiety",
      palm_oil: "High in calories",
    },
  },
  heart_health: {
    healthNote:
      "For heart health, choose foods rich in fiber, potassium, and healthy fats. Reduce saturated fat and sodium.",
    mealTip:
      "Prepare beans porridge with spinach, tomatoes, and just 1 tablespoon of groundnut oil. This heart-healthy meal is rich in soluble fiber that lowers cholesterol.",
    priorities: {
      beans: "HIGH",
      ugu: "HIGH",
      tomatoes: "HIGH",
      groundnut: "MEDIUM",
      ofada_rice: "MEDIUM",
      palm_oil: "MINIMIZE",
      crayfish: "LOW",
    },
    avoidReasons: { palm_oil: "High saturated fat increases LDL cholesterol" },
  },
  pregnancy: {
    healthNote:
      "During pregnancy, you need extra iron, folate, protein, and calcium. Ugu leaves are exceptionally high in iron and folate — critical for preventing anemia.",
    mealTip:
      "Make ugu leaf soup with crayfish and beans: iron from ugu (prevents anemia), protein from crayfish (baby development), folate from beans (neural tube health).",
    priorities: {
      ugu: "CRITICAL",
      crayfish: "HIGH",
      beans: "HIGH",
      tomatoes: "HIGH",
      palm_oil: "MEDIUM",
      eggs: "HIGH",
    },
    avoidReasons: {},
  },
  muscle_gain: {
    healthNote:
      "For muscle building, you need high protein intake combined with complex carbohydrates for energy recovery.",
    mealTip:
      "Post-workout: eat beans and rice together — beans provide all essential amino acids and rice gives carbs needed for muscle recovery.",
    priorities: {
      beans: "CRITICAL",
      crayfish: "HIGH",
      rice: "HIGH",
      groundnut: "MEDIUM",
      eggs: "CRITICAL",
      palm_oil: "MINIMIZE",
    },
    avoidReasons: {},
  },
  hypertension: {
    healthNote:
      "To lower blood pressure, focus on potassium-rich foods (ugu, beans) and reduce sodium.",
    mealTip:
      "Make low-sodium beans and vegetable soup using ugu leaves, fresh tomatoes, and beans. Use herbs and crayfish for flavour instead of salt.",
    priorities: {
      ugu: "CRITICAL",
      beans: "HIGH",
      tomatoes: "HIGH",
      ofada_rice: "MEDIUM",
      groundnut: "MEDIUM",
      salt: "AVOID",
    },
    avoidReasons: {
      salt: "Increases blood pressure",
      processed_food: "High sodium",
    },
  },
  children: {
    healthNote:
      "Children need balanced nutrition for growth: protein for muscles, calcium for bones, iron for brain development.",
    mealTip:
      "Cook a child-friendly beans and rice meal with tomato sauce and a sprinkle of crayfish. Mix in soft vegetables like carrots.",
    priorities: {
      rice: "HIGH",
      beans: "HIGH",
      tomatoes: "HIGH",
      crayfish: "HIGH",
      eggs: "CRITICAL",
      palm_oil: "MEDIUM",
    },
    avoidReasons: {},
  },
  general: {
    healthNote:
      "A balanced Nigerian diet rich in whole grains, legumes, and vegetables provides excellent nutrition.",
    mealTip:
      "A traditional Nigerian balanced meal: ofada rice + beans stew + ugu vegetable soup + tomato sauce + crayfish. This covers all nutritional bases.",
    priorities: {
      rice: "HIGH",
      beans: "HIGH",
      tomatoes: "HIGH",
      ugu: "MEDIUM",
      groundnut: "MEDIUM",
      palm_oil: "MEDIUM",
      crayfish: "MEDIUM",
    },
    avoidReasons: {},
  },
};

// ── GET SMART RECOMMENDATIONS ────────────────────────────────
router.post("/recommendations", async (req, res) => {
  try {
    console.log("🎯 Smart recommendations request:", req.body);

    const { dietary_need, budget, family_size } = req.body;

    if (!dietary_need) {
      return res.status(400).json({ message: "dietary_need is required" });
    }

    const rules = DIETARY_RULES[dietary_need] || DIETARY_RULES.general;
    console.log("📖 Using rules for:", dietary_need);

    try {
      const productsResult = await pool.query(
        `SELECT id, name, price, unit, stock FROM products
         WHERE COALESCE(stock, 100) > 0 ORDER BY name ASC LIMIT 50`,
      );
      const allProducts = productsResult.rows;

      const matched = [];
      const priorities = rules.priorities || {};

      for (const [keyword, priority] of Object.entries(priorities)) {
        if (priority === "AVOID") continue;

        const product = allProducts.find((p) => {
          const nameLower = p.name.toLowerCase();
          return nameLower.includes(keyword.toLowerCase());
        });

        if (product && matched.length < 8) {
          matched.push({
            product_name: product.name,
            product_id: product.id,
            price: Math.round((product.price || 2000) * 1500),
            unit: product.unit || "1kg",
            reason: getPriorityReason(keyword, priority, dietary_need),
            suggested_quantity: getSuggestedQuantity(keyword, family_size),
            priority:
              priority === "CRITICAL"
                ? "high"
                : priority === "HIGH"
                  ? "high"
                  : priority === "MEDIUM"
                    ? "medium"
                    : "low",
          });
        }
      }

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      matched.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
      );

      console.log("✅ Generated", matched.length, "smart recommendations");

      res.json({
        recommendations: matched.slice(0, 8),
        health_note: rules.healthNote,
        meal_tip: rules.mealTip,
        source: "smart-matching",
      });
    } catch (dbErr) {
      console.error("⚠️ Database error:", dbErr.message);
      res.json({
        recommendations: [],
        health_note: rules.healthNote,
        meal_tip: rules.mealTip,
        source: "fallback",
      });
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ message: "Error: " + err.message });
  }
});

// ── PHASE 1: CO-PURCHASE RECOMMENDATIONS ─────────────────────
router.post("/co-purchase", async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: "product_id required" });
    }

    console.log(
      "🛒 Finding co-purchase recommendations for product:",
      product_id,
    );

    const result = await pool.query(
      `
      SELECT
        p.id, p.name, p.price, p.unit,
        COUNT(*) as frequency,
        ROUND(COUNT(*) * 100.0 / (
          SELECT COUNT(DISTINCT order_id) FROM order_items WHERE product_id = $1
        ), 1) as buy_together_percentage
      FROM order_items oi1
      JOIN order_items oi2 ON oi1.order_id = oi2.order_id
      JOIN products p ON p.id = oi2.product_id
      WHERE oi1.product_id = $1
        AND oi2.product_id != $1
      GROUP BY p.id, p.name, p.price, p.unit
      ORDER BY frequency DESC
      LIMIT 5
    `,
      [product_id],
    );

    const recommendations = result.rows.map((r) => ({
      product_name: r.name,
      product_id: r.id,
      price: Math.round((r.price || 2000) * 1500),
      unit: r.unit,
      frequency: r.frequency,
      buyTogetherPercentage: r.buy_together_percentage,
    }));

    console.log("✅ Found", recommendations.length, "co-purchases");

    res.json({
      message: `Customers who bought this also bought:`,
      recommendations,
      source: "co-purchase-analysis",
    });
  } catch (err) {
    console.error("❌ Co-purchase error:", err.message);
    res.status(500).json({ message: "Error: " + err.message });
  }
});

// ── PHASE 2: SMART SHOPPING ASSISTANT ────────────────────────
router.post("/recipe-helper", async (req, res) => {
  try {
    const { recipe_name } = req.body;

    if (!recipe_name) {
      return res.status(400).json({ message: "recipe_name required" });
    }

    const recipes = {
      "jollof rice": {
        ingredients: ["rice", "tomatoes", "onion", "pepper", "groundnut oil"],
        instructions: "Fry onions, add tomatoes, then rice. Cook until fluffy.",
        servings: 4,
      },
      "beans and rice": {
        ingredients: [
          "beans",
          "rice",
          "tomatoes",
          "onion",
          "palm oil",
          "crayfish",
        ],
        instructions:
          "Cook beans with onions and palm oil. Cook rice separately. Mix and serve.",
        servings: 4,
      },
      "pepper soup": {
        ingredients: [
          "pepper",
          "tomatoes",
          "groundnut oil",
          "onion",
          "crayfish",
        ],
        instructions:
          "Blend pepper and tomatoes. Fry in oil with crayfish. Add water and simmer.",
        servings: 2,
      },
      "ugu soup": {
        ingredients: [
          "ugu",
          "crayfish",
          "beans",
          "tomatoes",
          "palm oil",
          "onion",
        ],
        instructions:
          "Fry onions in palm oil, add tomatoes, then ugu and crayfish. Simmer 15 mins.",
        servings: 4,
      },
      "garri and soup": {
        ingredients: [
          "garri",
          "vegetable soup",
          "crayfish",
          "palm oil",
          "tomatoes",
        ],
        instructions:
          "Make vegetable soup with tomatoes, palm oil, and crayfish. Serve with garri.",
        servings: 3,
      },
    };

    const recipe = recipes[recipe_name.toLowerCase()] || recipes["jollof rice"];

    const productsResult = await pool.query(
      `SELECT id, name, price, unit, stock FROM products
       WHERE COALESCE(stock, 100) > 0
       ORDER BY name ASC LIMIT 50`,
    );
    const allProducts = productsResult.rows;

    const ingredients = recipe.ingredients.map((ingredient) => {
      const product = allProducts.find((p) =>
        p.name.toLowerCase().includes(ingredient.toLowerCase()),
      );
      return {
        ingredient_name: ingredient,
        product_id: product?.id || null,
        product_name: product?.name || ingredient,
        price: product ? Math.round((product.price || 2000) * 1500) : null,
        unit: product?.unit || "1 unit",
      };
    });

    console.log("✅ Recipe helper found", ingredients.length, "ingredients");

    res.json({
      recipe_name,
      servings: recipe.servings,
      instructions: recipe.instructions,
      ingredients,
      source: "recipe-helper",
    });
  } catch (err) {
    console.error("❌ Recipe error:", err.message);
    res.status(500).json({ message: "Error: " + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// SMART CHAT — now genuinely AI-powered via Gemini
//
// BEFORE: getSmartChatResponse() only matched 4 keyword buckets and
// fell through to a RANDOM tip for everything else — including
// reasonable questions like "where is your company located", which
// is why that question returned an unrelated ingredients prompt.
//
// AFTER: keyword buckets still handle the well-defined cases instantly
// (recipes, health, delivery) since those benefit from exact, curated
// answers. Anything else now goes to Gemini with a system prompt that
// grounds it in BemsFarms context, so open-ended questions get a real,
// relevant answer instead of a random canned tip.
//
// Falls back to the old rule-based tips ONLY if Gemini errors or the
// API key is missing — chat never breaks even if Gemini is down.
// ═══════════════════════════════════════════════════════════════

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const BEMSFARMS_SYSTEM_PROMPT = `You are the BemsFarms shopping assistant — a friendly, concise AI for a Nigerian farm-fresh grocery e-commerce platform.

Facts about BemsFarms:
- We are an online-only marketplace (no physical retail storefront) connecting customers directly with Nigerian farmers.
- We deliver same-day within Lagos (2-4 hours) and within 1-3 days nationwide across Nigeria.
- Free delivery on orders over ₦15,000.
- We sell fresh produce, grains, tubers, spices, and pantry staples sourced from local farms.
- We offer AI-powered features: smart product search, personalized dietary recommendations, recipe-based shopping lists, and dynamic fair pricing.

Tone: warm, brief, helpful — like a knowledgeable friend, not a corporate bot. Use at most 1-2 short sentences plus one relevant emoji. If asked something you genuinely don't know (e.g. a specific policy not listed here), say so honestly and suggest contacting support, rather than inventing details.`;

async function callGemini(userMessage) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: BEMSFARMS_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned no text in response");
  }

  return text.trim();
}

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "messages array required" });
    }

    const lastMessage = messages[messages.length - 1]?.content || "";

    // Curated buckets first — these have exact, reliable answers we
    // want every time, not subject to AI variability.
    const ruleBasedReply = getRuleBasedReply(lastMessage);
    if (ruleBasedReply) {
      return res.json({ reply: ruleBasedReply, source: "rule-based" });
    }

    // Anything else → try real AI for a genuinely relevant answer.
    try {
      const aiReply = await callGemini(lastMessage);
      return res.json({ reply: aiReply, source: "gemini" });
    } catch (geminiErr) {
      console.error(
        "⚠️ Gemini call failed, using fallback:",
        geminiErr.message,
      );
      const fallback = getFallbackTip();
      return res.json({ reply: fallback, source: "fallback" });
    }
  } catch (err) {
    console.error("❌ Chat error:", err.message);
    res.status(500).json({ message: "Error: " + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function getPriorityReason(keyword, priority, dietary_need) {
  const reasons = {
    diabetes: {
      beans: "High fiber slows sugar absorption and stabilizes blood glucose",
      ugu: "Rich in chromium which improves insulin sensitivity",
      tomatoes: "Low GI, high in vitamin C which supports glucose metabolism",
      ofada_rice:
        "Brown rice has more fiber than white rice for better blood sugar control",
    },
    weight_loss: {
      beans: "High protein and fiber keep you full for 4+ hours",
      ugu: "Extremely low calorie (13 cal per 100g) but nutrient-dense",
      tomatoes: "Very low calorie (18 cal per 100g), fills you up with volume",
      groundnut:
        "Healthy monounsaturated fats provide sustained energy without excess calories",
    },
    heart_health: {
      beans:
        "Rich in soluble fiber that binds cholesterol and removes it from the body",
      ugu: "High in potassium which relaxes blood vessel walls and lowers BP",
      tomatoes:
        "Lycopene in tomatoes proven to reduce cardiovascular disease risk by 15%",
      groundnut: "Monounsaturated fats improve HDL/LDL cholesterol ratio",
    },
    pregnancy: {
      ugu: "One of the highest iron sources (3.2mg per 100g) — prevents pregnancy anemia",
      crayfish:
        "Complete protein with all amino acids needed for fetal development",
      beans:
        "Rich in folate (500mcg per cup) which prevents neural tube defects",
      tomatoes: "Vitamin C enhances iron absorption from plant sources",
    },
    muscle_gain: {
      beans: "Contains 15g protein per 100g PLUS all 9 essential amino acids",
      crayfish: "Premium protein (80% of calories) with minimal carbs",
      rice: "Complex carbs replenish glycogen stores for muscle recovery post-workout",
      eggs: "Perfect protein profile with all amino acids needed for muscle synthesis",
    },
  };

  return (
    reasons[dietary_need]?.[keyword] ||
    `Excellent source of nutrients for ${dietary_need}`
  );
}

function getSuggestedQuantity(keyword, family_size) {
  const familyMultiplier =
    family_size === "1 person"
      ? 1
      : family_size === "2 people"
        ? 2
        : family_size === "4 people"
          ? 4
          : 6;

  const quantities = {
    beans: `${1 * familyMultiplier}kg per week`,
    ugu: `${2 * familyMultiplier} bunches per week`,
    tomatoes: `${0.5 * familyMultiplier}kg per week`,
    rice: `${2 * familyMultiplier}kg per week`,
    groundnut: `${0.5 * familyMultiplier}L per month`,
    palm_oil: `${0.3 * familyMultiplier}L per month`,
    crayfish: `${0.2 * familyMultiplier}kg per week`,
    ofada_rice: `${2 * familyMultiplier}kg per week`,
  };

  return quantities[keyword] || "As needed";
}

// Returns a string if the message matches a curated bucket, or null
// if nothing matched (caller should fall through to Gemini).
function getRuleBasedReply(message) {
  const m = message.toLowerCase();

  if (m.includes("recipe") || m.includes("cook") || m.includes("make")) {
    if (m.includes("jollof"))
      return '🍚 Want to make jollof rice? You\'ll need: Rice, Tomatoes, Onion, Pepper, and Groundnut Oil. I can add all these to your cart! Say "add jollof rice ingredients"';
    if (m.includes("beans"))
      return '🫘 Making beans and rice? You\'ll need: Beans, Rice, Tomatoes, Onion, Palm Oil, and Crayfish. Say "add beans and rice ingredients"';
    if (m.includes("pepper"))
      return '🌶️ Pepper soup needs: Pepper, Tomatoes, Groundnut Oil, Onion, and Crayfish. Say "add pepper soup ingredients"';
    if (m.includes("ugu"))
      return '🌿 Ugu soup needs: Ugu Leaves, Crayfish, Beans, Tomatoes, Palm Oil, and Onion. Say "add ugu soup ingredients"';
    return "👨‍🍳 I can help you find ingredients for recipes! Popular ones: Jollof Rice, Beans & Rice, Pepper Soup, Ugu Soup. Which one?";
  }

  if (m.includes("what should i buy") || m.includes("what do i need")) {
    return "🤔 Tell me more! Are you:\n• Cooking a specific meal?\n• Managing a health condition (diabetes, weight loss, etc)?\n• Feeding a family?\nThis helps me recommend exactly what you need!";
  }

  if (
    m.includes("diabetes") ||
    m.includes("weight") ||
    m.includes("pregnant") ||
    m.includes("heart")
  ) {
    return "💡 Great! Go to our **AI Recommendations** page and select your health goal. I'll give you a personalized product list with exact quantities for your family size and budget.";
  }

  if (m.match(/deliver|shipping|fast|how long/)) {
    return "🚚 **Same-day in Lagos** (2-4 hours) | **1-3 days nationwide** | Free delivery over ₦15,000";
  }

  // No match — caller falls through to Gemini for an open-ended answer
  return null;
}

function getFallbackTip() {
  const tips = [
    "💡 Tip: Use code FRESH20 for 20% off",
    "🛒 Need help finding ingredients? Tell me what you're cooking!",
    "🎯 Use our AI Recommendations page for personalized health-based shopping",
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

module.exports = router;
