const rawData = `1 55g Sonia Pepper & Onions	2 Cartons
2 55g Gino Pepper & Onions	2 Cartons
3 400g Tin Tomatoes (De Rica & Soup)	24 Tins (1 Carton)
4 210g Tin Tomatoes (Supergold & De Rica)	48 Tins (2 Cartons)
5 Big Bay Leaves	4 Sachets
6 Small Bay Leaves	4 Sachets
7 Big Dried Thyme	2 Sachets
8 Ama Wonda Jollof Rice	10 Rolls
9 Ama Wonda Fried Rice	10 Rolls
10 Ama Wonda Ginger & Garlic	10 Rolls
11 Ace Jollof Rice	10 Rolls
12 Napa Goat Seasoning	10 Rolls x 21
13 Gino Thyme	10 Rolls x 14
14 Tiger Thyme	10 Rolls x 8
15 Kings Oil 2 Liters	12 Cans
16 Terra Gold Oil 1000ml	18 Sachets
17 Devon Kings 500ml Oil	24 Sachets
18 Emperor 500ml Oil	24 Sachets
19 1Kg Salt Biggest Pack	1 Bag (20 pieces)
20 500g Salt Bigger Pack	27 Sachets
21 250g Salt Smallest Pack	40 Sachets
22 25Kg Super Delicieux Oil	4 Gallons
23 Power Oil 45ml Sachet	1 Carton (96 + 16 extra)
24 Power Oil 110ml Sachet	1 Carton (40 + 6 extra)
25 Activa 40ml Oil	2 Cartons
26 Masala Curry	3 Rolls
27 Whippy Mayonnaise Sachet	1 Roll
28 Crown Premium	2 Cartons
29 Crown Thick	1 Carton
30 Star Maggi	2 Cartons
31 5 Liters Emperor Oil	4 Cans (1 Carton)
32 5 Liters Kings Oil	8 Cans (2 Cartons)
33 5 Liters Golden Terra Oil (Promo Pack)	4 Cans (1 Carton)
34 5 Liters Golden Terra Oil (Normal)	4 Cans (1 Carton)
35 3 Liters Golden Terra Oil	12 Cans (2 Cartons)
36 3 Liters Emperor Oil	6 Cans (1 Carton)
37 1Kg Golden Penny Semovita	10 Sachets (1 Bag)
38 2Kg Golden Penny Semovita	5 Sachets (1 Bag)
39 Superpack Noodles	3 Cartons
40 Belleful Noodles	3 Cartons
41 Golden Penny Spaghetti	3 Cartons
42 Hungry Man Noodles	3 Cartons
43 Indomitables Noodles	2 Cartons
44 Minimie Noodles	1 Carton
45 Ric Spaghetti	1 Carton
46 Golden Penny Twist	3 Cartons
47 Royco	1 Carton
48 Knorr Chicken	1 Carton
49 Knorr (Normal)	1 Carton
50 Terra Chicken	1 Carton
51 Terra Gold	1 Carton
52 Terra Beef	1 Carton
53 1Kg Sonia Sachet Tomatoes	6 Sachets
54 210g Sonia Sachet Tomatoes	12 Sachets
55 40g Sonia Sachet Tomatoes	12 Sachets
56 210g Sonia Mix (Pepper/Onion)	12 Sachets
57 400g One Native Sachet Tomatoes	12 Sachets
58 55g Tasty Tom Sachet Tomatoes	2 Cartons
59 50g Gino Party Jollof	2 Cartons
60 55g Gino Tomatoes Sachet	2 Cartons
61 1.7Kg Viva Plus	1 Carton (4 Bags)
62 1.7Kg Good Mama	1 Carton (4 Bags)
63 800g Good Mama	1 Carton (6 + 1 extra)
64 250g Viva Plus	1 Carton (24 pieces)
65 1Kg Honeywell Wheat	1 Bag (10 Sachets)
66 2Kg Honeywell Wheat	1 Bag (5 Sachets)
67 1Kg Ayoola Poundo Yam	4 Pieces
68 2Kg Ayoola Poundo Yam	3 Pieces
69 So Klin 1.7Kg	2 Pieces
70 So Klin 800g	3 Pieces
71 Gino Curry	10 Rolls x 20
72 800g Viva Plus	7 Packets
73 Hypo Liquid 1 Liter	12 Bottles
74 Hypo Liquid 500ml	12 Bottles
75 20g Milo	200 (10 Rolls x 20 pieces)
76 Sonia Mix	2 Cartons
77 170g Good Mama	13 Sachets
78 170g So Klin	13 Sachets
79 170g Viva Plus	12 Sachets
80 226ml Bama	12 Bottles
81 245g Whippy Mayonnaise	STRUCK OUT IN ORIGINAL
82 Hypo Sachet	100 Sachets + 12 extra
83 2Kg Checkers Custard Vanilla	3 Pieces
84 2Kg Checkers Custard Banana	1 Piece
85 2Kg Checkers Custard Milk	2 Pieces
86 810ml Bama Mayonnaise	12 Bottles
87 910ml Whippy Mayonnaise	12 Bottles
88 400ml Whippy Mayonnaise	12 Bottles
89 245ml Whippy Mayonnaise	12 Bottles
90 226ml Bama Mayonnaise	12 Bottles
91 385ml Bama Mayonnaise	12 Bottles
92 Viva Plus Soap	24 Packets
93 Sachet 3-in-1 Checkers Custard	80 Packets
94 85g Good Mama Detergent	13 Rolls + 2 extra
95 80g Viva Plus Detergent	6 Rolls x 11 pieces (25 total)
96 Sachet Gino Hot Red Pepper Powder	90 Pieces
97 45g Vanilla Checkers Custard	8 Rolls x 4 + 1 (97 total)`.split('\n');

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:bemsfarms11223355!@db.helhpaybcjrxljizblve.supabase.co:5432/postgres'
});

async function parseAndSeed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log("1. Wiping old dummy products from catalogue, inventory, and products...");
    await client.query('DELETE FROM customer_cart_items');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM inventory');
    await client.query('DELETE FROM catalogue');
    await client.query('DELETE FROM products');
    console.log("Wiped old dummy data successfully.");

    let skuCounter = 1;
    for (const line of rawData) {
      if (!line.trim()) continue;

      let namePart = '';
      let qtyPart = '';
      
      const tabSplit = line.split('\t');
      if (tabSplit.length >= 2) {
         namePart = tabSplit[0];
         qtyPart = tabSplit.slice(1).join(' ').trim();
      } else {
         const match = line.match(/^(\d+)\s+(.+?)\s+(\d.*|STRUCK.*)$/);
         if (match) {
             namePart = match[1] + ' ' + match[2];
             qtyPart = match[3];
         }
      }

      // Cleanup namePart (remove leading number)
      let name = namePart.replace(/^\d+\s+/, '').trim();
      let rawQty = qtyPart;

      let stock = 0;
      let unit = rawQty;

      // Ambiguous quantity overrides per user approval
      if (rawQty.includes('10 Rolls x 21')) { stock = 210; unit = 'Rolls'; }
      else if (rawQty.includes('10 Rolls x 14')) { stock = 140; unit = 'Rolls'; }
      else if (rawQty.includes('10 Rolls x 8')) { stock = 80; unit = 'Rolls'; }
      else if (rawQty.includes('10 Rolls x 20 pieces')) { stock = 200; unit = 'Rolls/Pieces'; }
      else if (rawQty.includes('10 Rolls x 20')) { stock = 200; unit = 'Rolls'; }
      else if (rawQty.includes('STRUCK OUT')) { stock = 0; unit = 'Crossed Out'; }
      else if (rawQty.includes('1 Carton (6 + 1 extra)')) { stock = 7; unit = 'Carton'; }
      else if (rawQty.includes('6 Rolls x 11 pieces (25 total)')) { stock = 66; unit = 'Pieces'; }
      else if (rawQty.includes('8 Rolls x 4 + 1 (97 total)')) { stock = 97; unit = 'Pieces'; }
      else {
          // Attempt to pull leading number for stock
          const leadingNumMatch = rawQty.match(/^(\d+)/);
          if (leadingNumMatch) {
              stock = parseInt(leadingNumMatch[1], 10);
          }
      }

      const sku = `PRD-${String(skuCounter).padStart(4, '0')}`;
      skuCounter++;
      
      const unitPrice = 0; // Prices are zero for now

      // insert into products
      const pRes = await client.query(`
        INSERT INTO products (sku, name, unit, stock, unit_price, price, status)
        VALUES ($1, $2, $3, $4, $5, $5, 'active')
        RETURNING id
      `, [sku, name, unit, stock, unitPrice]);

      const productId = pRes.rows[0].id;

      // insert into catalogue
      await client.query(`
        INSERT INTO catalogue (sku, product_name, stock_qty, unit_price)
        VALUES ($1, $2, $3, $4)
      `, [sku, name, stock, unitPrice]);

      // insert into inventory
      await client.query(`
        INSERT INTO inventory (sku, available_qty)
        VALUES ($1, $2)
      `, [sku, stock]);

      console.log(`Inserted ${sku} - ${name} | Stock: ${stock} ${unit}`);
    }

    await client.query('COMMIT');
    console.log("Data seeding complete!");
  } catch(e) {
    await client.query('ROLLBACK');
    console.error("Failed seeding:", e);
  } finally {
    client.release();
    pool.end();
  }
}

parseAndSeed();
