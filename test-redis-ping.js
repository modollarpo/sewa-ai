const { redisClient } = require('./backend/dist/config/redis');
redisClient.on('ready', async () => {
    try {
        const r = await redisClient.ping();
        console.log('PING RESULT TYPE:', typeof r);
        console.log('PING RESULT VALUE:', r);
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
});
