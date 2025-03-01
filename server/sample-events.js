module.exports = [
  {
    id: 'evt-001',
    title: 'Port Congestion at Los Angeles',
    location: 'Los Angeles, USA',
    region: 'north-america',
    severity: 'high',
    type: 'port',
    impact: 'Delays of 3-5 days expected for all shipments',
    details: 'Labor shortages and increased volume causing significant backlog at container terminals.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'evt-002',
    title: 'Severe Weather Alert: Typhoon Approaching',
    location: 'South China Sea',
    region: 'asia',
    severity: 'medium',
    type: 'weather',
    impact: 'Possible shipping delays for routes through Southeast Asia',
    details: 'Typhoon Megi expected to make landfall within 48 hours. Shipping lanes may be affected.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'evt-003',
    title: 'Rail Infrastructure Maintenance',
    location: 'Central Europe',
    region: 'europe',
    severity: 'low',
    type: 'infrastructure',
    impact: 'Minor delays for rail freight across Germany',
    details: 'Scheduled maintenance on key rail corridors may cause slight delays for shipments this weekend.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'evt-004',
    title: 'Customs Strike at Rotterdam Port',
    location: 'Rotterdam, Netherlands',
    region: 'europe',
    severity: 'high',
    type: 'political',
    impact: 'Processing delays of up to 7 days expected',
    details: 'Customs officials have announced a 48-hour strike starting tomorrow. Significant processing backlogs anticipated.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'evt-005',
    title: 'Manufacturing Slowdown: Semiconductor Shortage',
    location: 'Taiwan',
    region: 'asia',
    severity: 'medium',
    type: 'infrastructure',
    impact: 'Production delays for electronic components',
    details: 'Major semiconductor manufacturer reports production issues affecting global supply chain.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'evt-006',
    title: 'Fuel Price Surge in South America',
    location: 'Brazil',
    region: 'south-america',
    severity: 'low',
    type: 'political',
    impact: 'Increased shipping costs expected',
    details: 'Recent policy changes have led to rising fuel prices affecting transportation costs.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'evt-007',
    title: 'Container Shortage Crisis',
    location: 'Global',
    region: 'all',
    severity: 'high',
    type: 'infrastructure',
    impact: 'Shipping rates increasing by 25-40%',
    details: 'Global imbalance in container distribution causing severe shortages in major export hubs.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'evt-008',
    title: 'Suez Canal Traffic Congestion',
    location: 'Egypt',
    region: 'africa',
    severity: 'medium',
    type: 'port',
    impact: 'Transit delays of 2-3 days',
    details: 'Higher than normal traffic volume causing congestion at both ends of the canal.',
    timestamp: new Date().toISOString()
  }
];