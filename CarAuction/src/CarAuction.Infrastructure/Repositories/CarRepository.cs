using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CarAuction.Application.Interfaces;
using CarAuction.Domain.Entities;
using CarAuction.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CarAuction.Infrastructure.Repositories
{
    public class CarRepository : ICarRepository
    {
        private readonly ApplicationDbContext _context;

        public CarRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<Car>> GetAllCarsAsync()
        {
            return await _context.Cars
                .Include(c => c.Seller)
                .Include(c => c.Bids)
                .Include(c => c.Images)
                .ToListAsync();
        }

        public async Task<List<Car>> GetCarsByStatusAsync(CarStatus status)
        {
            return await _context.Cars
                .Where(c => c.Status == status)
                .Include(c => c.Seller)
                .Include(c => c.Bids)
                .Include(c => c.Images)
                .ToListAsync();
        }

        public async Task<Car?> GetCarByIdAsync(int id)
        {
            return await _context.Cars
                .Include(c => c.Seller)
                .Include(c => c.Bids)
                .ThenInclude(b => b.Bidder)
                .Include(c => c.Images)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<Car> AddCarAsync(Car car)
        {
            _context.Cars.Add(car);
            await _context.SaveChangesAsync();
            return car;
        }

        public async Task<Car> UpdateCarAsync(Car car)
        {
            _context.Entry(car).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return car;
        }        public async Task<bool> DeleteCarAsync(int id)
        {
            var car = await _context.Cars.FindAsync(id);
            if (car == null)
                return false;
                
            _context.Cars.Remove(car);
            await _context.SaveChangesAsync();
            return true;
        }
        
        public async Task<ApplicationUser?> GetSellerByIdAsync(string sellerId)
        {
            return await _context.Users.FindAsync(sellerId);
        }
    }
}
