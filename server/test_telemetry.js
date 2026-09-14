require("dotenv").config();
const express = require("express");
const telemetryRoutes = require("./src/routes/telemetry");
const pool = require("./src/db/pool");

const app = express();
app.use(express.json());
app.use("/api/telemetry", telemetryRoutes);

const PORT = 9999;
const server = app.listen(PORT, async () => {
  try {
    const res = await fetch(`http://localhost:${PORT}/api/telemetry/demand-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: 1,
        productName: "Test Product",
        category: "Test",
        source: "test_script",
      })
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
    
    if (res.status === 201) {
      console.log("✅ Telemetry route works correctly.");
    } else {
      console.error("❌ Test failed.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
    await pool.end();
  }
});
