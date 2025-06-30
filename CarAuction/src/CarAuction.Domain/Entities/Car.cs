using System;
using System.Collections.Generic;

namespace CarAuction.Domain.Entities
{
    public class Car
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string Model { get; set; }
        public int Year { get; set; }
        public decimal StartPrice { get; set; }
        public decimal? FixedPrice { get; set; } // Price for direct sale (non-auction)
        public required string Description { get; set; }
        public string? PhotoUrl { get; set; } // Legacy field, kept for compatibility
        public DateTime AuctionStartDate { get; set; }
        public DateTime AuctionEndDate { get; set; }
        public CarStatus Status { get; set; }
        public SaleType SaleType { get; set; } // Auction or DirectSale

        // Foreign keys
        public required string SellerId { get; set; }
        public string? WinnerUserId { get; set; } // The user who won the auction
        public string? BuyerId { get; set; } // The user who bought the car directly
        
        // Navigation properties
        public required virtual ApplicationUser Seller { get; set; }
        public virtual ApplicationUser? Winner { get; set; } // Navigation to the winner
        public virtual ApplicationUser? Buyer { get; set; } // Navigation to the buyer (direct sale)
        public virtual ICollection<Bid> Bids { get; set; } = new List<Bid>();
        public virtual ICollection<CarImage> Images { get; set; } = new List<CarImage>();
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    }
    
    public enum CarStatus
    {
        PendingApproval,
        UpcomingAuction,
        OngoingAuction,
        Sold,
        NotSold,
        AvailableForSale // For direct sale cars that are available
    }

    public enum SaleType
    {
        Auction,
        DirectSale
    }
}
