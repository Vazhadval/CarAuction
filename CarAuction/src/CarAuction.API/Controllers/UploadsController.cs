using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CarAuction.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UploadsController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;
        private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif" };
        
        public UploadsController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }
        
        [Authorize]
        [HttpPost("car-images")]
        public async Task<IActionResult> UploadCarImages(List<IFormFile> files)
        {
            if (files == null || !files.Any())
                return BadRequest("No files uploaded");

            var uploadResults = new List<UploadResult>();
            
            foreach (var file in files)
            {
                if (file.Length == 0)
                    continue;
                
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                
                // Validate file extension
                if (!_allowedExtensions.Contains(extension))
                {
                    uploadResults.Add(new UploadResult 
                    { 
                        FileName = file.FileName,
                        Success = false,
                        Error = "File type not allowed"
                    });
                    continue;
                }
                
                // Validate file size (max 5MB)
                if (file.Length > 5 * 1024 * 1024)
                {
                    uploadResults.Add(new UploadResult 
                    { 
                        FileName = file.FileName,
                        Success = false,
                        Error = "File size exceeds 5MB limit"
                    });
                    continue;
                }
                
                try
                {
                    // Create unique filename
                    var fileName = $"{Guid.NewGuid()}{extension}";
                    
                    // Ensure uploads directory exists
                    var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "cars");
                    if (!Directory.Exists(uploadsFolder))
                    {
                        Directory.CreateDirectory(uploadsFolder);
                    }
                    
                    var filePath = Path.Combine(uploadsFolder, fileName);
                    
                    // Save file
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }
                    
                    // Generate URL for the file
                    // Create a URL that's accessible from the frontend
                    // Using relative URL to avoid CORS issues between different domains/ports
                    var url = $"/uploads/cars/{fileName}";
                    
                    // For debugging - log the full path and URL
                    Console.WriteLine($"Saved file to: {filePath}");
                    Console.WriteLine($"URL: {url}");
                    
                    uploadResults.Add(new UploadResult 
                    { 
                        FileName = file.FileName,
                        StoredFileName = fileName,
                        ContentType = file.ContentType,
                        Url = url,
                        Success = true
                    });
                }
                catch (Exception ex)
                {
                    uploadResults.Add(new UploadResult 
                    { 
                        FileName = file.FileName,
                        Success = false,
                        Error = ex.Message
                    });
                }
            }
            
            return Ok(uploadResults);
        }
        
        // Add endpoint to serve optimized images with caching
        [HttpGet("car-images/{fileName}")]
        public IActionResult GetCarImage(string fileName)
        {
            var filePath = Path.Combine(_environment.WebRootPath, "uploads", "cars", fileName);
            
            if (!System.IO.File.Exists(filePath))
            {
                return NotFound();
            }
            
            var fileExtension = Path.GetExtension(fileName).ToLowerInvariant();
            string contentType = fileExtension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                _ => "application/octet-stream"
            };
            
            // Add cache headers for better performance
            Response.Headers.Append("Cache-Control", "public, max-age=86400"); // Cache for 1 day
            
            return PhysicalFile(filePath, contentType);
        }
    }
    
    public class UploadResult
    {
        public string FileName { get; set; } = string.Empty;
        public string? StoredFileName { get; set; }
        public string? ContentType { get; set; }
        public string? Url { get; set; }
        public bool Success { get; set; }
        public string? Error { get; set; }
    }
}
