const express = require('express');
const cors = require('cors');
const path = require('path');
const sampleEvents = require('./sample-events');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for development
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// SSE route for events
app.get('/stream/events', (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to event stream' })}\n\n`);
  
  // Parse filter parameters (these would be used in a real implementation)
  const region = req.query.region || 'all';
  const severity = req.query.severity || 'all';
  const type = req.query.type || 'all';
  
  // Send the initial batch of events (for demo purposes)
  setTimeout(() => {
    sampleEvents.slice(0, 3).forEach(event => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  }, 2000);
  
  // Create a queue of remaining sample events to send
  let eventQueue = [...sampleEvents.slice(3)];
  
  // Function to send events periodically
  const intervalId = setInterval(() => {
    if (eventQueue.length === 0) {
      // When we run out, create new events with updated timestamps
      eventQueue = sampleEvents.map(event => ({
        ...event,
        id: `evt-${Math.random().toString(36).substr(2, 9)}`, // Generate new IDs
        timestamp: new Date().toISOString() // Update timestamp
      }));
    }
    
    // Get next event
    const event = eventQueue.shift();
    
    // Send the event
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }, 10000); // Send an event every 10 seconds
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    console.log('Client disconnected');
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});