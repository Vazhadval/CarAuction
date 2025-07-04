using System;
using Microsoft.AspNetCore.Identity;

namespace CarAuction.Domain.Entities
{
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime RegisteredDate { get; set; }
        
        // Navigation properties
        public virtual ICollection<Car> CarsForAuction { get; set; } = new List<Car>();
        public virtual ICollection<Car> WonCars { get; set; } = new List<Car>(); // Cars won by this user
        public virtual ICollection<Car> PurchasedCars { get; set; } = new List<Car>(); // Cars bought directly
        public virtual ICollection<Bid> Bids { get; set; } = new List<Bid>();
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>(); // Direct purchase orders
    }
}
