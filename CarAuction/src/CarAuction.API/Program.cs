using System.Text;
using CarAuction.API.Hubs;
using CarAuction.Application.Interfaces;
using CarAuction.Application.Services;
using CarAuction.Domain.Entities;
using CarAuction.Infrastructure.Data;
using CarAuction.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel for hosting environments
builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
});

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS - Specify exact origins for SignalR compatibility
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Configure Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Read the token from the query string when SignalR connections are established
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/auctionHub"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

// Register Repositories and Services
builder.Services.AddScoped<ICarRepository, CarRepository>();
builder.Services.AddScoped<IBidRepository, BidRepository>();
builder.Services.AddScoped<IAuctionService, AuctionService>();

// Register Background Services
builder.Services.AddHostedService<CarAuction.API.Services.AuctionStatusBackgroundService>();

// Add SignalR
builder.Services.AddSignalR();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

// Remove HTTPS redirection for shared hosting (SmarterASP.NET handles SSL)
// app.UseHttpsRedirection();

app.UseStaticFiles();
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<AuctionHub>("/auctionHub");

// Initialize database and roles
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();

        // Test database connection first
        logger.LogInformation("Testing database connection...");
        if (await context.Database.CanConnectAsync())
        {
            logger.LogInformation("Database connection successful. Running migrations...");
            await context.Database.MigrateAsync();
            logger.LogInformation("Database migrations completed successfully.");

            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

            // Create roles if they don't exist
            if (!await roleManager.RoleExistsAsync("Admin"))
            {
                await roleManager.CreateAsync(new IdentityRole("Admin"));
                logger.LogInformation("Admin role created.");
            }

            if (!await roleManager.RoleExistsAsync("User"))
            {
                await roleManager.CreateAsync(new IdentityRole("User"));
                logger.LogInformation("User role created.");
            }

            // Create admin user if it doesn't exist
            var adminEmail = "admin@carauction.com";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);

            if (adminUser == null)
            {
                adminUser = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FirstName = "System",
                    LastName = "Admin",
                    EmailConfirmed = true,
                    RegisteredDate = DateTime.UtcNow
                };

                var result = await userManager.CreateAsync(adminUser, "Admin123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, "Admin");
                    logger.LogInformation("Admin user created successfully.");
                }
                else
                {
                    logger.LogError("Failed to create admin user: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }

            logger.LogInformation("Application initialization completed successfully.");
        }
        else
        {
            logger.LogError("Cannot connect to database. Please check connection string.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during application initialization. The application will continue but may not function properly.");
        // Don't throw - let the application start even if DB init fails
    }
}

app.Run();
