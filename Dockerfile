# Use the official .NET 9 runtime as base image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Use the official .NET 9 SDK for building
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj files and restore dependencies
COPY ["CarAuction/src/CarAuction.API/CarAuction.API.csproj", "CarAuction.API/"]
COPY ["CarAuction/src/CarAuction.Application/CarAuction.Application.csproj", "CarAuction.Application/"]
COPY ["CarAuction/src/CarAuction.Domain/CarAuction.Domain.csproj", "CarAuction.Domain/"]
COPY ["CarAuction/src/CarAuction.Infrastructure/CarAuction.Infrastructure.csproj", "CarAuction.Infrastructure/"]

RUN dotnet restore "CarAuction.API/CarAuction.API.csproj"

# Copy the rest of the application code
COPY CarAuction/src/ .

# Build the application
RUN dotnet build "CarAuction.API/CarAuction.API.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "CarAuction.API/CarAuction.API.csproj" -c Release -o /app/publish

# Create the final runtime image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Create uploads directory
RUN mkdir -p /app/wwwroot/uploads

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:80

ENTRYPOINT ["dotnet", "CarAuction.API.dll"]
