/* ══════════════════════════════════════════════════════════════════════════
   TrackIt — Configuration
   ══════════════════════════════════════════════════════════════════════════ */

// Supabase Configuration
const SUPABASE_URL = 'https://tvbzpdjsyuxiguqrpfag.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2YnpwZGpzeXV4aWd1cXJwZmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzgxMDgsImV4cCI6MjA4ODM1NDEwOH0.JS04q7iiTPVnGIKS9kCa6sFzl0Cr6ot2rx-jTs9m6dQ';

// Map Configuration
const CDO_CENTER = [8.485, 124.6468];
const CDO_BBOX = '124.5200,8.3600,124.7800,8.6200';

// Color Palettes
const VEHICLE_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#d97706', // Orange
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#0284c7', // Cyan
  '#ea580c', // Dark Orange
  '#059669'  // Emerald
];

// Status Badge Mappings
const STATUS_BADGE = {
  in_service: 'green',
  available: 'blue',
  maintenance: 'orange',
  out_of_service: 'red'
};

const DEVICE_STATUS = {
  registered: 'green',
  unregistered: 'orange',
  unassigned: 'navy',
  inactive: 'red'
};

// Route Suggestion Threshold (200 meters = 0.2 km)
const ROUTE_SUGGEST_THRESHOLD_KM = 0.2;

// Category Type Mappings for Place Search
const CAT_TYPE = {
  restaurant: 'food',
  cafe: 'food',
  fast_food: 'food',
  bakery: 'food',
  mall: 'shop',
  supermarket: 'shop',
  department_store: 'shop',
  marketplace: 'shop',
  school: 'edu',
  university: 'edu',
  college: 'edu',
  library: 'edu',
  hospital: 'health',
  clinic: 'health',
  pharmacy: 'health',
  dentist: 'health',
  bank: 'gov',
  atm: 'gov',
  police: 'gov',
  townhall: 'gov',
  place_of_worship: 'gov',
  fuel: 'transport',
  bus_station: 'transport',
  hotel: 'hotel',
  motel: 'hotel',
  park: 'leisure',
  garden: 'leisure',
  sports_centre: 'leisure',
  stadium: 'leisure'
};

// Category Display Information
const CAT_INFO = {
  food: { icon: 'fa-utensils', cls: 'ic-food', label: 'Food & Drink' },
  shop: { icon: 'fa-store', cls: 'ic-shop', label: 'Mall / Market' },
  edu: { icon: 'fa-graduation-cap', cls: 'ic-edu', label: 'School / Univ' },
  health: { icon: 'fa-hospital', cls: 'ic-health', label: 'Health' },
  gov: { icon: 'fa-landmark', cls: 'ic-gov', label: 'Government' },
  transport: { icon: 'fa-bus', cls: 'ic-transport', label: 'Transport' },
  hotel: { icon: 'fa-bed', cls: 'ic-hotel', label: 'Hotel' },
  leisure: { icon: 'fa-tree', cls: 'ic-leisure', label: 'Park / Leisure' },
  default: { icon: 'fa-location-dot', cls: 'ic-default', label: 'Place' }
};

// Polling Configuration
const POLLING_INTERVAL = 10000; // 10 seconds