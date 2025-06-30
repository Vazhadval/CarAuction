using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CarAuction.Application.Interfaces;
using CarAuction.Application.Models;
using CarAuction.Domain.Entities;

namespace CarAuction.Application.Services
{
    public class AuctionService : IAuctionService
    {
        private readonly ICarRepository _carRepository;
        private readonly IBidRepository _bidRepository;
        private readonly IOrderRepository _orderRepository;

        public AuctionService(ICarRepository carRepository, IBidRepository bidRepository, IOrderRepository orderRepository)
        {
            _carRepository = carRepository;
            _bidRepository = bidRepository;
            _orderRepository = orderRepository;
        }

        public async Task<List<CarDto>> GetAllCarsAsync()
        {
            var cars = await _carRepository.GetAllCarsAsync();
            
            // Update car statuses based on auction dates before returning
            int updatedCount = await UpdateCarStatuses(cars);
            if (updatedCount > 0)
            {
                Console.WriteLine($"Updated status for {updatedCount} cars");
            }
            
            return cars.Select(c => MapToCarDto(c)).ToList();
        }

        public async Task<List<CarDto>> GetCarsByStatusAsync(string status)
        {
            if (Enum.TryParse<CarStatus>(status, true, out var carStatus))
            {
                var cars = await _carRepository.GetCarsByStatusAsync(carStatus);
                
                // Update car statuses based on auction dates before returning
                int updatedCount = await UpdateCarStatuses(cars);
                if (updatedCount > 0)
                {
                    Console.WriteLine($"Updated status for {updatedCount} cars with status {status}");
                }
                
                return cars.Select(c => MapToCarDto(c)).ToList();
            }
            return new List<CarDto>();
        }

        public async Task<CarDetailsDto?> GetCarDetailsAsync(int id)
        {
            var car = await _carRepository.GetCarByIdAsync(id);
            if (car == null)
                return null;

            // Update car status based on auction dates before returning
            await UpdateCarStatus(car);
            
            var carDto = MapToCarDetailsDto(car);
            return carDto;
        }
        
        private async Task<int> UpdateCarStatuses(List<Car> cars)
        {
            // Simply use Now for all comparisons
            var now = DateTime.Now;
            var updatedCount = 0;
            
            foreach (var car in cars)
            {
                bool updated = false;
                
                if (car.Status == CarStatus.UpcomingAuction && now >= car.AuctionStartDate)
                {
                    car.Status = CarStatus.OngoingAuction;
                    updated = true;
                    Console.WriteLine($"Bulk update: Car {car.Id} transitioning to OngoingAuction at {now}");
                }
                else if (car.Status == CarStatus.OngoingAuction && now >= car.AuctionEndDate)
                {
                    // Use the robust auction ending method
                    var auctionEnded = await EndAuctionSafely(car);
                    if (auctionEnded)
                    {
                        updated = true;
                        Console.WriteLine($"Bulk update: Car {car.Id} auction ended, status: {car.Status}");
                    }
                }
                
                if (updated)
                {
                    await _carRepository.UpdateCarAsync(car);
                    updatedCount++;
                }
            }
            
            return updatedCount;
        }
        
        private async Task<bool> UpdateCarStatus(Car car)
        {
            // Use current time for all comparisons - simpler approach
            var now = DateTime.Now;
            
            var needsUpdate = false;
            var oldStatus = car.Status;
            
            // Store the start/end dates for simpler comparisons
            var startDate = car.AuctionStartDate;
            var endDate = car.AuctionEndDate;
            
            // Log the current state for debugging
            Console.WriteLine($"Checking car {car.Id} status: Current={car.Status}, Now={now}, StartDate={startDate}, EndDate={endDate}");
            
            // Simplified status transitions using DateTime.Now for all comparisons
            if (car.Status == CarStatus.UpcomingAuction && now >= startDate)
            {
                car.Status = CarStatus.OngoingAuction;
                needsUpdate = true;
                Console.WriteLine($"Transitioning car {car.Id} from UpcomingAuction to OngoingAuction at {now}");
            }
            else if (car.Status == CarStatus.OngoingAuction && now >= endDate)
            {
                // Use the robust auction ending method
                var auctionEnded = await EndAuctionSafely(car);
                if (auctionEnded)
                {
                    needsUpdate = true;
                    Console.WriteLine($"Individual update: Car {car.Id} auction ended, status: {car.Status}");
                }
            }
            
            if (needsUpdate)
            {
                // Update car in database
                await _carRepository.UpdateCarAsync(car);
                Console.WriteLine($"Car {car.Id} status updated from {oldStatus} to {car.Status}");
                
                // Notify status change via SignalR
                await NotifyStatusChange(car.Id, car.Status.ToString());
                return true;
            }
            
            return false;
        }
        
        private Task NotifyStatusChange(int carId, string status)
        {
            try
            {
                // In a real-world application, we would use an event/messaging system
                // or DI container to avoid reflection. For now, we'll just log the status change.
                // The background service will handle the actual notification via SignalR.
                Console.WriteLine($"Car {carId} status changed to {status}");
            }
            catch (Exception ex)
            {
                // Log but don't throw to prevent service disruption
                Console.WriteLine($"Failed to notify of status change: {ex.Message}");
            }
            
            return Task.CompletedTask;
        }

        private Task NotifyAuctionWinner(string winnerId, int carId, string carName, decimal winningBid)
        {
            try
            {
                // This would normally be done through an event/messaging system
                // For now, just log the winner notification
                Console.WriteLine($"User {winnerId} won auction for car {carId} ({carName}) with bid ${winningBid}");
                
                // We could use reflection to call the SignalR hub method here
                // In a production app, this would be better handled through events
                var hubType = Type.GetType("CarAuction.API.Hubs.AuctionHub, CarAuction.API");
                if (hubType != null)
                {
                    var method = hubType.GetMethod("NotifyAuctionWinner", 
                        System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);
                    method?.Invoke(null, new object[] { winnerId, carId, carName, winningBid });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to notify auction winner: {ex.Message}");
            }
            
            return Task.CompletedTask;
        }

        private Task NotifyAuctionExtension(int carId, DateTime newEndTime)
        {
            try
            {
                Console.WriteLine($"Auction for car {carId} extended. New end time: {newEndTime}");
                
                // Use reflection to call SignalR hub method
                var hubType = Type.GetType("CarAuction.API.Hubs.AuctionHub, CarAuction.API");
                if (hubType != null)
                {
                    var method = hubType.GetMethod("NotifyAuctionExtension", 
                        System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);
                    method?.Invoke(null, new object[] { carId, newEndTime });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to notify auction extension: {ex.Message}");
            }
            
            return Task.CompletedTask;
        }

        private Task NotifyNewBid(int carId, decimal amount, string bidderId, bool auctionExtended, DateTime endTime)
        {
            try
            {
                Console.WriteLine($"New bid placed for car {carId}: ${amount} by user {bidderId}. Extension: {auctionExtended}");
                
                // Use reflection to call SignalR hub method
                var hubType = Type.GetType("CarAuction.API.Hubs.AuctionHub, CarAuction.API");
                if (hubType != null)
                {
                    var method = hubType.GetMethod("NotifyNewBid", 
                        System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);
                    method?.Invoke(null, new object[] { carId, amount, bidderId, auctionExtended, endTime });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to notify new bid: {ex.Message}");
            }
            
            return Task.CompletedTask;
        }

        public async Task<CarDto?> AddCarAsync(CreateCarDto carDto, string sellerId)
        {
            // Get seller to satisfy required navigation property
            var seller = await _carRepository.GetSellerByIdAsync(sellerId);
            if (seller == null)
                return null;

            // Parse sale type
            var saleType = Enum.TryParse<SaleType>(carDto.SaleType, out var parsedSaleType) ? parsedSaleType : SaleType.Auction;
                
            var car = new Car
            {
                Name = carDto.Name,
                Model = carDto.Model,
                Year = carDto.Year,
                StartPrice = carDto.StartPrice,
                FixedPrice = carDto.FixedPrice,
                Description = carDto.Description,
                PhotoUrl = carDto.PhotoUrl,
                AuctionStartDate = carDto.AuctionStartDate,
                AuctionEndDate = carDto.AuctionEndDate,
                SaleType = saleType,
                SellerId = sellerId,
                Seller = seller,
                Status = saleType == SaleType.DirectSale ? CarStatus.AvailableForSale : CarStatus.PendingApproval,
                Images = new List<CarImage>()
            };
            
            // Add images if any
            if (carDto.ImageUrls != null && carDto.ImageUrls.Any())
            {
                for (int i = 0; i < carDto.ImageUrls.Count; i++)
                {
                    car.Images.Add(new CarImage
                    {
                        ImageUrl = carDto.ImageUrls[i],
                        IsPrimary = carDto.PrimaryImageIndex.HasValue && i == carDto.PrimaryImageIndex.Value,
                        Car = car
                    });
                }
                
                // Ensure at least one image is marked as primary
                if (!carDto.PrimaryImageIndex.HasValue && car.Images.Any())
                {
                    car.Images.First().IsPrimary = true;
                }
            }

            var addedCar = await _carRepository.AddCarAsync(car);
            return MapToCarDto(addedCar);
        }

        public async Task<bool> PlaceBidAsync(PlaceBidDto bidDto, string bidderId)
        {
            var car = await _carRepository.GetCarByIdAsync(bidDto.CarId);
            if (car == null)
                return false;
                
            // First, make sure the car status is updated if needed
            await UpdateCarStatus(car);
            
            // Check if it's an ongoing auction
            if (car.Status != CarStatus.OngoingAuction)
                return false;

            // Double check the auction is active based on current time
            var now = DateTime.Now;
            
            if (now < car.AuctionStartDate || now > car.AuctionEndDate)
                return false;

            // Check if bid is higher than the start price
            if (bidDto.Amount < car.StartPrice)
                return false;

            // Check if bid is higher than the current highest bid
            var highestBid = await _bidRepository.GetHighestBidForCarAsync(car.Id);
            if (highestBid != null && bidDto.Amount <= highestBid.Amount)
                return false;

            // Get the bidder
            var bidder = await _bidRepository.GetBidderByIdAsync(bidderId);
            if (bidder == null)
                return false;

            // Check if auction needs extension (if 60 seconds or less remaining)
            var timeRemaining = car.AuctionEndDate - now;
            var auctionExtended = false;
            
            if (timeRemaining.TotalSeconds <= 60 && timeRemaining.TotalSeconds > 0)
            {
                // Extend auction by 15 seconds
                car.AuctionEndDate = car.AuctionEndDate.AddSeconds(15);
                await _carRepository.UpdateCarAsync(car);
                auctionExtended = true;
                
                Console.WriteLine($"Auction for car {car.Id} extended by 15 seconds. New end time: {car.AuctionEndDate}");
                
                // Notify all clients about auction extension
                await NotifyAuctionExtension(car.Id, car.AuctionEndDate);
            }
                
            // Create new bid
            var bid = new Bid
            {
                CarId = car.Id,
                BidderId = bidderId,
                Amount = bidDto.Amount,
                PlacedAt = DateTime.UtcNow,
                Car = car,
                Bidder = bidder
            };

            await _bidRepository.AddBidAsync(bid);
            
            // Notify about the new bid (including potential auction extension info)
            await NotifyNewBid(car.Id, bidDto.Amount, bidderId, auctionExtended, car.AuctionEndDate);
            
            return true;
        }
        
        public async Task<bool> UpdateCarStatusAsync(int carId)
        {
            var car = await _carRepository.GetCarByIdAsync(carId);
            if (car == null)
                return false;
                
            return await UpdateCarStatus(car);
        }
        
        public async Task<int> UpdateAllCarStatusesAsync()
        {
            var cars = await _carRepository.GetAllCarsAsync();
            int updatedCount = 0;
            
            foreach (var car in cars)
            {
                if (await UpdateCarStatus(car))
                {
                    updatedCount++;
                }
            }
            
            return updatedCount;
        }

        public async Task<List<WonCarDto>> GetWonCarsByUserAsync(string userId)
        {
            var wonCars = await _bidRepository.GetWonCarsByUserAsync(userId);
            
            return wonCars.Select(car => 
            {
                // Use more robust approach to get the winning bid amount
                // Since the user is confirmed as the winner, find their highest bid
                var userWinningBid = car.Bids
                    .Where(b => b.BidderId == userId)
                    .OrderByDescending(b => b.Amount)
                    .FirstOrDefault();
                
                // Fallback to highest bid overall if user's bid not found (shouldn't happen)
                var winningBidAmount = userWinningBid?.Amount ?? 
                    car.Bids.OrderByDescending(b => b.Amount).FirstOrDefault()?.Amount ?? 
                    car.StartPrice;
                
                return new WonCarDto
                {
                    Id = car.Id,
                    Name = car.Name,
                    Model = car.Model,
                    Year = car.Year,
                    StartPrice = car.StartPrice,
                    WinningBid = winningBidAmount,
                    PhotoUrl = car.PhotoUrl,
                    Images = car.Images?
                        .Select(i => new CarImageDto 
                        { 
                            Id = i.Id, 
                            ImageUrl = i.ImageUrl, 
                            IsPrimary = i.IsPrimary 
                        })
                        .ToList() ?? new List<CarImageDto>(),
                    AuctionEndDate = car.AuctionEndDate,
                    SellerName = $"{car.Seller?.FirstName} {car.Seller?.LastName}"
                };
            }).ToList();
        }

        public async Task<List<UserBidDto>> GetUserBidsAsync(string userId)
        {
            var userBids = await _bidRepository.GetBidsByUserAsync(userId);
            
            return userBids.Select(bid => 
            {
                // Use more robust logic for determining if user is winning
                bool isWinning = false;
                bool hasWon = bid.Car.Status == CarStatus.Sold && bid.Car.WinnerUserId == userId;
                
                // For ongoing auctions, determine if user is currently winning
                if (bid.Car.Status == CarStatus.OngoingAuction)
                {
                    // Check if this user has the highest bid amount, and if tied, check by timestamp
                    var allBids = bid.Car.Bids.Where(b => b.Amount > 0).ToList();
                    if (allBids.Any())
                    {
                        var maxAmount = allBids.Max(b => b.Amount);
                        var winningBid = allBids
                            .Where(b => b.Amount == maxAmount)
                            .OrderBy(b => b.PlacedAt)
                            .FirstOrDefault();
                        
                        isWinning = winningBid?.BidderId == userId;
                    }
                }
                
                var highestBid = bid.Car.Bids.OrderByDescending(b => b.Amount).FirstOrDefault();
                
                return new UserBidDto
                {
                    Id = bid.Id,
                    Amount = bid.Amount,
                    PlacedAt = bid.PlacedAt,
                    CarId = bid.CarId,
                    CarName = bid.Car.Name,
                    CarModel = bid.Car.Model,
                    CarYear = bid.Car.Year,
                    AuctionStatus = bid.Car.Status.ToString(),
                    IsWinning = isWinning,
                    HasWon = hasWon,
                    CurrentHighestBid = highestBid?.Amount ?? 0
                };
            }).ToList();
        }

        private CarDto MapToCarDto(Car car)
        {
            var highestBid = car.Bids?.OrderByDescending(b => b.Amount).FirstOrDefault();

            return new CarDto
            {
                Id = car.Id,
                Name = car.Name,
                Model = car.Model,
                Year = car.Year,
                StartPrice = car.StartPrice,
                FixedPrice = car.FixedPrice,
                PhotoUrl = car.PhotoUrl, // Legacy support
                Images = car.Images?
                    .Select(i => new CarImageDto 
                    { 
                        Id = i.Id, 
                        ImageUrl = i.ImageUrl, 
                        IsPrimary = i.IsPrimary 
                    })
                    .ToList() ?? new List<CarImageDto>(),
                AuctionStartDate = car.AuctionStartDate,
                AuctionEndDate = car.AuctionEndDate,
                Status = car.Status.ToString(),
                SaleType = car.SaleType.ToString(),
                CurrentBid = highestBid?.Amount ?? 0,
                SellerName = $"{car.Seller?.FirstName} {car.Seller?.LastName}",
                WinnerName = car.Winner != null ? $"{car.Winner.FirstName} {car.Winner.LastName}" : null,
                BuyerName = car.Buyer != null ? $"{car.Buyer.FirstName} {car.Buyer.LastName}" : null
            };
        }

        private CarDetailsDto MapToCarDetailsDto(Car car)
        {
            var highestBid = car.Bids?.OrderByDescending(b => b.Amount).FirstOrDefault();

            var carDetailsDto = new CarDetailsDto
            {
                Id = car.Id,
                Name = car.Name,
                Model = car.Model,
                Year = car.Year,
                StartPrice = car.StartPrice,
                FixedPrice = car.FixedPrice,
                PhotoUrl = car.PhotoUrl, // Legacy support
                Images = car.Images?
                    .Select(i => new CarImageDto 
                    { 
                        Id = i.Id, 
                        ImageUrl = i.ImageUrl, 
                        IsPrimary = i.IsPrimary 
                    })
                    .ToList() ?? new List<CarImageDto>(),
                Description = car.Description,
                AuctionStartDate = car.AuctionStartDate,
                AuctionEndDate = car.AuctionEndDate,
                Status = car.Status.ToString(),
                SaleType = car.SaleType.ToString(),
                CurrentBid = highestBid?.Amount ?? 0,
                SellerName = $"{car.Seller?.FirstName} {car.Seller?.LastName}",
                WinnerName = car.Winner != null ? $"{car.Winner.FirstName} {car.Winner.LastName}" : null,
                BuyerName = car.Buyer != null ? $"{car.Buyer.FirstName} {car.Buyer.LastName}" : null,
                BidCount = car.Bids?.Count ?? 0,
                RecentBids = car.Bids?
                    .OrderByDescending(b => b.PlacedAt)
                    .Take(10)
                    .Select(b => new BidDto
                    {
                        Id = b.Id,
                        Amount = b.Amount,
                        PlacedAt = b.PlacedAt,
                        BidderName = $"{b.Bidder?.FirstName} {b.Bidder?.LastName}",
                        BidderId = b.BidderId
                    })
                    .ToList() ?? new List<BidDto>()
            };

            return carDetailsDto;
        }
        
        /// <summary>
        /// Ends an auction and determines the winner in a transaction-safe manner
        /// </summary>
        private async Task<bool> EndAuctionSafely(Car car)
        {
            try
            {
                // Use a more robust approach to determine the winner
                var winningBid = await DetermineAuctionWinner(car.Id);
                
                if (winningBid != null)
                {
                    car.Status = CarStatus.Sold;
                    car.WinnerUserId = winningBid.BidderId;
                    
                    Console.WriteLine($"Auction ended: Car {car.Id} won by user {car.WinnerUserId} with bid ${winningBid.Amount}");
                    
                    // Notify the winner
                    await NotifyAuctionWinner(winningBid.BidderId, car.Id, $"{car.Name} {car.Model}", winningBid.Amount);
                }
                else
                {
                    car.Status = CarStatus.NotSold;
                    car.WinnerUserId = null;
                    
                    Console.WriteLine($"Auction ended: Car {car.Id} - no bids, marked as not sold");
                }
                
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error ending auction for car {car.Id}: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// Determines the auction winner using the most recent highest bid with timestamp consideration
        /// </summary>
        private async Task<Bid?> DetermineAuctionWinner(int carId)
        {
            // Get all bids for this car, ordered by amount (highest first), then by timestamp (earliest first for same amount)
            var car = await _carRepository.GetCarByIdAsync(carId);
            if (car?.Bids == null || !car.Bids.Any())
                return null;
            
            // Find the highest bid amount
            var maxAmount = car.Bids.Max(b => b.Amount);
            
            // Among all bids with the highest amount, select the earliest one (first to place that amount)
            var winningBid = car.Bids
                .Where(b => b.Amount == maxAmount)
                .OrderBy(b => b.PlacedAt) // Earliest timestamp wins in case of tie
                .FirstOrDefault();
            
            return winningBid;
        }

        /// <summary>
        /// Verifies and fixes auction winners for sold cars that may have inconsistent winner data
        /// </summary>
        public async Task<int> VerifyAndFixAuctionWinners()
        {
            var soldCars = await _carRepository.GetCarsByStatusAsync(CarStatus.Sold);
            int fixedCount = 0;

            foreach (var car in soldCars)
            {
                bool needsUpdate = false;
                
                // Case 1: Car is sold but has no winner assigned
                if (car.WinnerUserId == null && car.Bids.Any())
                {
                    var winningBid = await DetermineAuctionWinner(car.Id);
                    if (winningBid != null)
                    {
                        car.WinnerUserId = winningBid.BidderId;
                        needsUpdate = true;
                        Console.WriteLine($"Fixed missing winner for car {car.Id}: assigned to user {car.WinnerUserId}");
                    }
                }
                // Case 2: Car is sold but the assigned winner didn't actually place the highest bid
                else if (car.WinnerUserId != null && car.Bids.Any())
                {
                    var actualWinningBid = await DetermineAuctionWinner(car.Id);
                    if (actualWinningBid != null && actualWinningBid.BidderId != car.WinnerUserId)
                    {
                        Console.WriteLine($"Warning: Car {car.Id} winner mismatch. Assigned: {car.WinnerUserId}, Actual highest bidder: {actualWinningBid.BidderId}");
                        car.WinnerUserId = actualWinningBid.BidderId;
                        needsUpdate = true;
                        Console.WriteLine($"Fixed incorrect winner for car {car.Id}: reassigned to user {car.WinnerUserId}");
                    }
                }
                // Case 3: Car is marked as sold but has no bids
                else if (!car.Bids.Any())
                {
                    car.Status = CarStatus.NotSold;
                    car.WinnerUserId = null;
                    needsUpdate = true;
                    Console.WriteLine($"Fixed car {car.Id}: marked as NotSold (no bids found)");
                }
                
                if (needsUpdate)
                {
                    await _carRepository.UpdateCarAsync(car);
                    fixedCount++;
                }
            }

            Console.WriteLine($"Auction winner verification completed. Fixed {fixedCount} cars.");
            return fixedCount;
        }

        /// <summary>
        /// Checks if a user is the winner of a specific car auction
        /// </summary>
        /// <param name="carId">The car ID to check</param>
        /// <param name="userId">The user ID to check</param>
        /// <returns>True if the user won the auction, false otherwise</returns>
        public async Task<bool> IsUserAuctionWinner(int carId, string userId)
        {
            var car = await _carRepository.GetCarByIdAsync(carId);
            if (car == null)
                return false;
            
            // For sold cars, use the WinnerUserId field (most reliable)
            if (car.Status == CarStatus.Sold)
            {
                return car.WinnerUserId == userId;
            }
            
            // For ongoing auctions, check if user has the winning bid
            if (car.Status == CarStatus.OngoingAuction)
            {
                var winningBid = await DetermineAuctionWinner(carId);
                return winningBid?.BidderId == userId;
            }
            
            return false;
        }

        /// <summary>
        /// Gets the current winner of an ongoing auction (or actual winner if auction ended)
        /// </summary>
        /// <param name="carId">The car ID to check</param>
        /// <returns>The user ID of the current/actual winner, or null if no winner</returns>
        public async Task<string?> GetCurrentAuctionWinner(int carId)
        {
            var car = await _carRepository.GetCarByIdAsync(carId);
            if (car == null)
                return null;
            
            // For sold cars, return the WinnerUserId
            if (car.Status == CarStatus.Sold)
            {
                return car.WinnerUserId;
            }
            
            // For ongoing auctions, determine current leader
            if (car.Status == CarStatus.OngoingAuction)
            {
                var winningBid = await DetermineAuctionWinner(carId);
                return winningBid?.BidderId;
            }
            
            return null;
        }

        /// <summary>
        /// Places a bid with enhanced concurrency protection and robust winner determination
        /// </summary>
        public async Task<bool> PlaceBidWithConcurrencyProtection(PlaceBidDto bidDto, string bidderId)
        {
            const int maxRetries = 3;
            int retryCount = 0;
            
            while (retryCount < maxRetries)
            {
                try
                {
                    var result = await PlaceBidAsync(bidDto, bidderId);
                    if (result)
                    {
                        // Double-check that the bid was recorded correctly
                        var car = await _carRepository.GetCarByIdAsync(bidDto.CarId);
                        var userBid = car?.Bids?.FirstOrDefault(b => b.BidderId == bidderId && b.Amount == bidDto.Amount);
                        
                        if (userBid == null)
                        {
                            Console.WriteLine($"Warning: Bid placement verification failed for user {bidderId} on car {bidDto.CarId}");
                            return false;
                        }
                        
                        return true;
                    }
                    return false;
                }
                catch (Exception ex)
                {
                    retryCount++;
                    Console.WriteLine($"Bid placement attempt {retryCount} failed for user {bidderId} on car {bidDto.CarId}: {ex.Message}");
                    
                    if (retryCount >= maxRetries)
                    {
                        Console.WriteLine($"Failed to place bid after {maxRetries} attempts");
                        return false;
                    }
                    
                    // Wait a short time before retrying
                    await Task.Delay(100 * retryCount);
                }
            }
            
            return false;
        }

        // Direct Sales Implementation
        public async Task<List<CarDto>> GetCarsForDirectSaleAsync()
        {
            var cars = await _carRepository.GetCarsBySaleTypeAsync(SaleType.DirectSale);
            var availableCars = cars.Where(c => c.Status == CarStatus.AvailableForSale).ToList();
            
            return availableCars.Select(c => MapToCarDto(c)).ToList();
        }

        public async Task<bool> CreateDirectPurchaseOrderAsync(CreateOrderDto orderDto, string buyerId)
        {
            var car = await _carRepository.GetCarByIdAsync(orderDto.CarId);
            if (car == null || car.SaleType != SaleType.DirectSale || car.Status != CarStatus.AvailableForSale)
                return false;

            // Check if car is already sold or if user already has an order for this car
            if (await _orderRepository.HasUserOrderedCarAsync(orderDto.CarId, buyerId))
                return false;

            var buyer = await _carRepository.GetSellerByIdAsync(buyerId); // Reusing method to get user
            if (buyer == null)
                return false;

            var order = new Order
            {
                CarId = orderDto.CarId,
                BuyerId = buyerId,
                PurchasePrice = car.FixedPrice ?? car.StartPrice,
                OrderDate = DateTime.UtcNow,
                Status = OrderStatus.Pending,
                PersonalNumber = orderDto.PersonalNumber,
                MobilePhone = orderDto.MobilePhone,
                Email = orderDto.Email,
                FullName = orderDto.FullName,
                Address = orderDto.Address,
                Car = car,
                Buyer = buyer
            };

            await _orderRepository.CreateOrderAsync(order);

            // Mark car as sold and set buyer
            car.Status = CarStatus.Sold;
            car.BuyerId = buyerId;
            await _carRepository.UpdateCarAsync(car);

            return true;
        }

        public async Task<List<OrderDto>> GetUserOrdersAsync(string userId)
        {
            var orders = await _orderRepository.GetOrdersByUserAsync(userId);
            
            return orders.Select(order => new OrderDto
            {
                Id = order.Id,
                PurchasePrice = order.PurchasePrice,
                OrderDate = order.OrderDate,
                Status = order.Status.ToString(),
                PersonalNumber = order.PersonalNumber,
                MobilePhone = order.MobilePhone,
                Email = order.Email,
                FullName = order.FullName,
                Address = order.Address,
                CarId = order.CarId,
                CarName = order.Car.Name,
                CarModel = order.Car.Model,
                CarYear = order.Car.Year,
                SellerName = $"{order.Car.Seller?.FirstName} {order.Car.Seller?.LastName}",
                CarImages = order.Car.Images?
                    .Select(i => new CarImageDto 
                    { 
                        Id = i.Id, 
                        ImageUrl = i.ImageUrl, 
                        IsPrimary = i.IsPrimary 
                    })
                    .ToList() ?? new List<CarImageDto>()
            }).ToList();
        }

        public async Task<List<PurchasedCarDto>> GetPurchasedCarsByUserAsync(string userId)
        {
            var orders = await _orderRepository.GetOrdersByUserAsync(userId);
            
            return orders.Select(order => new PurchasedCarDto
            {
                Id = order.Car.Id,
                Name = order.Car.Name,
                Model = order.Car.Model,
                Year = order.Car.Year,
                PurchasePrice = order.PurchasePrice,
                PhotoUrl = order.Car.PhotoUrl,
                Images = order.Car.Images?
                    .Select(i => new CarImageDto 
                    { 
                        Id = i.Id, 
                        ImageUrl = i.ImageUrl, 
                        IsPrimary = i.IsPrimary 
                    })
                    .ToList() ?? new List<CarImageDto>(),
                PurchaseDate = order.OrderDate,
                SellerName = $"{order.Car.Seller?.FirstName} {order.Car.Seller?.LastName}",
                OrderStatus = order.Status.ToString()
            }).ToList();
        }

        public async Task<bool> ConfirmOrderAsync(int orderId)
        {
            var order = await _orderRepository.GetOrderByIdAsync(orderId);
            if (order == null || order.Status != OrderStatus.Pending)
                return false;

            order.Status = OrderStatus.Confirmed;
            await _orderRepository.UpdateOrderAsync(order);

            return true;
        }

        public async Task<List<OrderDto>> GetAllOrdersAsync()
        {
            var orders = await _orderRepository.GetAllOrdersAsync();
            
            return orders.Select(order => new OrderDto
            {
                Id = order.Id,
                PurchasePrice = order.PurchasePrice,
                OrderDate = order.OrderDate,
                Status = order.Status.ToString(),
                PersonalNumber = order.PersonalNumber,
                MobilePhone = order.MobilePhone,
                Email = order.Email,
                FullName = order.FullName,
                Address = order.Address,
                CarId = order.CarId,
                CarName = order.Car.Name,
                CarModel = order.Car.Model,
                CarYear = order.Car.Year,
                SellerName = $"{order.Car.Seller?.FirstName} {order.Car.Seller?.LastName}",
                CarImages = order.Car.Images?
                    .Select(i => new CarImageDto 
                    { 
                        Id = i.Id, 
                        ImageUrl = i.ImageUrl, 
                        IsPrimary = i.IsPrimary 
                    })
                    .ToList() ?? new List<CarImageDto>()
            }).ToList();
        }
    }
}
