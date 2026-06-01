require("dotenv").config({ override: true });

const app = require("./app");
require("./services/mqttService");
const PORT = process.env.PORT || 5000;

const BASE_URL =
  process.env.SERVER_URL || `http://localhost:${PORT}` ;

/* ======================
   Start Server
====================== */
(async () => {
  try {
    // Đã loại bỏ kết nối Database (connectDB) theo yêu cầu

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