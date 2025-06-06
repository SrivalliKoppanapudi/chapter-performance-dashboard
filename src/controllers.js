import { Chapter } from './models.js';
import multer from 'multer';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';

const upload = multer({ dest: 'uploads/' });

export const getChapters = async (req, res) => {
    try {
        const { 
            class: className, 
            unit, 
            status, 
            weakChapters, 
            subject,
            page = 1,
            limit = 10
        } = req.query;

        // Build filter object
        const filter = {};
        if (className) filter.class = className;
        if (unit) filter.unit = unit;
        if (status) filter.status = status;
        if (subject) filter.subject = subject;
        if (weakChapters === 'true') filter.isWeakChapter = true;

        // Create cache key based on query parameters
        const cacheKey = `chapters:${JSON.stringify(filter)}:${page}:${limit}`;

        // Try to get from cache if Redis is available
        if (req.redisClient) {
            const cachedData = await req.redisClient.get(cacheKey);
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const total = await Chapter.countDocuments(filter);

        // Get filtered and paginated chapters
        const chapters = await Chapter.find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ subject: 1, chapter: 1 });

        const response = {
            chapters,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        };

        // Cache the result if Redis is available
        if (req.redisClient) {
            await req.redisClient.set(cacheKey, JSON.stringify(response), {
                EX: 3600 // Cache for 1 hour
            });
        }

        res.json(response);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching chapters', 
            error: error.message 
        });
    }
};

export const getChapterById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Try to get from cache if Redis is available
        if (req.redisClient) {
            const cachedData = await req.redisClient.get(`chapter:${id}`);
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }
        }

        const chapter = await Chapter.findById(id);
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        // Cache the result if Redis is available
        if (req.redisClient) {
            await req.redisClient.set(`chapter:${id}`, JSON.stringify(chapter), {
                EX: 3600 // Cache for 1 hour
            });
        }

        res.json(chapter);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching chapter', 
            error: error.message 
        });
    }
};
/* 
export const uploadChapters = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log(filePath);
    try {
        // 1. Async file read
        const data = await fs.readFile(filePath, 'utf8');
        const chapters = JSON.parse(data);

        const validChapters = [];
        const failedChapters = [];

        // 2. Validate all chapters first (no DB interaction yet)
        for (const chapter of chapters) {
            const newChapter = new Chapter(chapter);
            const error = newChapter.validateSync();
            if (error) {
                failedChapters.push({ chapter, error: error.message });
            } else {
                validChapters.push(newChapter.toObject());
            }
        }

        // 3. Insert all valid chapters at once (much faster)
        let insertResult = [];
        if (validChapters.length > 0) {
            insertResult = await Chapter.insertMany(validChapters, { ordered: false });
        }

        // 4. Clear Redis cache if client exists
        if (req.redisClient) {
            const keys = await req.redisClient.keys('chapters:*');
            if (keys.length > 0) await req.redisClient.del(keys);
        }

        // 5. Remove the uploaded file
        await fs.unlink(filePath);

        // 6. Respond
        return res.status(200).json({
            message: `Successfully uploaded ${insertResult.length} chapters`,
            successCount: insertResult.length,
            failureCount: failedChapters.length,
            failedChapters: failedChapters.length > 0 ? failedChapters : undefined
        });

    } catch (error) {
        // Cleanup file if something goes wrong
        if (existsSync(filePath)) {
            await fs.unlink(filePath);
        }
        return res.status(500).json({ 
            message: 'Error uploading chapters', 
            error: error.message 
        });
    }
};
 */

export const uploadChapters = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log('📁 File received:', filePath);

    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const chapters = JSON.parse(fileContent);

        const validChapters = [];
        const failedChapters = [];

        for (const chapter of chapters) {
            const newChapter = new Chapter(chapter);
            const error = newChapter.validateSync();
            if (error) {
                failedChapters.push({ chapter, error: error.message });
            } else {
                validChapters.push(newChapter.toObject());
            }
        }

        let insertResult = [];
        if (validChapters.length > 0) {
            insertResult = await Chapter.insertMany(validChapters, { ordered: false });
        }

        if (req.redisClient) {
            const keys = await req.redisClient.keys('chapters:*');
            if (keys.length > 0) await req.redisClient.del(keys);
        }

        await fs.unlink(filePath);

        return res.status(200).json({
            message: `✅ Uploaded ${insertResult.length} chapters.`,
            successCount: insertResult.length,
            failureCount: failedChapters.length,
            failedChapters: failedChapters.length ? failedChapters : undefined
        });

    } catch (error) {
        console.error('❌ Upload error:', error.message);
        if (existsSync(filePath)) await fs.unlink(filePath);
        return res.status(500).json({
            message: 'Error uploading chapters',
            error: error.message
        });
    }
};
