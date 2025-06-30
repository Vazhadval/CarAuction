using System.Collections.Generic;
using System.Threading.Tasks;
using CarAuction.Application.Models;
using CarAuction.Domain.Entities;

namespace CarAuction.Application.Interfaces
{
    public interface IAuctionService
    {
        Task<List<CarDto>> GetAllCarsAsync();
        Task<List<CarDto>> GetCarsByStatusAsync(string status);
        Task<CarDetailsDto?> GetCarDetailsAsync(int id);
        Task<CarDto?> AddCarAsync(CreateCarDto carDto, string sellerId);
        Task<bool> PlaceBidAsync(PlaceBidDto bidDto, string bidderId);
        
        /// <summary>
        /// Updates the status of a car based on its auction dates
        /// </summary>
        /// <param name="carId">The ID of the car to update</param>
        /// <returns>True if the status was updated, false otherwise</returns>
        Task<bool> UpdateCarStatusAsync(int carId);
        
        /// <summary>
        /// Updates the status of all cars based on their auction dates
        /// </summary>
        /// <returns>The number of cars whose status was updated</returns>
        Task<int> UpdateAllCarStatusesAsync();

        /// <summary>
        /// Gets the cars won by a specific user
        /// </summary>
        /// <param name="userId">The ID of the user</param>
        /// <returns>List of cars won by the user</returns>
        Task<List<WonCarDto>> GetWonCarsByUserAsync(string userId);

        /// <summary>
        /// Gets all bids placed by a specific user
        /// </summary>
        /// <param name="userId">The ID of the user</param>
        /// <returns>List of user's bids with status information</returns>
        Task<List<UserBidDto>> GetUserBidsAsync(string userId);

        /// <summary>
        /// Verifies and fixes auction winners for sold cars to ensure data integrity
        /// </summary>
        /// <returns>The number of cars that were fixed</returns>
        Task<int> VerifyAndFixAuctionWinners();

        /// <summary>
        /// Checks if a user is the winner of a specific car auction
        /// </summary>
        /// <param name="carId">The car ID to check</param>
        /// <param name="userId">The user ID to check</param>
        /// <returns>True if the user won the auction, false otherwise</returns>
        Task<bool> IsUserAuctionWinner(int carId, string userId);

        /// <summary>
        /// Gets the current winner of an ongoing auction (or actual winner if auction ended)
        /// </summary>
        /// <param name="carId">The car ID to check</param>
        /// <returns>The user ID of the current/actual winner, or null if no winner</returns>
        Task<string?> GetCurrentAuctionWinner(int carId);

        /// <summary>
        /// Places a bid with enhanced concurrency protection and robust winner determination
        /// </summary>
        /// <param name="bidDto">The bid details</param>
        /// <param name="bidderId">The ID of the bidder</param>
        /// <returns>True if the bid was placed successfully, false otherwise</returns>
        Task<bool> PlaceBidWithConcurrencyProtection(PlaceBidDto bidDto, string bidderId);
    }
}
