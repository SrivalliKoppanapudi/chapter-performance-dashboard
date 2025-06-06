const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const bodyParser = require('body-parser');
const routes = require('./routes');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const redisClient = redis.createClient(process.env.REDIS_URL);

app.use(bodyParser.json());
app.use('/api/v1', routes);

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
