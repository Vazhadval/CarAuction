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
              .SetIsOriginAllowed(_ => true)
              .AllowAnyHeader();
    });
});

// Configure Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    // Render automatically provides DATABASE_URL for PostgreSQL services
    var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
                          ?? builder.Configuration.GetConnectionString("DefaultConnection");
    
    // Debug logging for connection string
    Console.WriteLine($"CONNECTION STRING DEBUG:");
    Console.WriteLine($"DATABASE_URL env var: {(Environment.GetEnvironmentVariable("DATABASE_URL") != null ? "EXISTS" : "NULL")}");
    Console.WriteLine($"Connection string length: {connectionString?.Length ?? 0}");
    Console.WriteLine($"Starts with postgresql://: {connectionString?.StartsWith("postgresql://") == true}");
    
    // Show the masked connection string for debugging
    if (!string.IsNullOrEmpty(connectionString))
    {
        // Mask password but show the structure
        var maskedConnectionString = connectionString;
        if (connectionString.Contains("://") && connectionString.Contains("@"))
        {
            var parts = connectionString.Split('@');
            if (parts.Length >= 2)
            {
                var beforeAt = parts[0];
                var afterAt = string.Join("@", parts.Skip(1));
                
                if (beforeAt.Contains(":"))
                {
                    var userParts = beforeAt.Split(':');
                    if (userParts.Length >= 3) // protocol:user:password
                    {
                        maskedConnectionString = $"{userParts[0]}:{userParts[1]}:***@{afterAt}";
                    }
                }
            }
        }
        Console.WriteLine($"Masked connection string: {maskedConnectionString}");
        
        // Check for common issues
        Console.WriteLine($"Contains spaces: {connectionString.Contains(" ")}");
        Console.WriteLine($"Contains newlines: {connectionString.Contains("\n") || connectionString.Contains("\r")}");
        Console.WriteLine($"First char: '{connectionString[0]}'");
        Console.WriteLine($"Last char: '{connectionString[connectionString.Length - 1]}'");
        
        try
        {
            var uri = new Uri(connectionString);
            Console.WriteLine($"Host: {uri.Host}");
            Console.WriteLine($"Port: {uri.Port}");
            Console.WriteLine($"Database: {uri.AbsolutePath.TrimStart('/')}");
            Console.WriteLine($"Username: {uri.UserInfo.Split(':')[0]}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing connection string as URI: {ex.Message}");
        }
    }
    
    // Check if it's a PostgreSQL connection string (for production/Render)
    if (connectionString?.Contains("postgresql://") == true || connectionString?.Contains("postgres://") == true)
    {
        Console.WriteLine("Using PostgreSQL (Npgsql)");
        
        // Convert URI format to Npgsql connection string format
        try
        {
            var uri = new Uri(connectionString);
            var userInfo = uri.UserInfo.Split(':');
            var username = userInfo[0];
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
            
            var npgsqlConnectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
            
            Console.WriteLine($"Converted to Npgsql format (masked): Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={username};Password=***;SSL Mode=Require;Trust Server Certificate=true");
            
            options.UseNpgsql(npgsqlConnectionString)
                   .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error converting connection string: {ex.Message}");
            // Fallback to original connection string
            options.UseNpgsql(connectionString)
                   .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        }
    }
    else
    {
        Console.WriteLine("Using SQL Server");
        // Fallback to SQL Server for local development
        options.UseSqlServer(connectionString)
               .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }
});

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
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "default-jwt-key-for-development-only"))
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
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
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
        try
        {
            // Try to create a connection to test the connection string format
            using var testConnection = context.Database.GetDbConnection();
            Console.WriteLine($"Connection type: {testConnection.GetType().Name}");
            Console.WriteLine($"Connection string (length): {testConnection.ConnectionString?.Length ?? 0}");
            
            var canConnect = await context.Database.CanConnectAsync();
            if (canConnect)
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
                logger.LogError("Cannot connect to database. CanConnectAsync returned false.");
            }
        }
        catch (Exception dbEx)
        {
            logger.LogError(dbEx, "Database connection failed with exception: {Message}", dbEx.Message);
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during application initialization. The application will continue but may not function properly.");
        // Don't throw - let the application start even if DB init fails
    }
}

app.Run();
