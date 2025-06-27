# GitHub Copilot Instructions for Car Auction Project

## Project Overview
This is a car auction web application built with .NET (backend) and React/TypeScript (frontend). It allows users to register, add cars for auction, and participate in real-time bidding. It also includes an admin panel for managing cars and users.

## Architecture
- Backend: Clean Architecture (.NET)
  - Domain Layer: Core entities
  - Application Layer: Business logic, interfaces, DTOs
  - Infrastructure Layer: Database operations, repositories
  - API Layer: Controllers, SignalR hub
- Frontend: React/TypeScript
  - Components organized by feature
  - Type definitions matching backend DTOs
  - Services for API and SignalR interactions

## Key Files and Directories

### Backend
- `src/CarAuction.Domain/Entities/`: Core domain entities (Car, Bid, ApplicationUser)
- `src/CarAuction.Application/Interfaces/`: Repository and service interfaces
- `src/CarAuction.Application/Models/`: DTOs for API communication
- `src/CarAuction.Application/Services/`: Business logic implementations
- `src/CarAuction.Infrastructure/Data/`: Database context and configurations
- `src/CarAuction.Infrastructure/Repositories/`: Data access implementations
- `src/CarAuction.API/Controllers/`: API endpoints
- `src/CarAuction.API/Hubs/`: SignalR hub for real-time bidding

### Frontend
- `src/carauction.web/src/components/`: React components
- `src/carauction.web/src/services/`: API and SignalR services
- `src/carauction.web/src/types/`: TypeScript interface definitions

## Development Workflow
1. Add/update domain entities in Domain layer
2. Define interfaces and DTOs in Application layer
3. Implement services in Application layer
4. Implement repositories in Infrastructure layer
5. Add/update controllers in API layer
6. Update TypeScript interfaces in Frontend to match backend DTOs
7. Implement React components to consume the API

## Common Tasks

### Adding a New Entity
1. Create entity class in Domain layer
2. Add to ApplicationDbContext in Infrastructure layer
3. Create repository interface and implementation
4. Create DTOs in Application layer
5. Create service interface and implementation
6. Add controller with endpoints
7. Add TypeScript interface in frontend
8. Create React components to interact with the entity

### Adding Real-time Features
1. Add methods to AuctionHub in API layer
2. Update signalRService in frontend
3. Use the service in React components

## Database Migrations
To create a new migration:
```
cd src/CarAuction.API
dotnet ef migrations add MigrationName --project ../CarAuction.Infrastructure
dotnet ef database update
```

## Running the Application
1. Start backend: `cd src/CarAuction.API && dotnet run`
2. Start frontend: `cd src/carauction.web && npm start`
