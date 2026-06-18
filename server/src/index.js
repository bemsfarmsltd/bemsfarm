const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();

// MUST be before routes
app.use(
  cors({
    origin: [
      "https://bemsfarm.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true, // CRITICAL: allows cookies to be sent
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/* app.use(cors({
  origin: [
    'https://bemsfarms.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // CRITICAL: parse cookies

// Routes
const authRoutes = require("./routes/auth");
const ordersRoutes = require("./routes/orders");
const productsRoutes = require("./routes/products");
const categoriesRoutes = require("./routes/categories");
const adminRoutes = require("./routes/admin");
const aiRoutes = require("./routes/ai");
const miscRoutes = require("./routes/misc");
const advancedAiRoutes = require("./routes/advanced-ai");

app.use("/api/auth", authRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", miscRoutes);
app.use("/api/advanced-ai", advancedAiRoutes);

app.get("/health", (req, res) => res.json({ status: "OK", time: new Date() }));
app.options("*", cors());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
