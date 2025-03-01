const EventEmitter = require('events');
const apiClient = require('../api/events');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * EventsPoller class for implementing SSE-like functionality
 * Polls the Newscatcher API at regular intervals and emits events
 */
class EventsPoller extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.pollingInterval = options.pollingInterval || config.newscatcher.pollingInterval || 30000;
    this.maxEvents = options.maxEvents || config.newscatcher.maxEvents || 100;
    this.useRealApi = options.useRealApi !== false && !!config.newscatcher.apiKey;
    this.clients = new Set();
    this.events = [];
    this.isPolling = false;
    this.pollTimer = null;
    this.lastEventId = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = options.maxConsecutiveErrors || 5;
    
    logger.info(`EventsPoller initialized with ${this.useRealApi ? 'real API' : 'sample data'}`);
    logger.info(`Polling interval: ${this.pollingInterval}ms, Max events: ${this.maxEvents}`);
  }

  /**
   * Start polling for events
   */
  start() {
    if (this.isPolling) {
      logger.debug('Poller already running');
      return;
    }
    
    logger.info('Starting events poller');
    this.isPolling = true;
    
    // Poll immediately on start
    this.poll();
    
    // Set up polling interval
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.pollingInterval);
  }

  /**
   * Stop polling for events
   */
  stop() {
    if (!this.isPolling) {
      return;
    }
    
    logger.info('Stopping events poller');
    this.isPolling = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Poll for new events
   */
  async poll() {
    if (!this.isPolling) {
      return;
    }
    
    try {
      // If we're using the real API and have an API key
      if (this.useRealApi) {
        logger.debug('Polling Newscatcher API for events');
        
        // Get events from API - adjust days back for balance between response time and coverage
        // For production, we want a smaller window to avoid long API response times
        const daysBack = config.server.nodeEnv === 'production' ? 1 : 3;
        const events = await apiClient.getFundraisingEvents(daysBack);
        
        // Process new events
        this.processNewEvents(events);
        
        // Reset consecutive errors counter
        this.consecutiveErrors = 0;
      } else {
        logger.debug('Using sample data (API key not provided)');
        // Handle the case where we're not using the real API
        // This is for development/testing purposes
        const sampleEvents = require('../sample-events');
        
        // Update timestamp to current time
        const updatedEvents = sampleEvents.map(event => ({
          ...event,
          id: `evt-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        }));
        
        // Take a random event
        const randomIndex = Math.floor(Math.random() * updatedEvents.length);
        const randomEvent = updatedEvents[randomIndex];
        
        // Process the random event
        this.processNewEvents([randomEvent]);
      }
    } catch (error) {
      this.consecutiveErrors++;
      logger.error(`Error polling for events (attempt ${this.consecutiveErrors}):`, error);
      
      // If we've had too many consecutive errors, stop polling
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        logger.error(`Stopping poller after ${this.consecutiveErrors} consecutive errors`);
        this.stop();
        
        // Emit error event
        this.emit('error', new Error('Too many consecutive polling errors'));
        
        // Try to restart after a longer delay
        setTimeout(() => {
          logger.info('Attempting to restart poller after consecutive errors');
          this.start();
        }, this.pollingInterval * 2);
      }
    }
  }
  
  /**
   * Add a new client (SSE connection)
   * @param {Object} client - Client object (Express response)
   * @param {Object} filters - Filter parameters
   */
  addClient(client, filters = {}) {
    this.clients.add({
      client,
      filters
    });
    
    logger.info(`New client connected. Total clients: ${this.clients.size}`);
    
    // Start polling if not already started
    if (!this.isPolling && this.clients.size > 0) {
      this.start();
    }
    
    // Send initial batch of events to new client
    this.sendInitialEvents(client, filters);
  }
  
  /**
   * Remove a client
   * @param {Object} client - Client object
   */
  removeClient(client) {
    // Find and remove the client
    for (const item of this.clients) {
      if (item.client === client) {
        this.clients.delete(item);
        break;
      }
    }
    
    logger.info(`Client disconnected. Total clients: ${this.clients.size}`);
    
    // Stop polling if no clients are connected
    if (this.clients.size === 0) {
      this.stop();
    }
  }
  
  /**
   * Process new events received from API
   * @param {Array} newEvents - Array of new events
   */
  processNewEvents(newEvents) {
    if (!newEvents || !Array.isArray(newEvents) || newEvents.length === 0) {
      logger.debug('No new events to process');
      return;
    }
    
    logger.debug(`Processing ${newEvents.length} new events`);
    
    // Add new events to our events array
    this.events = [...newEvents, ...this.events].slice(0, this.maxEvents);
    
    // Get only events that are newer than the last broadcast
    const eventsToSend = this.lastEventId ? 
      newEvents.filter(event => event.id !== this.lastEventId) : 
      newEvents;
    
    // Update the last event ID
    if (newEvents.length > 0) {
      this.lastEventId = newEvents[0].id;
    }
    
    // Broadcast events to all connected clients
    this.broadcastEvents(eventsToSend);
    
    // Emit events for any external listeners
    eventsToSend.forEach(event => {
      this.emit('event', event);
    });
  }
  
  /**
   * Send initial batch of events to a new client
   * @param {Object} client - Client object
   * @param {Object} filters - Filter parameters
   */
  sendInitialEvents(client, filters = {}) {
    // Apply filters if specified
    const filteredEvents = this.filterEvents(this.events, filters);
    
    // Only send a subset of events initially to not overwhelm the client
    const initialEvents = filteredEvents.slice(0, 5);
    
    if (initialEvents.length === 0) {
      // If no events match the filter, still send a connection message
      client.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to event stream' })}\n\n`);
      return;
    }
    
    // Send connection message
    client.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to event stream' })}\n\n`);
    
    // Send each event
    initialEvents.forEach(event => {
      client.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  }
  
  /**
   * Broadcast events to all connected clients
   * @param {Array} events - Events to broadcast
   */
  broadcastEvents(events) {
    if (!events || events.length === 0 || this.clients.size === 0) {
      return;
    }
    
    logger.debug(`Broadcasting ${events.length} events to ${this.clients.size} clients`);
    
    for (const { client, filters } of this.clients) {
      // Apply filters for this specific client
      const filteredEvents = this.filterEvents(events, filters);
      
      // Send each filtered event to the client
      filteredEvents.forEach(event => {
        client.write(`data: ${JSON.stringify(event)}\n\n`);
      });
    }
  }
  
  /**
   * Filter events based on criteria
   * @param {Array} events - Events to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} - Filtered events
   */
  filterEvents(events, filters = {}) {
    if (!events || events.length === 0) {
      return [];
    }
    
    if (!filters || Object.keys(filters).length === 0) {
      return events;
    }
    
    return events.filter(event => {
      // Region filter
      if (filters.region && filters.region !== 'all') {
        if (event.region !== filters.region) {
          return false;
        }
      }
      
      // Severity filter
      if (filters.severity && filters.severity !== 'all') {
        if (event.severity !== filters.severity) {
          return false;
        }
      }
      
      // Type filter
      if (filters.type && filters.type !== 'all') {
        if (event.type !== filters.type) {
          return false;
        }
      }
      
      // Funding type filter (specific to fundraising events)
      if (filters.fundingType && filters.fundingType !== 'all') {
        const eventFundingType = event.fundingType || 
                                 event.original?.fundraising?.funding_type || 
                                 '';
        if (eventFundingType !== filters.fundingType) {
          return false;
        }
      }
      
      return true;
    });
  }
}

// Create and export a singleton instance
const eventsPoller = new EventsPoller();
module.exports = eventsPoller;