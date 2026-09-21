// server/scripts/seed_culinary_knowledge.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const pool = require("../src/db/pool");

async function seed() {
  console.log("🌱 Starting Culinary & Recipe Knowledge Base Seeding...");

  try {
    // 1. Ensure required tables exist with proper schemas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meals (
        meal_id TEXT PRIMARY KEY,
        meal_name TEXT NOT NULL,
        meal_category TEXT,
        cuisine_origin TEXT DEFAULT 'Nigerian',
        regional_context TEXT,
        description TEXT,
        default_serving_size INT DEFAULT 4,
        complexity TEXT DEFAULT 'Medium',
        supports_budget_mode BOOLEAN DEFAULT true,
        best_for TEXT,
        meal_time TEXT DEFAULT 'Lunch & Dinner'
      );

      CREATE TABLE IF NOT EXISTS ingredients (
        ingredient_id TEXT PRIMARY KEY,
        ingredient_name TEXT NOT NULL,
        ingredient_category TEXT,
        aliases TEXT,
        allergen_tag TEXT,
        dietary_tag TEXT,
        recipe_base_unit TEXT DEFAULT 'g',
        qty_per_person_base NUMERIC DEFAULT 100,
        usage_frequency TEXT DEFAULT 'High',
        requires_hard_filter BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS meal_ingredients (
        id SERIAL PRIMARY KEY,
        meal_id TEXT REFERENCES meals(meal_id) ON DELETE CASCADE,
        meal_name TEXT,
        ingredient_id TEXT,
        ingredient_name TEXT NOT NULL,
        requirement_type TEXT DEFAULT 'Essential', -- Essential, Optional, Garnish
        qty_per_person NUMERIC DEFAULT 1,
        recipe_unit TEXT DEFAULT 'unit',
        role_in_meal TEXT,
        importance_score INT DEFAULT 5,
        budget_adjustment_rule TEXT
      );

      CREATE TABLE IF NOT EXISTS substitutions (
        substitution_id TEXT PRIMARY KEY,
        original_ingredient_id TEXT,
        original_ingredient TEXT NOT NULL,
        substitute_ingredient_id TEXT,
        substitute_ingredient TEXT NOT NULL,
        substitution_reason TEXT,
        taste_impact TEXT DEFAULT 'Minimal',
        estimated_price_impact NUMERIC DEFAULT 0,
        safety_status TEXT DEFAULT 'Safe',
        ai_action TEXT DEFAULT 'Suggest to user'
      );

      CREATE TABLE IF NOT EXISTS dietary_rules (
        diet_rule_id TEXT PRIMARY KEY,
        diet_name TEXT NOT NULL,
        excluded_ingredients TEXT,
        allowed_substitutes TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS allergy_rules (
        allergy_id TEXT PRIMARY KEY,
        allergy_name TEXT NOT NULL,
        excluded_item TEXT NOT NULL,
        action_type TEXT DEFAULT 'Hard Filter',
        substitution_guidance TEXT,
        safety_note TEXT
      );

      CREATE TABLE IF NOT EXISTS admin_recommendations (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        trigger_condition TEXT NOT NULL,
        recommended_items TEXT NOT NULL,
        context_tags TEXT,
        priority INT DEFAULT 5,
        is_active BOOLEAN DEFAULT true,
        created_by INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log("✅ Tables verified/created.");

    // 2. SEED MEALS
    const mealsData = [
      {
        meal_id: "meal-jollof-rice",
        meal_name: "Authentic Nigerian Party Jollof Rice",
        meal_category: "Rice & Grains",
        cuisine_origin: "Nigerian",
        regional_context: "National Favorite",
        description: "Classic smoky party jollof rice cooked in rich spiced tomato-pepper reduction.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Parties, Family Dinner, Weekend Gathering",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-egusi-soup",
        meal_name: "Rich Nigerian Egusi Soup (Melon Seed Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian",
        regional_context: "South-West & South-East",
        description: "Hearty melon seed soup with vegetables, dried fish, crayfish and palm oil.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Swallow Lunches, Healthy Dinners",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-fried-rice",
        meal_name: "Nigerian Style Fried Rice",
        meal_category: "Rice & Grains",
        cuisine_origin: "Nigerian",
        regional_context: "National Favorite",
        description: "Vibrant yellow rice sautéed with sweet corn, carrots, green peas, liver, and aromatic herbs.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Sunday Lunch, Celebrations",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-banga-soup",
        meal_name: "Delta Banga Soup (Palm Nut Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Niger Delta)",
        regional_context: "Delta / Urhobo / Itsekiri",
        description: "Aromatic palm fruit concentrate soup seasoned with oburunbebe stick, beletiete and fresh catfish.",
        default_serving_size: 4,
        complexity: "Advanced",
        supports_budget_mode: false,
        best_for: "Special Occasions, Seafood Lovers",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-afang-soup",
        meal_name: "Calabar Afang Soup",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Efik / Ibibio)",
        regional_context: "Cross River & Akwa Ibom",
        description: "Nutritious dark leafy soup made with pounded okazi (afang) leaves, waterleaf, periwinkles and stockfish.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Swallow Meals, High Fiber Nutrition",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-pepper-soup",
        meal_name: "Nigerian Catfish / Goat Meat Pepper Soup",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian",
        regional_context: "National Comfort Food",
        description: "Hot, spicy, and medicinal light herbal broth infused with calabash nutmeg (ehuru), uda, and scent leaves.",
        default_serving_size: 2,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Cold Evenings, Recovery, Appetizer",
        meal_time: "Dinner & Late Night"
      },
      {
        meal_id: "meal-ofada-rice-stew",
        meal_name: "Ofada Rice with Designer Ayamase Stew",
        meal_category: "Rice & Grains",
        cuisine_origin: "Nigerian (Yoruba)",
        regional_context: "South-West",
        description: "Aromatic unpolished Ofada rice served with bleached palm oil green pepper stew, iru (locust beans), and assorted offals.",
        default_serving_size: 4,
        complexity: "Advanced",
        supports_budget_mode: false,
        best_for: "Weekend Special, Gourmet Nigerian Lunch",
        meal_time: "Lunch"
      },
      {
        meal_id: "meal-beans-plantain",
        meal_name: "Honey Beans (Ewa Oloyin) & Fried Plantain (Dodo)",
        meal_category: "Beans & Plantain",
        cuisine_origin: "Nigerian",
        regional_context: "National Comfort Dish",
        description: "Slow-simmered sweet brown honey beans with palm oil, onions, crayfish paired with sweet golden fried dodo.",
        default_serving_size: 4,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "High Protein Lunch, Family Meal",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-edikaikong",
        meal_name: "Traditional Edikang Ikong Soup",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Calabar)",
        regional_context: "Cross River",
        description: "Luxurious vegetable soup packed with fresh pumpkin leaves (ugu), waterleaf, assorted meats, and dried prawns.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: false,
        best_for: "Iron-rich Diet, Premium Swallow Dinners",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-moi-moi",
        meal_name: "Steamed Nigerian Moi Moi (Bean Pudding)",
        meal_category: "Beans & Staples",
        cuisine_origin: "Nigerian",
        regional_context: "National",
        description: "Steamed blended peeled beans puree spiced with peppers, crayfish, boiled eggs, and flaked fish.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Breakfast with Pap/Custard, Lunch with Jollof",
        meal_time: "Breakfast & Lunch"
      }
    ];

    for (const m of mealsData) {
      await pool.query(`
        INSERT INTO meals (meal_id, meal_name, meal_category, cuisine_origin, regional_context, description, default_serving_size, complexity, supports_budget_mode, best_for, meal_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (meal_id) DO UPDATE SET
          meal_name = EXCLUDED.meal_name,
          meal_category = EXCLUDED.meal_category,
          description = EXCLUDED.description,
          default_serving_size = EXCLUDED.default_serving_size,
          complexity = EXCLUDED.complexity,
          best_for = EXCLUDED.best_for
      `, [m.meal_id, m.meal_name, m.meal_category, m.cuisine_origin, m.regional_context, m.description, m.default_serving_size, m.complexity, m.supports_budget_mode, m.best_for, m.meal_time]);
    }
    console.log(`✅ Seeded ${mealsData.length} Nigerian Meals.`);

    // 3. SEED MEAL INGREDIENTS
    await pool.query(`DELETE FROM meal_ingredients;`);
    const mealIngredientsData = [
      // Jollof Rice
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Long Grain Parboiled Rice", requirement_type: "Essential", qty_per_person: 0.25, recipe_unit: "kg", role_in_meal: "Base Carb", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Fresh Tomatoes", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Sauce Base", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Sonia Sachet Tomatoes / Tomato Paste", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "sachet", role_in_meal: "Color & Depth", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Red Bell Pepper (Tatashe) & Rodo", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Spicy Aroma", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Onions (Red)", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "bulb", role_in_meal: "Sauté Aromatics", importance_score: 4 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Vegetable / Groundnut Oil", requirement_type: "Essential", qty_per_person: 0.05, recipe_unit: "L", role_in_meal: "Frying Base", importance_score: 4 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Curry Powder, Thyme & Bay Leaves", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "pack", role_in_meal: "Signature Seasoning", importance_score: 4 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Stock Seasoning Cubes (Knorr/Maggi)", requirement_type: "Essential", qty_per_person: 2, recipe_unit: "cubes", role_in_meal: "Umami Seasoning", importance_score: 5 },

      // Egusi Soup
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Ground Melon Seeds (Egusi)", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Soup Base & Protein", importance_score: 5 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Pure Red Palm Oil", requirement_type: "Essential", qty_per_person: 0.08, recipe_unit: "L", role_in_meal: "Color & Flavor Base", importance_score: 5 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Fresh Pumpkin Leaves (Ugu)", requirement_type: "Essential", qty_per_person: 0.5, recipe_unit: "bunch", role_in_meal: "Leafy Greens", importance_score: 5 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Ground Crayfish", requirement_type: "Essential", qty_per_person: 0.03, recipe_unit: "kg", role_in_meal: "Seafood Umami", importance_score: 5 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Dry Fish / Smoked Catfish", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "piece", role_in_meal: "Protein & Smoke", importance_score: 4 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Locust Beans (Iru)", requirement_type: "Optional", qty_per_person: 0.02, recipe_unit: "cup", role_in_meal: "Traditional Aroma", importance_score: 4 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Ayoola Poundo Yam / Semovita", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Swallow Accompaniment", importance_score: 5 },

      // Beans & Dodo
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Honey Brown Beans (Ewa Oloyin)", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Protein Base", importance_score: 5 },
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Ripe Plantain", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "finger", role_in_meal: "Sweet Side", importance_score: 5 },
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Pure Red Palm Oil", requirement_type: "Essential", qty_per_person: 0.05, recipe_unit: "L", role_in_meal: "Cooking Oil", importance_score: 4 },
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Onions (Red)", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "bulb", role_in_meal: "Sweet Aromatics", importance_score: 4 },
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Ground Crayfish", requirement_type: "Optional", qty_per_person: 0.02, recipe_unit: "kg", role_in_meal: "Flavor Enhancer", importance_score: 4 }
    ];

    for (const mi of mealIngredientsData) {
      await pool.query(`
        INSERT INTO meal_ingredients (meal_id, meal_name, ingredient_name, requirement_type, qty_per_person, recipe_unit, role_in_meal, importance_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [mi.meal_id, mi.meal_name, mi.ingredient_name, mi.requirement_type, mi.qty_per_person, mi.recipe_unit, mi.role_in_meal, mi.importance_score]);
    }
    console.log(`✅ Seeded ${mealIngredientsData.length} Meal Ingredients.`);

    // 4. SEED SUBSTITUTIONS
    const substitutionsData = [
      {
        substitution_id: "sub-palmoil-veg",
        original_ingredient: "Red Palm Oil",
        substitute_ingredient: "Groundnut Oil / Sunflower Oil + Paprika",
        substitution_reason: "Low Cholesterol / Heart Health / Lighter Taste",
        taste_impact: "Lighter, less earthy aroma",
        estimated_price_impact: 0,
        safety_status: "Safe",
        ai_action: "Suggest for low-fat or cardiovascular diets"
      },
      {
        substitution_id: "sub-white-ofada-rice",
        original_ingredient: "White Parboiled Rice",
        substitute_ingredient: "Ofada Rice (Unpolished Brown Rice)",
        substitution_reason: "Diabetic Management / Low Glycemic Index / High Fiber",
        taste_impact: "Nutty, earthy traditional aroma",
        estimated_price_impact: 300,
        safety_status: "Safe",
        ai_action: "Recommend for diabetic & fitness meal plans"
      },
      {
        substitution_id: "sub-crayfish-mushroom",
        original_ingredient: "Crayfish / Seafood Stock",
        substitute_ingredient: "Dried Mushrooms + Smoked Iru (Locust Beans)",
        substitution_reason: "Shellfish Allergy / Vegan Diet",
        taste_impact: "Deep savory umami without crustaceans",
        estimated_price_impact: -100,
        safety_status: "Allergy Safe",
        ai_action: "Automatic substitute when seafood allergy is detected"
      },
      {
        substitution_id: "sub-sugar-dates",
        original_ingredient: "Refined White Sugar",
        substitute_ingredient: "Date Powder / Honey",
        substitution_reason: "Natural sweetener, lower glycemic spike",
        taste_impact: "Rich caramel sweetness",
        estimated_price_impact: 200,
        safety_status: "Safe",
        ai_action: "Suggest for healthy porridge and baby food"
      },
      {
        substitution_id: "sub-fresh-sachet-tomatoes",
        original_ingredient: "Fresh Tomatoes",
        substitute_ingredient: "Sonia Sachet Tomatoes / Tin Tomatoes",
        substitution_reason: "Off-season price spike / Quick cooking convenience",
        taste_impact: "Concentrated tomato flavor, slightly more tart",
        estimated_price_impact: -400,
        safety_status: "Safe",
        ai_action: "Suggest when customer asks for budget cooking mode"
      }
    ];

    for (const s of substitutionsData) {
      await pool.query(`
        INSERT INTO substitutions (substitution_id, original_ingredient, substitute_ingredient, substitution_reason, taste_impact, estimated_price_impact, safety_status, ai_action)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (substitution_id) DO UPDATE SET
          original_ingredient = EXCLUDED.original_ingredient,
          substitute_ingredient = EXCLUDED.substitute_ingredient,
          substitution_reason = EXCLUDED.substitution_reason,
          taste_impact = EXCLUDED.taste_impact,
          safety_status = EXCLUDED.safety_status
      `, [s.substitution_id, s.original_ingredient, s.substitute_ingredient, s.substitution_reason, s.taste_impact, s.estimated_price_impact, s.safety_status, s.ai_action]);
    }
    console.log(`✅ Seeded ${substitutionsData.length} Ingredient Substitutions.`);

    // 5. SEED DIETARY & ALLERGY RULES
    const dietaryData = [
      {
        diet_rule_id: "diet-diabetes",
        diet_name: "Diabetes & Blood Sugar Control",
        excluded_ingredients: "White refined sugar, excessive white flour, full-sugar sodas",
        allowed_substitutes: "Ofada Rice, Brown Beans, Ugu Leaves, Date Powder, Scent Leaves",
        notes: "Prioritize high-fiber legumes (Honey Beans) and chromium-rich leafy greens to stabilize blood glucose."
      },
      {
        diet_rule_id: "diet-hypertension",
        diet_name: "Hypertension & Low Sodium Care",
        excluded_ingredients: "Excessive table salt, high-sodium bouillon cubes, heavily salted dry fish",
        allowed_substitutes: "Garlic, Ginger, Sweet Peppers, Scent Leaves (Efirin), Fresh Catfish",
        notes: "Use potassium-packed vegetables (Ugu, Garden egg) and natural aromatic herbs instead of excess salt."
      },
      {
        diet_rule_id: "diet-pregnancy",
        diet_name: "Pregnancy & Fetal Health",
        excluded_ingredients: "Uncooked meats, unpasteurized dairy, excessive unboiled herbs",
        allowed_substitutes: "Ugu (high iron), Crayfish (amino acids), Honey Beans (folate), Fresh Tomatoes (Vitamin C)",
        notes: "Ensure complete protein synthesis and folate-rich legumes for fetal neural development."
      },
      {
        diet_rule_id: "diet-vegan",
        diet_name: "Strict Nigerian Vegan / Vegetarian",
        excluded_ingredients: "Meat, Poultry, Catfish, Crayfish, Stockfish, Eggs, Dairy",
        allowed_substitutes: "Iru (Locust Beans), Soya Chunks, Mushrooms, Brown Beans, Groundnut oil",
        notes: "Ensure adequate plant-based protein combinations like Beans + Rice or Akara + Pap."
      }
    ];

    for (const d of dietaryData) {
      await pool.query(`
        INSERT INTO dietary_rules (diet_rule_id, diet_name, excluded_ingredients, allowed_substitutes, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (diet_rule_id) DO UPDATE SET
          diet_name = EXCLUDED.diet_name,
          excluded_ingredients = EXCLUDED.excluded_ingredients,
          allowed_substitutes = EXCLUDED.allowed_substitutes,
          notes = EXCLUDED.notes
      `, [d.diet_rule_id, d.diet_name, d.excluded_ingredients, d.allowed_substitutes, d.notes]);
    }
    console.log(`✅ Seeded ${dietaryData.length} Dietary Rules.`);

    const allergyData = [
      {
        allergy_id: "all-shellfish",
        allergy_name: "Shellfish & Crustacean Allergy",
        excluded_item: "Crayfish, Prawns, Shrimps, Periwinkles, Crabs",
        action_type: "Hard Filter",
        substitution_guidance: "Replace with smoked fish powder or fermented locust beans (Iru) + dried mushrooms for umami.",
        safety_note: "CRITICAL: Never add crayfish to any bundle if customer flags crustacean allergy."
      },
      {
        allergy_id: "all-peanut",
        allergy_name: "Peanut / Groundnut Allergy",
        excluded_item: "Groundnut Oil, Peanut Paste, Suya Spice with kuli-kuli",
        action_type: "Hard Filter",
        substitution_guidance: "Use Sunflower Oil, Pure Palm Oil, or Olive Oil. Use nut-free suya pepper.",
        safety_note: "Check blended spice mixes to ensure zero peanut flour contamination."
      },
      {
        allergy_id: "all-gluten",
        allergy_name: "Gluten Intolerance (Celiac)",
        excluded_item: "Wheat Flour, Semovita, Golden Penny Wheat",
        action_type: "Hard Filter",
        substitution_guidance: "Substitute with Ayoola Poundo Yam, Garri (Cassava), or Plantain Flour.",
        safety_note: "Offer 100% cassava/yam-based swallows instead of grain wheats."
      }
    ];

    for (const a of allergyData) {
      await pool.query(`
        INSERT INTO allergy_rules (allergy_id, allergy_name, excluded_item, action_type, substitution_guidance, safety_note)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (allergy_id, excluded_item) DO UPDATE SET
          allergy_name = EXCLUDED.allergy_name,
          action_type = EXCLUDED.action_type,
          substitution_guidance = EXCLUDED.substitution_guidance,
          safety_note = EXCLUDED.safety_note
      `, [a.allergy_id, a.allergy_name, a.excluded_item, a.action_type, a.substitution_guidance, a.safety_note]);
    }
    console.log(`✅ Seeded ${allergyData.length} Allergy Rules.`);

    // 6. SEED SMART RECOMMENDATIONS & PAIRINGS
    const recsData = [
      {
        title: "Party Jollof Side Pairing",
        trigger_condition: "Customer orders Rice or Jollof ingredients",
        recommended_items: "Ripe Plantain (Dodo), Fresh Salad Greens, Bama Mayonnaise",
        context_tags: "Party, Weekend, Lunch",
        priority: 10
      },
      {
        title: "Egusi Soup Swallow Pairing",
        trigger_condition: "Customer orders Egusi Soup ingredients",
        recommended_items: "Ayoola Poundo Yam, Golden Penny Semovita, Palm Oil",
        context_tags: "Dinner, Swallow",
        priority: 9
      },
      {
        title: "Beans & Sweet Plantain Combo",
        trigger_condition: "Customer orders Honey Beans or Brown Beans",
        recommended_items: "Ripe Plantain, Garri (Ijebu), Palm Oil",
        context_tags: "Staple, High Protein",
        priority: 8
      },
      {
        title: "Pepper Soup Spices & Refreshment",
        trigger_condition: "Customer orders Pepper Soup ingredients or Catfish",
        recommended_items: "Scent Leaves, Uda pods, Calabash Nutmeg (Ehuru)",
        context_tags: "Comfort, Spicy",
        priority: 7
      }
    ];

    await pool.query(`DELETE FROM admin_recommendations WHERE created_by IS NULL;`);
    for (const r of recsData) {
      await pool.query(`
        INSERT INTO admin_recommendations (title, trigger_condition, recommended_items, context_tags, priority, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
      `, [r.title, r.trigger_condition, r.recommended_items, r.context_tags, r.priority]);
    }
    console.log(`✅ Seeded ${recsData.length} Smart Recommendations.`);

    console.log("🎉 ALL CULINARY & RECIPE KNOWLEDGE BASE DATA SEEDED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
