using System;

namespace CarAuction.Domain.Entities
{
    public class CarImage
    {
        public int Id { get; set; }
        public required string ImageUrl { get; set; }
        public bool IsPrimary { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        
        // Foreign key
        public int CarId { get; set; }
        
        // Navigation property
        public required virtual Car Car { get; set; }
    }
}
