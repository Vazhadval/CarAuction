using System.Threading.Tasks;
using CarAuction.Application.Interfaces;
using CarAuction.Application.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CarAuction.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CarsController : ControllerBase
    {
        private readonly IAuctionService _auctionService;

        public CarsController(IAuctionService auctionService)
        {
            _auctionService = auctionService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllCars()
        {
            var cars = await _auctionService.GetAllCarsAsync();
            return Ok(cars);
        }

        [HttpGet("status/{status}")]
        public async Task<IActionResult> GetCarsByStatus(string status)
        {
            var cars = await _auctionService.GetCarsByStatusAsync(status);
            return Ok(cars);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCar(int id)
        {
            var car = await _auctionService.GetCarDetailsAsync(id);
            if (car == null)
                return NotFound();

            return Ok(car);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateCar(CreateCarDto carDto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
            
            var car = await _auctionService.AddCarAsync(carDto, userId);
            if (car == null)
                return BadRequest("Failed to create car");
                
            return CreatedAtAction(nameof(GetCar), new { id = car.Id }, car);
        }

        [Authorize]
        [HttpPost("bid")]
        public async Task<IActionResult> PlaceBid(PlaceBidDto bidDto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
            
            var success = await _auctionService.PlaceBidAsync(bidDto, userId);
            if (!success)
                return BadRequest("Invalid bid");

            return Ok(new { success = true });
        }

        [Authorize]
        [HttpGet("won")]
        public async Task<IActionResult> GetWonCars()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
                
            var wonCars = await _auctionService.GetWonCarsByUserAsync(userId);
            return Ok(wonCars);
        }

        [Authorize]
        [HttpGet("mybids")]
        public async Task<IActionResult> GetMyBids()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
                
            var userBids = await _auctionService.GetUserBidsAsync(userId);
            return Ok(userBids);
        }
    }
}
