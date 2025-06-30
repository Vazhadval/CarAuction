using System;
using CarAuction.Domain.Entities;

namespace CarAuction.Application.Models
{
    public class CarImageDto
    {
        public int Id { get; set; }
        public required string ImageUrl { get; set; }
        public bool IsPrimary { get; set; }
    }

    public class CarDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string Model { get; set; }
        public int Year { get; set; }
        public decimal StartPrice { get; set; }
        public decimal? FixedPrice { get; set; } // For direct sale
        public string? PhotoUrl { get; set; }
        public List<CarImageDto> Images { get; set; } = new List<CarImageDto>();
        public DateTime AuctionStartDate { get; set; }
        public DateTime AuctionEndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string SaleType { get; set; } = string.Empty; // Auction or DirectSale
        public decimal CurrentBid { get; set; }
        public string SellerName { get; set; } = string.Empty;
        public string? WinnerName { get; set; } // Name of the auction winner
        public string? BuyerName { get; set; } // Name of the direct buyer
    }

    public class CarDetailsDto : CarDto
    {
        public required string Description { get; set; }
        public int BidCount { get; set; }
        public List<BidDto> RecentBids { get; set; } = new List<BidDto>();
    }

    public class CreateCarDto
    {
        public required string Name { get; set; }
        public required string Model { get; set; }
        public int Year { get; set; }
        public decimal StartPrice { get; set; }
        public decimal? FixedPrice { get; set; } // For direct sale
        public required string Description { get; set; }
        public string? PhotoUrl { get; set; }
        public List<string> ImageUrls { get; set; } = new List<string>();
        public int? PrimaryImageIndex { get; set; }
        public DateTime AuctionStartDate { get; set; }
        public DateTime AuctionEndDate { get; set; }
        public string SaleType { get; set; } = "Auction"; // Default to Auction
    }

    public class BidDto
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime PlacedAt { get; set; }
        public string BidderName { get; set; } = string.Empty;
        public string BidderId { get; set; } = string.Empty; // Added to track bidder
    }

    public class PlaceBidDto
    {
        public int CarId { get; set; }
        public decimal Amount { get; set; }
    }

    // New DTOs for won cars functionality
    public class WonCarDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string Model { get; set; }
        public int Year { get; set; }
        public decimal StartPrice { get; set; }
        public decimal WinningBid { get; set; }
        public string? PhotoUrl { get; set; }
        public List<CarImageDto> Images { get; set; } = new List<CarImageDto>();
        public DateTime AuctionEndDate { get; set; }
        public string SellerName { get; set; } = string.Empty;
    }

    public class UserBidDto
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime PlacedAt { get; set; }
        public int CarId { get; set; }
        public string CarName { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;
        public int CarYear { get; set; }
        public string AuctionStatus { get; set; } = string.Empty;
        public bool IsWinning { get; set; }
        public bool HasWon { get; set; }
        public decimal CurrentHighestBid { get; set; }
    }

    // DTOs for direct sales and orders
    public class CreateOrderDto
    {
        public int CarId { get; set; }
        public required string PersonalNumber { get; set; }
        public required string MobilePhone { get; set; }
        public required string Email { get; set; }
        public required string FullName { get; set; }
        public string? Address { get; set; }
    }

    public class OrderDto
    {
        public int Id { get; set; }
        public decimal PurchasePrice { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PersonalNumber { get; set; } = string.Empty;
        public string MobilePhone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public int CarId { get; set; }
        public string CarName { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;
        public int CarYear { get; set; }
        public string SellerName { get; set; } = string.Empty;
        public List<CarImageDto> CarImages { get; set; } = new List<CarImageDto>();
    }

    public class PurchasedCarDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string Model { get; set; }
        public int Year { get; set; }
        public decimal PurchasePrice { get; set; }
        public string? PhotoUrl { get; set; }
        public List<CarImageDto> Images { get; set; } = new List<CarImageDto>();
        public DateTime PurchaseDate { get; set; }
        public string SellerName { get; set; } = string.Empty;
        public string OrderStatus { get; set; } = string.Empty;
    }
}
