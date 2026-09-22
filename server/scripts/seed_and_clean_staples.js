// server/scripts/seed_and_clean_staples.js
require("dotenv").config();
const pool = require("../src/db/pool");

async function main() {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting database cleanup and staple commodity seeding...");
    await client.query("BEGIN");

    // 1. Clean up existing product descriptions
    console.log("🧹 1. Cleansing internal inventory audit notes from product descriptions...");
    await client.query(`
      UPDATE products
      SET description = CASE
        WHEN name ILIKE '%good mama%' OR name ILIKE '%viva plus%' OR name ILIKE '%so klin%' THEN 'High-performance laundry and household cleaning detergent for deep stain removal.'
        WHEN name ILIKE '%mayonnaise%' OR name ILIKE '%bama%' OR name ILIKE '%whippy%' THEN 'Rich and creamy premium mayonnaise spread for sandwiches, salads, and meals.'
        WHEN name ILIKE '%custard%' OR name ILIKE '%checkers%' THEN 'Smooth and delicious fortified custard powder with rich flavor.'
        WHEN name ILIKE '%milo%' OR name ILIKE '%milk%' OR name ILIKE '%cowbell%' OR name ILIKE '%peak%' OR name ILIKE '%ovaltine%' THEN 'Nutritious beverage and dairy staple packed with vitamins and minerals.'
        WHEN name ILIKE '%sardine%' OR name ILIKE '%geisha%' OR name ILIKE '%titus%' THEN 'High-protein canned fish in rich seasoned tomato sauce or oil.'
        WHEN name ILIKE '%noodles%' OR name ILIKE '%spaghetti%' OR name ILIKE '%semovita%' OR name ILIKE '%wheat%' OR name ILIKE '%poundo%' THEN 'Premium grain, pasta, and swallow food for family meals.'
        WHEN name ILIKE '%salt%' THEN 'Pure iodized granulated table and cooking salt for everyday meals.'
        WHEN name ILIKE '%sugar%' THEN 'Refined pure white granulated sugar for baking and beverages.'
        WHEN name ILIKE '%tomatoes%' OR name ILIKE '%sonia%' OR name ILIKE '%gino%' OR name ILIKE '%native%' THEN 'Rich concentrated tomato and pepper paste blend for flavorful stews and jollof.'
        WHEN name ILIKE '%thyme%' OR name ILIKE '%curry%' OR name ILIKE '%maggi%' OR name ILIKE '%knorr%' OR name ILIKE '%royco%' OR name ILIKE '%terra%' OR name ILIKE '%seasoning%' THEN 'Aromatic food seasoning and spice blend to enrich soups, rice, and meats.'
        WHEN name ILIKE '%oil%' THEN 'High-quality pure cooking oil for frying, cooking, and roasting.'
        WHEN name ILIKE '%hypo%' THEN 'Effective disinfectant and multi-surface household bleach.'
        WHEN name ILIKE '%soap%' THEN 'Cleansing and refreshing bar soap for laundry and household wash.'
        WHEN name ILIKE '%egg%' THEN 'Farm-fresh healthy poultry eggs rich in protein.'
        ELSE 'Quality farm produce and grocery staple from Bems Farms Ltd.'
      END
      WHERE description ILIKE '%recorded:%' OR description ILIKE '%price per single piece%' OR description ILIKE '%source: page%'
    `);

    // 2. Ensure essential categories exist
    console.log("📂 2. Verifying and synchronizing product categories...");
    const requiredCategories = [
      { id: 1, name: "Grains & Cereals", icon: "🌾", description: "Premium rice, maize, wheat, and whole grains." },
      { id: 2, name: "Vegetables", icon: "🥬", description: "Fresh farm-harvested vegetables, peppers, and tomatoes." },
      { id: 3, name: "Cooking Oils", icon: "🛢️", description: "Pure red palm oil, vegetable oil, soya oil, and groundnut oil." },
      { id: 4, name: "Legumes", icon: "🫘", description: "Honey beans (Oloyin), white beans, brown beans, and peas." },
      { id: 5, name: "Tubers & Roots", icon: "🥔", description: "Fresh yam tubers, cassava, sweet potatoes, and plantains." },
      { id: 6, name: "Spices & Seasonings", icon: "🌶️", description: "Aromatic herbs, curry, thyme, peppers, and seasonings." },
      { id: 15, name: "Cooking Oil", icon: "🛢️", description: "Pure red palm oil and refined vegetable cooking oils." },
      { id: 18, name: "Grains & Pasta", icon: "🍝", description: "Rice, spaghetti, noodles, semovita, and wheat flour." },
      { id: 25, name: "Farm Produce", icon: "🌱", description: "Fresh harvest directly from Bems Farms." }
    ];

    for (const cat of requiredCategories) {
      await client.query(`
        INSERT INTO categories (id, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name, description = EXCLUDED.description
      `, [cat.id, cat.name, cat.description]);
    }

    // 3. Staple Products to Seed / Upsert
    console.log("🌾 3. Seeding Nigerian staple commodities (Rice, Palm Oil, Beans, Garri, Yam, Plantains)...");
    const staples = [
      // ─── RICE COMMODITIES ───
      {
        name: "50kg Royal Stallion Parboiled Rice",
        price: 75000.00,
        unit_price: 75000.00,
        cost_price: 68000.00,
        unit: "50 kg bag",
        description: "Premium grade stone-free long grain parboiled rice. Easy to cook, non-sticky, and ideal for jollof, fried rice, and large celebrations.",
        is_featured: true,
        category_id: 1,
        stock: 50,
        stock_quantity: 50,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "parboiled", "parboiled-rice", "staple", "grain", "50kg", "stallion", "white-rice"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },
      {
        name: "25kg Mama Gold Parboiled Rice",
        price: 38500.00,
        unit_price: 38500.00,
        cost_price: 35000.00,
        unit: "25 kg bag",
        description: "Finest quality Nigerian parboiled long grain rice. Stone-free, delicious texture, perfect for home cooking and events.",
        is_featured: true,
        category_id: 1,
        stock: 65,
        stock_quantity: 65,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "parboiled", "parboiled-rice", "staple", "grain", "25kg", "mama-gold", "white-rice"],
        image_url: "https://images.unsplash.com/photo-1536304993881-ff86e0c9dbe8?w=600&q=80"
      },
      {
        name: "10kg Premium Parboiled Long Grain Rice",
        price: 16000.00,
        unit_price: 16000.00,
        cost_price: 14200.00,
        unit: "10 kg bag",
        description: "Convenient 10kg pack of premium parboiled rice. Clean, stone-free, perfectly milled for everyday delicious meals.",
        is_featured: true,
        category_id: 1,
        stock: 80,
        stock_quantity: 80,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "parboiled", "parboiled-rice", "staple", "grain", "10kg", "white-rice"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },
      {
        name: "5kg Premium Parboiled Long Grain Rice",
        price: 8200.00,
        unit_price: 8200.00,
        cost_price: 7200.00,
        unit: "5 kg bag",
        description: "5kg bag of premium long grain parboiled rice. Fluffy, firm, and stone-free for quick family meals.",
        is_featured: false,
        category_id: 1,
        stock: 120,
        stock_quantity: 120,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "parboiled", "parboiled-rice", "staple", "grain", "5kg", "white-rice"],
        image_url: "https://images.unsplash.com/photo-1536304993881-ff86e0c9dbe8?w=600&q=80"
      },
      {
        name: "1kg Premium Parboiled Rice",
        price: 1750.00,
        unit_price: 1750.00,
        cost_price: 1450.00,
        unit: "1 kg bag",
        description: "Top quality 1kg parboiled long-grain rice. Firm, easy to boil, and stone-free.",
        is_featured: false,
        category_id: 1,
        stock: 250,
        stock_quantity: 250,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "parboiled", "parboiled-rice", "staple", "grain", "1kg", "white-rice"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },
      {
        name: "5kg Royal Basmati White Rice",
        price: 14500.00,
        unit_price: 14500.00,
        cost_price: 12800.00,
        unit: "5 kg bag",
        description: "Aromatic extra-long grain Royal Basmati white rice. Fragrant, slender grains that elongate when cooked.",
        is_featured: true,
        category_id: 1,
        stock: 60,
        stock_quantity: 60,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "basmati", "basmati-rice", "white-rice", "aromatic", "grain", "5kg"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },
      {
        name: "1kg Royal Basmati White Rice",
        price: 3200.00,
        unit_price: 3200.00,
        cost_price: 2700.00,
        unit: "1 kg bag",
        description: "Premium fragrant Basmati rice. Delicately aged, slender long grain, perfect for special dishes.",
        is_featured: false,
        category_id: 1,
        stock: 150,
        stock_quantity: 150,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "basmati", "basmati-rice", "white-rice", "aromatic", "grain", "1kg"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },
      {
        name: "1kg Ofada Rice (Local Unpolished Brown Rice)",
        price: 2800.00,
        unit_price: 2800.00,
        cost_price: 2300.00,
        unit: "1 kg bag",
        description: "Authentic Nigerian Ofada rice. Short-grain unpolished rice rich in natural fiber with signature aromatic aroma for ayamase sauce.",
        is_featured: true,
        category_id: 1,
        stock: 140,
        stock_quantity: 140,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "ofada", "ofada-rice", "brown-rice", "local-rice", "grain", "staple"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },
      {
        name: "1kg Abakaliki Long Grain Rice",
        price: 2400.00,
        unit_price: 2400.00,
        cost_price: 2000.00,
        unit: "1 kg bag",
        description: "Authentic Ebonyi State Abakaliki rice. Cleanly de-stoned, natural nutrient-rich white rice.",
        is_featured: false,
        category_id: 1,
        stock: 180,
        stock_quantity: 180,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "abakaliki", "local-rice", "white-rice", "grain", "staple", "ebonyi"],
        image_url: "https://images.unsplash.com/photo-1536304993881-ff86e0c9dbe8?w=600&q=80"
      },
      {
        name: "1kg Local Nigerian White Rice",
        price: 2100.00,
        unit_price: 2100.00,
        cost_price: 1750.00,
        unit: "1 kg bag",
        description: "Freshly harvested and milled Nigerian white rice. Stone-free, nutritious, and affordable.",
        is_featured: false,
        category_id: 1,
        stock: 200,
        stock_quantity: 200,
        status: "active",
        available_for_sale: true,
        tags: ["rice", "white-rice", "local-rice", "grain", "staple"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },

      // ─── PALM OIL & COOKING OILS ───
      {
        name: "Pure Red Palm Oil (5 Liters)",
        price: 13500.00,
        unit_price: 13500.00,
        cost_price: 11500.00,
        unit: "5 Liters Jerrycan",
        description: "100% unadulterated cold-pressed traditional red palm oil. Thick, deeply aromatic, free from artificial additives, perfect for soups, stews, and native delicacies.",
        is_featured: true,
        category_id: 3,
        stock: 75,
        stock_quantity: 75,
        status: "active",
        available_for_sale: true,
        tags: ["palm-oil", "oil", "red-oil", "cooking-oil", "palm", "5-liters", "native-oil", "staple"],
        image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80"
      },
      {
        name: "Pure Red Palm Oil (2 Liters)",
        price: 5800.00,
        unit_price: 5800.00,
        cost_price: 4900.00,
        unit: "2 Liters Bottle",
        description: "High quality pure red palm oil in a convenient 2-liter tamper-proof bottle. Rich in beta-carotene and natural taste.",
        is_featured: false,
        category_id: 3,
        stock: 90,
        stock_quantity: 90,
        status: "active",
        available_for_sale: true,
        tags: ["palm-oil", "oil", "red-oil", "cooking-oil", "palm", "2-liters", "native-oil"],
        image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80"
      },
      {
        name: "Pure Red Palm Oil (1 Liter)",
        price: 3000.00,
        unit_price: 3000.00,
        cost_price: 2500.00,
        unit: "1 Liter Bottle",
        description: "Fresh natural red palm oil directly from Eastern palm plantations. Unadulterated and rich aroma.",
        is_featured: false,
        category_id: 3,
        stock: 120,
        stock_quantity: 120,
        status: "active",
        available_for_sale: true,
        tags: ["palm-oil", "oil", "red-oil", "cooking-oil", "palm", "1-liter", "native-oil"],
        image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80"
      },
      {
        name: "Pure Red Palm Oil (25 Liters)",
        price: 62000.00,
        unit_price: 62000.00,
        cost_price: 55000.00,
        unit: "25 Liters Jerrycan",
        description: "Bulk 25-liter jerrycan of pure unadulterated red palm oil for restaurants, catering, and large families.",
        is_featured: true,
        category_id: 3,
        stock: 25,
        stock_quantity: 25,
        status: "active",
        available_for_sale: true,
        tags: ["palm-oil", "oil", "red-oil", "cooking-oil", "palm", "25-liters", "bulk", "native-oil"],
        image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80"
      },
      {
        name: "Pure Groundnut Cooking Oil (5 Liters)",
        price: 15500.00,
        unit_price: 15500.00,
        cost_price: 13500.00,
        unit: "5 Liters Can",
        description: "Pure refined peanut / groundnut oil with high smoke point for crispy frying and healthy cooking.",
        is_featured: false,
        category_id: 3,
        stock: 45,
        stock_quantity: 45,
        status: "active",
        available_for_sale: true,
        tags: ["groundnut-oil", "peanut-oil", "oil", "cooking-oil", "vegetable-oil", "5-liters"],
        image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80"
      },

      // ─── BEANS & LEGUMES ───
      {
        name: "Honey Beans (Oloyin) 1kg",
        price: 2800.00,
        unit_price: 2800.00,
        cost_price: 2300.00,
        unit: "1 kg bag",
        description: "Sweet naturally honey-flavored brown beans (Ewa Oloyin). Tender, fast cooking, ideal for bean porridge, moi moi, and akara.",
        is_featured: true,
        category_id: 4,
        stock: 140,
        stock_quantity: 140,
        status: "active",
        available_for_sale: true,
        tags: ["beans", "honey-beans", "oloyin", "ewa", "legumes", "protein", "1kg"],
        image_url: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&q=80"
      },
      {
        name: "Honey Beans (Oloyin) 5kg",
        price: 13500.00,
        unit_price: 13500.00,
        cost_price: 11500.00,
        unit: "5 kg bag",
        description: "5kg sack of premium sweet Oloyin honey beans. Stone-free and high protein.",
        is_featured: false,
        category_id: 4,
        stock: 60,
        stock_quantity: 60,
        status: "active",
        available_for_sale: true,
        tags: ["beans", "honey-beans", "oloyin", "ewa", "legumes", "protein", "5kg"],
        image_url: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&q=80"
      },
      {
        name: "White Beans (Black-eyed Peas) 1kg",
        price: 2500.00,
        unit_price: 2500.00,
        cost_price: 2100.00,
        unit: "1 kg bag",
        description: "Clean white beans (black-eyed peas), perfectly dried and weevil-free for cooking, moi moi, and rice pairings.",
        is_featured: false,
        category_id: 4,
        stock: 110,
        stock_quantity: 110,
        status: "active",
        available_for_sale: true,
        tags: ["beans", "white-beans", "black-eyed-peas", "legumes", "protein", "1kg"],
        image_url: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&q=80"
      },

      // ─── GARRI & TUBERS ───
      {
        name: "Ijebu Garri (Crispy & Sour) 1kg",
        price: 1800.00,
        unit_price: 1800.00,
        cost_price: 1400.00,
        unit: "1 kg bag",
        description: "Authentic fine-grain crunchy Ijebu Garri. Tangy and pleasant sour kick, perfect for soaking with ice water, groundnuts, or making eba.",
        is_featured: true,
        category_id: 1,
        stock: 160,
        stock_quantity: 160,
        status: "active",
        available_for_sale: true,
        tags: ["garri", "ijebu-garri", "cassava", "swallow", "staple", "1kg"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },
      {
        name: "Yellow Garri (With Palm Oil) 1kg",
        price: 1600.00,
        unit_price: 1600.00,
        cost_price: 1300.00,
        unit: "1 kg bag",
        description: "Traditional yellow cassava garri processed with pure palm oil. Smooth texture, perfect for delicious eba.",
        is_featured: false,
        category_id: 1,
        stock: 150,
        stock_quantity: 150,
        status: "active",
        available_for_sale: true,
        tags: ["garri", "yellow-garri", "cassava", "eba", "swallow", "staple", "1kg"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },
      {
        name: "White Garri 5kg Paint Bucket",
        price: 7200.00,
        unit_price: 7200.00,
        cost_price: 6000.00,
        unit: "5 kg bucket",
        description: "5kg bucket of clean, well-sieved white cassava garri for family consumption.",
        is_featured: false,
        category_id: 1,
        stock: 50,
        stock_quantity: 50,
        status: "active",
        available_for_sale: true,
        tags: ["garri", "white-garri", "cassava", "eba", "swallow", "5kg", "staple"],
        image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
      },
      {
        name: "Large Yam Tuber (Abakaliki / Benue Yam)",
        price: 3500.00,
        unit_price: 3500.00,
        cost_price: 2800.00,
        unit: "1 Tuber",
        description: "Freshly harvested large mature white yam tuber. Dry, starchy, delicious for pounded yam, boiled yam, roasted yam, or yam porridge.",
        is_featured: true,
        category_id: 5,
        stock: 90,
        stock_quantity: 90,
        status: "active",
        available_for_sale: true,
        tags: ["yam", "tuber", "ji", "pounded-yam", "farm-produce", "staple"],
        image_url: "https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?w=600&q=80"
      },
      {
        name: "Fresh Plantain Bunch (Unripe / Semi-Ripe)",
        price: 4200.00,
        unit_price: 4200.00,
        cost_price: 3400.00,
        unit: "1 Bunch",
        description: "Fresh farm-cut plantain bunch. Great for dodo, plantain chips, or healthy boiled unripe plantain porridge.",
        is_featured: false,
        category_id: 5,
        stock: 60,
        stock_quantity: 60,
        status: "active",
        available_for_sale: true,
        tags: ["plantain", "dodo", "unripe-plantain", "farm-produce", "tuber", "staple"],
        image_url: "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=600&q=80"
      },
      {
        name: "Fresh Farm Tomatoes (5kg Basket)",
        price: 8500.00,
        unit_price: 8500.00,
        cost_price: 7000.00,
        unit: "5 kg basket",
        description: "Firm, juicy fresh red tomatoes harvested directly from farm greenhouses. Ideal for hearty stews, jollof rice, and sauces.",
        is_featured: true,
        category_id: 2,
        stock: 80,
        stock_quantity: 80,
        status: "active",
        available_for_sale: true,
        tags: ["tomatoes", "fresh-tomatoes", "vegetables", "farm-produce", "stew", "fresh"],
        image_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80"
      },
      {
        name: "Fresh Scotch Bonnet Pepper (Rodo) 500g",
        price: 2200.00,
        unit_price: 2200.00,
        cost_price: 1700.00,
        unit: "500g pack",
        description: "Fiery fresh scotch bonnet peppers (Ata Rodo) packed with vibrant heat and flavor.",
        is_featured: false,
        category_id: 2,
        stock: 95,
        stock_quantity: 95,
        status: "active",
        available_for_sale: true,
        tags: ["pepper", "rodo", "scotch-bonnet", "spices", "vegetables", "fresh"],
        image_url: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&q=80"
      },
      {
        name: "Fresh Red Onions (1kg Bag)",
        price: 2000.00,
        unit_price: 2000.00,
        cost_price: 1600.00,
        unit: "1 kg bag",
        description: "Pungent and flavorful Nigerian red onions. Essential base ingredient for soups, stews, and cooking.",
        is_featured: false,
        category_id: 2,
        stock: 140,
        stock_quantity: 140,
        status: "active",
        available_for_sale: true,
        tags: ["onions", "red-onions", "vegetables", "farm-produce", "staple"],
        image_url: "https://images.unsplash.com/photo-1508747703725-719777637510?w=600&q=80"
      }
    ];

    for (const item of staples) {
      // Check if product already exists by exact name
      const existing = await client.query("SELECT id FROM products WHERE name = $1 LIMIT 1", [item.name]);
      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE products
          SET price = $1, unit_price = $2, cost_price = $3, unit = $4,
              description = $5, is_featured = $6, category_id = $7,
              stock = $8, stock_quantity = $9, status = $10,
              available_for_sale = $11, tags = $12::jsonb, image_url = $13,
              updated_at = NOW()
          WHERE id = $14
        `, [
          item.price, item.unit_price, item.cost_price, item.unit,
          item.description, item.is_featured, item.category_id,
          item.stock, item.stock_quantity, item.status,
          item.available_for_sale, JSON.stringify(item.tags), item.image_url,
          existing.rows[0].id
        ]);
        console.log(`  ↻ Updated existing staple: "${item.name}" (ID: ${existing.rows[0].id})`);
      } else {
        const ins = await client.query(`
          INSERT INTO products (
            name, price, unit_price, cost_price, unit, description,
            is_featured, category_id, stock, stock_quantity, status,
            available_for_sale, tags, image_url, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, NOW(), NOW())
          RETURNING id
        `, [
          item.name, item.price, item.unit_price, item.cost_price, item.unit,
          item.description, item.is_featured, item.category_id,
          item.stock, item.stock_quantity, item.status,
          item.available_for_sale, JSON.stringify(item.tags), item.image_url
        ]);
        console.log(`  ➕ Inserted new staple: "${item.name}" (ID: ${ins.rows[0].id})`);
      }
    }

    await client.query("COMMIT");
    console.log("✅ Database cleanup and staple commodity seeding completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding error:", err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
