using System.Collections.Generic;
using System.Threading.Tasks;
using CarAuction.Domain.Entities;

namespace CarAuction.Application.Interfaces
{
    public interface IOrderRepository
    {
        Task<Order> CreateOrderAsync(Order order);
        Task<Order?> GetOrderByIdAsync(int orderId);
        Task<List<Order>> GetOrdersByUserAsync(string userId);
        Task<List<Order>> GetOrdersByCarAsync(int carId);
        Task<Order?> GetOrderByCarAndUserAsync(int carId, string userId);
        Task<bool> HasUserOrderedCarAsync(int carId, string userId);
        Task<Order> UpdateOrderAsync(Order order);
        Task<List<Order>> GetAllOrdersAsync();
        Task<List<Order>> GetOrdersByStatusAsync(OrderStatus status);
    }
}
