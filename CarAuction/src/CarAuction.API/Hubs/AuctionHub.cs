using System;
using System.Threading.Tasks;
using CarAuction.Application.Interfaces;
using CarAuction.Application.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CarAuction.API.Hubs
{
    [Authorize]
    public class AuctionHub : Hub
    {
        private readonly IAuctionService _auctionService;
        private static IHubContext<AuctionHub>? _hubContext;

        public AuctionHub(IAuctionService auctionService, IHubContext<AuctionHub> hubContext)
        {
            _auctionService = auctionService;
            _hubContext = hubContext;
        }
        
        // This static method will be called from our background service
        public static async Task NotifyCarStatusChanged(int carId, string newStatus)
        {
            if (_hubContext != null)
            {
                await _hubContext.Clients.Group($"car-{carId}").SendAsync("CarStatusChanged", carId, newStatus);
                // Also notify clients on the homepage/listings
                await _hubContext.Clients.Group("car-listings").SendAsync("CarStatusChanged", carId, newStatus);
            }
        }

        // New method to notify auction winners
        public static async Task NotifyAuctionWinner(string winnerId, int carId, string carName, decimal winningBid)
        {
            if (_hubContext != null)
            {
                await _hubContext.Clients.User(winnerId).SendAsync("AuctionWon", carId, carName, winningBid);
            }
        }

        // New method to notify auction extension
        public static async Task NotifyAuctionExtension(int carId, DateTime newEndTime)
        {
            if (_hubContext != null)
            {
                await _hubContext.Clients.Group($"car-{carId}").SendAsync("AuctionExtended", carId, newEndTime);
            }
        }

        // Enhanced method to notify new bids with extension info
        public static async Task NotifyNewBid(int carId, decimal amount, string bidderId, bool auctionExtended, DateTime endTime)
        {
            if (_hubContext != null)
            {
                await _hubContext.Clients.Group($"car-{carId}").SendAsync("BidPlacedWithExtension", carId, amount, bidderId, auctionExtended, endTime);
            }
        }
        
        public async Task JoinCarListings()
        {
            // Group for clients that are viewing car listings (home page)
            await Groups.AddToGroupAsync(Context.ConnectionId, "car-listings");
        }

        public async Task JoinCarAuction(int carId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"car-{carId}");
        }

        public async Task LeaveCarAuction(int carId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"car-{carId}");
        }

        public async Task<bool> PlaceBid(PlaceBidDto bidDto)
        {
            var userId = Context.UserIdentifier;
            
            if (string.IsNullOrEmpty(userId))
                return false;

            var success = await _auctionService.PlaceBidAsync(bidDto, userId);
            
            if (success)
            {
                // Get the updated car details after the new bid
                var carDetails = await _auctionService.GetCarDetailsAsync(bidDto.CarId);
                
                // Notify all clients in the car's group about the new bid
                // The PlaceBidAsync method now handles extension notifications automatically
                await Clients.Group($"car-{bidDto.CarId}").SendAsync("BidPlaced", carDetails);
            }
            
            return success;
        }
    }
}
