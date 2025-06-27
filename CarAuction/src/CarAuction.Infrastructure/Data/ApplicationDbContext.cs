using CarAuction.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CarAuction.Infrastructure.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) 
            : base(options)
        {
        }

        public DbSet<Car> Cars { get; set; }
        public DbSet<Bid> Bids { get; set; }
        public DbSet<CarImage> CarImages { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure Car entity
            builder.Entity<Car>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Model).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Description).IsRequired();
                entity.Property(e => e.StartPrice).HasColumnType("decimal(18, 2)");
                
                // Relationship with User (Seller)
                entity.HasOne(c => c.Seller)
                      .WithMany(u => u.CarsForAuction)
                      .HasForeignKey(c => c.SellerId)
                      .OnDelete(DeleteBehavior.Restrict);
            });
            
            // Configure CarImage entity
            builder.Entity<CarImage>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ImageUrl).IsRequired();
                
                // Relationship with Car
                entity.HasOne(i => i.Car)
                      .WithMany(c => c.Images)
                      .HasForeignKey(i => i.CarId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Bid entity
            builder.Entity<Bid>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Amount).HasColumnType("decimal(18, 2)");
                
                // Relationship with Car
                entity.HasOne(b => b.Car)
                      .WithMany(c => c.Bids)
                      .HasForeignKey(b => b.CarId)
                      .OnDelete(DeleteBehavior.Cascade);
                
                // Relationship with User (Bidder)
                entity.HasOne(b => b.Bidder)
                      .WithMany(u => u.Bids)
                      .HasForeignKey(b => b.BidderId)
                      .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
