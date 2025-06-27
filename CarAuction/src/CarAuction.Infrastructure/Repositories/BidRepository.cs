using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CarAuction.Application.Interfaces;
using CarAuction.Domain.Entities;
using CarAuction.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CarAuction.Infrastructure.Repositories
{
    public class BidRepository : IBidRepository
    {
        private readonly ApplicationDbContext _context;

        public BidRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Bid>> GetBidsForCarAsync(int carId)
        {
            return await _context.Bids
                .Where(b => b.CarId == carId)
                .Include(b => b.Bidder)
                .OrderByDescending(b => b.PlacedAt)
                .ToListAsync();
        }

        public async Task<Bid?> GetHighestBidForCarAsync(int carId)
        {
            return await _context.Bids
                .Where(b => b.CarId == carId)
                .OrderByDescending(b => b.Amount)
                .FirstOrDefaultAsync();
        }

        public async Task<Bid> AddBidAsync(Bid bid)
        {
            _context.Bids.Add(bid);
            await _context.SaveChangesAsync();
            return bid;
        }
        
        public async Task<ApplicationUser?> GetBidderByIdAsync(string bidderId)
        {
            return await _context.Users.FindAsync(bidderId);
        }

        public async Task<List<Bid>> GetBidsByUserAsync(string userId)
        {
            return await _context.Bids
                .Where(b => b.BidderId == userId)
                .Include(b => b.Car)
                .ThenInclude(c => c.Images)
                .Include(b => b.Car.Seller)
                .Include(b => b.Car.Bids)
                .OrderByDescending(b => b.PlacedAt)
                .ToListAsync();
        }

        public async Task<List<Car>> GetWonCarsByUserAsync(string userId)
        {
            return await _context.Cars
                .Where(c => c.Status == CarStatus.Sold)
                .Include(c => c.Bids)
                .ThenInclude(b => b.Bidder)
                .Include(c => c.Images)
                .Include(c => c.Seller)
                .Where(c => c.Bids.Any() && 
                           c.Bids.OrderByDescending(b => b.Amount).First().BidderId == userId)
                .ToListAsync();
        }
    }
}
