using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CarAuction.Application.Interfaces;
using CarAuction.Domain.Entities;
using CarAuction.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CarAuction.Infrastructure.Repositories
{
    public class OrderRepository : IOrderRepository
    {
        private readonly ApplicationDbContext _context;

        public OrderRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Order> CreateOrderAsync(Order order)
        {
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<Order?> GetOrderByIdAsync(int orderId)
        {
            return await _context.Orders
                .Include(o => o.Car)
                .ThenInclude(c => c.Images)
                .Include(o => o.Car.Seller)
                .Include(o => o.Buyer)
                .FirstOrDefaultAsync(o => o.Id == orderId);
        }

        public async Task<List<Order>> GetOrdersByUserAsync(string userId)
        {
            return await _context.Orders
                .Where(o => o.BuyerId == userId)
                .Include(o => o.Car)
                .ThenInclude(c => c.Images)
                .Include(o => o.Car.Seller)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
        }

        public async Task<List<Order>> GetOrdersByCarAsync(int carId)
        {
            return await _context.Orders
                .Where(o => o.CarId == carId)
                .Include(o => o.Buyer)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
        }

        public async Task<Order?> GetOrderByCarAndUserAsync(int carId, string userId)
        {
            return await _context.Orders
                .Include(o => o.Car)
                .Include(o => o.Buyer)
                .FirstOrDefaultAsync(o => o.CarId == carId && o.BuyerId == userId);
        }

        public async Task<bool> HasUserOrderedCarAsync(int carId, string userId)
        {
            return await _context.Orders
                .AnyAsync(o => o.CarId == carId && o.BuyerId == userId);
        }

        public async Task<Order> UpdateOrderAsync(Order order)
        {
            _context.Orders.Update(order);
            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<List<Order>> GetAllOrdersAsync()
        {
            return await _context.Orders
                .Include(o => o.Car)
                .ThenInclude(c => c.Images)
                .Include(o => o.Car.Seller)
                .Include(o => o.Buyer)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
        }

        public async Task<List<Order>> GetOrdersByStatusAsync(OrderStatus status)
        {
            return await _context.Orders
                .Where(o => o.Status == status)
                .Include(o => o.Car)
                .ThenInclude(c => c.Images)
                .Include(o => o.Car.Seller)
                .Include(o => o.Buyer)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
        }
    }
}
