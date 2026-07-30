const fs = require("fs");
const { Client } = require("pg");

// Manually parse the .env file
const envFile = fs.readFileSync("c:/Users/USER/OneDrive/Documents/frutella/server/.env", "utf8");
const databaseUrlLine = envFile.split("\n").find(line => line.startsWith("DATABASE_URL="));
const databaseUrl = databaseUrlLine.split("=")[1].trim();

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const result = await client.query(
      "SELECT id, name, email, role, status FROM users WHERE LOWER(email) = LOWER($1)",
      ["est0295@gmail.com"]
    );
    console.log("Database User Record:", result.rows[0]);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
