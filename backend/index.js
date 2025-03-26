const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");
const debug = require("debug")("app:server");
const app = express();
app.use(cors());
app.use(express.json()); // Parse JSON requests

// API Routes
app.use("/api/users", require("./routes/userRoutes"));

// Sample route
app.get("/", (req, res) => {
  res.send("Backend is running...");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  debug("✅ Server started on port 4998");
  console.log(`Server is running on port ${PORT}`);
});
