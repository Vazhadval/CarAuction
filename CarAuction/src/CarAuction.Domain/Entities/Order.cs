using System;

namespace CarAuction.Domain.Entities
{
    public class Order
    {
        public int Id { get; set; }
        public decimal PurchasePrice { get; set; }
        public DateTime OrderDate { get; set; }
        public OrderStatus Status { get; set; }
        
        // Buyer information
        public required string PersonalNumber { get; set; }
        public required string MobilePhone { get; set; }
        public required string Email { get; set; }
        public required string FullName { get; set; }
        public string? Address { get; set; }
        
        // Foreign keys
        public int CarId { get; set; }
        public required string BuyerId { get; set; }
        
        // Navigation properties
        public required virtual Car Car { get; set; }
        public required virtual ApplicationUser Buyer { get; set; }
    }
    
    public enum OrderStatus
    {
        Pending,
        Confirmed,
        Completed,
        Cancelled
    }
}
