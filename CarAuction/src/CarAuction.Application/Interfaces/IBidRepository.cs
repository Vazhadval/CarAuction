using System.Collections.Generic;
using System.Threading.Tasks;
using CarAuction.Domain.Entities;

namespace CarAuction.Application.Interfaces
{
    public interface IBidRepository
    {
        Task<List<Bid>> GetBidsForCarAsync(int carId);
        Task<Bid?> GetHighestBidForCarAsync(int carId);
        Task<Bid> AddBidAsync(Bid bid);
        Task<ApplicationUser?> GetBidderByIdAsync(string bidderId);
        Task<List<Bid>> GetBidsByUserAsync(string userId);
        Task<List<Car>> GetWonCarsByUserAsync(string userId);
    }
}
