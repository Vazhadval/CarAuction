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
    }
}
