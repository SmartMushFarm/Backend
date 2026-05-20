require('dotenv').config();

const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Debug: Log để check credentials có load đúng không
console.log('🔧 Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Loaded' : '❌ Missing',
  api_key: process.env.CLOUDINARY_API_KEY ? '✅ Loaded' : '❌ Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ Loaded' : '❌ Missing',
});

module.exports = cloudinary;

