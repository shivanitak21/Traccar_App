# Fleet Tracker

A professional fleet management mobile application built with React Native and Expo that integrates with the Elevatics IoT GPS tracking platform.

## Features

- **Secure Authentication** - Basic authentication with Elevatics IoT server
- **Real-time Dashboard** - Fleet statistics with animated charts and metrics
- **Live GPS Tracking** - Real-time device location tracking with WebSocket updates
- **Device Management** - Comprehensive device list with search and filtering
- **Route Playback** - Historical route playback with timeline controls
- **Geofence Management** - Create, edit, and manage geofences
- **Device Commands** - Send commands to devices (engine stop/resume, alerts, etc.)
- **Interactive Maps** - Real-time map view with all devices
- **Device Information** - Detailed device information and sensor readings

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (optional, for local development)
- Elevatics IoT server access

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Running the App

- **Web**: Press 'w' in the terminal or open the URL shown
- **Mobile**: Scan the QR code with Expo Go app (iOS/Android)

### Configuration

1. Launch the app
2. Enter your Elevatics IoT server URL
3. Log in with your Elevatics IoT credentials (email and password)

## Tech Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and build tools
- **Expo Router** - File-based navigation system
- **React Native Maps** - Native map integration
- **AsyncStorage** - Secure session persistence
- **WebSockets** - Real-time data updates
- **TypeScript** - Type-safe development

## Project Structure

```
/src
  /api          - Elevatics IoT API client and WebSocket integration
  /screens      - Application screens
  /components   - Reusable UI components
  /theme        - Design system (colors, typography)
  /utils        - Utility functions and helpers
/app
  /(tabs)       - Tab navigation (Dashboard, Devices, Map, Settings)
  /device/[id]  - Device-specific screens
  index.tsx     - Application entry point
```

## API Integration

The application integrates with the Elevatics IoT REST API:

- **Authentication**: Basic Auth with base64-encoded credentials
- **REST Endpoints**: Devices, positions, geofences, events, commands
- **WebSocket**: Real-time updates for positions, devices, and events

All API requests include the `Authorization: Basic {base64(email:password)}` header.

## Building for Production

```bash
# Type checking
npm run typecheck

# Web build
npm run build:web

# Lint code
npm run lint
```

## License

MIT
