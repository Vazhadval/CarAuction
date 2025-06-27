# Car Auction Web Application

A simplified version of a car auction platform like Copart, built with .NET backend and React frontend.

## Features

- **Admin Panel**
  - Add cars to the auction
  - Manage car listings (approve/reject)
  - View statistics
  - Manage users

- **User Portal**
  - Register and login
  - Add cars for auction
  - Participate in real-time auctions
  - Track your own auctions and bids

## Technology Stack

### Backend
- **.NET** - Core framework
- **Entity Framework Core** - ORM for database operations
- **SQL Server** - Database
- **SignalR** - Real-time communications for bidding
- **JWT Authentication** - Secure user authentication

### Frontend
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Bootstrap** - UI components
- **Axios** - HTTP client
- **SignalR Client** - Real-time bidding functionality

## Architecture

The application follows Clean Architecture principles:

1. **Domain Layer** - Core business entities
2. **Application Layer** - Business logic and use cases
3. **Infrastructure Layer** - Database, external services integration
4. **API Layer** - Controllers, endpoints, and SignalR hubs
5. **Web Layer** - React frontend application

## Getting Started

### Prerequisites
- .NET 9.0+
- SQL Server
- Node.js and npm

### Setup

1. **Clone the repository**

2. **Setup the database**
   - Update the connection string in `appsettings.json` if needed
   - Apply migrations:
     ```
     cd src/CarAuction.API
     dotnet ef database update
     ```

3. **Run the API**
   ```
   cd src/CarAuction.API
   dotnet run --launch-profile https
   ```
   The API will be available at https://localhost:7000

4. **Run the React frontend**
   ```
   cd src/carauction.web
   npm install
   npm start
   ```
   The web app will be available at http://localhost:3000

### Default Admin Account
- Email: admin@carauction.com
- Password: Admin123!

## License
MIT
