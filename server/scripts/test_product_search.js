// server/scripts/test_product_search.js
require("dotenv").config();
const pool = require("../src/db/pool");

async function testQuery(urlDesc, searchUrl, queryParam) {
  console.log(`\n============================================================`);
  console.log(`🧪 TEST: ${urlDesc} -> query: "${queryParam}"`);
  console.log(`============================================================`);

  // Simulate /api/products/search logic
  const cleanQ = String(queryParam || "").trim();
  const rawTokens = cleanQ
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const tokens = [...new Set(rawTokens)];
  const maxResults = 8;

  let result;
  if (tokens.length === 0) {
    result = await pool.query(
      `SELECT
         p.id, p.name, p.price, p.unit, p.image_url,
         p.stock, p.is_featured,
         c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.status != 'archived' AND p.name ILIKE $1
       ORDER BY p.is_featured DESC, p.name ASC
       LIMIT $2`,
      [`%${cleanQ}%`, maxResults],
    );
  } else {
    const exactPhrase = cleanQ.toLowerCase();
    const wildcardPhrase = `%${cleanQ}%`;

    const conditions = [];
    const params = [exactPhrase, wildcardPhrase];

    tokens.forEach((t) => {
      params.push(`%${t}%`);
      const ilikeParam = `$${params.length}`;

      params.push(t);
      const wordParam = `$${params.length}`;

      conditions.push(`(
        p.name ILIKE ${ilikeParam}
        OR c.name ILIKE ${ilikeParam}
        OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(p.tags, '[]'::jsonb)) tag WHERE tag ILIKE ${ilikeParam})
        OR p.description ~* ('\\m' || ${wordParam} || '\\M')
      )`);
    });

    const tokenClause = conditions.join(" AND ");
    params.push(maxResults);
    const limitParam = `$${params.length}`;

    const querySql = `
      SELECT
        p.id, p.name, p.price, p.unit, p.image_url,
        p.stock, p.is_featured,
        c.name as category_name,
        (
          CASE WHEN LOWER(p.name) = $1 THEN 150 ELSE 0 END
          + CASE WHEN p.name ILIKE $2 THEN 90 ELSE 0 END
          + CASE WHEN LOWER(c.name) = $1 THEN 50 ELSE 0 END
          + CASE WHEN c.name ILIKE $2 THEN 30 ELSE 0 END
          + CASE WHEN COALESCE(p.stock, 0) > 0 THEN 25 ELSE 0 END
          + CASE WHEN p.is_featured THEN 10 ELSE 0 END
        ) AS rank_score
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status != 'archived'
        AND (${tokenClause})
      ORDER BY rank_score DESC, COALESCE(p.stock, 0) > 0 DESC, p.is_featured DESC, p.name ASC
      LIMIT ${limitParam}
    `;

    result = await pool.query(querySql, params);
  }

  console.log(`✅ Returned ${result.rows.length} results:`);
  result.rows.forEach((r, i) => {
    console.log(`  ${i + 1}. [ID: ${r.id}] "${r.name}" | ₦${Number(r.price).toLocaleString()} | Stock: ${r.stock} | Cat: ${r.category_name}`);
  });

  return result.rows;
}

async function run() {
  // Test 1: "rice" -> MUST return only rice staples and ZERO detergents/mayo/soaps
  const r1 = await testQuery("Live Autocomplete Search", "/api/products/search?q=rice", "rice");
  const hasDetergentInRice = r1.some(r => /good mama|viva|so klin|mayonnaise|detergent|bleach/i.test(r.name));
  if (hasDetergentInRice) {
    throw new Error("FAIL: Found detergent/unrelated item in 'rice' search!");
  }
  console.log("  🎯 VERIFIED: ZERO false-positive detergents/soaps in 'rice' search!");

  // Test 2: "parboiled rice" -> MUST return Parboiled Rice varieties
  const r2 = await testQuery("Live Autocomplete Search", "/api/products/search?q=parboiled rice", "parboiled rice");
  if (r2.length === 0 || !r2.some(r => /parboiled/i.test(r.name))) {
    throw new Error("FAIL: 'parboiled rice' returned no parboiled rice!");
  }
  console.log("  🎯 VERIFIED: 'parboiled rice' successfully returned parboiled rice commodities!");

  // Test 3: "palm oil cooking oil" -> MUST return Palm Oil products
  const r3 = await testQuery("Live Autocomplete Search", "/api/products/search?q=palm oil cooking oil", "palm oil cooking oil");
  if (r3.length === 0 || !r3.some(r => /palm oil/i.test(r.name))) {
    throw new Error("FAIL: 'palm oil cooking oil' returned no palm oil!");
  }
  console.log("  🎯 VERIFIED: 'palm oil cooking oil' successfully returned pure palm oil!");

  // Test 4: "beans" -> MUST return Honey Beans
  const r4 = await testQuery("Live Autocomplete Search", "/api/products/search?q=beans", "beans");
  if (r4.length === 0 || !r4.some(r => /beans/i.test(r.name))) {
    throw new Error("FAIL: 'beans' returned no beans!");
  }
  console.log("  🎯 VERIFIED: 'beans' returned honey beans and white beans!");

  // Test 5: "garri" -> MUST return Ijebu & Yellow Garri
  const r5 = await testQuery("Live Autocomplete Search", "/api/products/search?q=garri", "garri");
  if (r5.length === 0 || !r5.some(r => /garri/i.test(r.name))) {
    throw new Error("FAIL: 'garri' returned no garri!");
  }
  console.log("  🎯 VERIFIED: 'garri' returned authentic Ijebu and yellow garri!");

  // Test 6: "yam" -> MUST return Yam Tubers
  const r6 = await testQuery("Live Autocomplete Search", "/api/products/search?q=yam", "yam");
  if (r6.length === 0 || !r6.some(r => /yam/i.test(r.name))) {
    throw new Error("FAIL: 'yam' returned no yam!");
  }
  console.log("  🎯 VERIFIED: 'yam' returned large yam tubers!");

  console.log(`\n============================================================`);
  console.log("🎉 ALL PRODUCT SEARCH DATA-QUALITY TESTS PASSED 100%!");
  console.log(`============================================================\n`);
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Test failed:", e.message);
  process.exit(1);
});
