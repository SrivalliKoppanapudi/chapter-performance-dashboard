

const rateLimit = async (req, res, next) => {
    try {
        if (!req.redisClient) {
            // If Redis is not available, allow the request
            return next();
        }

        const ip = req.ip;
        const key = `ratelimit:${ip}`;
        
        // Get the current count for this IP
        let count = await req.redisClient.get(key);
        count = count ? parseInt(count) : 0;

        if (count >= 30) {
            return res.status(429).json({ 
                message: 'Too many requests. Please try again later.' 
            });
        }

        // Increment the count and set expiry if it's the first request
        if (count === 0) {
            await req.redisClient.setEx(key, 60, '1'); // Expire after 60 seconds
        } else {
            await req.redisClient.incr(key);
        }

        next();
    } catch (error) {
        console.error('Rate limiting error:', error);
        // If there's an error with rate limiting, allow the request
        next();
    }
};

const adminAuth = (req, res, next) => {
    const adminKey = req.headers['admin-key'];
    console.log(adminKey)
    
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ 
            message: 'Unauthorized. Admin access required.' 
        });
    }
    
    next();
};

export { rateLimit, adminAuth };
