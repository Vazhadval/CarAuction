using System;

namespace CarAuction.Domain.Entities
{
    public class Bid
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public DateTime PlacedAt { get; set; }
        
        // Foreign keys
        public int CarId { get; set; }
        public required string BidderId { get; set; }
        
        // Navigation properties
        public required virtual Car Car { get; set; }
        public required virtual ApplicationUser Bidder { get; set; }
    }
}
