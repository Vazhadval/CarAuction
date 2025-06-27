import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Badge, Button, Form, Row, Col, Alert, ListGroup } from 'react-bootstrap';
import { getCarDetails } from '../services/api';
import { CarDetails as CarDetailsType, User } from '../types';
import signalRService from '../services/signalRService';
import { getAbsoluteImageUrl } from '../utils/imageHelper';
import ImageCarousel from './ImageCarousel';
import { useToast } from './ToastProvider';
import { formatDate, getTimeRemaining, getTimeRemainingWithSeconds } from '../utils/dateHelpers';

interface CarDetailsProps {
  user: User | null;
}

const CarDetails: React.FC<CarDetailsProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const [car, setCar] = useState<CarDetailsType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<boolean>(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchCarDetails = async () => {
      try {
        const response = await getCarDetails(Number(id));
        setCar(response.data);
      } catch (err) {
        setError('Failed to fetch car details. Please try again later.');
        console.error('Error fetching car details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCarDetails();
  }, [id]);

  useEffect(() => {
    if (car) {
      // Join auction room via SignalR
      signalRService.joinCarAuction(car.id);

      // Listen for bid updates
      signalRService.onBidPlaced((updatedCar: CarDetailsType) => {
        setCar(updatedCar);
        // Show a notification when a bid is placed by someone else
        if (updatedCar.recentBids && updatedCar.recentBids.length > 0) {
          const latestBid = updatedCar.recentBids[0];
          if (user && latestBid.bidderName !== user?.firstName + ' ' + user?.lastName) {
            showToast('New Bid', `${latestBid.bidderName} placed a bid of $${latestBid.amount.toFixed(2)}`, 'info');
          }
        }
      });
      
      // Listen for status changes
      signalRService.onCarStatusChanged((carId: number, newStatus: string) => {
        if (carId === car.id && car.status !== newStatus) {
          setCar(prev => {
            if (prev) {
              showToast('Status Change', `Auction status changed to ${newStatus.replace(/([A-Z])/g, ' $1').trim()}`, 'info');
              return { ...prev, status: newStatus };
            }
            return prev;
          });
        }
      });

      // Listen for auction won notifications
      signalRService.onAuctionWon((carId: number, carName: string, winningBid: number) => {
        if (carId === car.id) {
          showToast('Congratulations!', `You won the auction for ${carName} with a bid of $${winningBid.toFixed(2)}!`, 'success');
        }
      });

      // Listen for auction extensions
      signalRService.onAuctionExtended((carId: number, newEndTime: string) => {
        if (carId === car.id) {
          setCar(prev => {
            if (prev) {
              return { ...prev, auctionEndDate: newEndTime };
            }
            return prev;
          });
        }
      });

      // Listen for bid placed with extension information
      signalRService.onBidPlacedWithExtension((carId: number, amount: number, bidderId: string, auctionExtended: boolean, endTime: string) => {
        if (carId === car.id) {
          // Update car details to reflect new end time if extended
          setCar(prev => {
            if (prev) {
              const updatedCar = { ...prev, auctionEndDate: endTime };
              return updatedCar;
            }
            return prev;
          });
        }
      });

      // Clean up
      return () => {
        signalRService.leaveCarAuction(car.id);
        signalRService.removeOnBidPlaced();
        signalRService.removeOnCarStatusChanged();
        signalRService.removeOnAuctionWon();
        signalRService.removeOnAuctionExtended();
        signalRService.removeOnBidPlacedWithExtension();
      };
    }
  }, [car?.id, user, showToast]);

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidError(null);
    setBidSuccess(false);

    if (!car || !user) return;

    const amount = parseFloat(bidAmount);
    
    // Validation
    if (isNaN(amount) || amount <= 0) {
      setBidError('Please enter a valid bid amount');
      return;
    }

    if (amount <= car.currentBid && car.currentBid > 0) {
      setBidError(`Your bid must be higher than the current bid: $${car.currentBid.toFixed(2)}`);
      return;
    }

    if (amount < car.startPrice) {
      setBidError(`Your bid must be at least the starting price: $${car.startPrice.toFixed(2)}`);
      return;
    }

    try {
      // Use SignalR to place the bid
      const success = await signalRService.placeBid({
        carId: car.id,
        amount: amount
      });

      if (success) {
        setBidSuccess(true);
        setBidAmount('');
        showToast('Bid Placed', 'Your bid was successfully placed!', 'success');
        setTimeout(() => setBidSuccess(false), 3000);
      } else {
        setBidError('Failed to place bid. Please try again.');
        showToast('Bid Failed', 'There was a problem placing your bid. Please try again.', 'error');
      }
    } catch (err) {
      const errorMessage = 'An error occurred while placing your bid. Please try again.';
      setBidError(errorMessage);
      showToast('Error', errorMessage, 'error');
      console.error('Error placing bid:', err);
    }
  };

  // Add refs for interval timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [startTimeRemaining, setStartTimeRemaining] = useState<string>('');
  
  // Set up countdown timer
  useEffect(() => {
    if (!car) return;
    
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Function to update both time remainings and check for status transitions
    const updateCountdowns = () => {
      const now = new Date().getTime();
      
      // Format for display
      if (car.status === 'OngoingAuction') {
        const endDate = new Date(car.auctionEndDate).getTime();
        const timeData = getTimeRemainingWithSeconds(car.auctionEndDate);
        setTimeRemaining(timeData.formatted);
        setTimeRemainingSeconds(timeData.totalSeconds);
        
        // Auto-transition when end date is reached
        if (now >= endDate && car.status === 'OngoingAuction') {
          getCarDetails(Number(id)).then(response => {
            setCar(response.data);
          }).catch(err => {
            console.error('Error updating car after auction end time reached:', err);
          });
        }
      } 
      else if (car.status === 'UpcomingAuction') {
        const startDate = new Date(car.auctionStartDate).getTime();
        setStartTimeRemaining(getTimeRemaining(car.auctionStartDate));
        
        // Auto-transition when start date is reached
        if (now >= startDate && car.status === 'UpcomingAuction') {
          getCarDetails(Number(id)).then(response => {
            setCar(response.data);
            if (response.data.status === 'OngoingAuction') {
              showToast('Auction Started', 'This auction is now active!', 'info');
            }
          }).catch(err => {
            console.error('Error updating car after auction start time reached:', err);
          });
        }
      }
    };
    
    // Update immediately
    updateCountdowns();
    
    // Set interval to update time remaining every second for all auction types
    timerRef.current = setInterval(updateCountdowns, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [car, id, showToast]);

  // Add auto-refresh check for status changes
  useEffect(() => {
    if (!car) return;
    
    const now = new Date();
    const startDate = new Date(car.auctionStartDate);
    const endDate = new Date(car.auctionEndDate);
    
    let refreshTimeout: NodeJS.Timeout | null = null;
    
    if (car.status === 'UpcomingAuction' && startDate > now) {
      // Calculate milliseconds until auction starts
      const timeUntilStart = startDate.getTime() - now.getTime();
      
      // Set a timeout to refresh the car data when the auction should start
      refreshTimeout = setTimeout(async () => {
        try {
          const response = await getCarDetails(Number(id));
          setCar(response.data);
          showToast('Auction Update', 'The auction is now active!', 'info');
        } catch (err) {
          console.error('Error refreshing car details:', err);
        }
      }, timeUntilStart + 1000); // Add 1 second buffer
    } 
    else if (car.status === 'OngoingAuction' && endDate > now) {
      // Calculate milliseconds until auction ends
      const timeUntilEnd = endDate.getTime() - now.getTime();
      
      // Set a timeout to refresh the car data when the auction should end
      refreshTimeout = setTimeout(async () => {
        try {
          const response = await getCarDetails(Number(id));
          setCar(response.data);
          showToast('Auction Update', 'The auction has ended!', 'info');
        } catch (err) {
          console.error('Error refreshing car details:', err);
        }
      }, timeUntilEnd + 1000); // Add 1 second buffer
    }
    
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [car, id, showToast]);

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
  
  const getCarMainImage = () => {
    if (!car) return 'https://via.placeholder.com/800x400?text=No+Image';
    
    // First try to find a primary image
    const primaryImage = car.images?.find(img => img.isPrimary);
    
    if (primaryImage) {
      return getAbsoluteImageUrl(primaryImage.imageUrl);
    }
    
    // If no primary image, use the first image
    if (car.images && car.images.length > 0) {
      return getAbsoluteImageUrl(car.images[0].imageUrl);
    }
    
    // Fall back to legacy field or placeholder
    return getAbsoluteImageUrl(car.photoUrl) || 'https://via.placeholder.com/800x400?text=No+Image';
  };

  const isAuctionOngoing = car?.status === 'OngoingAuction';
  const isUserSeller = user && car && user.id === car.sellerId;

  if (loading) {
    return <div className="text-center mt-5">Loading car details...</div>;
  }

  if (error || !car) {
    return <div className="alert alert-danger">{error || 'Car not found'}</div>;
  }

  return (
    <Row className="mt-4">
      <Col md={8}>
        <Card>
          {car.images && car.images.length > 0 ? (
            <ImageCarousel images={car.images} carName={`${car.name} ${car.model}`} />
          ) : (
            <Card.Img 
              variant="top" 
              src={getCarMainImage()} 
              style={{ maxHeight: '400px', objectFit: 'cover' }}
            />
          )}
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Card.Title className="mb-0 h2">{car.name} {car.model} ({car.year})</Card.Title>
              <Badge bg={getStatusVariant(car.status)}>
                {formatStatus(car.status)}
              </Badge>
            </div>
            
            <Card.Text>{car.description}</Card.Text>
            
            <Row className="mt-4">
              <Col md={6}>
                <strong>Start Price:</strong> ${car.startPrice.toFixed(2)}
              </Col>
              <Col md={6}>
                <strong>Current Bid:</strong> ${car.currentBid.toFixed(2) || car.startPrice.toFixed(2)}
              </Col>
              <Col md={6} className="mt-2">
                <strong>Auction Start:</strong> {formatDate(car.auctionStartDate)}
              </Col>
              <Col md={6} className="mt-2">
                <strong>Auction End:</strong> {formatDate(car.auctionEndDate)}
              </Col>
              <Col md={6} className="mt-2">
                <strong>Seller:</strong> {car.sellerName}
              </Col>
              <Col md={6} className="mt-2">
                <strong>Total Bids:</strong> {car.bidCount}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Bid History */}
        <Card className="mt-4">
          <Card.Header>Recent Bids</Card.Header>
          <ListGroup variant="flush">
            {car.recentBids && car.recentBids.length > 0 ? (
              car.recentBids.map((bid: any, index: number) => {
                const isHighestBid = index === 0; // First bid is the highest (most recent and highest)
                const isCurrentUserBid = user && bid.bidderId === user.id;
                const isWinningBid = isHighestBid && isCurrentUserBid;
                
                return (
                  <ListGroup.Item 
                    key={bid.id} 
                    className={`d-flex justify-content-between align-items-center ${
                      isWinningBid ? 'bg-success-subtle border-success' : 
                      isCurrentUserBid ? 'bg-primary-subtle' : ''
                    }`}
                  >
                    <div>
                      <strong>${bid.amount.toFixed(2)}</strong> by {bid.bidderName}
                      {isWinningBid && (
                        <Badge bg="success" className="ms-2">
                          <i className="bi bi-trophy"></i> You're Winning!
                        </Badge>
                      )}
                      {isCurrentUserBid && !isWinningBid && (
                        <Badge bg="primary" className="ms-2">Your Bid</Badge>
                      )}
                    </div>
                    <small>{new Date(bid.placedAt).toLocaleString()}</small>
                  </ListGroup.Item>
                );
              })
            ) : (
              <ListGroup.Item>No bids yet</ListGroup.Item>
            )}
          </ListGroup>
        </Card>
      </Col>

      <Col md={4}>
        {/* Bidding Panel */}
        <Card>
          <Card.Header>Place a Bid</Card.Header>
          <Card.Body>
            {!user ? (
              <Alert variant="info">Please log in to place a bid</Alert>
            ) : isUserSeller ? (
              <Alert variant="warning">You cannot bid on your own car</Alert>
            ) : !isAuctionOngoing ? (
              <Alert variant="info">This auction is not currently active</Alert>
            ) : (
              <>
                {/* Show winning status in bidding panel */}
                {user && car.recentBids && car.recentBids.length > 0 && (
                  (() => {
                    const highestBid = car.recentBids[0];
                    const isWinning = highestBid.bidderId === user.id;
                    
                    if (isWinning) {
                      return (
                        <Alert variant="success" className="mb-3">
                          <i className="bi bi-trophy me-2"></i>
                          <strong>You're currently winning!</strong>
                          <br />
                          <small>Your bid: ${highestBid.amount.toFixed(2)}</small>
                        </Alert>
                      );
                    }
                    return null;
                  })()
                )}
                
                <Form onSubmit={handleBidSubmit}>
                  {bidError && <Alert variant="danger">{bidError}</Alert>}
                  {bidSuccess && <Alert variant="success">Bid placed successfully!</Alert>}
                <Form.Group className="mb-3" controlId="bidAmount">
                  <Form.Label>Your Bid Amount ($)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min={car.currentBid > 0 ? car.currentBid + 0.01 : car.startPrice}
                    value={bidAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBidAmount(e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    Must be higher than current bid: ${car.currentBid > 0 ? car.currentBid.toFixed(2) : car.startPrice.toFixed(2)}
                  </Form.Text>
                </Form.Group>
                <Button variant="primary" type="submit">
                  Place Bid
                </Button>
                </Form>
              </>
            )}
          </Card.Body>
        </Card>

        {/* Auction Info */}
        <Card className="mt-4">
          <Card.Header>Auction Information</Card.Header>
          <Card.Body>
            <div className="mb-2">
              <strong>Status:</strong> {formatStatus(car.status)}
            </div>
            <div className="mb-2">
              <strong>Start Time:</strong> {formatDate(car.auctionStartDate)}
            </div>
            <div className="mb-2">
              <strong>End Time:</strong> {formatDate(car.auctionEndDate)}
            </div>
            
            {/* Show winning status if user has the highest bid */}
            {user && car.recentBids && car.recentBids.length > 0 && (
              (() => {
                const highestBid = car.recentBids[0];
                const isWinning = highestBid.bidderId === user.id;
                
                if (isWinning && car.status === 'OngoingAuction') {
                  return (
                    <Alert variant="success" className="mb-3">
                      <i className="bi bi-trophy me-2"></i>
                      <strong>You're currently winning this auction!</strong>
                      <br />
                      <small>Your winning bid: ${highestBid.amount.toFixed(2)}</small>
                    </Alert>
                  );
                } else if (isWinning && car.status === 'Sold') {
                  return (
                    <Alert variant="success" className="mb-3">
                      <i className="bi bi-trophy me-2"></i>
                      <strong>Congratulations! You won this auction!</strong>
                      <br />
                      <small>Winning bid: ${highestBid.amount.toFixed(2)}</small>
                    </Alert>
                  );
                }
                return null;
              })()
            )}
            
            {car.status === 'OngoingAuction' && (
              <div className="mb-2">
                <strong>Time Left:</strong>{' '}
                <span 
                  className={`fw-bold ${
                    timeRemainingSeconds <= 5 && timeRemainingSeconds > 0 
                      ? 'text-danger fs-4 fw-bolder' 
                      : 'text-danger'
                  }`}
                  style={{
                    ...(timeRemainingSeconds <= 5 && timeRemainingSeconds > 0 && {
                      animation: 'pulse 1s infinite',
                      textShadow: '0 0 10px rgba(220, 53, 69, 0.8)'
                    })
                  }}
                >
                  {timeRemaining}
                </span>
                {timeRemainingSeconds <= 5 && timeRemainingSeconds > 0 && (
                  <div className="mt-1">
                    <small className="text-danger fw-bold">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      FINAL SECONDS!
                    </small>
                  </div>
                )}
              </div>
            )}
            
            {car.status === 'UpcomingAuction' && (
              <div className="mb-2">
                <strong>Starts In:</strong>{' '}
                <span className="text-primary fw-bold">{startTimeRemaining}</span>
                <div className="mt-1">
                  <small className="text-muted">
                    Note: Auction status will automatically update when the start time is reached.
                  </small>
                </div>
              </div>
            )}
            
            <div className="mt-3">
              <small className="text-muted">
                Bids are binding contracts. By placing a bid, you agree to purchase the vehicle if you are the winning bidder.
              </small>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default CarDetails;
