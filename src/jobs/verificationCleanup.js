const cron = require('node-cron');
const verificationService = require('../services/verificationService');

// Run cleanup every hour
const cleanupJob = cron.schedule('0 * * * *', async () => {
    try {
        console.log(' Running verification code cleanup job...');
        const cleaned = await verificationService.cleanupExpiredCodes();
        console.log(` Cleanup completed. Removed ${cleaned} expired codes.`);
    } catch (error) {
        console.error(' Cleanup job failed:', error);
    }
});

// Start the job
cleanupJob.start();

module.exports = cleanupJob;