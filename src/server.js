require("dotenv").config({ override: true });

const app = require("./app");
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

const BASE_URL =
  process.env.SERVER_URL || `http://localhost:${PORT}` ;

/* ======================
   Start Server
====================== */
(async () => {
  try {
    await pool.query('SELECT 1');

    app.listen(PORT, () => {
      console.log(`
=================================
🚀 Server running on port ${PORT}
🌐 Base URL: ${BASE_URL}
📄 Swagger: ${BASE_URL}/api-docs
=================================
      `);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();