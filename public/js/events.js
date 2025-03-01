/**
 * Events configuration and management
 * This file defines all supported event types and their properties
 */

const EventTypes = {
  // Fundraising event type configuration
  fundraising: {
    id: 'fundraising',
    name: 'Fundraising Events',
    cardTemplate: 'fundraising-card-template',
    dataTransformer: function(event) {
      // Transform API data to UI-friendly format for fundraising
      return {
        id: event.id || '',
        title: event.title || `${event.company || 'Unknown Company'} Fundraising`,
        company: event.company || 'Unknown Company',
        amount: event.amount || 0,
        currency: event.currency || 'USD',
        fundingType: event.fundingType || 'Fundraising',
        severity: event.severity || 'medium',
        investors: Array.isArray(event.investors) ? event.investors : [],
        details: event.details || event.impact || 'No details available',
        timestamp: event.timestamp || new Date().toISOString()
      };
    },
    // Stats calculation for fundraising events
    calculateStats: function(events) {
      const totalEvents = events.length;
      
      // Calculate total funding amount
      const totalFunding = events.reduce((sum, event) => {
        return sum + (parseFloat(event.amount) || 0);
      }, 0);
      
      return {
        totalEvents,
        totalFunding: formatCurrency(totalFunding)
      };
    }
  },
  
  // Template for future event types
  /*
  layoff: {
    id: 'layoff',
    name: 'Layoff Events',
    cardTemplate: 'layoff-card-template',
    dataTransformer: function(event) {
      // Transform API data for layoff events
      return {
        // Implementation will be added later
      };
    },
    calculateStats: function(events) {
      // Implementation will be added later
      return {
        totalEvents: events.length
      };
    }
  }
  */
};

// Helper function to format currency values
function formatCurrency(amount, currency = 'USD') {
  if (!amount) return '$0';
  
  // For large amounts, format in millions or billions
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  
  return `$${amount.toLocaleString()}`;
}

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Helper function to format time
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}