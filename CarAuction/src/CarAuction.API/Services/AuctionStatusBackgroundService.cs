using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using CarAuction.API.Hubs;
using CarAuction.Application.Interfaces;
using CarAuction.Application.Models;
using CarAuction.Domain.Entities;
using Microsoft.AspNetCore.SignalR;

namespace CarAuction.API.Services
{
    public class AuctionStatusBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<AuctionStatusBackgroundService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromSeconds(5); // Check every 5 seconds for more responsive status transitions
        private readonly IHubContext<AuctionHub> _hubContext;
        private int _fullUpdateCounter = 0; // Counter to track when to do full updates

        public AuctionStatusBackgroundService(
            IServiceProvider services,
            ILogger<AuctionStatusBackgroundService> logger,
            IHubContext<AuctionHub> hubContext)
        {
            _services = services;
            _logger = logger;
            _hubContext = hubContext;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Auction Status Background Service is starting at: {time}", DateTimeOffset.Now);
            
            // Track the last time we did a full update to prevent constant looping
            DateTime lastFullUpdateTime = DateTime.Now;
            int consecutiveEmptyUpdates = 0;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Log the start of each iteration with current time to track timing issues
                    _logger.LogDebug("Background service iteration starting at local time: {time}", DateTime.Now);
                    
                    var updatedCars = await UpdateCarStatuses();
                    if (updatedCars.Count > 0)
                    {
                        await NotifyStatusChanges(updatedCars);
                        consecutiveEmptyUpdates = 0; // Reset counter when we find updates
                    }
                    else
                    {
                        consecutiveEmptyUpdates++;
                        
                        // If we've had several consecutive empty updates, increase wait time temporarily
                        if (consecutiveEmptyUpdates > 5)
                        {
                            _logger.LogInformation("No updates for {count} consecutive checks, extending interval", consecutiveEmptyUpdates);
                            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // Wait longer
                            continue; // Skip the normal delay
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while updating auction statuses");
                }

                // Wait for the specified interval before checking again
                await Task.Delay(_interval, stoppingToken);
            }
        }

        private async Task<List<(int Id, string Status)>> UpdateCarStatuses()
        {
            // Create a scope to resolve scoped services
            using var scope = _services.CreateScope();
            var auctionService = scope.ServiceProvider.GetRequiredService<IAuctionService>();
            var carRepository = scope.ServiceProvider.GetRequiredService<ICarRepository>();
            
            // Use local time for checking, to match the UI and AuctionService
            var now = DateTime.Now;
            var updatedCars = new List<(int Id, string Status)>();
            
            try
            {
                _logger.LogDebug("Starting car status update check at local time {localTime}, UTC time {utcTime}", 
                    now, DateTime.UtcNow);
                
                // First, prioritize cars that should be starting or ending soon
                // Get upcoming auctions that should be starting now
                var upcomingCars = await carRepository.GetCarsByStatusAsync(CarStatus.UpcomingAuction);
                
                // Look for auctions that are exactly at or past their start time
                foreach (var car in upcomingCars.Where(c => c.AuctionStartDate.ToLocalTime() <= now))
                {
                    _logger.LogInformation("Car {carId} needs status update - Start time UTC:{startTime}/Local:{localStartTime} has passed, current local time: {now}", 
                        car.Id, car.AuctionStartDate, car.AuctionStartDate.ToLocalTime(), now);
                    
                    if (await auctionService.UpdateCarStatusAsync(car.Id))
                    {
                        _logger.LogInformation("Car {carId} status updated to OngoingAuction at: {time}", 
                            car.Id, DateTimeOffset.Now);
                        updatedCars.Add((car.Id, CarStatus.OngoingAuction.ToString()));
                    }
                    else
                    {
                        _logger.LogWarning("Car {carId} status update failed even though start time has passed", car.Id);
                    }
                }

                // Get ongoing auctions that should be ending now
                var ongoingCars = await carRepository.GetCarsByStatusAsync(CarStatus.OngoingAuction);
                foreach (var car in ongoingCars.Where(c => c.AuctionEndDate.ToLocalTime() <= now))
                {
                    _logger.LogInformation("Car {carId} needs status update - End time UTC:{endTime}/Local:{localEndTime} has passed, current local time: {now}", 
                        car.Id, car.AuctionEndDate, car.AuctionEndDate.ToLocalTime(), now);
                        
                    if (await auctionService.UpdateCarStatusAsync(car.Id))
                    {
                        var finalStatus = car.Bids.Any() ? CarStatus.Sold : CarStatus.NotSold;
                        _logger.LogInformation("Car {carId} status updated to {status} at: {time}", 
                            car.Id, finalStatus, DateTimeOffset.Now);
                        updatedCars.Add((car.Id, finalStatus.ToString()));
                    }
                    else
                    {
                        _logger.LogWarning("Car {carId} status update failed even though end time has passed", car.Id);
                    }
                }
                
                // Only do a full update scan periodically (every 30 seconds) to avoid constant scanning
                // Use a static counter to track when to do full updates
                _fullUpdateCounter++;
                if (_fullUpdateCounter >= 6) // Every 6 cycles (30 seconds with 5s interval)
                {
                    _fullUpdateCounter = 0; // Reset counter
                    
                    _logger.LogDebug("Performing full car status update scan");
                    int updatedCount = await auctionService.UpdateAllCarStatusesAsync();
                    
                    if (updatedCount > 0)
                    {
                        _logger.LogInformation("{count} car auction statuses updated at: {time}", 
                            updatedCount, DateTimeOffset.Now);
                        
                        var cars = await auctionService.GetAllCarsAsync();
                        foreach (var car in cars)
                        {
                            updatedCars.Add((car.Id, car.Status));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking for imminent status changes");
            }
            
            return updatedCars;
        }
        
        private async Task NotifyStatusChanges(List<(int Id, string Status)> updatedCars)
        {
            foreach (var (id, status) in updatedCars)
            {
                await _hubContext.Clients.Group($"car-{id}").SendAsync("CarStatusChanged", id, status);
                await _hubContext.Clients.Group("car-listings").SendAsync("CarStatusChanged", id, status);
                
                _logger.LogInformation("Notified clients of car {carId} status change to {status}", id, status);
            }
        }
    }
}
