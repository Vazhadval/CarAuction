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
        public required string Description { get; set; }
        public string? PhotoUrl { get; set; } // Legacy field, kept for compatibility
        public DateTime AuctionStartDate { get; set; }
        public DateTime AuctionEndDate { get; set; }
        public CarStatus Status { get; set; }

        // Foreign key
        public required string SellerId { get; set; }
        
        // Navigation properties
        public required virtual ApplicationUser Seller { get; set; }
        public virtual ICollection<Bid> Bids { get; set; } = new List<Bid>();
        public virtual ICollection<CarImage> Images { get; set; } = new List<CarImage>();
    }
    
    public enum CarStatus
    {
        PendingApproval,
        UpcomingAuction,
        OngoingAuction,
        Sold,
        NotSold
    }
}
