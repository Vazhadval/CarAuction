using System.Threading.Tasks;
using CarAuction.Application.Interfaces;
using CarAuction.Application.Models;
using CarAuction.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using System.Linq;

namespace CarAuction.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAuctionService _auctionService;
        private readonly ICarRepository _carRepository;
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminController(
            IAuctionService auctionService,
            ICarRepository carRepository,
            UserManager<ApplicationUser> userManager)
        {
            _auctionService = auctionService;
            _carRepository = carRepository;
            _userManager = userManager;
        }

        [HttpGet("cars/pending")]
        public async Task<IActionResult> GetPendingCars()
        {
            var cars = await _auctionService.GetCarsByStatusAsync("PendingApproval");
            return Ok(cars);
        }

        [HttpPut("cars/{id}/approve")]
        public async Task<IActionResult> ApproveCar(int id)
        {
            var car = await _carRepository.GetCarByIdAsync(id);
            if (car == null)
                return NotFound();

            car.Status = CarStatus.UpcomingAuction;
            await _carRepository.UpdateCarAsync(car);
            return Ok();
        }

        [HttpPut("cars/{id}/reject")]
        public async Task<IActionResult> RejectCar(int id)
        {
            await _carRepository.DeleteCarAsync(id);
            return Ok();
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = _userManager.Users.Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.RegisteredDate
            });
            
            return Ok(users);
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            var allCars = await _carRepository.GetAllCarsAsync();
            
            var stats = new
            {
                TotalCars = allCars.Count,
                UpcomingAuctions = allCars.Count(c => c.Status == CarStatus.UpcomingAuction),
                OngoingAuctions = allCars.Count(c => c.Status == CarStatus.OngoingAuction),
                SoldCars = allCars.Count(c => c.Status == CarStatus.Sold),
                PendingApproval = allCars.Count(c => c.Status == CarStatus.PendingApproval)
            };
            
            return Ok(stats);
        }
    }
}
