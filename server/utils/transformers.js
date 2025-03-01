const logger = require('./logger');

/**
 * Transform a Newscatcher API event to our application format
 * @param {Object} event - Event from Newscatcher API
 * @returns {Object} - Transformed event for our application
 */
function transformEvent(event) {
  try {
    // Safety check
    if (!event || typeof event !== 'object') {
      logger.error('Invalid event data for transformation', event);
      return null;
    }

    // Create a standardized event object that matches our application's format
    const transformedEvent = {
      id: event.id || `evt-${Math.random().toString(36).substring(2, 11)}`,
      title: getFundraisingTitle(event),
      type: 'fundraising',
      severity: determineSeverity(event),
      impact: getImpactDescription(event),
      details: getFundraisingDetails(event),
      location: getLocation(event),
      region: getRegion(event),
      timestamp: event.extraction_date || new Date().toISOString(),
      
      // Additional fundraising-specific fields
      company: event.company_name || 'Unknown Company',
      amount: getFundraisingAmount(event),
      currency: getFundraisingCurrency(event),
      fundingType: getFundingType(event),
      investors: getInvestors(event),
      // Original data for reference
      original: event
    };

    return transformedEvent;
  } catch (error) {
    logger.error('Error transforming event data:', error);
    // Return a fallback object with the original event
    return {
      id: event.id || `evt-${Math.random().toString(36).substring(2, 11)}`,
      title: event.company_name ? `${event.company_name} Fundraising` : 'Fundraising Event',
      type: 'fundraising',
      severity: 'medium',
      impact: 'Investment activity detected',
      details: 'Details unavailable due to processing error',
      location: 'Unknown',
      region: 'all',
      timestamp: event.extraction_date || new Date().toISOString(),
      original: event
    };
  }
}

/**
 * Get a meaningful title for the fundraising event
 * @param {Object} event - Event from Newscatcher API
 * @returns {string} - Event title
 */
function getFundraisingTitle(event) {
  // Try to use a title directly from the data if available
  if (event.fundraising && event.fundraising.title) {
    return event.fundraising.title;
  }
  
  // Form a title from company name and funding type
  const company = event.company_name || 'Company';
  const fundingType = event.fundraising?.funding_type || 'Fundraising';
  const amount = getFundraisingAmount(event);
  const currency = getFundraisingCurrency(event);
  
  // If we have an amount, include it in the title
  if (amount && currency) {
    return `${company} Raises ${formatCurrency(amount, currency)} in ${fundingType} Round`;
  }
  
  return `${company} Announces ${fundingType} Round`;
}

/**
 * Determine the severity of the fundraising event based on amount
 * @param {Object} event - Event from Newscatcher API
 * @returns {string} - Severity level (low, medium, high)
 */
function determineSeverity(event) {
  if (!event.fundraising || !event.fundraising.amount) {
    return 'medium'; // Default
  }
  
  const amount = parseFloat(event.fundraising.amount);
  
  // Determine severity based on funding amount
  if (isNaN(amount)) {
    return 'medium';
  } else if (amount >= 100000000) { // $100M+
    return 'high';
  } else if (amount >= 10000000) { // $10M+
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Get impact description for the fundraising event
 * @param {Object} event - Event from Newscatcher API
 * @returns {string} - Impact description
 */
function getImpactDescription(event) {
  const company = event.company_name || 'Company';
  const fundingType = getFundingType(event);
  const amount = getFundraisingAmount(event);
  const currency = getFundraisingCurrency(event);
  
  if (amount && currency) {
    return `${company} secured ${formatCurrency(amount, currency)} in ${fundingType} funding`;
  }
  
  return `${company} secured new ${fundingType} funding`;
}

/**
 * Get detailed description for the fundraising event
 * @param {Object} event - Event from Newscatcher API
 * @returns {string} - Detailed description
 */
function getFundraisingDetails(event) {
  if (event.fundraising && event.fundraising.summary) {
    return event.fundraising.summary;
  }
  
  if (event.fundraising && event.fundraising.company_description) {
    return event.fundraising.company_description;
  }
  
  // Fallback: Create a description from available data
  const company = event.company_name || 'The company';
  const fundingType = getFundingType(event);
  const investors = getInvestors(event).join(', ') || 'investors';
  const amount = getFundraisingAmount(event);
  const currency = getFundraisingCurrency(event);
  
  if (amount && currency) {
    return `${company} has raised ${formatCurrency(amount, currency)} in ${fundingType} funding from ${investors}.`;
  }
  
  return `${company} has secured ${fundingType} funding from ${investors}.`;
}

/**
 * Get location for the fundraising event
 * @param {Object} event - Event from Newscatcher API
 * @returns {string} - Location
 */
function getLocation(event) {
  // This information isn't consistently available in the Newscatcher API
  // We'll need to extract it from different fields
  
  return 'Global'; // Default fallback
}

/**
 * Get region for the fundraising event
 * @param {Object} event - Event from Newscatcher API
 * @returns {string} - Region code
 */
function getRegion(event) {
  // For now, we'll set a default region
  // In a real implementation, we'd extract this from the event data
  return 'all';
}

/**
 * Get fundraising amount
 * @param {Object} event - Event from Newscatcher API
 * @returns {number|null} - Fundraising amount or null
 */
function getFundraisingAmount(event) {
  if (!event.fundraising) {
    return null;
  }
  
  const amount = event.fundraising.amount;
  
  if (!amount || amount === '') {
    return null;
  }
  
  // Try to parse as number
  const parsedAmount = parseFloat(amount);
  return isNaN(parsedAmount) ? null : parsedAmount;
}

/**
 * Get fundraising currency
 * @param {Object} event - Event from Newscatcher API
 * @returns {string} - Currency code
 */
function getFundraisingCurrency(event) {
  if (!event.fundraising) {
    return 'USD';
  }
  
  return event.fundraising.currency || 'USD';
}

/**
 * Get funding type
 * @param {Object} event - Event from Newscatcher API
 * @returns {string} - Funding type
 */
function getFundingType(event) {
  if (!event.fundraising || !event.fundraising.funding_type) {
    return 'Fundraising';
  }
  
  return event.fundraising.funding_type;
}

/**
 * Get list of investors
 * @param {Object} event - Event from Newscatcher API
 * @returns {string[]} - Array of investor names
 */
function getInvestors(event) {
  if (!event.fundraising || !event.fundraising.investors) {
    return [];
  }
  
  return event.fundraising.investors;
}

/**
 * Format currency amount
 * @param {number} amount - Amount
 * @param {string} currency - Currency code
 * @returns {string} - Formatted currency
 */
function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) {
    return 'undisclosed amount';
  }
  
  // For large amounts, format in millions or billions
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B ${currency}`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ${currency}`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ${currency}`;
  }
  
  return `${amount} ${currency}`;
}

module.exports = {
  transformEvent
};