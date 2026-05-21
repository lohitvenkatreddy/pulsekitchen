# Design Document: Restaurant Mapping and ETA Feature

## Overview

This design document specifies the technical architecture for integrating GPS-based restaurant mapping with real-time route calculation and ETA display in the React Native food delivery application. The feature enables users to visualize restaurant locations on an interactive Mapbox GL map, view actual road routes from their current location to the selected restaurant, and receive accurate estimated delivery times based on real-world traffic and road conditions.

### Key Capabilities

- **Real-time Location Tracking**: Utilizes device GPS through React Native's Expo Location API to obtain high-accuracy user coordinates
- **Interactive Mapping**: Renders an interactive map using Mapbox GL React Native SDK with custom markers for user and restaurant locations
- **Route Visualization**: Displays actual road routes by integrating with the Mapbox Directions API, showing the precise path delivery will take
- **Accurate ETA Calculation**: Provides realistic delivery time estimates based on Mapbox's traffic-aware routing algorithms
- **Intelligent Caching**: Implements session-based caching to minimize API calls and improve performance
- **Secure Token Management**: Manages Mapbox API credentials securely through environment variables

### Technology Stack

- **Mapping Library**: `@rnmapbox/maps` (React Native Mapbox GL SDK)
- **Location Services**: `expo-location` (already installed)
- **HTTP Client**: `axios` (existing API service with retry logic)
- **State Management**: Redux Toolkit (existing store architecture)
- **Caching**: In-memory JavaScript Map for session-based route caching
- **External API**: Mapbox Directions API v5

## Architecture

### System Architecture Diagram

```mermaid
graph TB
    subgraph "React Native Mobile App"
        UI[Map Screen Component]
        LM[Location Manager]
        RC[Route Calculator]
        EC[ETA Calculator]
        MR[Map Renderer]
        TM[Token Manager]
        SC[Session Cache]
        
        UI --> LM
        UI --> RC
        UI --> MR
        RC --> EC
        RC --> SC
        RC --> TM
        MR --> UI
        
        subgraph "Redux Store"
            MS[Map Slice]
            RS[Restaurant Slice]
        end
        
        UI --> MS
        UI --> RS
    end
    
    subgraph "Device Services"
        GPS[GPS/Location Service]
        LM --> GPS
    end
    
    subgraph "External Services"
        MAPI[Mapbox Directions API]
        RC --> MAPI
    end
    
    subgraph "Backend"
        DB[(Restaurant Database)]
        RS --> DB
    end
