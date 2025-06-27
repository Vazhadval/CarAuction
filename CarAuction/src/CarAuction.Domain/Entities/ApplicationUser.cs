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
        public virtual ICollection<Car> CarsForAuction { get; set; }
        public virtual ICollection<Bid> Bids { get; set; }
    }
}
