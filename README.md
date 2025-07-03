# Scrum Poker Backend

Backend API and real-time server for the Scrum Poker application - a planning poker tool for agile teams to facilitate story point estimation sessions.

**🌐 Live at: [scrum-poker.site](https://scrum-poker.site)**

**🔗 Frontend Repository: [scrum-poker-react](https://github.com/OriLapushner/scrum-poker-react)**

## 🚀 Features

- **Real-time Communication**: WebSocket server using Socket.IO for instant updates across all participants
- **Room Management**: Create, join, and manage estimation rooms with multiple participants
- **Guest Management**: Handle user connections, disconnections, and room assignments
- **Vote Processing**: Process and validate voting data from participants
- **Data Validation**: Robust input validation using Joi schemas
- **Scalable Architecture**: Clean entity-based architecture for maintainable code

## 📋 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Real-time Communication**: Socket.IO
- **Validation**: Joi
- **Development**: Nodemon, ESLint
- **Deployment**: Docker support

## 🏗️ Architecture

- **Entities**: Room, Guest, RoomsManager for clean separation of concerns
- **Request Handlers**: Centralized handling of client requests
- **Data Schemas**: Joi validation schemas for type-safe data processing
- **Services**: Socket.IO service management for real-time features

## 🛠️ Setup & Development

### Prerequisites

- Node.js 18+ and npm/yarn
- TypeScript

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp example.env .env

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Docker

```bash
# Build Docker image
docker build -t scrum-poker-backend .

# Run container
docker run -p 3001:3001 scrum-poker-backend
```

## 🔗 Frontend Integration

This backend serves the [Scrum Poker React frontend](https://github.com/OriLapushner/scrum-poker-react) and handles:

- WebSocket connections for real-time voting updates
- Room creation and management
- Guest session handling
- Vote data processing and storage

## 📝 API Endpoints

The backend primarily uses Socket.IO for real-time communication, with REST endpoints for initial setup and health checks.

## 🚀 Deployment

The application is configured for deployment with Docker and includes SSL certificate management for secure connections.
