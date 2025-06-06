import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import routes from './src/routes.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { mkdir, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
if (!existsSync('uploads')) {
    mkdir('uploads', (err) => {
        if (err) console.error('Error creating uploads directory:', err);
    });
}

const app = express();

// Initialize Redis client
let redisClient = null;
const initRedis = async () => {
    try {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        redisClient.on('error', (err) => {
            console.warn('Redis error:', err);
        });

        await redisClient.connect();
        console.log('Redis connected successfully');
    } catch (err) {
        console.warn('Redis connection failed:', err.message);
        console.log('Application will continue without caching');
        redisClient = null;
    }
};

initRedis().catch(console.error);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make redisClient available to routes
app.use((req, res, next) => {
    req.redisClient = redisClient;
    next();
});

// Routes
app.use('/api/v1', routes);

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chapter-performance');
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        setTimeout(connectDB, 5000);
    }
};

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
