# TrackIt — Live Bus Tracking System

A modular, organized web application for real-time bus tracking in Cagayan de Oro City.

## 📁 File Structure

```
trackit-cdo/
├── index.html              # Main HTML structure
├── styles.css              # All application styles
├── config.js               # Configuration & constants
├── utils.js                # Utility functions
├── map.js                  # Map functionality (Leaflet)
├── search.js               # Place search (Nominatim API)
├── sidebar.js              # Sidebar controls & UI
├── live.js                 # Live vehicle tracking
├── route.js                # Route management & suggestions
├── operating-hour.js       # Operating hours display
└── app.js                  # Main entry point
```

## 🗂️ Module Breakdown

### **index.html**
- Main HTML structure
- Sidebar layout (header, search, tabs, content)
- Map container and controls
- External library imports (Leaflet, Supabase, Font Awesome)

### **styles.css**
- Complete application styling
- CSS variables for theming
- Animations (fadeUp, pulse, spin, markerPop)
- Responsive sidebar and map layout
- Component styles (cards, badges, buttons, etc.)

### **config.js**
- Supabase credentials
- Map configuration (CDO center, bounding box)
- Color palettes for vehicles and routes
- Status badge mappings
- Category type mappings for place search
- Polling interval settings

### **utils.js**
- Geometry utilities (haversine distance calculation)
- Distance to polyline/segment calculations
- UI utilities (toast notifications, status updates)
- Device color management
- Tab switching functionality
- Sidebar toggle

### **map.js**
- Leaflet map initialization
- Map layer management (OSM, Satellite)
- Bus marker creation with heading arrows
- Place marker management
- Map controls (zoom, locate, layer toggle, refresh)
- Map info card management

### **search.js**
- Nominatim API integration
- Place category detection
- Autocomplete dropdown functionality
- Search result handling
- Keyboard navigation (arrows, enter, escape)
- Full search execution

### **sidebar.js**
- Tab management and switching
- Sidebar collapse/expand
- View toggles (live default, search results)
- Place card rendering and event handlers
- Search result UI management

### **live.js**
- Supabase client initialization
- GPS position fetching
- Real-time vehicle tracking
- Bus data rendering (sidebar cards + map markers)
- Real-time subscriptions (Postgres changes)
- Polling mechanism for updates
- Vehicle info card display

### **route.js**
- Route data fetching
- Route polyline rendering on map
- Route selection and highlighting
- Vehicle list per route (expandable)
- Route suggestions based on location
- Nearest vehicle calculations
- Route planning input handlers

### **operating-hour.js**
- Operating hours data fetching
- Operating hours card rendering
- First trip / last trip display

### **app.js**
- Main application initialization
- Module initialization orchestration
- Data loading coordinator
- Error handling
- DOM ready event handling

## 🚀 How It Works

1. **Initialization** (`app.js`):
   - Waits for DOM ready
   - Initializes all modules in sequence
   - Loads all data from Supabase

2. **Map Setup** (`map.js`):
   - Creates Leaflet map centered on CDO
   - Sets up OSM and Satellite layers
   - Initializes map controls

3. **Search** (`search.js`):
   - Connects to Nominatim API
   - Provides autocomplete suggestions
   - Renders search results with place cards

4. **Live Tracking** (`live.js`):
   - Fetches GPS positions from Supabase
   - Creates/updates bus markers on map
   - Subscribes to real-time database changes
   - Polls every 10 seconds for updates

5. **Route Display** (`route.js`):
   - Fetches routes from database
   - Draws polylines on map
   - Calculates route suggestions near search locations
   - Shows nearest vehicles to selected places

6. **Operating Hours** (`operating-hour.js`):
   - Displays first/last trip times
   - Organized by route

## 🔧 Key Features

### Modular Architecture
- Each module has a single responsibility
- Clean separation of concerns
- Easy to maintain and extend

### Real-time Updates
- WebSocket subscriptions via Supabase
- Fallback polling mechanism
- Automatic marker updates

### Smart Route Suggestions
- 200m threshold for route proximity
- Distance calculations using Haversine formula
- Shows nearest live vehicles

### Interactive Map
- Animated bus markers with heading arrows
- Route polylines with colors
- Place markers with category icons
- Info cards for vehicles and places

### Search Functionality
- Autocomplete with Nominatim API
- Category detection for places
- Keyboard navigation support
- Pattern-based location recognition

## 📦 Dependencies

- **Leaflet** 1.9.4 - Interactive maps
- **Supabase JS** 2.x - Real-time database
- **Font Awesome** 6.4.0 - Icons
- **DM Sans** - Typography

## 🎨 Design System

### Colors
- Navy: Primary brand color
- Accent (Blue): Interactive elements
- Success (Green): In-service vehicles
- Warning (Orange): Maintenance status
- Danger (Red): Out of service

### Components
- Cards, badges, buttons
- Toast notifications
- Loading spinners
- Empty states
- Autocomplete dropdowns

## 🔗 Integration Points

1. **Supabase Tables**:
   - `vehicle` - Vehicle information
   - `gps_position` - Real-time GPS data
   - `routes` - Route definitions
   - `driver` - Driver information

2. **External APIs**:
   - Nominatim (OpenStreetMap) - Place search
   - Google Maps - Directions
   - OpenStreetMap - Map sharing

## 🛠️ Customization

### Adding New Features
1. Create a new `.js` file for the module
2. Add it to `index.html` script imports
3. Initialize it in `app.js`
4. Export functions via `window` for cross-module access

### Styling
- Modify CSS variables in `styles.css`
- Colors, spacing, and animations are centralized
- Component styles follow BEM-like naming

### Configuration
- Update `config.js` for API keys, colors, etc.
- Map center and bounds can be changed
- Polling intervals and thresholds are configurable

## 📱 Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Geolocation API support
- ES6+ JavaScript features

---

**Made with ❤️ for Cagayan de Oro City**
