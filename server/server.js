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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      "img-src": ["'self'", "data:"]
    }
  }
}));

// Enable CORS for development
app.use(cors());

// Body parser middleware
app.use(express.json());                 // <-- ADD THIS LINE for JSON parsing
app.use(express.urlencoded({ extended: true }));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Event types configuration
const eventTypes = [
  { id: 'fundraising', name: 'Fundraising Events', enabled: true },
  { id: 'layoff', name: 'Layoff Events', enabled: false },
  { id: 'data_breach', name: 'Data Breach Events', enabled: false }
];

// Define main routes
app.get('/', (req, res) => {
  // Get the active event type from query parameter or default to fundraising
  const activeEventType = req.query.eventType || 'fundraising';
  
  res.render('index', {
    title: 'Event Horizon',
    eventTypes: eventTypes,
    activeEventType: activeEventType,
    config: {
      apiEnabled: !!config.newscatcher.apiKey,
      environment: config.server.nodeEnv
    }
  });
});

// SSE route for events
app.get('/stream/events', (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Parse filter parameters
  const filters = {
    type: req.query.type || 'all',
    fundingType: req.query.fundingType || 'all',
    amount: req.query.amount || 'all',
    company: req.query.company || ''
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

// Route for rendering event cards via AJAX
app.post('/render-event-card', (req, res) => {
  try {
    const event = req.body.event;
    const eventType = req.body.eventType || 'fundraising';
    
    // Helper functions for the template
    const helpers = {
      formatCurrency: (amount, currency = 'USD') => {
        if (!amount) return '$0';
        
        if (amount >= 1000000000) {
          return `${(amount / 1000000000).toFixed(1)}B`;
        } else if (amount >= 1000000) {
          return `${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
          return `${(amount / 1000).toFixed(0)}K`;
        }
        
        return `${parseFloat(amount).toLocaleString()}`;
      },
      formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      },
      formatTime: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    };
    
    // Combine the event data with helper functions
    const templateData = { event, ...helpers };
    
    // Render the appropriate template
    if (eventType === 'fundraising') {
      res.render('events/fundraising/card', templateData, (err, html) => {
        if (err) {
          logger.error('Error rendering event card:', err);
          res.status(500).json({ error: 'Failed to render event card' });
        } else {
          res.json({ html });
        }
      });
    } else {
      res.status(400).json({ error: 'Unsupported event type' });
    }
  } catch (error) {
    logger.error('Error in render-event-card endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Event types API endpoint
app.get('/api/event-types', (req, res) => {
  res.json(eventTypes.filter(type => type.enabled));
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
          type: 'Filter by event type (all, fundraising, layoff, data_breach)',
          fundingType: 'Filter by funding type (all, Series A, Seed, etc.)',
          amount: 'Filter by amount range (all, high, medium, low)',
          company: 'Filter by company name'
        }
      },
      {
        path: '/api/event-types',
        method: 'GET',
        description: 'Get available event types'
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