// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  // Newscatcher API configuration
  newscatcher: {
    apiKey: process.env.NEWSCATCHER_API_KEY,
    pollingInterval: parseInt(process.env.POLLING_INTERVAL, 10) || 30000, // 30 seconds default
    maxEvents: parseInt(process.env.MAX_EVENTS, 10) || 100,
  }
};