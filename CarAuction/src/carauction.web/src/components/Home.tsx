import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getAllCars } from '../services/api';
import { Car } from '../types';
import { getAbsoluteImageUrl } from '../utils/imageHelper';
import { formatDate, getTimeRemaining, isAuctionActive } from '../utils/dateHelpers';
import signalRService from '../services/signalRService';

const Home: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCars = async () => {
    setLoading(true);
    try {
      const response = await getAllCars();
      setCars(response.data);
    } catch (err) {
      setError('Failed to fetch cars. Please try again later.');
      console.error('Error fetching cars:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
    
    // Join car-listings group for status updates
    const token = localStorage.getItem('token');
    if (token) {
      // Register for car status updates
      signalRService.joinCarListings().catch(err => {
        console.error("Failed to join car listings:", err);
      });

      // Listen for car status changes
      signalRService.onCarStatusChanged((carId, newStatus) => {
        console.log(`Car ${carId} status changed to ${newStatus}`);
        
        // Update the car in our local state
        setCars(prevCars => prevCars.map(car => {
          if (car.id === carId) {
            return { ...car, status: newStatus };
          }
          return car;
        }));
      });
    }

    // Setup refresh timer to update countdowns every second and check for transitions
    const timer = setInterval(() => {
      // Check for any auctions that need status updates based on current time
      const now = new Date();
      let needsRefresh = false;
      
      setCars(prevCars => {
        const updatedCars = [...prevCars];
        
        // Check each car for potential status changes
        updatedCars.forEach(car => {
          const startDate = new Date(car.auctionStartDate);
          const endDate = new Date(car.auctionEndDate);
          
          if (car.status === 'UpcomingAuction' && now >= startDate) {
            needsRefresh = true;
          } else if (car.status === 'OngoingAuction' && now >= endDate) {
            needsRefresh = true;
          }
        });
        
        // If any cars need updates, schedule a refresh after this render
        if (needsRefresh) {
          setTimeout(() => fetchCars(), 100); 
        }
        
        // Just force re-render for countdown timers
        return updatedCars;
      });
    }, 1000); // Update every second for smoother countdowns

    // Cleanup when component unmounts
    return () => {
      signalRService.removeOnCarStatusChanged();
      clearInterval(timer);
    };
  }, []);

  // Check for cars that need status updates
  useEffect(() => {
    if (cars.length === 0) return;
    
    const now = new Date().getTime();
    const timeouts: NodeJS.Timeout[] = [];
    
    // Check each car for upcoming status changes
    cars.forEach(car => {
      const startDate = new Date(car.auctionStartDate).getTime();
      const endDate = new Date(car.auctionEndDate).getTime();
      
      // For upcoming auctions that should start soon
      if (car.status === 'UpcomingAuction' && startDate > now) {
        const timeUntilStart = startDate - now;
        if (timeUntilStart < 60000) { // If starting in less than a minute
          const timeout = setTimeout(() => {
            fetchCars(); // Refresh all cars when one should change status
          }, timeUntilStart + 1000); // Add 1 second buffer
          timeouts.push(timeout);
        }
      }
      
      // For ongoing auctions that should end soon
      if (car.status === 'OngoingAuction' && endDate > now) {
        const timeUntilEnd = endDate - now;
        if (timeUntilEnd < 60000) { // If ending in less than a minute
          const timeout = setTimeout(() => {
            fetchCars(); // Refresh all cars when one should change status
          }, timeUntilEnd + 1000); // Add 1 second buffer
          timeouts.push(timeout);
        }
      }
    });
    
    // Clean up timeouts
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [cars]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'UpcomingAuction':
        return 'primary';
      case 'OngoingAuction':
        return 'success';
      case 'Sold':
        return 'secondary';
      case 'PendingApproval':
        return 'warning';
      default:
        return 'info';
    }
  };

  const formatStatus = (status: string) => {
    // Convert camel case to spaces
    return status.replace(/([A-Z])/g, ' $1').trim();
  };
  
  const getCarMainImage = (car: Car) => {
    // Check if car has images array property
    if (car.images && Array.isArray(car.images) && car.images.length > 0) {
      // First try to find a primary image
      const primaryImage = car.images.find(img => img.isPrimary);
      
      if (primaryImage && primaryImage.imageUrl) {
        return getAbsoluteImageUrl(primaryImage.imageUrl);
      }
      
      // If no primary image, use the first image
      if (car.images[0].imageUrl) {
        return getAbsoluteImageUrl(car.images[0].imageUrl);
      }
    }
    
    // Fall back to legacy field or placeholder
    if (car.photoUrl) {
      return getAbsoluteImageUrl(car.photoUrl);
    }

    return 'https://via.placeholder.com/300x200?text=No+Image';
  };

  if (loading) {
    return <div className="text-center mt-5">Loading cars...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Available Cars</h1>
        <Button 
          variant="outline-primary" 
          onClick={fetchCars} 
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Auctions'}
        </Button>
      </div>
      <Row xs={1} md={2} lg={3} className="g-4">
        {cars.map(car => (
          <Col key={car.id}>
            <Card>
              <Card.Img 
                variant="top" 
                src={getCarMainImage(car)} 
                style={{ height: '200px', objectFit: 'cover' }}
              />
              <Card.Body>
                <Card.Title>{car.name} {car.model} ({car.year})</Card.Title>
                <div className="mb-2">
                  <Badge bg={getStatusVariant(car.status)}>
                    {formatStatus(car.status)}
                  </Badge>
                  
                  {car.status === 'OngoingAuction' && (
                    <Badge bg="danger" className="ms-2">
                      Ends in: {getTimeRemaining(car.auctionEndDate)}
                    </Badge>
                  )}
                  
                  {car.status === 'UpcomingAuction' && (
                    <Badge bg="info" className="ms-2">
                      Starts in: {getTimeRemaining(car.auctionStartDate)}
                    </Badge>
                  )}
                </div>
                <div className="mb-2">
                  <strong>Start Price:</strong> ${car.startPrice.toFixed(2)}
                </div>
                {car.currentBid > 0 && (
                  <div className="mb-2">
                    <strong>Current Bid:</strong> ${car.currentBid.toFixed(2)}
                  </div>
                )}
                <div className="mb-2">
                  <strong>Auction:</strong> {formatDate(car.auctionStartDate)} - {formatDate(car.auctionEndDate)}
                </div>
                <div className="mb-3">
                  <strong>Seller:</strong> {car.sellerName}
                </div>
                <Link to={`/car/${car.id}`} className="btn btn-primary">View Details</Link>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      {cars.length === 0 && (
        <div className="text-center mt-5">
          <p>No cars available at the moment.</p>
        </div>
      )}
    </>
  );
};

export default Home;
