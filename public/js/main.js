/**
 * Main application logic for Event Horizon
 * Handles event stream connection and event rendering
 */

// Global variables
let eventSource = null;
const events = [];

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize filters
  initializeFilters();
  
  // Get initial event type from URL or default to fundraising
  const urlParams = new URLSearchParams(window.location.search);
  const initialEventType = urlParams.get('eventType') || 'fundraising';
  
  // Update filter state with initial event type
  FilterState.setEventType(initialEventType);
  
  // Connect to event stream
  connectToEventStream();
});

// Function to connect to the SSE endpoint
function connectToEventStream() {
  // Get current filters and event type
  const filters = FilterState.getFilters();
  const eventType = FilterState.getEventType();
  
  // Update connection status to connecting
  updateConnectionStatus('connecting');
  
  // Close existing connection if any
  if (eventSource) {
    eventSource.close();
  }
  
  // Create URL with filters
  const url = new URL('/stream/events', window.location.origin);
  url.searchParams.set('type', eventType);
  
  // Add other filters if they are set
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      url.searchParams.set(key, value);
    }
  });
  
  // Create new EventSource connection
  eventSource = new EventSource(url.toString());
  
  // Handle successful connection
  eventSource.onopen = () => {
    updateConnectionStatus('connected');
  };
  
  // Handle incoming events
  eventSource.onmessage = (message) => {
    const data = JSON.parse(message.data);
    
    // Skip connection messages
    if (data.type === 'connection') return;
    
    // Process the event
    processEvent(data);
  };
  
  // Handle connection errors
  eventSource.onerror = () => {
    updateConnectionStatus('disconnected');
    
    // Close the current connection
    eventSource.close();
    eventSource = null;
    
    // Try to reconnect after 3 seconds
    setTimeout(connectToEventStream, 3000);
  };
}

// Function to update connection status
function updateConnectionStatus(status) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusElement.className = status;
  }
}

// Function to process and render an event
function processEvent(event) {
  // Get current event type
  const eventType = FilterState.getEventType();
  
  // Skip events that don't match the current event type
  if (event.type !== eventType) return;
  
  // Transform the event data based on event type
  const eventConfig = EventTypes[eventType];
  if (!eventConfig) return;
  
  const transformedEvent = eventConfig.dataTransformer(event);
  
  // Add to events array
  events.unshift(transformedEvent);
  
  // Hide empty state if present
  const emptyState = document.querySelector('.empty-state');
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  // Render the event
  renderEvent(transformedEvent, eventType, true);
  
  // Update stats
  updateStats();
}

// Function to render an event card
function renderEvent(event, eventType, isNew = false) {
  // Get the event config
  const eventConfig = EventTypes[eventType];
  if (!eventConfig) return;
  
  // Use the server-side rendering endpoint to get the HTML
  fetch('/render-event-card', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event: event,
      eventType: eventType
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      console.error('Error rendering event card:', data.error);
      return;
    }
    
    // Create a temporary container for the HTML
    const temp = document.createElement('div');
    temp.innerHTML = data.html;
    
    // Get the event card element
    const cardElement = temp.firstChild;
    
    // Add new class if this is a new event
    if (isNew && cardElement) {
      cardElement.classList.add('new-alert');
    }
    
    // Get the events container
    const eventsContainer = document.getElementById('events-container');
    if (!eventsContainer) return;
    
    // Hide empty state if present
    const emptyState = eventsContainer.querySelector('.empty-state');
    if (emptyState) {
      emptyState.style.display = 'none';
    }
    
    // Add the event to the container
    if (isNew) {
      eventsContainer.prepend(cardElement);
    } else {
      eventsContainer.appendChild(cardElement);
    }
    
    // Apply filters to show/hide the event
    applyFilters();
  })
  .catch(error => {
    console.error('Failed to render event card:', error);
  });
}

// Function to update stats based on event type
function updateStats() {
  const eventType = FilterState.getEventType();
  const eventConfig = EventTypes[eventType];
  
  if (!eventConfig || !eventConfig.calculateStats) return;
  
  const stats = eventConfig.calculateStats(events);
  
  // Update total events
  const totalEventsElement = document.getElementById('total-events');
  if (totalEventsElement) {
    totalEventsElement.textContent = stats.totalEvents || 0;
  }
  
  // Update fundraising-specific stats
  if (eventType === 'fundraising') {
    const totalFundingElement = document.getElementById('total-funding');
    if (totalFundingElement) {
      totalFundingElement.textContent = stats.totalFunding || '$0';
    }
  }
}

// Function to switch between event types
function switchEventType(newEventType) {
  // Skip if this is already the active type
  if (newEventType === FilterState.getEventType()) return;
  
  // Update filter state
  FilterState.setEventType(newEventType);
  
  // Update UI to show the selected event type
  document.querySelectorAll('.event-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.eventType === newEventType);
  });
  
  // Clear events array
  events.length = 0;
  
  // Clear events container
  const eventsContainer = document.getElementById('events-container');
  if (eventsContainer) {
    eventsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Awaiting events...</h3>
        <p>Events will appear here as they are received from the stream.</p>
      </div>
    `;
  }
  
  // Reset stats
  updateStats();
  
  // Reconnect to event stream with new type
  connectToEventStream();
  
  // Reload the page to show the correct templates
  // This is a simple approach - for a more sophisticated app,
  // we could dynamically load templates without a page reload
  window.location.href = `/?eventType=${newEventType}`;
}