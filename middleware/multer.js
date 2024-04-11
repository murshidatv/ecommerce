const multer = require('multer');
const path = require('path');

// image upload multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/');
    },
    filename: (req, file, cb) => {
        // Generate unique filename (e.g., timestamp + original filename)
        const uniqueFilename = Date.now() + '-' + file.originalname;
        cb(null, uniqueFilename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check file types (e.g., allow images and other file types)
        const filetypes = /jpeg|jpg|png|gif|webp|pdf|docx|xlsx/; 
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images, PDFs, and documents are allowed'));
    }
});

module.exports = { upload };