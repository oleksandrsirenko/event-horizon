document.addEventListener('DOMContentLoaded', () => {
  // Core elements
  const alertsContainer = document.getElementById('alerts');
  const regionFilter = document.getElementById('region-filter');
  const severityFilter = document.getElementById('severity-filter');
  const typeFilter = document.getElementById('type-filter');
  const statusElement = document.getElementById('status');
  const emptyState = document.querySelector('.empty-state');
  
  // Connect to the server's event stream
  connectToEventStream();
  
  // Filter event handlers
  regionFilter.addEventListener('change', applyFilters);
  severityFilter.addEventListener('change', applyFilters);
  typeFilter.addEventListener('change', applyFilters);
  
  // Function to connect to the SSE endpoint
  function connectToEventStream() {
    // Update connection status to connecting
    updateConnectionStatus('connecting');
    
    // Create a new EventSource connection
    const eventSource = new EventSource('/stream/events');
    
    // Handle successful connection
    eventSource.onopen = () => {
      updateConnectionStatus('connected');
    };
    
    // Handle incoming events
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Skip connection messages
      if (data.type === 'connection') return;
      
      // Hide the empty state on first event
      if (emptyState && emptyState.style.display !== 'none') {
        emptyState.style.display = 'none';
      }
      
      // Create alert card for the event
      createAlertCard(data, true);
    };
    
    // Handle connection errors
    eventSource.onerror = () => {
      updateConnectionStatus('disconnected');
      
      // Close the current connection
      eventSource.close();
      
      // Try to reconnect after 3 seconds
      setTimeout(connectToEventStream, 3000);
    };
  }
  
  // Function to update connection status
  function updateConnectionStatus(status) {
    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusElement.className = status;
  }
  
  // Function to create an alert card
  function createAlertCard(alert, isNew = false) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert-card ${isNew ? 'new-alert' : ''}`;
    alertElement.dataset.region = alert.region;
    alertElement.dataset.severity = alert.severity;
    alertElement.dataset.type = alert.type;
    
    // Format timestamp
    const timestamp = new Date(alert.timestamp);
    const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    alertElement.innerHTML = `
      <div class="severity severity-${alert.severity}">${alert.severity}</div>
      <h3>${alert.title}</h3>
      
      <div class="alert-meta">
        <span><strong>Location:</strong> ${alert.location}</span>
        <span><strong>Type:</strong> ${alert.type.replace('-', ' ')}</span>
      </div>
      
      <div class="alert-body">
        <p><strong>Impact:</strong> ${alert.impact}</p>
        <p>${alert.details}</p>
      </div>
      
      <div class="timestamp">${formattedDate} at ${formattedTime}</div>
    `;
    
    if (isNew) {
      alertsContainer.insertBefore(alertElement, alertsContainer.firstChild);
    } else {
      alertsContainer.appendChild(alertElement);
    }
    
    // Apply current filters
    applyFilters();
  }
  
  // Function to apply filters to the alerts
  function applyFilters() {
    const regionValue = regionFilter.value;
    const severityValue = severityFilter.value;
    const typeValue = typeFilter.value;
    
    const alerts = document.querySelectorAll('.alert-card');
    
    alerts.forEach(alert => {
      const regionMatch = regionValue === 'all' || alert.dataset.region === regionValue;
      const severityMatch = severityValue === 'all' || alert.dataset.severity === severityValue;
      const typeMatch = typeValue === 'all' || alert.dataset.type === typeValue;
      
      alert.style.display = regionMatch && severityMatch && typeMatch ? 'block' : 'none';
    });
  }
});