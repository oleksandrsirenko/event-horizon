const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { transformEvent } = require('../utils/transformers');
const cache = require('../utils/cache');

class EventsApiClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://events.newscatcherapi.xyz/api';
    this.timeout = options.timeout || 10000; // 10 seconds
    this.retries = options.retries || 3;
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cacheTtl = options.cacheTtl || 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (!this.apiKey) {
      logger.warn('EventsApiClient initialized without API key. API calls will fail.');
    }
  }

  /**
   * Make an authenticated request to the Newscatcher Events API
   * @param {string} endpoint - API endpoint path
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {Object} data - Request body for POST requests
   * @param {Object} params - URL parameters for GET requests
   * @returns {Promise<Object>} - API response data
   */
  async makeRequest(endpoint, method = 'GET', data = null, params = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = `${method}:${url}:${JSON.stringify(data)}:${JSON.stringify(params)}`;
    
    // Check cache first if enabled
    if (this.cacheEnabled && method === 'GET') {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return cachedData;
      }
    }
    
    const headers = {
      'x-api-token': this.apiKey,
      'Content-Type': 'application/json'
    };
    
    let retries = 0;
    let lastError = null;
    
    while (retries <= this.retries) {
      try {
        logger.debug(`Making ${method} request to ${url}`);
        
        // Set a longer timeout for POST requests to the search endpoint due to potentially large responses
        const requestTimeout = endpoint.includes('events_search') ? 30000 : this.timeout;
        
        const response = await axios({
          method,
          url,
          headers,
          data,
          params,
          timeout: requestTimeout
        });
        
        // Store in cache if it's a GET request and caching is enabled
        if (this.cacheEnabled && method === 'GET') {
          cache.set(cacheKey, response.data, this.cacheTtl);
        }
        
        // Cache POST responses too for event search queries (with shorter TTL)
        if (this.cacheEnabled && method === 'POST' && endpoint.includes('events_search')) {
          // Use a shorter TTL for search results (2 minutes)
          cache.set(cacheKey, response.data, 2 * 60 * 1000);
        }
        
        return response.data;
      } catch (error) {
        lastError = error;
        retries++;
        
        // Log the error
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.error(`API error ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`);
          
          // Don't retry on client errors except for rate limiting
          if (error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
            break;
          }
        } else if (error.request) {
          // The request was made but no response was received
          logger.error(`API request error: No response received`);
        } else {
          // Something happened in setting up the request
          logger.error(`API request setup error: ${error.message}`);
        }
        
        // If this is the last retry, don't wait
        if (retries <= this.retries) {
          // Exponential backoff
          const backoffTime = Math.min(1000 * Math.pow(2, retries - 1), 10000);
          logger.debug(`Retrying in ${backoffTime}ms (attempt ${retries} of ${this.retries})`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('API request failed after multiple retries');
  }

  /**
   * Check API health
   * @returns {Promise<boolean>} - True if API is healthy
   */
  async checkHealth() {
    try {
      const response = await this.makeRequest('/health');
      return response.message === 'Healthy';
    } catch (error) {
      logger.error('API health check failed:', error);
      return false;
    }
  }

  /**
   * Get fundraising events
   * @param {number} daysBack - Number of days to look back
   * @returns {Promise<Array>} - Array of fundraising events
   */
  async getFundraisingEvents(daysBack = 7) {
    const payload = {
      event_type: 'fundraising',
      attach_articles_data: true,
      additional_filters: {
        extraction_date: {
          gte: `now-${daysBack}d`,
          lte: 'now'
        }
      }
    };
    
    try {
      logger.info(`Fetching fundraising events for the last ${daysBack} days`);
      const response = await this.makeRequest('/events_search', 'POST', payload);
      
      if (response.message === 'Success' && Array.isArray(response.events)) {
        logger.info(`Retrieved ${response.events.length} fundraising events`);
        // Transform the events to match our application format
        return response.events.map(event => transformEvent(event));
      } else {
        logger.warn('Unexpected API response format:', response);
        return [];
      }
    } catch (error) {
      logger.error('Failed to fetch fundraising events:', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Object|null>} - Event object or null if not found
   */
  async getEventById(eventId) {
    try {
      const payload = {
        event_type: 'fundraising',
        attach_articles_data: true,
        additional_filters: {
          id: eventId
        }
      };
      
      const response = await this.makeRequest('/events_search', 'POST', payload);
      
      if (response.message === 'Success' && Array.isArray(response.events) && response.events.length > 0) {
        return transformEvent(response.events[0]);
      } else {
        logger.warn(`Event with ID ${eventId} not found`);
        return null;
      }
    } catch (error) {
      logger.error(`Failed to fetch event with ID ${eventId}:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const apiClient = new EventsApiClient(
  config.newscatcher.apiKey,
  {
    timeout: 15000,
    retries: 3,
    cacheEnabled: true,
    cacheTtl: 5 * 60 * 1000 // 5 minutes
  }
);

module.exports = apiClient;