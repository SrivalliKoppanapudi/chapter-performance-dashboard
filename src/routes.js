import express from 'express';
import { getChapters, getChapterById, uploadChapters } from './controllers.js';
import { rateLimit, adminAuth } from './middleware.js';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.json');
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json') {
            cb(null, true);
        } else {
            cb(new Error('Only JSON files are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

const router = express.Router();

// Apply rate limiting to all routes
router.use(rateLimit);

// Get all chapters with filtering and pagination
router.get('/chapters', getChapters);

// Get specific chapter by ID
router.get('/chapters/:id', getChapterById);

// Upload chapters (admin only)
router.post('/chapters', 
    adminAuth,
    upload.single('file'),
    uploadChapters
);

export default router;
