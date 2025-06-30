using System.Collections.Generic;
using System.Threading.Tasks;
using CarAuction.Domain.Entities;

namespace CarAuction.Application.Interfaces
{
    public interface ICarRepository
    {
        Task<List<Car>> GetAllCarsAsync();
        Task<List<Car>> GetCarsByStatusAsync(CarStatus status);
        Task<List<Car>> GetCarsBySaleTypeAsync(SaleType saleType);
        Task<Car?> GetCarByIdAsync(int id);
        Task<Car> AddCarAsync(Car car);
        Task<Car> UpdateCarAsync(Car car);
        Task<bool> DeleteCarAsync(int id);
        Task<ApplicationUser?> GetSellerByIdAsync(string sellerId);
    }
}
