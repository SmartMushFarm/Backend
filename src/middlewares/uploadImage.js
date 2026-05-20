const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Sử dụng memory storage để upload trực tiếp từ buffer
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước file 5MB
    fileFilter: (req, file, cb) => {
        // Chỉ chấp nhận các định dạng ảnh
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and GIF images are allowed'));
        }
    }
});
 
/**
 * Middleware upload ảnh lên Cloudinary
 * Sử dụng sau upload.single('image') hoặc upload.array('images')
 */
const uploadToCloudinary = async (req, res, next) => {
    try {
        // Nếu không có file, skip
        if (!req.file && !req.files) {
            return next();
        }

        // Upload single file
        if (req.file) {
            const result = await uploadSingleImage(req.file);
            req.body.image_url = result.secure_url; // Lưu URL vào body
            req.cloudinary_id = result.public_id; // Lưu ID để có thể xóa sau
        }

        // Upload multiple files
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadSingleImage(file));
            const results = await Promise.all(uploadPromises);
            req.body.image_urls = results.map(r => r.secure_url);
            req.cloudinary_ids = results.map(r => r.public_id);
        }

        next();
    } catch (error) {
        console.error('❌ Upload to Cloudinary error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload image to cloud'
        });
    }
};

/**
 * Helper function để upload 1 file lên Cloudinary
 */
const uploadSingleImage = (file) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'SmartMushFarm', // Thư mục trên Cloudinary
                resource_type: 'image',
                transformation: [
                    { width: 1000, height: 1000, crop: 'limit' }, // Resize if larger
                    { quality: 'auto' }, // Auto quality
                    { fetch_format: 'auto' } // Auto format (WebP if supported)
                ]
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        // Pipe buffer vào upload stream
        uploadStream.end(file.buffer);
    });
};

module.exports = {
    upload,
    uploadToCloudinary
};
