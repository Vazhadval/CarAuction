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

        public AuctionService(ICarRepository carRepository, IBidRepository bidRepository)
        {
            _carRepository = carRepository;
            _bidRepository = bidRepository;
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
                    car.Status = car.Bids.Any() ? CarStatus.Sold : CarStatus.NotSold;
                    updated = true;
                    Console.WriteLine($"Bulk update: Car {car.Id} transitioning to {car.Status} at {now}");
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
                car.Status = car.Bids.Any() ? CarStatus.Sold : CarStatus.NotSold;
                needsUpdate = true;
                Console.WriteLine($"Transitioning car {car.Id} from OngoingAuction to {car.Status} at {now}");
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

        public async Task<CarDto?> AddCarAsync(CreateCarDto carDto, string sellerId)
        {
            // Get seller to satisfy required navigation property
            var seller = await _carRepository.GetSellerByIdAsync(sellerId);
            if (seller == null)
                return null;
                
            var car = new Car
            {
                Name = carDto.Name,
                Model = carDto.Model,
                Year = carDto.Year,
                StartPrice = carDto.StartPrice,
                Description = carDto.Description,
                PhotoUrl = carDto.PhotoUrl,
                AuctionStartDate = carDto.AuctionStartDate,
                AuctionEndDate = carDto.AuctionEndDate,
                SellerId = sellerId,
                Seller = seller,
                Status = CarStatus.PendingApproval,
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
                CurrentBid = highestBid?.Amount ?? 0,
                SellerName = $"{car.Seller?.FirstName} {car.Seller?.LastName}"
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
                CurrentBid = highestBid?.Amount ?? 0,
                SellerName = $"{car.Seller?.FirstName} {car.Seller?.LastName}",
                BidCount = car.Bids?.Count ?? 0,
                RecentBids = car.Bids?
                    .OrderByDescending(b => b.PlacedAt)
                    .Take(10)
                    .Select(b => new BidDto
                    {
                        Id = b.Id,
                        Amount = b.Amount,
                        PlacedAt = b.PlacedAt,
                        BidderName = $"{b.Bidder?.FirstName} {b.Bidder?.LastName}"
                    })
                    .ToList() ?? new List<BidDto>()
            };

            return carDetailsDto;
        }
    }
}
