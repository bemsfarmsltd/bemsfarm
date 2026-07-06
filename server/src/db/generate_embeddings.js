const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!GEMINI_API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY is not defined in your server/.env file!");
  console.log("\n💡 For Dummies Instruction:");
  console.log("1. Get a free Gemini API Key from Google AI Studio (https://aistudio.google.com/)");
  console.log("2. Open the file 'C:\\Users\\USER\\OneDrive\\Documents\\frutella\\server\\.env' in your editor");
  console.log("3. Add this line at the bottom:");
  console.log("   GEMINI_API_KEY=your_actual_api_key_here");
  console.log("\n🧪 Offline / Local Testing Option:");
  console.log("If you do not have a key yet and want to test the vector search offline, add:");
  console.log("   GEMINI_API_KEY=MOCK");
  console.log("to your server/.env, and we will generate mock vector numbers for you!");
  process.exit(1);
}

const isMock = GEMINI_API_KEY === "MOCK";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false
});

async function getEmbedding(text) {
  if (isMock) {
    // Generate a deterministic or random 768 float array for offline testing
    const mockVector = [];
    // Use character codes of the text to seed a simple deterministic pseudo-random number generator
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
      seed += text.charCodeAt(i);
    }
    for (let i = 0; i < 768; i++) {
      // Deterministic floats between -1.0 and 1.0
      const val = Math.sin(seed + i) * 0.5;
      mockVector.push(val);
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
        parts: [{ text }]
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Embedding API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;
  if (!values) {
    throw new Error("Gemini Embedding API response format mismatch (missing embedding.values)");
  }
  
  return values;
}

// Convert a vector array [0.1, 0.2, ...] to pgvector format '[0.1, 0.2, ...]'
function toPgVectorString(arr) {
  return `[${arr.join(",")}]`;
}

async function runSeeding() {
  if (isMock) {
    console.log("🧪 Running in MOCK Mode — no actual API calls will be made to Google.");
  }
  
  console.log("Connecting to Database...");
  const client = await pool.connect();
  
  try {
    console.log("Fetching all products...");
    const productsRes = await client.query("SELECT id, name, description FROM products");
    const products = productsRes.rows;
    console.log(`Found ${products.length} products. Generating embeddings...`);
    
    for (const product of products) {
      // Build a search description by joining name and description
      const searchContext = `Product: ${product.name}. Description: ${product.description || ""}`;
      
      console.log(`🤖 Generating embedding for "${product.name}"...`);
      try {
        const embedding = await getEmbedding(searchContext);
        const vectorStr = toPgVectorString(embedding);
        
        await client.query("UPDATE products SET embedding = $1 WHERE id = $2", [vectorStr, product.id]);
        console.log(`   ✅ Saved embedding for product ID ${product.id}`);
      } catch (err) {
        console.error(`   ❌ Failed to generate embedding for "${product.name}":`, err.message);
      }
      
      if (!isMock) {
        // Rate limit safety sleep
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log("🎉 Embedding generation completed successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

runSeeding();
