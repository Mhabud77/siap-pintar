const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, '../../uploads/foto-profil');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi penyimpanan
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Format: foto-{timestamp}-{random}.{ext}
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `foto-${uniqueSuffix}${ext}`);
    }
});

// Filter hanya gambar
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar (JPG, PNG, WEBP) yang diizinkan'), false);
    }
};

// Batas ukuran file: 2MB
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    }
});

module.exports = upload;