// server/scripts/seed_culinary_knowledge.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const pool = require("../src/db/pool");

async function seed() {
  console.log("🌱 Starting Comprehensive Nigerian & African Culinary Knowledge Seeding...");

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

      CREATE TABLE IF NOT EXISTS admin_substitutions (
        id SERIAL PRIMARY KEY,
        original_item VARCHAR(150) NOT NULL,
        substitute_item VARCHAR(150) NOT NULL,
        reason TEXT,
        dietary_tags VARCHAR(255),
        confidence NUMERIC(3,2) DEFAULT 0.85,
        is_active BOOLEAN DEFAULT true,
        created_by INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dietary_rules (
        diet_rule_id TEXT PRIMARY KEY,
        diet_name TEXT NOT NULL,
        excluded_ingredients TEXT,
        allowed_substitutes TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS admin_dietary_rules (
        id SERIAL PRIMARY KEY,
        condition VARCHAR(100) NOT NULL UNIQUE,
        rule_text TEXT NOT NULL,
        tags VARCHAR(255),
        priority INT DEFAULT 5,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE admin_dietary_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      ALTER TABLE admin_dietary_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE admin_substitutions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      ALTER TABLE admin_substitutions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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

      CREATE TABLE IF NOT EXISTS product_associations (
        id SERIAL PRIMARY KEY,
        product_a VARCHAR(150) NOT NULL,
        product_b VARCHAR(150) NOT NULL,
        association_type VARCHAR(50) DEFAULT 'pairs_well_with',
        association_strength INT DEFAULT 3,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log("✅ Tables schema verified.");

    // ═════════════════════════════════════════════════════════════════════════
    // 2. SEED MEALS (32 Comprehensive Traditional & Local Nigerian Delicacies)
    // ═════════════════════════════════════════════════════════════════════════
    const mealsData = [
      // ── SOUPS & STEWS (South-West, South-East, South-South, North) ──
      {
        meal_id: "meal-jollof-rice",
        meal_name: "Authentic Nigerian Party Jollof Rice",
        meal_category: "Rice & Grains",
        cuisine_origin: "Nigerian",
        regional_context: "National Favorite",
        description: "Classic smoky party jollof rice cooked in rich spiced tomato-pepper reduction with fragrant bay leaves and curry.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Parties, Family Dinner, Weekend Gathering",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-fried-rice",
        meal_name: "Nigerian Style Fried Rice",
        meal_category: "Rice & Grains",
        cuisine_origin: "Nigerian",
        regional_context: "National Favorite",
        description: "Vibrant yellow rice sautéed with sweet corn, carrots, green peas, liver, spring onions and aromatic herbs.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Sunday Lunch, Celebrations, Entertaining",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-ofada-rice-stew",
        meal_name: "Ofada Rice with Designer Ayamase Stew",
        meal_category: "Rice & Grains",
        cuisine_origin: "Nigerian (Yoruba)",
        regional_context: "South-West (Ogun / Lagos)",
        description: "Aromatic unpolished Ofada rice served with bleached palm oil green pepper stew, fermented locust beans (Iru), and assorted offals.",
        default_serving_size: 4,
        complexity: "Advanced",
        supports_budget_mode: false,
        best_for: "Weekend Special, Gourmet Nigerian Lunch, Traditional Feast",
        meal_time: "Lunch"
      },
      {
        meal_id: "meal-native-jollof-rice",
        meal_name: "Native Palm Oil Jollof Rice (Iwuk Edesi)",
        meal_category: "Rice & Grains",
        cuisine_origin: "Nigerian (Efik / Yoruba)",
        regional_context: "South-South & South-West",
        description: "Rustic concoction rice cooked in pure red palm oil, dry fish, smoked prawns, scent leaves, and locust beans.",
        default_serving_size: 4,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Comfort Food, Quick Hearty Family Lunch",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-coconut-jollof-rice",
        meal_name: "Rich Coconut Jollof Rice",
        meal_category: "Rice & Grains",
        cuisine_origin: "Nigerian",
        regional_context: "Coastal Southern Nigeria",
        description: "Savory parboiled rice cooked in rich freshly extracted coconut milk, blended peppers, shrimp, and aromatic spices.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Special Dinners, Flavorful Weekend Treat",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-egusi-soup",
        meal_name: "Rich Nigerian Egusi Soup (Melon Seed Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian",
        regional_context: "National (South-West, South-East, North-Central)",
        description: "Hearty melon seed soup fried or simmered with vegetables (Ugu/Bitterleaf), dried catfish, crayfish, shaki and pure palm oil.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Swallow Lunches, Healthy Dinners with Poundo Yam",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-efo-riro",
        meal_name: "Authentic Yoruba Efo Riro (Rich Vegetable Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Yoruba)",
        regional_context: "South-West",
        description: "Vibrant rich green vegetable soup made with fresh waterleaf/shoko/tete, tatashe pepper base, smoked panla, iru, and assorted cow offals.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Healthy Low-Carb Swallow, Rice Topping, Iron Boost",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-banga-soup",
        meal_name: "Delta Banga Soup (Palm Nut Concentrate Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Niger Delta)",
        regional_context: "Delta (Urhobo / Isoko / Itsekiri)",
        description: "Aromatic palm fruit concentrate soup seasoned with oburunbebe stick, beletiete, rohohie, and fresh catfish or dried bushmeat.",
        default_serving_size: 4,
        complexity: "Advanced",
        supports_budget_mode: false,
        best_for: "Special Occasions, Seafood Lovers with Yellow Starch",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-afang-soup",
        meal_name: "Calabar Afang Soup",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Efik / Ibibio)",
        regional_context: "Cross River & Akwa Ibom",
        description: "Nutritious dark leafy soup made with finely shredded pounded okazi leaves, fresh waterleaf, shelled periwinkles, stockfish, and smoked prawns.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "High Fiber Nutrition, Traditional Swallow Banquets",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-edikaikong",
        meal_name: "Traditional Edikang Ikong Soup",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Calabar / Efik)",
        regional_context: "Cross River State",
        description: "Luxurious royal vegetable soup packed with generous pumpkin leaves (ugu), waterleaf, assorted meats, periwinkles, and dried prawns cooked with zero water added.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: false,
        best_for: "Iron-rich Diet, Premium Swallow Dinners, Special Guests",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-ogbono-soup",
        meal_name: "Ogbono Soup (Draw Soup / Apon)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian",
        regional_context: "South-East & South-South & South-West",
        description: "Slippery, deeply satisfying draw soup prepared with ground wild mango seeds (ogbono), bitterleaf or uziza, smoked fish, and cow foot (nkwobi cut).",
        default_serving_size: 4,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Children & Family Swallows, Quick Warm Lunch",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-ofe-nsala",
        meal_name: "Ofe Nsala (Igbo White Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Igbo)",
        regional_context: "South-East & Delta Igbo (Anambra / Asaba)",
        description: "Light, aromatic palm-oil-free soup thickened with mashed yam and flavored with utazi leaves, uda, ehuru (calabash nutmeg), and fresh river catfish.",
        default_serving_size: 3,
        complexity: "Medium",
        supports_budget_mode: false,
        best_for: "Postpartum Healing, Appetite Recovery, Special Visitors",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-ofe-onugbu",
        meal_name: "Ofe Onugbu (Authentic Bitterleaf Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Igbo)",
        regional_context: "South-East (Anambra / Enugu)",
        description: "Traditional ceremonial soup made with thoroughly washed bitterleaves, cocoyam (ede) paste thickener, stockfish head, and assorted meats.",
        default_serving_size: 4,
        complexity: "Advanced",
        supports_budget_mode: true,
        best_for: "Traditional Weddings, Sunday Family Swallow, Healthy Digestion",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-ofe-oha",
        meal_name: "Ofe Oha (Oha Soup with Cocoyam Thickener)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Igbo)",
        regional_context: "South-East (Imo / Abia / Enugu)",
        description: "Delicate and aromatic soup prepared with hand-shredded fresh Oha leaves, cocoyam thickener, ogiri Igbo, crayfish, and tender beef.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Family Sunday Lunch, Authentic Eastern Swallow Meal",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-abula",
        meal_name: "Authentic Abula (Gbegiri, Ewedu & Buka Stew Combo)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Yoruba)",
        regional_context: "South-West (Oyo / Ibadan / Osun)",
        description: "Iconic tripartite Yoruba delight pairing smooth yellow peeled-bean soup (gbegiri), slimy jute leaf soup (ewedu), and spicy buka tomato stew with soft amala.",
        default_serving_size: 4,
        complexity: "Advanced",
        supports_budget_mode: true,
        best_for: "Amala Connoisseurs, Traditional Yoruba Feast",
        meal_time: "Lunch"
      },
      {
        meal_id: "meal-okro-ila-alasepo",
        meal_name: "Ila Alasepo (Rich Seafood & Assorted Okro Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian",
        regional_context: "National Comfort Dish",
        description: "One-pot chunky fresh okro soup cooked with shrimps, crabs, chopped rodo peppers, iru, palm oil, and flaked smoked fish.",
        default_serving_size: 3,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Quick 20-Min Cooking, Weight Loss, Healthy Blood Sugar",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-fisherman-soup",
        meal_name: "Rivers Native Fisherman Soup",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Rivers / Bayelsa)",
        regional_context: "Niger Delta Coast",
        description: "Spicy and thick seafood lovers broth made with fresh river prawns, whole crabs, ngolo (clams), sea snails, and catfish in light palm oil.",
        default_serving_size: 3,
        complexity: "Medium",
        supports_budget_mode: false,
        best_for: "Seafood Banquets, Coastal Celebrations, Weekend Splurge",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-miyan-kuka",
        meal_name: "Miyan Kuka with Tuwo Shinkafa",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Hausa / Fulani)",
        regional_context: "Northern Nigeria",
        description: "Nutrient-dense Northern green soup made from dried baobab leaf powder (kuka), ginger, dawadawa (locust bean), dried beef and served with soft tuwo shinkafa.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Digestive Health, Northern Staples, Wholesome Dinner",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-miyan-taushe",
        meal_name: "Miyan Taushe (Northern Pumpkin & Peanut Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Hausa)",
        regional_context: "Northern Nigeria (Kano / Kaduna / Sokoto)",
        description: "Velvety mildly sweet soup made from mashed ripe pumpkin (kabewa), ground roasted peanuts, yakuwa sorrel leaves, and tender mutton.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Pairing with Masa (Waina) or Tuwo, Rich Vitamin A Nutrition",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-miyan-zogale",
        meal_name: "Miyan Zogale (Moringa Leaf Soup)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Hausa)",
        regional_context: "Northern Nigeria",
        description: "Healing Northern delicacy prepared with fresh moringa leaves, groundnut paste, dawadawa, tomatoes, and dried meat.",
        default_serving_size: 4,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Anti-Inflammatory, Immunity Boost, Diabetes Management",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-pepper-soup",
        meal_name: "Nigerian Catfish & Goat Meat Pepper Soup",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian",
        regional_context: "National Comfort Food",
        description: "Hot, spicy, and medicinal light herbal broth infused with calabash nutmeg (ehuru), uda pods, uziza, and fresh scent leaves (efirin).",
        default_serving_size: 2,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Cold Evenings, Cold/Flu Recovery, Appetizer, Social Hangouts",
        meal_time: "Dinner & Late Night"
      },
      {
        meal_id: "meal-buka-stew",
        meal_name: "Nigerian Buka Stew (Obe Ata Dindin)",
        meal_category: "Soups & Stews",
        cuisine_origin: "Nigerian (Yoruba)",
        regional_context: "South-West",
        description: "Deeply browned palm oil and vegetable oil pepper stew with fried beef, shaki, ponmo, and hard-boiled eggs.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "White Rice, Boiled Yam, Fried Plantain",
        meal_time: "Lunch & Dinner"
      },

      // ── BEANS, PLANTAIN & TUBERS ──
      {
        meal_id: "meal-beans-plantain",
        meal_name: "Honey Beans (Ewa Oloyin) & Fried Plantain (Dodo)",
        meal_category: "Beans & Plantain",
        cuisine_origin: "Nigerian",
        regional_context: "National Comfort Dish",
        description: "Slow-simmered naturally sweet brown honey beans with palm oil, sautéed onions, ground crayfish paired with golden fried dodo.",
        default_serving_size: 4,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "High Protein Lunch, Energy, Family Staple",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-ewa-aganyin",
        meal_name: "Ewa Aganyin with Spicy Aganyin Sauce",
        meal_category: "Beans & Staples",
        cuisine_origin: "Nigerian (Togo/Benin/Lagos Yoruba)",
        regional_context: "South-West (Lagos)",
        description: "Ultra-soft mashed brown beans topped with deeply caramelized charred onion and chili palm oil sauce.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Street Food Breakfast, Agege Bread Pairing, High Energy",
        meal_time: "Breakfast & Lunch"
      },
      {
        meal_id: "meal-moi-moi",
        meal_name: "Steamed Nigerian Moi Moi (Bean Pudding)",
        meal_category: "Beans & Staples",
        cuisine_origin: "Nigerian",
        regional_context: "National",
        description: "Steamed pureed peeled beans spiced with red peppers, onions, crayfish, flaked mackerel, and boiled eggs in banana leaves.",
        default_serving_size: 4,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Breakfast with Pap/Custard, Lunch with Jollof Rice",
        meal_time: "Breakfast & Lunch"
      },
      {
        meal_id: "meal-akara",
        meal_name: "Crispy Nigerian Akara (Bean Cakes)",
        meal_category: "Beans & Staples",
        cuisine_origin: "Nigerian",
        regional_context: "National Morning Classic",
        description: "Fluffy on the inside, golden crispy on the outside deep-fried whipped black-eyed bean batter seasoned with habanero and red onions.",
        default_serving_size: 4,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Saturday Morning Breakfast with Ogi (Pap) or Fresh Bread",
        meal_time: "Breakfast"
      },
      {
        meal_id: "meal-asaro-yam-porridge",
        meal_name: "Asaro (Yoruba Savory Yam Porridge)",
        meal_category: "Tubers & Staples",
        cuisine_origin: "Nigerian (Yoruba)",
        regional_context: "South-West",
        description: "Rich, mashed pottage of white puna yam simmered in coarse pepper sauce, palm oil, smoked fish, crayfish, and fresh ugu leaves.",
        default_serving_size: 4,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Wholesome Rainy Day Lunch, Easy One-Pot Family Meal",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-ekpang-nkukwo",
        meal_name: "Ekpang Nkukwo (Grated Cocoyam & Water Yam Pot)",
        meal_category: "Tubers & Staples",
        cuisine_origin: "Nigerian (Efik / Ibibio)",
        regional_context: "Cross River & Akwa Ibom",
        description: "Traditional coastal delicacy of seasoned grated cocoyam wrapped individually in tender cocoyam leaves, cooked with dried fish, periwinkles and scent leaf.",
        default_serving_size: 4,
        complexity: "Advanced",
        supports_budget_mode: false,
        best_for: "Cultural Festivals, Authentic South-South Delicacy",
        meal_time: "Lunch & Dinner"
      },
      {
        meal_id: "meal-abacha-ugba",
        meal_name: "Abacha & Ugba (African Salad)",
        meal_category: "Snacks & Staples",
        cuisine_origin: "Nigerian (Igbo)",
        regional_context: "South-East (Enugu / Anambra)",
        description: "Exquisite salad made with dried shredded cassava (abacha), fermented oil bean seed (ugba), palm oil ncha sauce, garden egg, utazi and fried fish.",
        default_serving_size: 2,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Afternoon Refreshment, Cultural Celebrations, Healthy Snack",
        meal_time: "Lunch & Snack"
      },
      {
        meal_id: "meal-plantain-porridge",
        meal_name: "Ukodo (Yam & Unripe Plantain Pepper Soup Pot)",
        meal_category: "Tubers & Staples",
        cuisine_origin: "Nigerian (Urhobo / Delta)",
        regional_context: "Niger Delta",
        description: "Hearty traditional pottage combining unripe plantain, yam chunks, goat meat, and aromatic pepper soup spices in a rich medicinal broth.",
        default_serving_size: 4,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Morning Hangover Cure, Low Glycemic Comfort Food, Cold Weather",
        meal_time: "Breakfast & Lunch"
      },

      // ── PROTEINS, STREET GRILLS & SPECIALS ──
      {
        meal_id: "meal-suya-skewer",
        meal_name: "Authentic Mai Suya Spiced Beef Skewers",
        meal_category: "Grills & Proteins",
        cuisine_origin: "Nigerian (Northern)",
        regional_context: "National Street Favorite",
        description: "Thinly sliced tender beef marinated in peanut kuli-kuli yaji spice, ginger, and garlic, char-grilled to perfection and served with sliced onions and tomatoes.",
        default_serving_size: 2,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Evening Snack, Entertaining, Protein Boost",
        meal_time: "Dinner & Snack"
      },
      {
        meal_id: "meal-asun-goat-meat",
        meal_name: "Authentic Yoruba Asun (Spicy Peppered Smoked Goat Meat)",
        meal_category: "Grills & Proteins",
        cuisine_origin: "Nigerian (Yoruba - Ondo)",
        regional_context: "South-West",
        description: "Fire-roasted tender goat meat chopped into bite sizes and stir-fried with crushed scotch bonnet peppers, onions, and bell peppers.",
        default_serving_size: 3,
        complexity: "Medium",
        supports_budget_mode: false,
        best_for: "Parties, Happy Hour, Social Gatherings",
        meal_time: "Dinner & Snack"
      },
      {
        meal_id: "meal-nkwobi",
        meal_name: "Nkwobi (Spicy Cow Foot Delicacy in Potash Sauce)",
        meal_category: "Traditional Delicacies",
        cuisine_origin: "Nigerian (Igbo)",
        regional_context: "South-East",
        description: "Slow-tenderized cow foot folded into rich curded palm oil, potash (akanwu/ncha), calabash nutmeg, and garnished with thin sliced utazi leaves and onion rings.",
        default_serving_size: 2,
        complexity: "Medium",
        supports_budget_mode: true,
        best_for: "Evening Relaxation, Cultural Dining, Palm Wine Pairing",
        meal_time: "Dinner & Snack"
      },
      {
        meal_id: "meal-gizdodo",
        meal_name: "Gizdodo (Spicy Chicken Gizzard & Dodo Medley)",
        meal_category: "Grills & Proteins",
        cuisine_origin: "Nigerian",
        regional_context: "National Party Classic",
        description: "Succulent braised chicken gizzards and sweet golden fried plantain cubes tossed in rich red bell pepper and onion sauce.",
        default_serving_size: 3,
        complexity: "Easy",
        supports_budget_mode: true,
        best_for: "Party Finger Food, Side Dish for Jollof / Fried Rice",
        meal_time: "Lunch & Dinner"
      }
    ];

    for (const m of mealsData) {
      await pool.query(`
        INSERT INTO meals (meal_id, meal_name, meal_category, cuisine_origin, regional_context, description, default_serving_size, complexity, supports_budget_mode, best_for, meal_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (meal_id) DO UPDATE SET
          meal_name = EXCLUDED.meal_name,
          meal_category = EXCLUDED.meal_category,
          cuisine_origin = EXCLUDED.cuisine_origin,
          regional_context = EXCLUDED.regional_context,
          description = EXCLUDED.description,
          default_serving_size = EXCLUDED.default_serving_size,
          complexity = EXCLUDED.complexity,
          supports_budget_mode = EXCLUDED.supports_budget_mode,
          best_for = EXCLUDED.best_for,
          meal_time = EXCLUDED.meal_time
      `, [m.meal_id, m.meal_name, m.meal_category, m.cuisine_origin, m.regional_context, m.description, m.default_serving_size, m.complexity, m.supports_budget_mode, m.best_for, m.meal_time]);
    }
    console.log(`✅ Seeded ${mealsData.length} Nigerian Meals & Recipes.`);

    // ═════════════════════════════════════════════════════════════════════════
    // 3. SEED INGREDIENTS KNOWLEDGE BASE
    // ═════════════════════════════════════════════════════════════════════════
    const ingredientsData = [
      { ingredient_id: "ing-parboiled-rice", ingredient_name: "Long Grain Parboiled Rice", ingredient_category: "Grains & Rice", aliases: "White Rice, Nigerian Rice", allergen_tag: "Gluten-Free", dietary_tag: "Vegan, Halal" },
      { ingredient_id: "ing-ofada-rice", ingredient_name: "Ofada Rice", ingredient_category: "Grains & Rice", aliases: "Unpolished Rice, Brown Rice, Abakaliki Rice", allergen_tag: "Gluten-Free", dietary_tag: "Diabetic Friendly, High Fiber, Vegan" },
      { ingredient_id: "ing-fresh-tomatoes", ingredient_name: "Fresh Tomatoes", ingredient_category: "Vegetables & Fresh Produce", aliases: "Tomato Jos, Round Tomatoes", allergen_tag: "Nightshade", dietary_tag: "Vegan, Low Calorie" },
      { ingredient_id: "ing-tatashe", ingredient_name: "Red Bell Pepper (Tatashe)", ingredient_category: "Vegetables & Fresh Produce", aliases: "Tatashe, Sweet Pepper", allergen_tag: "Nightshade", dietary_tag: "Vegan, Vitamin C" },
      { ingredient_id: "ing-rodo", ingredient_name: "Scotch Bonnet Pepper (Rodo)", ingredient_category: "Vegetables & Fresh Produce", aliases: "Ata Rodo, Fresh Pepper, Habanero", allergen_tag: "Nightshade", dietary_tag: "Vegan, Metabolism Booster" },
      { ingredient_id: "ing-shombo", ingredient_name: "Cayenne Pepper (Shombo)", ingredient_category: "Vegetables & Fresh Produce", aliases: "Bawa, Long Pepper", allergen_tag: "Nightshade", dietary_tag: "Vegan" },
      { ingredient_id: "ing-onions-red", ingredient_name: "Red Onions", ingredient_category: "Vegetables & Fresh Produce", aliases: "Alubosa, Onions", allergen_tag: "None", dietary_tag: "Vegan, Heart Health" },
      { ingredient_id: "ing-palm-oil", ingredient_name: "Pure Red Palm Oil", ingredient_category: "Oils & Fats", aliases: "Epo Pupa, Palm Fruit Oil", allergen_tag: "None", dietary_tag: "Vegan, Vitamin A, Vitamin E" },
      { ingredient_id: "ing-veg-oil", ingredient_name: "Vegetable / Groundnut Oil", ingredient_category: "Oils & Fats", aliases: "Cooking Oil, Sunflower Oil", allergen_tag: "Peanut / Seed", dietary_tag: "Cholesterol Free, Halal" },
      { ingredient_id: "ing-egusi", ingredient_name: "Ground Melon Seeds (Egusi)", ingredient_category: "Seeds & Nuts", aliases: "Egusi, Hand-peeled Egusi", allergen_tag: "Seeds", dietary_tag: "Keto, High Protein, Healthy Fats" },
      { ingredient_id: "ing-crayfish", ingredient_name: "Ground Crayfish", ingredient_category: "Seafood & Dried Fish", aliases: "Oron Crayfish, Dried Shrimps", allergen_tag: "Crustacean / Shellfish", dietary_tag: "High Protein, High Calcium", requires_hard_filter: true },
      { ingredient_id: "ing-stockfish", ingredient_name: "Stockfish (Okporoko / Panla)", ingredient_category: "Seafood & Dried Fish", aliases: "Cod Fish, Dried Stockfish", allergen_tag: "Fish", dietary_tag: "High Protein, Lean" },
      { ingredient_id: "ing-dry-catfish", ingredient_name: "Smoked Catfish / Dry Fish", ingredient_category: "Seafood & Dried Fish", aliases: "Eja Aro, Mangala", allergen_tag: "Fish", dietary_tag: "High Protein, Keto" },
      { ingredient_id: "ing-fresh-catfish", ingredient_name: "Fresh Point & Kill Catfish", ingredient_category: "Seafood & Fresh Fish", aliases: "Catfish, Live Fish", allergen_tag: "Fish", dietary_tag: "High Omega-3, Halal" },
      { ingredient_id: "ing-periwinkle", ingredient_name: "Shelled Periwinkles (Isam / Mfi)", ingredient_category: "Seafood", aliases: "Periwinkle, Sea Snails", allergen_tag: "Mollusc / Shellfish", dietary_tag: "Iron Rich, Low Fat", requires_hard_filter: true },
      { ingredient_id: "ing-iru", ingredient_name: "Locust Beans (Iru / Dawadawa)", ingredient_category: "Traditional Seasoning", aliases: "Iru Woro, Iru Pete, Fermented Beans", allergen_tag: "Legume", dietary_tag: "Probiotic, Heart Health, Umami" },
      { ingredient_id: "ing-curry-thyme", ingredient_name: "Curry Powder, Thyme & Bay Leaves", ingredient_category: "Herbs & Spices", aliases: "Ducros Curry, Lion Thyme", allergen_tag: "None", dietary_tag: "Vegan, Halal" },
      { ingredient_id: "ing-stock-cubes", ingredient_name: "Stock Seasoning Cubes (Knorr / Maggi)", ingredient_category: "Packaged Seasoning", aliases: "Maggi Chicken, Knorr Beef", allergen_tag: "Soy / Celery", dietary_tag: "Umami Seasoning" },
      { ingredient_id: "ing-honey-beans", ingredient_name: "Honey Brown Beans (Ewa Oloyin)", ingredient_category: "Legumes & Pulses", aliases: "Ewa Oloyin, Sweet Beans", allergen_tag: "Legume", dietary_tag: "High Protein, High Folate, Vegan" },
      { ingredient_id: "ing-ripe-plantain", ingredient_name: "Ripe Plantain (Dodo)", ingredient_category: "Tubers & Plantains", aliases: "Ogede Dodo, Sweet Plantain", allergen_tag: "None", dietary_tag: "Potassium Rich, Vegan" },
      { ingredient_id: "ing-unripe-plantain", ingredient_name: "Unripe Green Plantain", ingredient_category: "Tubers & Plantains", aliases: "Ogede Apon, Green Plantain", allergen_tag: "None", dietary_tag: "Diabetic Friendly, Iron Rich" },
      { ingredient_id: "ing-white-yam", ingredient_name: "Puna White Yam Tuber", ingredient_category: "Tubers & Roots", aliases: "Isu Tuntun, White Yam", allergen_tag: "None", dietary_tag: "Complex Carbs, Gluten-Free" },
      { ingredient_id: "ing-waterleaf", ingredient_name: "Fresh Waterleaf (Gbure)", ingredient_category: "Leafy Greens", aliases: "Waterleaf, Gbure", allergen_tag: "None", dietary_tag: "Hydrating, High Fiber, Vegan" },
      { ingredient_id: "ing-ugu-leaves", ingredient_name: "Fresh Pumpkin Leaves (Ugu)", ingredient_category: "Leafy Greens", aliases: "Ugu, Fluted Pumpkin", allergen_tag: "None", dietary_tag: "Iron Rich, Blood Building, Vegan" },
      { ingredient_id: "ing-bitterleaf", ingredient_name: "Washed Bitterleaf (Onugbu / Ewuro)", ingredient_category: "Leafy Greens", aliases: "Ewuro, Onugbu, Bitter Leaf", allergen_tag: "None", dietary_tag: "Digestive Cleanser, Diabetic Friendly" },
      { ingredient_id: "ing-okazi-leaves", ingredient_name: "Afang / Okazi Leaves", ingredient_category: "Leafy Greens", aliases: "Okazi, Afang, Wild Spinach", allergen_tag: "None", dietary_tag: "High Fiber, Low Glycemic" },
      { ingredient_id: "ing-oha-leaves", ingredient_name: "Fresh Oha Leaves", ingredient_category: "Leafy Greens", aliases: "Ora Leaves, Oha", allergen_tag: "None", dietary_tag: "Antioxidant, High Vitamin C" },
      { ingredient_id: "ing-scent-leaves", ingredient_name: "Fresh Scent Leaves (Efirin / Nchanwu)", ingredient_category: "Herbs & Leafy Greens", aliases: "Efirin, Nchanwu, African Basil", allergen_tag: "None", dietary_tag: "Antibacterial, Digestive Health" },
      { ingredient_id: "ing-utazi-leaves", ingredient_name: "Fresh Utazi Leaves", ingredient_category: "Herbs & Leafy Greens", aliases: "Utazi, Bitter Vine", allergen_tag: "None", dietary_tag: "Postpartum Recovery, Blood Sugar Control" },
      { ingredient_id: "ing-poundo-yam", ingredient_name: "Ayoola Poundo Yam Flour", ingredient_category: "Flours & Swallows", aliases: "Poundo Yam, Pounded Yam Flour", allergen_tag: "Gluten-Free", dietary_tag: "Gluten-Free Swallow" },
      { ingredient_id: "ing-semovita", ingredient_name: "Golden Penny Semovita", ingredient_category: "Flours & Swallows", aliases: "Semolina, Semo", allergen_tag: "Gluten / Wheat", dietary_tag: "Energy Swallow", requires_hard_filter: true },
      { ingredient_id: "ing-garri-ijebu", ingredient_name: "Garri (Ijebu White / Yellow)", ingredient_category: "Flours & Swallows", aliases: "Ijebu Garri, Eba Garri, Cassava Flakes", allergen_tag: "Gluten-Free", dietary_tag: "100% Cassava, Vegan" },
      { ingredient_id: "ing-beef", ingredient_name: "Fresh Cow Meat (Beef Cuts)", ingredient_category: "Meats & Poultry", aliases: "Eran Malu, Red Meat", allergen_tag: "None", dietary_tag: "High Protein, Iron, Halal" },
      { ingredient_id: "ing-goat-meat", ingredient_name: "Fresh Goat Meat (Ogunfe)", ingredient_category: "Meats & Poultry", aliases: "Ogunfe, Asun Meat, Chevon", allergen_tag: "None", dietary_tag: "Lean Red Meat, High Zinc" },
      { ingredient_id: "ing-assorted-meat", ingredient_name: "Assorted Meat (Shaki, Abodi, Kpomo)", ingredient_category: "Meats & Offals", aliases: "Orisirisi, Tripe, Cow Skin", allergen_tag: "None", dietary_tag: "Traditional Delicacy" },
      { ingredient_id: "ing-chicken", ingredient_name: "Fresh Whole / Cut Chicken", ingredient_category: "Meats & Poultry", aliases: "Old Layer, Broiler, Hard Chicken", allergen_tag: "None", dietary_tag: "Lean Protein, Halal" },
      { ingredient_id: "ing-gizzard", ingredient_name: "Chicken / Turkey Gizzards", ingredient_category: "Meats & Offals", aliases: "Gizzard, Eran Gizzard", allergen_tag: "None", dietary_tag: "High Protein, Low Fat" },
      { ingredient_id: "ing-suya-pepper", ingredient_name: "Suya Pepper (Yaji Spice)", ingredient_category: "Herbs & Spices", aliases: "Yaji, Suya Spice", allergen_tag: "Peanut / Groundnut (Kuli-kuli)", dietary_tag: "Northern Spice Mix", requires_hard_filter: true },
      { ingredient_id: "ing-peppersoup-spices", ingredient_name: "Calabash Nutmeg (Ehuru) & Uda Pods", ingredient_category: "Herbs & Spices", aliases: "Ehuru, Uda, Uziza seeds, Pepper soup mix", allergen_tag: "None", dietary_tag: "Medicinal, Anti-inflammatory" },
      { ingredient_id: "ing-banga-paste", ingredient_name: "Palm Fruit Concentrate (Banga Paste)", ingredient_category: "Canned & Preserves", aliases: "Banga Oil, Oghwo paste", allergen_tag: "None", dietary_tag: "Traditional Rich Base" },
      { ingredient_id: "ing-ogbono", ingredient_name: "Ground Ogbono Seeds (Apon)", ingredient_category: "Seeds & Nuts", aliases: "Wild Mango Seeds, Apon", allergen_tag: "Seeds", dietary_tag: "Rich in Healthy Lipids" },
      { ingredient_id: "ing-fresh-okro", ingredient_name: "Fresh Lady Finger Okro", ingredient_category: "Vegetables & Fresh Produce", aliases: "Ila, Okra, Lady's Fingers", allergen_tag: "None", dietary_tag: "High Soluble Fiber, Low Calorie" }
    ];

    for (const ing of ingredientsData) {
      await pool.query(`
        INSERT INTO ingredients (ingredient_id, ingredient_name, ingredient_category, aliases, allergen_tag, dietary_tag, requires_hard_filter)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (ingredient_id) DO UPDATE SET
          ingredient_name = EXCLUDED.ingredient_name,
          ingredient_category = EXCLUDED.ingredient_category,
          aliases = EXCLUDED.aliases,
          allergen_tag = EXCLUDED.allergen_tag,
          dietary_tag = EXCLUDED.dietary_tag,
          requires_hard_filter = EXCLUDED.requires_hard_filter
      `, [ing.ingredient_id, ing.ingredient_name, ing.ingredient_category, ing.aliases, ing.allergen_tag, ing.dietary_tag, ing.requires_hard_filter || false]);
    }
    console.log(`✅ Seeded ${ingredientsData.length} Master Ingredients.`);

    // ═════════════════════════════════════════════════════════════════════════
    // 4. SEED MEAL INGREDIENTS (Full Recipe Breakdowns with Quantities)
    // ═════════════════════════════════════════════════════════════════════════
    await pool.query(`DELETE FROM meal_ingredients;`);
    const mealIngredientsData = [
      // 1. Jollof Rice
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Long Grain Parboiled Rice", requirement_type: "Essential", qty_per_person: 0.25, recipe_unit: "kg", role_in_meal: "Base Carb", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Fresh Tomatoes", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Sauce Base", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Sonia Sachet Tomatoes / Tomato Paste", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "sachet", role_in_meal: "Color & Depth", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Red Bell Pepper (Tatashe)", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Color & Sweetness", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Scotch Bonnet Pepper (Rodo)", requirement_type: "Essential", qty_per_person: 0.05, recipe_unit: "kg", role_in_meal: "Heat & Aroma", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Red Onions", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "bulb", role_in_meal: "Aromatics Base", importance_score: 4 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Vegetable / Groundnut Oil", requirement_type: "Essential", qty_per_person: 0.06, recipe_unit: "L", role_in_meal: "Frying Base", importance_score: 4 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Curry Powder, Thyme & Bay Leaves", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "pack", role_in_meal: "Signature Herbal Aroma", importance_score: 5 },
      { meal_id: "meal-jollof-rice", meal_name: "Authentic Nigerian Party Jollof Rice", ingredient_name: "Stock Seasoning Cubes (Knorr / Maggi)", requirement_type: "Essential", qty_per_person: 2, recipe_unit: "cubes", role_in_meal: "Umami Seasoning", importance_score: 5 },

      // 2. Egusi Soup
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Ground Melon Seeds (Egusi)", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Soup Base & Protein", importance_score: 5 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Pure Red Palm Oil", requirement_type: "Essential", qty_per_person: 0.08, recipe_unit: "L", role_in_meal: "Color & Rich Flavor", importance_score: 5 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Fresh Pumpkin Leaves (Ugu)", requirement_type: "Essential", qty_per_person: 0.5, recipe_unit: "bunch", role_in_meal: "Leafy Greens", importance_score: 5 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Ground Crayfish", requirement_type: "Essential", qty_per_person: 0.03, recipe_unit: "kg", role_in_meal: "Seafood Umami", importance_score: 5 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Smoked Catfish / Dry Fish", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "piece", role_in_meal: "Smoked Protein", importance_score: 4 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Stockfish (Okporoko / Panla)", requirement_type: "Optional", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Chewy Rich Texture", importance_score: 4 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Locust Beans (Iru / Dawadawa)", requirement_type: "Optional", qty_per_person: 0.02, recipe_unit: "cup", role_in_meal: "Fermented Traditional Aroma", importance_score: 4 },
      { meal_id: "meal-egusi-soup", meal_name: "Rich Nigerian Egusi Soup", ingredient_name: "Ayoola Poundo Yam Flour", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Swallow Pairing", importance_score: 5 },

      // 3. Ofada Rice with Ayamase
      { meal_id: "meal-ofada-rice-stew", meal_name: "Ofada Rice with Designer Ayamase Stew", ingredient_name: "Ofada Rice", requirement_type: "Essential", qty_per_person: 0.25, recipe_unit: "kg", role_in_meal: "Base Grain", importance_score: 5 },
      { meal_id: "meal-ofada-rice-stew", meal_name: "Ofada Rice with Designer Ayamase Stew", ingredient_name: "Green Bell Peppers & Rodo", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Green Pepper Base", importance_score: 5 },
      { meal_id: "meal-ofada-rice-stew", meal_name: "Ofada Rice with Designer Ayamase Stew", ingredient_name: "Pure Red Palm Oil", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "L", role_in_meal: "Bleached Base Oil", importance_score: 5 },
      { meal_id: "meal-ofada-rice-stew", meal_name: "Ofada Rice with Designer Ayamase Stew", ingredient_name: "Locust Beans (Iru / Dawadawa)", requirement_type: "Essential", qty_per_person: 0.05, recipe_unit: "cup", role_in_meal: "Signature Savory Punch", importance_score: 5 },
      { meal_id: "meal-ofada-rice-stew", meal_name: "Ofada Rice with Designer Ayamase Stew", ingredient_name: "Assorted Meat (Shaki, Abodi, Kpomo)", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Offals & Protein", importance_score: 5 },
      { meal_id: "meal-ofada-rice-stew", meal_name: "Ofada Rice with Designer Ayamase Stew", ingredient_name: "Boiled Eggs", requirement_type: "Optional", qty_per_person: 1, recipe_unit: "piece", role_in_meal: "Traditional Garnish", importance_score: 4 },

      // 4. Efo Riro
      { meal_id: "meal-efo-riro", meal_name: "Authentic Yoruba Efo Riro", ingredient_name: "Fresh Waterleaf (Gbure)", requirement_type: "Essential", qty_per_person: 0.5, recipe_unit: "bunch", role_in_meal: "Tender Leaf Base", importance_score: 5 },
      { meal_id: "meal-efo-riro", meal_name: "Authentic Yoruba Efo Riro", ingredient_name: "Fresh Pumpkin Leaves (Ugu)", requirement_type: "Essential", qty_per_person: 0.5, recipe_unit: "bunch", role_in_meal: "Rich Iron Greens", importance_score: 5 },
      { meal_id: "meal-efo-riro", meal_name: "Authentic Yoruba Efo Riro", ingredient_name: "Red Bell Pepper (Tatashe)", requirement_type: "Essential", qty_per_person: 0.15, recipe_unit: "kg", role_in_meal: "Coarse Pepper Puree", importance_score: 5 },
      { meal_id: "meal-efo-riro", meal_name: "Authentic Yoruba Efo Riro", ingredient_name: "Pure Red Palm Oil", requirement_type: "Essential", qty_per_person: 0.08, recipe_unit: "L", role_in_meal: "Cooking Oil", importance_score: 4 },
      { meal_id: "meal-efo-riro", meal_name: "Authentic Yoruba Efo Riro", ingredient_name: "Smoked Catfish / Dry Fish", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "piece", role_in_meal: "Smoked Fish", importance_score: 4 },
      { meal_id: "meal-efo-riro", meal_name: "Authentic Yoruba Efo Riro", ingredient_name: "Ground Crayfish", requirement_type: "Essential", qty_per_person: 0.03, recipe_unit: "kg", role_in_meal: "Umami Seasoning", importance_score: 5 },
      { meal_id: "meal-efo-riro", meal_name: "Authentic Yoruba Efo Riro", ingredient_name: "Locust Beans (Iru / Dawadawa)", requirement_type: "Essential", qty_per_person: 0.03, recipe_unit: "cup", role_in_meal: "Traditional Fragrance", importance_score: 4 },

      // 5. Banga Soup
      { meal_id: "meal-banga-soup", meal_name: "Delta Banga Soup", ingredient_name: "Palm Fruit Concentrate (Banga Paste)", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Soup Base", importance_score: 5 },
      { meal_id: "meal-banga-soup", meal_name: "Delta Banga Soup", ingredient_name: "Fresh Point & Kill Catfish", requirement_type: "Essential", qty_per_person: 0.3, recipe_unit: "kg", role_in_meal: "Primary Protein", importance_score: 5 },
      { meal_id: "meal-banga-soup", meal_name: "Delta Banga Soup", ingredient_name: "Banga Spices (Oburunbebe / Beletiete)", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "pack", role_in_meal: "Traditional Herbal Aroma", importance_score: 5 },
      { meal_id: "meal-banga-soup", meal_name: "Delta Banga Soup", ingredient_name: "Ground Crayfish", requirement_type: "Essential", qty_per_person: 0.04, recipe_unit: "kg", role_in_meal: "Seafood Base", importance_score: 5 },
      { meal_id: "meal-banga-soup", meal_name: "Delta Banga Soup", ingredient_name: "Shelled Periwinkles (Isam / Mfi)", requirement_type: "Optional", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Chewy Seafood Texture", importance_score: 4 },

      // 6. Afang Soup
      { meal_id: "meal-afang-soup", meal_name: "Calabar Afang Soup", ingredient_name: "Afang / Okazi Leaves", requirement_type: "Essential", qty_per_person: 0.15, recipe_unit: "kg", role_in_meal: "Pounded Okazi Base", importance_score: 5 },
      { meal_id: "meal-afang-soup", meal_name: "Calabar Afang Soup", ingredient_name: "Fresh Waterleaf (Gbure)", requirement_type: "Essential", qty_per_person: 0.6, recipe_unit: "bunch", role_in_meal: "Moisture & Leaf Softness", importance_score: 5 },
      { meal_id: "meal-afang-soup", meal_name: "Calabar Afang Soup", ingredient_name: "Pure Red Palm Oil", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "L", role_in_meal: "Gloss & Flavor", importance_score: 5 },
      { meal_id: "meal-afang-soup", meal_name: "Calabar Afang Soup", ingredient_name: "Shelled Periwinkles (Isam / Mfi)", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Signature Coastal Crunch", importance_score: 5 },
      { meal_id: "meal-afang-soup", meal_name: "Calabar Afang Soup", ingredient_name: "Stockfish (Okporoko / Panla)", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Stockfish Essence", importance_score: 4 },

      // 7. Pepper Soup
      { meal_id: "meal-pepper-soup", meal_name: "Nigerian Catfish & Goat Meat Pepper Soup", ingredient_name: "Fresh Goat Meat (Ogunfe)", requirement_type: "Essential", qty_per_person: 0.3, recipe_unit: "kg", role_in_meal: "Rich Meat Cut", importance_score: 5 },
      { meal_id: "meal-pepper-soup", meal_name: "Nigerian Catfish & Goat Meat Pepper Soup", ingredient_name: "Calabash Nutmeg (Ehuru) & Uda Pods", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "pack", role_in_meal: "Spicy Herbal Broth", importance_score: 5 },
      { meal_id: "meal-pepper-soup", meal_name: "Nigerian Catfish & Goat Meat Pepper Soup", ingredient_name: "Fresh Scent Leaves (Efirin / Nchanwu)", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "bunch", role_in_meal: "Medicinal Herbal Garnish", importance_score: 5 },
      { meal_id: "meal-pepper-soup", meal_name: "Nigerian Catfish & Goat Meat Pepper Soup", ingredient_name: "Scotch Bonnet Pepper (Rodo)", requirement_type: "Essential", qty_per_person: 0.04, recipe_unit: "kg", role_in_meal: "Fiery Heat", importance_score: 5 },

      // 8. Beans & Plantain (Ewa Oloyin & Dodo)
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Honey Brown Beans (Ewa Oloyin)", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Sweet Protein Base", importance_score: 5 },
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Ripe Plantain (Dodo)", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "finger", role_in_meal: "Golden Fried Side", importance_score: 5 },
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Pure Red Palm Oil", requirement_type: "Essential", qty_per_person: 0.05, recipe_unit: "L", role_in_meal: "Simmering Oil", importance_score: 4 },
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Red Onions", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "bulb", role_in_meal: "Caramelized Aromatics", importance_score: 4 },
      { meal_id: "meal-beans-plantain", meal_name: "Honey Beans & Fried Plantain", ingredient_name: "Ground Crayfish", requirement_type: "Optional", qty_per_person: 0.02, recipe_unit: "kg", role_in_meal: "Flavor Enhancer", importance_score: 4 },

      // 9. Asaro (Savory Yam Porridge)
      { meal_id: "meal-asaro-yam-porridge", meal_name: "Asaro (Savory Yam Porridge)", ingredient_name: "Puna White Yam Tuber", requirement_type: "Essential", qty_per_person: 0.4, recipe_unit: "kg", role_in_meal: "Yam Base", importance_score: 5 },
      { meal_id: "meal-asaro-yam-porridge", meal_name: "Asaro (Savory Yam Porridge)", ingredient_name: "Pure Red Palm Oil", requirement_type: "Essential", qty_per_person: 0.08, recipe_unit: "L", role_in_meal: "Color & Taste", importance_score: 5 },
      { meal_id: "meal-asaro-yam-porridge", meal_name: "Asaro (Savory Yam Porridge)", ingredient_name: "Smoked Catfish / Dry Fish", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "piece", role_in_meal: "Smoked Protein Flakes", importance_score: 4 },
      { meal_id: "meal-asaro-yam-porridge", meal_name: "Asaro (Savory Yam Porridge)", ingredient_name: "Fresh Pumpkin Leaves (Ugu)", requirement_type: "Optional", qty_per_person: 0.3, recipe_unit: "bunch", role_in_meal: "Fresh Green Garnish", importance_score: 4 },
      { meal_id: "meal-asaro-yam-porridge", meal_name: "Asaro (Savory Yam Porridge)", ingredient_name: "Ground Crayfish", requirement_type: "Essential", qty_per_person: 0.03, recipe_unit: "kg", role_in_meal: "Seafood Savory Base", importance_score: 5 },

      // 10. Suya Skewers
      { meal_id: "meal-suya-skewer", meal_name: "Authentic Mai Suya Spiced Beef Skewers", ingredient_name: "Fresh Cow Meat (Beef Cuts)", requirement_type: "Essential", qty_per_person: 0.25, recipe_unit: "kg", role_in_meal: "Lean Beef Slices", importance_score: 5 },
      { meal_id: "meal-suya-skewer", meal_name: "Authentic Mai Suya Spiced Beef Skewers", ingredient_name: "Suya Pepper (Yaji Spice)", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "pack", role_in_meal: "Spicy Peanut Rub", importance_score: 5 },
      { meal_id: "meal-suya-skewer", meal_name: "Authentic Mai Suya Spiced Beef Skewers", ingredient_name: "Red Onions", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "bulb", role_in_meal: "Raw Crisp Rings", importance_score: 4 },
      { meal_id: "meal-suya-skewer", meal_name: "Authentic Mai Suya Spiced Beef Skewers", ingredient_name: "Fresh Tomatoes", requirement_type: "Optional", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Fresh Slices", importance_score: 3 },

      // 11. Ofe Nsala (White Soup)
      { meal_id: "meal-ofe-nsala", meal_name: "Ofe Nsala (White Soup)", ingredient_name: "Fresh Point & Kill Catfish", requirement_type: "Essential", qty_per_person: 0.35, recipe_unit: "kg", role_in_meal: "River Fresh Fish", importance_score: 5 },
      { meal_id: "meal-ofe-nsala", meal_name: "Ofe Nsala (White Soup)", ingredient_name: "Puna White Yam Tuber", requirement_type: "Essential", qty_per_person: 0.15, recipe_unit: "kg", role_in_meal: "Pounded Yam Thickener", importance_score: 5 },
      { meal_id: "meal-ofe-nsala", meal_name: "Ofe Nsala (White Soup)", ingredient_name: "Fresh Utazi Leaves", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "bunch", role_in_meal: "Bitter-Sweet Herbal Punch", importance_score: 5 },
      { meal_id: "meal-ofe-nsala", meal_name: "Ofe Nsala (White Soup)", ingredient_name: "Calabash Nutmeg (Ehuru) & Uda Pods", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "pack", role_in_meal: "Aromatic Spice Blend", importance_score: 5 },
      { meal_id: "meal-ofe-nsala", meal_name: "Ofe Nsala (White Soup)", ingredient_name: "Ground Crayfish", requirement_type: "Essential", qty_per_person: 0.04, recipe_unit: "kg", role_in_meal: "Seafood Essence", importance_score: 5 },

      // 12. Gizdodo
      { meal_id: "meal-gizdodo", meal_name: "Gizdodo", ingredient_name: "Chicken / Turkey Gizzards", requirement_type: "Essential", qty_per_person: 0.2, recipe_unit: "kg", role_in_meal: "Savory Meaty Bites", importance_score: 5 },
      { meal_id: "meal-gizdodo", meal_name: "Gizdodo", ingredient_name: "Ripe Plantain (Dodo)", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "finger", role_in_meal: "Sweet Golden Dices", importance_score: 5 },
      { meal_id: "meal-gizdodo", meal_name: "Gizdodo", ingredient_name: "Red Bell Pepper (Tatashe)", requirement_type: "Essential", qty_per_person: 0.1, recipe_unit: "kg", role_in_meal: "Rich Sweet Sauce", importance_score: 5 },
      { meal_id: "meal-gizdodo", meal_name: "Gizdodo", ingredient_name: "Vegetable / Groundnut Oil", requirement_type: "Essential", qty_per_person: 0.05, recipe_unit: "L", role_in_meal: "Frying Oil", importance_score: 4 },
      { meal_id: "meal-gizdodo", meal_name: "Gizdodo", ingredient_name: "Red Onions", requirement_type: "Essential", qty_per_person: 1, recipe_unit: "bulb", role_in_meal: "Chunky Sauté", importance_score: 4 }
    ];

    for (const mi of mealIngredientsData) {
      await pool.query(`
        INSERT INTO meal_ingredients (meal_id, meal_name, ingredient_name, requirement_type, qty_per_person, recipe_unit, role_in_meal, importance_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [mi.meal_id, mi.meal_name, mi.ingredient_name, mi.requirement_type, mi.qty_per_person, mi.recipe_unit, mi.role_in_meal, mi.importance_score]);
    }
    console.log(`✅ Seeded ${mealIngredientsData.length} Meal Ingredients.`);

    // ═════════════════════════════════════════════════════════════════════════
    // 5. SEED INGREDIENT SUBSTITUTIONS (20+ Rich Substitutions)
    // ═════════════════════════════════════════════════════════════════════════
    const substitutionsData = [
      {
        substitution_id: "sub-palmoil-veg",
        original_ingredient: "Red Palm Oil",
        substitute_ingredient: "Groundnut Oil / Sunflower Oil + Smoked Paprika",
        substitution_reason: "Low Cholesterol / Cardiovascular Health / Lighter Taste",
        taste_impact: "Lighter, less earthy aroma, slightly less heavy mouthfeel",
        estimated_price_impact: 0,
        safety_status: "Safe",
        ai_action: "Suggest for low-fat, cardiovascular, or heart-health diet plans"
      },
      {
        substitution_id: "sub-white-ofada-rice",
        original_ingredient: "Long Grain Parboiled Rice",
        substitute_ingredient: "Ofada Rice (Unpolished Brown Rice)",
        substitution_reason: "Diabetic Management / Low Glycemic Index / High Fiber",
        taste_impact: "Nutty, earthy traditional aroma with chewy whole-grain texture",
        estimated_price_impact: 400,
        safety_status: "Safe",
        ai_action: "Recommend when customer mentions diabetes, blood sugar, or fitness"
      },
      {
        substitution_id: "sub-crayfish-mushroom-iru",
        original_ingredient: "Ground Crayfish",
        substitute_ingredient: "Dried Shiitake / Forest Mushrooms + Fermented Iru",
        substitution_reason: "Shellfish / Crustacean Allergy or Strict Vegan Diet",
        taste_impact: "Deep savory umami broth without any crustacean allergens",
        estimated_price_impact: -100,
        safety_status: "Allergy Safe",
        ai_action: "Automatic substitute when seafood/shellfish allergy is flagged"
      },
      {
        substitution_id: "sub-stockfish-smoked-catfish",
        original_ingredient: "Stockfish (Okporoko)",
        substitute_ingredient: "Smoked Catfish / Mangala Fish",
        substitution_reason: "Budget Optimization / Faster Cooking Convenience",
        taste_impact: "Richer smoked aroma, tender flaking texture",
        estimated_price_impact: -800,
        safety_status: "Safe",
        ai_action: "Suggest when customer asks for economical or quick cooking options"
      },
      {
        substitution_id: "sub-sugar-date-powder",
        original_ingredient: "Refined White Sugar",
        substitute_ingredient: "Date Fruit Powder (Dabino) / Pure Honey",
        substitution_reason: "Natural Sweetener / Low Glycemic Index / Child Nutrition",
        taste_impact: "Warm caramel molasses sweetness",
        estimated_price_impact: 250,
        safety_status: "Safe",
        ai_action: "Suggest for sweet porridge, pap (ogi), baby meals, and baking"
      },
      {
        substitution_id: "sub-fresh-tomatoes-paste",
        original_ingredient: "Fresh Tomatoes",
        substitute_ingredient: "Sonia Sachet Tomatoes + Sweet Red Tatashe",
        substitution_reason: "Off-season price spike / Rainy season inflation",
        taste_impact: "Concentrated tomato richness with deep crimson color",
        estimated_price_impact: -500,
        safety_status: "Safe",
        ai_action: "Suggest when budget mode is requested during tomato inflation"
      },
      {
        substitution_id: "sub-semovita-poundo-garri",
        original_ingredient: "Golden Penny Semovita",
        substitute_ingredient: "Ayoola Poundo Yam / Garri (Ijebu) / Plantain Flour",
        substitution_reason: "Gluten Intolerance / Celiac Disease / Wheat Avoidance",
        taste_impact: "Smooth authentic yam or tangy cassava swallow texture",
        estimated_price_impact: 150,
        safety_status: "Allergy Safe",
        ai_action: "Automatic swap when gluten allergy or wheat sensitivity is flagged"
      },
      {
        substitution_id: "sub-cow-milk-tigernut",
        original_ingredient: "Cow Milk / Dairy",
        substitute_ingredient: "Fresh Tiger Nut Milk (Kunun Aya) / Soy Milk",
        substitution_reason: "Lactose Intolerance / Dairy Allergy / Plant-Based Diet",
        taste_impact: "Creamy, naturally sweet nutty beverage",
        estimated_price_impact: 100,
        safety_status: "Allergy Safe",
        ai_action: "Suggest when lactose intolerance is detected"
      },
      {
        substitution_id: "sub-groundnut-oil-sunflower",
        original_ingredient: "Groundnut Oil",
        substitute_ingredient: "Sunflower Oil / Soya Bean Oil",
        substitution_reason: "Peanut / Groundnut Allergy",
        taste_impact: "Neutral, clean frying profile",
        estimated_price_impact: 0,
        safety_status: "Allergy Safe",
        ai_action: "Automatic substitute when peanut allergy is detected"
      },
      {
        substitution_id: "sub-beef-soya-chunks",
        original_ingredient: "Fresh Cow Meat (Beef)",
        substitute_ingredient: "High-Protein Soya Chunks / Brown Beans",
        substitution_reason: "Economical Budget / Vegetarian / Gout Management",
        taste_impact: "Spongy texture that absorbs soup spices and sauces well",
        estimated_price_impact: -1200,
        safety_status: "Safe",
        ai_action: "Suggest when customer asks to minimize grocery bill or avoid purines"
      },
      {
        substitution_id: "sub-potash-baking-soda",
        original_ingredient: "Food Potash (Kaun / Akanwu)",
        substitute_ingredient: "Baking Soda (Sodium Bicarbonate)",
        substitution_reason: "Kidney Health / Cleaner Cooking / Controlled Alkalinity",
        taste_impact: "Smooth emulsification without gritty earthy aftertaste",
        estimated_price_impact: 50,
        safety_status: "Safe",
        ai_action: "Recommend for ewedu, gbegiri, and bean cooking for kidney care"
      },
      {
        substitution_id: "sub-scentleaf-basil",
        original_ingredient: "Fresh Scent Leaves (Efirin)",
        substitute_ingredient: "Sweet Italian Basil / Fresh Mint Leaves",
        substitution_reason: "Diaspora Cooking / Seasonal Scarcity",
        taste_impact: "Aromatic herbal fragrance, slightly sweeter notes",
        estimated_price_impact: 0,
        safety_status: "Safe",
        ai_action: "Suggest for international customers or out-of-season recipes"
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
          estimated_price_impact = EXCLUDED.estimated_price_impact,
          safety_status = EXCLUDED.safety_status,
          ai_action = EXCLUDED.ai_action
      `, [s.substitution_id, s.original_ingredient, s.substitute_ingredient, s.substitution_reason, s.taste_impact, s.estimated_price_impact, s.safety_status, s.ai_action]);

      // Sync into admin_substitutions for the Admin UI
      await pool.query(`
        INSERT INTO admin_substitutions (original_item, substitute_item, reason, dietary_tags, confidence, is_active)
        VALUES ($1, $2, $3, $4, 0.90, true)
        ON CONFLICT DO NOTHING
      `, [s.original_ingredient, s.substitute_ingredient, s.substitution_reason, s.safety_status]);
    }
    console.log(`✅ Seeded ${substitutionsData.length} Ingredient Substitutions.`);

    // ═════════════════════════════════════════════════════════════════════════
    // 6. SEED DIETARY & HEALTH RULES (10+ Specialized Guidelines)
    // ═════════════════════════════════════════════════════════════════════════
    const dietaryData = [
      {
        diet_rule_id: "diet-diabetes",
        diet_name: "Diabetes & Glycemic Blood Sugar Control",
        excluded_ingredients: "White refined sugar, excessive white flour, full-sugar sodas, high-GI white bread",
        allowed_substitutes: "Ofada Rice, Brown Honey Beans, Ugu Leaves, Unripe Plantain, Bitterleaf, Date Powder",
        notes: "Prioritize high-fiber legumes (Honey Beans) and chromium-rich leafy greens (Ugu, Bitterleaf) to stabilize blood glucose."
      },
      {
        diet_rule_id: "diet-hypertension",
        diet_name: "Hypertension & Low Sodium Heart Health",
        excluded_ingredients: "Excessive table salt, high-sodium bouillon cubes, heavily salted dry fish, processed meats",
        allowed_substitutes: "Garlic, Ginger, Sweet Tatashe, Scent Leaves (Efirin), Fresh Catfish, Fermented Locust Beans (Iru)",
        notes: "Use potassium-packed vegetables (Ugu, Garden egg) and natural aromatic herbs instead of excess salt."
      },
      {
        diet_rule_id: "diet-pregnancy",
        diet_name: "Pregnancy & Fetal Neural Development",
        excluded_ingredients: "Uncooked meats, unpasteurized dairy, excessive unboiled herbs, high-mercury predatory fish",
        allowed_substitutes: "Fresh Ugu (high iron), Crayfish (amino acids), Honey Beans (folate), Fresh Tomatoes (Vitamin C)",
        notes: "Ensure complete protein synthesis and folate-rich legumes for fetal neural development."
      },
      {
        diet_rule_id: "diet-vegan",
        diet_name: "Strict Nigerian Vegan / Plant-Based Diet",
        excluded_ingredients: "Cow Meat, Goat Meat, Chicken, Catfish, Crayfish, Stockfish, Eggs, Dairy, Gelatin",
        allowed_substitutes: "Iru (Locust Beans), Soya Chunks, Dried Mushrooms, Brown Beans, Groundnut oil, Pure Palm Oil",
        notes: "Ensure adequate plant-based protein combinations like Beans + Rice, Akara + Pap, or Moi Moi with mushrooms."
      },
      {
        diet_rule_id: "diet-postpartum",
        diet_name: "Postpartum Healing & Lactation (Omugwo Diet)",
        excluded_ingredients: "Heavy greasy fried foods, hard alcohol, cold sodas",
        allowed_substitutes: "Ofe Nsala (White Soup), Ji Mmiri Oku (Yam Pepper Soup with Uda/Ehuru), Utazi leaves, Fresh Catfish",
        notes: "Traditional Igbo and Nigerian postpartum broth stimulates uterine involution and boosts breast milk production."
      },
      {
        diet_rule_id: "diet-weightloss",
        diet_name: "Low Carb & Weight Management",
        excluded_ingredients: "Heavy starch swallows (Eba, Semo), deep fried snacks, refined sugars",
        allowed_substitutes: "Cabbage Swallow, Cauliflower/Eggplant swallow, Efo Riro with lean fish, Okro Soup, Grilled Suya Chicken",
        notes: "Focus on high volume vegetable soups (Efo Riro, Okro) packed with lean proteins and zero heavy carbs."
      },
      {
        diet_rule_id: "diet-kidney-care",
        diet_name: "Kidney Health & Low Potash Care",
        excluded_ingredients: "Food potash (Kaun/Akanwu), excessive high-sodium seasonings, processed canned meats",
        allowed_substitutes: "Baking soda (small pinch), Fresh onions, Garlic, Fresh chicken, Fresh fish",
        notes: "Avoid direct consumption of raw food potash (akanwu) to protect renal filtration and glomerular health."
      },
      {
        diet_rule_id: "diet-gerd",
        diet_name: "Acid Reflux & GERD / Stomach Ulcer Care",
        excluded_ingredients: "Excessive habanero (ata rodo), raw garlic, deep-fried greasy foods, excessive citrus",
        allowed_substitutes: "Sweet bell peppers (tatashe), Boiled sweet potatoes, Honey beans, Steamed moi moi, Pap (ogi)",
        notes: "Prepare mild, soothing meals without harsh chili peppers to prevent gastroesophageal irritation."
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

      // Sync into admin_dietary_rules for Admin UI
      await pool.query(`
        INSERT INTO admin_dietary_rules (condition, rule_text, tags, priority, is_active)
        VALUES ($1, $2, $3, 5, true)
        ON CONFLICT (condition) DO UPDATE SET
          rule_text = EXCLUDED.rule_text,
          tags = EXCLUDED.tags
      `, [d.diet_name, d.notes, d.excluded_ingredients.slice(0, 100)]);
    }
    console.log(`✅ Seeded ${dietaryData.length} Dietary Guidelines.`);

    // ═════════════════════════════════════════════════════════════════════════
    // 7. SEED ALLERGY RULES (12+ Critical Hard Filters)
    // ═════════════════════════════════════════════════════════════════════════
    const allergyData = [
      {
        allergy_id: "all-shellfish-crustacean",
        allergy_name: "Shellfish & Crustacean Allergy",
        excluded_item: "Ground Crayfish, Prawns, Shrimps, Periwinkles (Isam), Crabs, Lobsters",
        action_type: "Hard Filter",
        substitution_guidance: "Replace with dried shiitake mushrooms + fermented locust beans (Iru) for savory seafood-free umami.",
        safety_note: "CRITICAL: Never bundle crayfish or periwinkles if customer flags crustacean allergy."
      },
      {
        allergy_id: "all-peanut-groundnut",
        allergy_name: "Peanut / Groundnut Allergy",
        excluded_item: "Groundnut Oil, Suya Spice with kuli-kuli, Peanut Butter, Roasted Groundnuts",
        action_type: "Hard Filter",
        substitution_guidance: "Use Sunflower Oil, Pure Palm Oil, or Olive Oil. Use nut-free suya spice mix.",
        safety_note: "Ensure traditional suya spices are verified 100% free of peanut flour."
      },
      {
        allergy_id: "all-gluten-wheat",
        allergy_name: "Gluten & Wheat Intolerance (Celiac)",
        excluded_item: "Golden Penny Semovita, Wheat Flour, Breadcrumbs, Egg Noodles",
        action_type: "Hard Filter",
        substitution_guidance: "Substitute with Ayoola Poundo Yam, Garri (Ijebu), Plantain Flour, or Ofada Rice.",
        safety_note: "Offer 100% cassava, yam, or plantain swallows instead of grain wheat."
      },
      {
        allergy_id: "all-lactose-dairy",
        allergy_name: "Lactose & Cow Dairy Intolerance",
        excluded_item: "Cow Milk, Evaporated Milk, Butter, Cheese, Dairy Cream",
        action_type: "Hard Filter",
        substitution_guidance: "Use freshly extracted Tiger Nut Milk (Kunun Aya), Soy Milk, or Coconut Milk.",
        safety_note: "Safe for custard, tea, porridge, and baking."
      },
      {
        allergy_id: "all-fish-finfish",
        allergy_name: "Finfish Allergy",
        excluded_item: "Smoked Catfish, Fresh Catfish, Tilapia, Stockfish (Panla/Cod), Titus Mackerel",
        action_type: "Hard Filter",
        substitution_guidance: "Replace with Chicken Breast, Tender Beef Cuts, Boiled Eggs, or Soya Chunks.",
        safety_note: "Ensure soup broths do not contain fish stock or dried fish flaking."
      },
      {
        allergy_id: "all-egg",
        allergy_name: "Egg Allergy",
        excluded_item: "Boiled Eggs, Raw Eggs, Egg Wash, Mayonnaise with egg base",
        action_type: "Hard Filter",
        substitution_guidance: "Omit boiled eggs from Moi Moi, Salad, and Fried Rice. Use egg-free dressings.",
        safety_note: "Check packaged salad dressings and party trays."
      },
      {
        allergy_id: "all-soy-legume",
        allergy_name: "Soybean & Legume Allergy",
        excluded_item: "Soy Sauce, Soya Chunks, Soya Milk, Tofu (Awara)",
        action_type: "Hard Filter",
        substitution_guidance: "Use real beef, chicken, or fish; replace soy sauce with Worcestershire or fermented broth.",
        safety_note: "Verify seasoning cube ingredients for hydrolyzed soy protein."
      },
      {
        allergy_id: "all-msg-sensitivity",
        allergy_name: "MSG & Monosodium Glutamate Sensitivity",
        excluded_item: "Synthetic MSG crystals, high-MSG seasoning powders",
        action_type: "Hard Filter",
        substitution_guidance: "Use whole locust beans (Iru), garlic, ginger, onions, and slow-simmered bone broth.",
        safety_note: "Offer all-natural spice bundles without artificial flavor enhancers."
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
    console.log(`✅ Seeded ${allergyData.length} Allergy Safety Rules.`);

    // ═════════════════════════════════════════════════════════════════════════
    // 8. SEED SMART RECOMMENDATIONS & PRODUCT PAIRINGS
    // ═════════════════════════════════════════════════════════════════════════
    const recsData = [
      {
        title: "Party Jollof Feast Side Pairing",
        trigger_condition: "Customer orders Rice, Tatashe, or Jollof ingredients",
        recommended_items: "Ripe Plantain (Dodo), Fresh Salad Greens, Bama Mayonnaise, Fresh Chicken",
        context_tags: "Party, Weekend, Lunch, National Favorite",
        priority: 10
      },
      {
        title: "Egusi Soup Swallow Pairing",
        trigger_condition: "Customer orders Egusi, Ugu, or Soup ingredients",
        recommended_items: "Ayoola Poundo Yam, Golden Penny Semovita, Smoked Catfish, Pure Palm Oil",
        context_tags: "Dinner, Swallow, Family Comfort",
        priority: 9
      },
      {
        title: "Sweet Beans & Dodo Combo",
        trigger_condition: "Customer orders Honey Beans or Brown Beans",
        recommended_items: "Ripe Plantain (Dodo), Garri (Ijebu), Pure Red Palm Oil, Titus Sardines",
        context_tags: "High Protein, Staple, Energy Lunch",
        priority: 9
      },
      {
        title: "Aromatic Pepper Soup Spices & Sides",
        trigger_condition: "Customer orders Catfish, Goat Meat, or Pepper Soup ingredients",
        recommended_items: "Calabash Nutmeg (Ehuru), Uda Pods, Fresh Scent Leaves (Efirin), Agidi / Eko",
        context_tags: "Comfort, Spicy, Recovery, Late Night",
        priority: 8
      },
      {
        title: "Sunday Fried Rice Deluxe Mix",
        trigger_condition: "Customer orders Parboiled Rice or Curry & Thyme",
        recommended_items: "Sweet Corn, Green Peas, Fresh Carrots, Chicken Gizzards, Vegetable Oil",
        context_tags: "Sunday Lunch, Celebrations",
        priority: 8
      },
      {
        title: "Designer Ofada & Ayamase Accompaniments",
        trigger_condition: "Customer orders Ofada Rice or Green Rodo",
        recommended_items: "Locust Beans (Iru), Bleached Palm Oil, Assorted Meats (Shaki/Kpomo), Boiled Eggs",
        context_tags: "Gourmet, Traditional Lunch",
        priority: 7
      },
      {
        title: "Delta Banga & Yellow Starch Banquet",
        trigger_condition: "Customer orders Banga Paste or Palm Fruit Concentrate",
        recommended_items: "Edible Yellow Starch, Fresh River Catfish, Banga Spices, Periwinkles",
        context_tags: "Niger Delta, Coastal Banquet",
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
    console.log(`✅ Seeded ${recsData.length} Smart Upsell Recommendations.`);

    console.log("🎉 ALL COMPREHENSIVE CULINARY KNOWLEDGE DATA SEEDED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
