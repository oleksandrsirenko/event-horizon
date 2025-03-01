const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const apiClient = require('./api/events');
const eventsPoller = require('./sse/poller');

const app = express();
const PORT = config.server.port;

// Security middleware
app.use(helmet());

// Enable CORS for development
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// SSE route for events
app.get('/stream/events', (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Parse filter parameters
  const filters = {
    region: req.query.region || 'all',
    severity: req.query.severity || 'all',
    type: req.query.type || 'all',
    fundingType: req.query.fundingType || 'all'
  };
  
  logger.info(`New SSE connection established with filters: ${JSON.stringify(filters)}`);
  
  // Add this client to the poller
  eventsPoller.addClient(res, filters);
  
  // Handle client disconnect
  req.on('close', () => {
    eventsPoller.removeClient(res);
    logger.info('Client disconnected from SSE stream');
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  let apiStatus = 'unavailable';
  
  // Check API health if we have an API key
  if (config.newscatcher.apiKey) {
    try {
      const isHealthy = await apiClient.checkHealth();
      apiStatus = isHealthy ? 'healthy' : 'unhealthy';
    } catch (error) {
      logger.error('API health check failed:', error);
      apiStatus = 'error';
    }
  }
  
  res.status(200).json({
    status: 'ok',
    api: apiStatus,
    environment: config.server.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.status(200).json({
    name: 'Event Horizon API',
    version: '1.0.0',
    description: 'Real-time events monitoring API powered by Newscatcher',
    endpoints: [
      {
        path: '/stream/events',
        method: 'GET',
        description: 'Server-Sent Events endpoint for real-time events',
        parameters: {
          region: 'Filter by region (all, asia, europe, north-america, etc.)',
          severity: 'Filter by severity (all, high, medium, low)',
          type: 'Filter by event type (all, fundraising, etc.)',
          fundingType: 'Filter by funding type (all, Series A, Seed, etc.)'
        }
      },
      {
        path: '/health',
        method: 'GET',
        description: 'Health check endpoint'
      },
      {
        path: '/api/info',
        method: 'GET',
        description: 'API information endpoint'
      }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running in ${config.server.nodeEnv} mode on http://localhost:${PORT}`);
  
  // Check if we have an API key for Newscatcher
  if (!config.newscatcher.apiKey) {
    logger.warn('No Newscatcher API key provided. Using sample data instead of real events.');
  }
});