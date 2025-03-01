/**
 * Filter management for events
 * This file handles the filtering functionality for different event types
 */

// Filter state object
const FilterState = {
  activeEventType: 'fundraising',
  filters: {
    // Fundraising filters
    fundingType: 'all',
    amount: 'all',
    company: ''
  },
  
  // Set a filter value
  setFilter: function(key, value) {
    this.filters[key] = value;
    this.saveState();
    return this.filters;
  },
  
  // Get all current filters
  getFilters: function() {
    return { ...this.filters };
  },
  
  // Get filter value
  getFilter: function(key) {
    return this.filters[key];
  },
  
  // Set active event type
  setEventType: function(type) {
    this.activeEventType = type;
    this.saveState();
    return this.activeEventType;
  },
  
  // Get active event type
  getEventType: function() {
    return this.activeEventType;
  },
  
  // Reset filters to default
  resetFilters: function() {
    this.filters = {
      fundingType: 'all',
      amount: 'all',
      company: ''
    };
    this.saveState();
    return this.filters;
  },
  
  // Save filter state to localStorage
  saveState: function() {
    try {
      localStorage.setItem('event-horizon-filters', JSON.stringify({
        activeEventType: this.activeEventType,
        filters: this.filters
      }));
    } catch (error) {
      console.error('Failed to save filter state:', error);
    }
  },
  
  // Load filter state from localStorage
  loadState: function() {
    try {
      const savedState = localStorage.getItem('event-horizon-filters');
      if (savedState) {
        const state = JSON.parse(savedState);
        this.activeEventType = state.activeEventType || 'fundraising';
        this.filters = state.filters || this.resetFilters();
      }
    } catch (error) {
      console.error('Failed to load filter state:', error);
      this.resetFilters();
    }
    return this;
  }
};

// Initialize filter handlers
function initializeFilters() {
  // Load saved filter state
  FilterState.loadState();
  
  // Set up filter change handlers
  document.querySelectorAll('select[data-filter-key], input[data-filter-key]').forEach(element => {
    const filterKey = element.dataset.filterKey;
    
    // Set initial value from saved state
    if (element.tagName === 'SELECT') {
      element.value = FilterState.getFilter(filterKey) || 'all';
    } else if (element.tagName === 'INPUT' && element.type === 'text') {
      element.value = FilterState.getFilter(filterKey) || '';
    }
    
    // Add event listener
    if (element.tagName === 'SELECT') {
      element.addEventListener('change', () => {
        FilterState.setFilter(filterKey, element.value);
        applyFilters();
      });
    } else if (element.tagName === 'INPUT' && element.type === 'text') {
      element.addEventListener('input', () => {
        FilterState.setFilter(filterKey, element.value.trim());
        applyFilters();
      });
    }
  });
  
  // Set up event type buttons
  document.querySelectorAll('.event-type-btn').forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      
      const eventType = button.dataset.eventType;
      switchEventType(eventType);
    });
  });
}

// Apply filters to the events
function applyFilters() {
  const filters = FilterState.getFilters();
  const eventType = FilterState.getEventType();
  
  // Get all event cards
  const events = document.querySelectorAll('.alert-card');
  
  events.forEach(event => {
    let visible = true;
    
    // Apply fundraising-specific filters
    if (eventType === 'fundraising') {
      // Funding type filter
      if (filters.fundingType !== 'all') {
        if (event.dataset.fundingType !== filters.fundingType) {
          visible = false;
        }
      }
      
      // Amount filter
      if (filters.amount !== 'all') {
        const amount = parseFloat(event.dataset.amount) || 0;
        if (filters.amount === 'high' && amount < 100000000) {
          visible = false;
        } else if (filters.amount === 'medium' && (amount < 10000000 || amount >= 100000000)) {
          visible = false;
        } else if (filters.amount === 'low' && amount >= 10000000) {
          visible = false;
        }
      }
      
      // Company filter
      if (filters.company) {
        const company = (event.dataset.company || '').toLowerCase();
        if (!company.includes(filters.company.toLowerCase())) {
          visible = false;
        }
      }
    }
    
    // Show/hide the event based on filter results
    event.style.display = visible ? 'block' : 'none';
  });
  
  // Update URL with filter state
  updateUrlWithFilters();
}

// Update URL with current filters without reloading the page
function updateUrlWithFilters() {
  const url = new URL(window.location);
  const filters = FilterState.getFilters();
  const eventType = FilterState.getEventType();
  
  // Set event type
  url.searchParams.set('eventType', eventType);
  
  // Set filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  });
  
  // Update URL without reloading the page
  window.history.replaceState({}, '', url);
}