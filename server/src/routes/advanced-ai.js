const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// ═══════════════════════════════════════════════════════════════
// PHASE 3: SEMANTIC SEARCH — now a real hybrid system
//
// BEFORE: a static 10-entry keyword dictionary. Anything outside
// those exact phrases (e.g. "brunch", "spicy dinner", "party food")
// returned zero results, despite being marketed as "semantic" search.
//
// AFTER: three-tier hybrid, in order of cost (cheapest/fastest first):
//   1. Keyword dictionary match (instant, free, handles common cases)
//   2. Direct product-name substring match (instant, free)
//   3. Gemini AI fallback — ONLY when tiers 1-2 find nothing. Gemini
//      is given the REAL product catalog and asked to pick which
//      actual products fit the query's intent. It is explicitly
//      constrained to only return product names that exist in the
//      list it was given — its raw response is then validated against
//      the real catalog server-side, so a hallucinated product name
//      can never reach the user or be "addable" to cart with no real ID.
// ═══════════════════════════════════════════════════════════════

const SEMANTIC_CATEGORIES = {
  "cooking oil": ["palm oil", "groundnut oil", "oil"],
  "breakfast food": ["garri", "beans", "oatmeal", "oat", "egg"],
  "soup ingredients": [
    "tomatoes",
    "onion",
    "crayfish",
    "pepper",
    "ugu",
    "tomato",
  ],
  carbs: ["rice", "garri", "beans", "yam"],
  vegetables: ["ugu", "tomatoes", "pepper", "onion", "spinach"],
  protein: ["beans", "crayfish", "egg", "meat", "fish"],
  "healthy eating": ["ugu", "beans", "tomatoes", "ofada", "oat"],
  "festive meals": ["rice", "palm oil", "tomatoes", "crayfish"],
  "quick meals": ["garri", "noodles", "rice"],
  "nigerian staples": ["rice", "garri", "beans", "palm oil", "yam"],
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function getQueryEmbedding(query) {
  if (GEMINI_API_KEY === "MOCK") {
    const mockVector = [];
    let seed = 0;
    for (let i = 0; i < query.length; i++) {
      seed += query.charCodeAt(i);
    }
    for (let i = 0; i < 768; i++) {
      mockVector.push(Math.sin(seed + i) * 0.5);
    }
    return mockVector;
  }

  const model = "text-embedding-004";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: {
        parts: [{ text: query }]
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Embedding API status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data?.embedding?.values;
}

async function getAiProductMatches(query, allProducts) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Give Gemini ONLY the product names it's allowed to choose from —
  // this is what makes hallucination impossible to act on, even if
  // the model tries: anything it returns gets filtered against this
  // exact list before it's ever sent back to the user.
  const catalogNames = allProducts.map((p) => p.name);

  const prompt = `A customer searched for: "${query}"

Here is the FULL product catalog available (these are the ONLY valid product names):
${catalogNames.map((n) => `- ${n}`).join("\n")}

Pick up to 8 products from the list above that would genuinely satisfy what the customer is looking for, based on meal type, cuisine, occasion, or food category they mentioned. Use real-world food knowledge (e.g. "brunch" suggests eggs, bread, garri-based meals; "spicy" suggests pepper-heavy items).

Respond with ONLY a JSON array of product names copied EXACTLY as they appear in the list above. No explanation, no markdown, just the JSON array. If nothing in the catalog genuinely fits, respond with an empty array [].`;

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");

  // Strip markdown code fences if Gemini wraps the JSON in them anyway
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "");

  let suggestedNames;
  try {
    suggestedNames = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Gemini response was not valid JSON: " + cleaned.slice(0, 200),
    );
  }

  if (!Array.isArray(suggestedNames)) {
    throw new Error("Gemini response was not an array");
  }

  // ── VALIDATION GATE ──────────────────────────────────────────
  // Only keep names that exactly match a real product in our catalog.
  // Anything hallucinated gets silently dropped here, never reaching
  // the response.
  const catalogSet = new Set(catalogNames);
  const validNames = suggestedNames.filter((name) => catalogSet.has(name));

  return allProducts.filter((p) => validNames.includes(p.name));
}

router.post("/semantic-search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query)
      return res.status(400).json({ message: "Search query required" });

    const queryLower = query.toLowerCase().trim();

    const productsResult = await pool.query(
      `SELECT id, name, price, unit, COALESCE(stock, 100) as stock FROM products
       WHERE COALESCE(stock, 100) > 0 ORDER BY name ASC`,
    );
    const allProducts = productsResult.rows;

    let results = [];
    let matchTier = null;

    // ── TIER 1: keyword dictionary (instant, free) ──────────────
    const matched = Object.entries(SEMANTIC_CATEGORIES).find(
      ([key]) => key.includes(queryLower) || queryLower.includes(key),
    );

    if (matched) {
      const [, keywords] = matched;
      results = allProducts
        .filter((p) =>
          keywords.some((kw) =>
            p.name.toLowerCase().includes(kw.toLowerCase()),
          ),
        )
        .slice(0, 12);
      if (results.length) matchTier = "keyword-dictionary";
    }

    // ── TIER 2: direct product-name substring match (instant, free) ──
    if (!results.length) {
      results = allProducts
        .filter((p) => p.name.toLowerCase().includes(queryLower))
        .slice(0, 12);
      if (results.length) matchTier = "direct-match";
    }

    // ── TIER 3: pgvector Database Similarity Search ──────────────────
    if (!results.length) {
      try {
        console.log(`🤖 Running pgvector database search for: "${query}"`);
        const queryVector = await getQueryEmbedding(query);
        if (queryVector) {
          const vectorStr = `[${queryVector.join(",")}]`;
          // search matching products with threshold 0.3 (or adjust as needed) and limit 8
          const vectorResults = await pool.query(
            "SELECT * FROM match_products($1, 0.3, 8)",
            [vectorStr]
          );
          if (vectorResults.rows.length) {
            results = vectorResults.rows;
            matchTier = "vector-similarity";
          }
        }
      } catch (vectorErr) {
        console.warn("⚠️ pgvector search failed:", vectorErr.message);
      }
    }

    // ── TIER 4: Gemini AI fallback (as a final safety net) ───────────
    if (!results.length) {
      try {
        console.log(
          `🤖 No keyword/vector matches for "${query}" — trying Gemini fallback`,
        );
        const aiMatches = await getAiProductMatches(query, allProducts);
        if (aiMatches.length) {
          results = aiMatches.slice(0, 8);
          matchTier = "ai-reasoning";
        }
      } catch (aiErr) {
        console.warn("⚠️ Gemini search fallback failed:", aiErr.message);
      }
    }

    res.json({
      query,
      results: results.map((p) => ({
        id: p.id,
        name: p.name,
        price: Math.round((parseFloat(p.price) || 2) * 1500),
        unit: p.unit,
        stock: p.stock,
      })),
      match_tier: matchTier,
    });
  } catch (err) {
    console.error("Semantic search error:", err.message);
    res.status(500).json({ message: "Search error: " + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PHASE 4: DYNAMIC PRICING
// ═══════════════════════════════════════════════════════════════

const SEASONALITY_MULTIPLIERS = {
  tomatoes: {
    Jan: 1.3,
    Feb: 1.25,
    Mar: 1.1,
    Apr: 1.0,
    May: 1.0,
    Jun: 1.0,
    Jul: 1.0,
    Aug: 1.0,
    Sep: 1.0,
    Oct: 1.1,
    Nov: 1.2,
    Dec: 1.4,
  },
  rice: {
    Jan: 1.1,
    Feb: 1.05,
    Mar: 1.0,
    Apr: 1.0,
    May: 1.0,
    Jun: 1.0,
    Jul: 1.0,
    Aug: 1.0,
    Sep: 1.0,
    Oct: 1.0,
    Nov: 1.05,
    Dec: 1.15,
  },
  "palm oil": {
    Jan: 1.1,
    Feb: 1.05,
    Mar: 1.0,
    Apr: 0.95,
    May: 0.9,
    Jun: 0.9,
    Jul: 0.95,
    Aug: 1.0,
    Sep: 1.05,
    Oct: 1.1,
    Nov: 1.15,
    Dec: 1.2,
  },
  ugu: {
    Jan: 1.3,
    Feb: 1.2,
    Mar: 1.1,
    Apr: 1.0,
    May: 1.0,
    Jun: 1.0,
    Jul: 0.95,
    Aug: 0.9,
    Sep: 0.95,
    Oct: 1.0,
    Nov: 1.1,
    Dec: 1.2,
  },
};

router.post("/dynamic-pricing", async (req, res) => {
  try {
    const { product_id } = req.body;
    const result = await pool.query(
      `SELECT id, name, price, COALESCE(stock, 100) as stock FROM products WHERE id = $1`,
      [parseInt(product_id)],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = result.rows[0];
    const basePrice = parseFloat(product.price) * 1500;
    const currentMonth = new Date().toLocaleString("en-US", { month: "short" });
    const currentStock = parseInt(product.stock) || 100;

    let multiplier = 1.0;

    const nameLower = product.name.toLowerCase();
    const seasonalKey = Object.keys(SEASONALITY_MULTIPLIERS).find((k) =>
      nameLower.includes(k),
    );
    const seasonality = seasonalKey ? SEASONALITY_MULTIPLIERS[seasonalKey] : {};
    multiplier *= seasonality[currentMonth] || 1.0;

    if (currentStock < 5) multiplier *= 1.3;
    else if (currentStock < 20) multiplier *= 1.15;
    else if (currentStock > 100) multiplier *= 0.95;

    let weeklySales = 0;
    try {
      const salesResult = await pool.query(
        `SELECT COUNT(oi.id) as sales
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.product_id = $1
           AND o.created_at > NOW() - INTERVAL '7 days'`,
        [parseInt(product_id)],
      );
      weeklySales = parseInt(salesResult.rows[0]?.sales || 0);
    } catch (e) {
      console.warn("Sales query skipped:", e.message);
    }

    if (weeklySales > 50) multiplier *= 1.1;
    else if (weeklySales < 5) multiplier *= 0.9;

    multiplier = Math.min(Math.max(multiplier, 0.7), 1.5);

    const dynamicPrice = Math.round(basePrice * multiplier);

    res.json({
      product_id,
      product_name: product.name,
      base_price: Math.round(basePrice),
      dynamic_price: dynamicPrice,
      discount_percent: multiplier < 1 ? Math.round((1 - multiplier) * 100) : 0,
      markup_percent: multiplier > 1 ? Math.round((multiplier - 1) * 100) : 0,
      factors: {
        seasonality: seasonality[currentMonth]
          ? `${Math.round((seasonality[currentMonth] - 1) * 100)}% seasonal adjustment`
          : "No seasonal adjustment",
        inventory:
          currentStock < 20
            ? `Low stock (${currentStock} units) — premium applied`
            : currentStock > 100
              ? `High stock (${currentStock} units) — discount applied`
              : `Normal stock (${currentStock} units)`,
        demand:
          weeklySales > 50
            ? `High demand — ${weeklySales} sales this week`
            : weeklySales < 5
              ? `Low demand — ${weeklySales} sales this week`
              : `Normal demand — ${weeklySales} sales this week`,
      },
      current_stock: currentStock,
      weekly_sales: weeklySales,
      current_month: currentMonth,
    });
  } catch (err) {
    console.error("Dynamic pricing error:", err.message);
    res.status(500).json({ message: "Pricing error: " + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PHASE 5: FRAUD DETECTION
// ═══════════════════════════════════════════════════════════════

router.post("/fraud-check", async (req, res) => {
  try {
    const { user_id, order_amount, payment_method, behavior_metrics } = req.body;
    const riskFactors = [];
    let riskScore = 0;

    // Check behavioral interaction metrics (if provided by client)
    if (behavior_metrics) {
      const { timeSpent, clicks, keyPresses } = behavior_metrics;
      
      if (timeSpent !== undefined && timeSpent < 3) {
        riskFactors.push(`Abnormal checkout speed (${timeSpent}s) - possible bot activity`);
        riskScore += 45;
      }
      
      if (clicks !== undefined && clicks < 2) {
        riskFactors.push("Minimal screen interaction detected - possible script injection");
        riskScore += 35;
      }
      
      if (keyPresses !== undefined && keyPresses === 0 && order_amount > 20000) {
        riskFactors.push("No manual keyboard input registered for checkout details");
        riskScore += 20;
      }
    }

    const failed = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE user_id=$1 AND status='cancelled' AND created_at > NOW() - INTERVAL '24 hours'`,
      [parseInt(user_id || 0)],
    );
    if (parseInt(failed.rows[0]?.count || 0) > 3) {
      riskFactors.push("Multiple cancelled orders in the last 24 hours");
      riskScore += 40;
    }

    const avgQ = await pool.query(
      `SELECT AVG(total) as avg_total FROM orders WHERE user_id=$1 AND status != 'cancelled'`,
      [parseInt(user_id || 0)],
    );
    const avgTotal = parseFloat(avgQ.rows[0]?.avg_total || 0);
    if (avgTotal > 0 && order_amount > avgTotal * 5) {
      riskFactors.push("Order is 5x larger than usual spending");
      riskScore += 30;
    }

    const rapid = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE user_id=$1 AND created_at > NOW() - INTERVAL '5 minutes'`,
      [parseInt(user_id || 0)],
    );
    if (parseInt(rapid.rows[0]?.count || 0) > 1) {
      riskFactors.push("Multiple orders placed within 5 minutes");
      riskScore += 35;
    }

    const userQ = await pool.query(
      `SELECT EXTRACT(DAY FROM (NOW() - created_at)) as days_old FROM users WHERE id=$1`,
      [parseInt(user_id || 0)],
    );
    const daysOld = parseInt(userQ.rows[0]?.days_old || 0);
    if (daysOld < 1 && order_amount > 50000) {
      riskFactors.push("New account placing a large first order");
      riskScore += 25;
    }

    const methods = await pool.query(
      `SELECT DISTINCT payment_method FROM orders WHERE user_id=$1`,
      [parseInt(user_id || 0)],
    );
    const known = methods.rows.map((r) => r.payment_method);
    if (known.length > 0 && !known.includes(payment_method)) {
      riskFactors.push("Payment method different from previous orders");
      riskScore += 15;
    }

    const riskLevel =
      riskScore > 70 ? "HIGH" : riskScore > 40 ? "MEDIUM" : "LOW";

    res.json({
      user_id,
      risk_level: riskLevel,
      risk_score: riskScore,
      risk_factors: riskFactors,
      should_require_verification: riskScore > 60,
      days_user_active: daysOld,
      average_order_amount: Math.round(avgTotal),
      order_amount,
      recommendation:
        riskScore > 70
          ? "Require manual review before processing"
          : riskScore > 40
            ? "Flag for verification — proceed with caution"
            : "Safe to proceed",
    });
  } catch (err) {
    console.error("Fraud check error:", err.message);
    res.status(500).json({ message: "Fraud check error: " + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PHASE 6: DEMAND FORECASTING + INVENTORY ALERTS
// ═══════════════════════════════════════════════════════════════

router.get("/demand-forecast", async (req, res) => {
  try {
    const historical = await pool.query(`
      SELECT p.id, p.name,
        EXTRACT(MONTH FROM o.created_at) as month,
        COUNT(oi.id) as units_sold
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id
        AND o.created_at > NOW() - INTERVAL '90 days'
        AND o.status != 'cancelled'
      GROUP BY p.id, p.name, EXTRACT(MONTH FROM o.created_at)
      ORDER BY p.id, month
    `);

    const productMap = {};
    historical.rows.forEach((row) => {
      if (!productMap[row.id])
        productMap[row.id] = { name: row.name, months: [], total: 0 };
      if (row.month) {
        productMap[row.id].months.push(parseInt(row.units_sold || 0));
        productMap[row.id].total += parseInt(row.units_sold || 0);
      }
    });

    const forecast = Object.entries(productMap)
      .filter(([, d]) => d.total > 0)
      .map(([id, data]) => {
        const avg = data.total / Math.max(data.months.length, 1);
        const last = data.months[data.months.length - 1] || 0;
        const first = data.months[0] || 0;
        const trendFactor =
          data.months.length > 1
            ? last > first
              ? 1.1
              : last < first
                ? 0.9
                : 1.0
            : 1.0;
        return {
          product_id: parseInt(id),
          product_name: data.name,
          historical_monthly_avg: Math.round(avg),
          forecasted_next_month: Math.round(avg * trendFactor),
          trend:
            trendFactor > 1
              ? "INCREASING"
              : trendFactor < 1
                ? "DECREASING"
                : "STABLE",
          confidence: Math.min(95, 50 + data.months.length * 10),
          recommendation:
            trendFactor > 1
              ? "Stock up — demand is rising"
              : "Monitor — demand may be softening",
        };
      })
      .sort((a, b) => b.forecasted_next_month - a.forecasted_next_month)
      .slice(0, 10);

    res.json({ products: forecast, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error("Demand forecast error:", err.message);
    res.status(500).json({ message: "Forecast error: " + err.message });
  }
});

router.get("/inventory-alerts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name,
        COALESCE(stock, 100) as stock,
        COALESCE(low_stock_threshold, 10) as threshold,
        CASE
          WHEN COALESCE(stock, 100) <= COALESCE(low_stock_threshold, 10) THEN 'CRITICAL'
          WHEN COALESCE(stock, 100) <= COALESCE(low_stock_threshold, 10) * 2 THEN 'WARNING'
          ELSE 'OK'
        END as alert_level
      FROM products
      WHERE COALESCE(stock, 100) <= COALESCE(low_stock_threshold, 10) * 2
      ORDER BY stock ASC
    `);

    const critical = result.rows.filter((r) => r.alert_level === "CRITICAL");
    const warning = result.rows.filter((r) => r.alert_level === "WARNING");

    res.json({
      critical_count: critical.length,
      warning_count: warning.length,
      critical_alerts: critical.map((r) => ({
        product_id: r.id,
        name: r.name,
        current_stock: r.stock,
        threshold: r.threshold,
        action: "RESTOCK IMMEDIATELY",
      })),
      warning_alerts: warning.map((r) => ({
        product_id: r.id,
        name: r.name,
        current_stock: r.stock,
        threshold: r.threshold,
        action: "Plan restocking soon",
      })),
    });
  } catch (err) {
    console.error("Inventory alert error:", err.message);
    res.status(500).json({ message: "Alert error: " + err.message });
  }
});

module.exports = router;
