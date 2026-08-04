import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const FEATURED_RECIPES = [
  {
    id: "jollof-rice",
    name: "Jollof Rice",
    desc: "Classic Nigerian party jollof with tomatoes and spices",
    img: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=300&q=80",
    time: "45 min",
    serves: "4",
  },
  {
    id: "egusi-soup",
    name: "Egusi Soup",
    desc: "Rich melon seed soup with vegetables and assorted meat",
    img: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&q=80",
    time: "60 min",
    serves: "6",
  },
  {
    id: "pepper-soup",
    name: "Pepper Soup",
    desc: "Spicy aromatic soup with fresh pepper and herbs",
    img: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300&q=80",
    time: "35 min",
    serves: "4",
  },
  {
    id: "beans-rice",
    name: "Beans and Rice",
    desc: "Protein-rich Nigerian beans cooked with rice",
    img: "https://images.unsplash.com/photo-1515543237350-b3ecd2609e39?w=300&q=80",
    time: "50 min",
    serves: "4",
  },
  {
    id: "ugu-soup",
    name: "Ugu Soup",
    desc: "Nutritious fluted pumpkin leaf soup with crayfish",
    img: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300&q=80",
    time: "40 min",
    serves: "4",
  },
  {
    id: "garri-soup",
    name: "Garri and Soup",
    desc: "Traditional eba (garri) served with vegetable soup",
    img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80",
    time: "30 min",
    serves: "2",
  },
];

// Products that BemsFarms actually sells (from the shop page we saw)
const BEMSFARMS_PRODUCTS = [
  "Ofada Rice",
  "Brown Rice",
  "Garri (Ijebu)",
  "Millet",
  "Sorghum (Guinea Corn)",
  "Dried Maize",
  "Palm Oil",
  "Groundnut Oil",
  "Black-eyed Beans",
  "Fresh Tomatoes",
  "Fresh Pepper",
  "Ugu Leaves",
  "Watermelon",
  "Plantain",
  "Pineapple",
  "Pawpaw (Papaya)",
  "Yellow Yam (Puna)",
  "White Yam",
  "Cassava",
  "Sweet Potato",
  "Cocoyam",
  "Dried Crayfish",
  "Dried Pepper (Atarodo)",
  "Curry Powder",
  "Dried Thyme",
  "Fresh Ginger",
];

const SYSTEM_PROMPT = `You are a Nigerian cuisine expert and nutritionist assistant for BemsFarms, Nigeria's farm-fresh food marketplace.

When the user asks about a Nigerian dish or recipe, respond with ONLY valid JSON in this exact format (no markdown, no extra text):

{
  "dish": "Exact dish name",
  "description": "2-sentence description of this Nigerian dish",
  "servings": "4 people",
  "prep_time": "XX minutes",
  "cook_time": "XX minutes",
  "ingredients": [
    {
      "name": "Ingredient name",
      "amount": "quantity with unit (e.g. 2 cups, 500g, 3 pieces)",
      "inStore": true or false,
      "storeName": "Exact BemsFarms product name if available, else null",
      "tip": "Optional short tip about this ingredient"
    }
  ],
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ...",
    "..."
  ],
  "nutritionHighlights": ["High protein", "Rich in iron"],
  "nigerianTip": "A short authentic cooking tip from Nigerian tradition"
}

BemsFarms sells these products exactly: ${BEMSFARMS_PRODUCTS.join(", ")}.

Rules:
- ONLY output valid JSON, nothing else
- Include ALL authentic ingredients for the dish, not a simplified list
- Mark inStore: true ONLY for ingredients that closely match the BemsFarms product list above
- For inStore ingredients, set storeName to the exact BemsFarms product name
- Be accurate to authentic Nigerian cooking methods
- steps should be numbered and detailed (at least 5-8 steps)
- If the user asks about a non-Nigerian dish, still respond in JSON but adapt it to Nigerian ingredients where possible`;

export default function RecipeHelperPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addedItems, setAddedItems] = useState({});
  const { addItem } = useCart();
  const navigate = useNavigate();

  const fetchRecipe = async (dishName) => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        "https://bemsfarms-api.onrender.com/api/recipe-helper",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dish: dishName }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        return;
      }
    } catch (_) {
      // Fall through to direct Gemini call
    }

    // Direct Gemini fallback via backend proxy or use Anthropic if configured
    try {
      const res = await fetch(
        "https://bemsfarms-api.onrender.com/api/ai/recipe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dish: dishName,
            systemPrompt: SYSTEM_PROMPT,
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        // data might be { recipe: {...} } or directly the recipe object
        const recipe = data.recipe || data;
        setResult(recipe);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      setError(
        `Could not find recipe for "${dishName}". Please check your internet connection and try again, or try a different dish name.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    fetchRecipe(query.trim());
  };

  const handleFeatured = (recipe) => {
    setQuery(recipe.name);
    fetchRecipe(recipe.name);
  };

  const handleAddToCart = (ingredient) => {
    // Navigate to shop with search query for this ingredient
    navigate(
      `/shop?search=${encodeURIComponent(ingredient.storeName || ingredient.name)}`,
    );
  };

  const getStatusColor = (inStore) =>
    inStore
      ? { bg: "#F0FDF4", border: "#BBF7D0", dot: "#22C55E", text: "#166534" }
      : { bg: "#F9FAFB", border: "#E5E7EB", dot: "#9CA3AF", text: "#6B7280" };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg,#1B5E20 0%,#2E7D32 60%,#388E3C 100%)",
          padding: "48px 5%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="recipe-hero-decoration"
          style={{
            position: "absolute",
            right: "5%",
            top: 0,
            bottom: 0,
            width: "35%",
            overflow: "hidden",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80"
            alt="Nigerian food"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.2,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to right, #2E7D32, transparent)",
            }}
          />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                overflow: "hidden",
                border: "3px solid rgba(255,255,255,0.4)",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=52&q=80"
                alt="Chef"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div>
              <h1
                style={{
                  color: "#fff",
                  fontSize: "clamp(1.5rem,3vw,2.2rem)",
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                Recipe Helper
              </h1>
              <p style={{ color: "#A5D6A7", margin: 0, fontSize: 14 }}>
                Tell us any dish — we'll find the ingredients you need
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "40px 5%", maxWidth: 900, margin: "0 auto" }}>
        {/* Search */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 40,
            background: "#fff",
            borderRadius: 16,
            padding: 8,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            border: "2px solid #E5E7EB",
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Type any dish — e.g. egusi soup, jollof rice, fried plantain..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 15,
              padding: "10px 12px",
              background: "transparent",
              color: "#1a1a1a",
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            style={{
              background: loading ? "#9CA3AF" : "#2E7D32",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Finding...
              </>
            ) : (
              <>
                <img
                  src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=20&q=80"
                  alt=""
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    objectFit: "cover",
                  }}
                />
                Find Ingredients
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 12,
              padding: "16px 20px",
              color: "#DC2626",
              marginBottom: 32,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=32&q=80"
              alt="error"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Recipe not found
              </div>
              <div style={{ fontSize: 14 }}>{error}</div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div style={{ marginBottom: 48 }}>
            {/* Recipe header */}
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: "28px 32px",
                marginBottom: 20,
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                border: "1px solid #E5E7EB",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: "#0D1117",
                      margin: "0 0 8px",
                    }}
                  >
                    {result.dish}
                  </h2>
                  <p
                    style={{
                      color: "#6B7280",
                      fontSize: 15,
                      margin: "0 0 16px",
                      lineHeight: 1.6,
                    }}
                  >
                    {result.description}
                  </p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {[
                      {
                        img: "https://images.unsplash.com/photo-1495521939206-a217db9df264?w=24&q=80",
                        label: `Prep: ${result.prep_time}`,
                      },
                      {
                        img: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=24&q=80",
                        label: `Cook: ${result.cook_time}`,
                      },
                      {
                        img: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=24&q=80",
                        label: `Serves: ${result.servings}`,
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={stat.img}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#374151",
                          }}
                        >
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Nutrition highlights */}
                {result.nutritionHighlights?.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {result.nutritionHighlights.map((h) => (
                      <span
                        key={h}
                        style={{
                          background: "#F0FDF4",
                          border: "1px solid #BBF7D0",
                          color: "#166534",
                          borderRadius: 20,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Nigerian tip */}
            {result.nigerianTip && (
              <div
                style={{
                  background: "linear-gradient(135deg,#FFF8E1,#FFF3CD)",
                  border: "1px solid #FFD54F",
                  borderRadius: 16,
                  padding: "16px 20px",
                  marginBottom: 20,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=40&q=80"
                    alt="tip"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#92400E",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Nigerian Kitchen Tip
                  </div>
                  <div
                    style={{ fontSize: 14, color: "#78350F", lineHeight: 1.6 }}
                  >
                    {result.nigerianTip}
                  </div>
                </div>
              </div>
            )}

            {/* Ingredients */}
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: "28px 32px",
                marginBottom: 20,
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                border: "1px solid #E5E7EB",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#0D1117",
                    margin: 0,
                  }}
                >
                  Ingredients
                </h3>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#22C55E",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: "#6B7280" }}>
                      Available on BemsFarms
                    </span>
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#9CA3AF",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: "#6B7280" }}>Buy elsewhere</span>
                  </span>
                </div>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {result.ingredients?.map((ing, i) => {
                  const colors = getStatusColor(ing.inStore);
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 12,
                        padding: "12px 16px",
                        transition: "transform 0.15s",
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: colors.dot,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#1a1a1a",
                            fontSize: 14,
                          }}
                        >
                          {ing.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>
                          {ing.amount}
                        </div>
                        {ing.tip && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9CA3AF",
                              fontStyle: "italic",
                              marginTop: 2,
                            }}
                          >
                            {ing.tip}
                          </div>
                        )}
                      </div>
                      {ing.inStore && (
                        <button
                          onClick={() => handleAddToCart(ing)}
                          style={{
                            background: "#2E7D32",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "6px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.background = "#1B5E20")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.background = "#2E7D32")
                          }
                        >
                          Shop Now
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              {result.ingredients?.some((i) => i.inStore) && (
                <div
                  style={{
                    marginTop: 20,
                    padding: "16px 20px",
                    background: "linear-gradient(135deg,#1B5E20,#2E7D32)",
                    borderRadius: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}
                    >
                      {result.ingredients.filter((i) => i.inStore).length}{" "}
                      ingredients available on BemsFarms
                    </div>
                    <div style={{ color: "#A5D6A7", fontSize: 13 }}>
                      Get them delivered fresh today
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/shop")}
                    style={{
                      background: "#F57F17",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 24px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Shop All Ingredients →
                  </button>
                </div>
              )}
            </div>

            {/* Steps */}
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: "28px 32px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                border: "1px solid #E5E7EB",
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0D1117",
                  margin: "0 0 20px",
                }}
              >
                Cooking Steps
              </h3>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {result.steps?.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#2E7D32,#388E3C)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 8px rgba(46,125,50,0.3)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        color: "#374151",
                        lineHeight: 1.7,
                        paddingTop: 6,
                      }}
                    >
                      {step.replace(/^Step \d+:\s*/i, "")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Featured recipes (shown when no result) */}
        {!result && !loading && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9CA3AF",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                OR PICK A FEATURED RECIPE
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {FEATURED_RECIPES.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => handleFeatured(recipe)}
                    style={{
                      background: "#fff",
                      border: "2px solid #E5E7EB",
                      borderRadius: 16,
                      overflow: "hidden",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#2E7D32";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 12px 32px rgba(46,125,50,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div
                      style={{ width: "100%", height: 140, overflow: "hidden" }}
                    >
                      <img
                        src={recipe.img}
                        alt={recipe.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.3s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.transform = "scale(1.05)")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.transform = "none")
                        }
                      />
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 6,
                        }}
                      >
                        <h3
                          style={{
                            fontWeight: 800,
                            fontSize: 15,
                            color: "#0D1117",
                            margin: 0,
                          }}
                        >
                          {recipe.name}
                        </h3>
                        <span
                          style={{
                            background: "#F0FDF4",
                            color: "#166534",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {recipe.time}
                        </span>
                      </div>
                      <p
                        style={{
                          color: "#6B7280",
                          fontSize: 13,
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {recipe.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Decorative header image risks overlapping the title text once
           the viewport is narrow enough that the title wraps close to it —
           it's purely decorative (opacity 0.2, gradient-faded), so just
           hide it below the point where that becomes a real risk. */
        @media (max-width: 640px) {
          .recipe-hero-decoration { display: none; }
        }
      `}</style>
    </div>
  );
}
