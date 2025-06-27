# Car Image Upload Feature

## Overview
This feature allows users to upload multiple images when adding a car to the auction. Users can select which image should be the primary image to display in listings.

## Implementation Details

### Backend Changes
- Added a new `CarImage` entity to store multiple images per car
- Created an `UploadsController` to handle file uploads
- Updated the `Car` entity to have a collection of `CarImage` entities
- Modified DTOs to support multiple images
- Created a migration to update the database schema

### Frontend Changes
- Added image upload UI to the AddCar component
- Implemented functionality to set a primary image
- Updated display components to show the primary image or fallback to legacy fields
- Added multi-image gallery in car details view

## How It Works
1. Users can upload multiple images when adding a car
2. They can select which image should be the primary image
3. The primary image is displayed in listings and as the main image in details
4. All images are shown in a gallery in the car details page

## Technical Notes
- Images are stored in the `wwwroot/uploads/cars` directory
- Image references are stored in the database with URLs
- The backend is configured to serve static files
- The UploadsController validates file types and sizes
