import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Badge, Button, Form, Row, Col, Alert, ListGroup, Modal } from 'react-bootstrap';
import { getCarDetails, buyDirectSaleCar } from '../services/api';
import { CarDetails as CarDetailsType, User, CreateOrderDto } from '../types';
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
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<boolean>(false);
  
  // Bid step configuration
  const BID_STEP = 100;
  
  // Direct sale order state
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [orderData, setOrderData] = useState<CreateOrderDto>({
    carId: 0,
    personalNumber: '',
    mobile: '',
    email: user?.email || '',
    address: '',
    notes: ''
  });
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderLoading, setOrderLoading] = useState<boolean>(false);
  
  const { showToast } = useToast();

  useEffect(() => {
    const fetchCarDetails = async () => {
      try {
        const response = await getCarDetails(Number(id));
        setCar(response.data);
      } catch (err) {
        setError('მანქანის დეტალების ჩამოტვირთვა ვერ მოხერხდა. გთხოვთ, კვლავ სცადეთ.');
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
            showToast('ახალი ბიდი', `${latestBid.bidderName}-მა განათავსა ბიდი $${latestBid.amount.toFixed(2)}`, 'info');
          }
        }
      });
      
      // Listen for status changes
      signalRService.onCarStatusChanged((carId: number, newStatus: string) => {
        if (carId === car.id && car.status !== newStatus) {
          setCar(prev => {
            if (prev) {
              showToast('სტატუსის ცვლილება', `აუქციონის სტატუსი შეიცვალა: ${newStatus.replace(/([A-Z])/g, ' $1').trim()}`, 'info');
              return { ...prev, status: newStatus };
            }
            return prev;
          });
        }
      });

      // Listen for auction won notifications
      signalRService.onAuctionWon((carId: number, carName: string, winningBid: number) => {
        if (carId === car.id) {
          showToast('გილოცავთ!', `თქვენ მოიგეთ აუქციონი ${carName}-ზე $${winningBid.toFixed(2)} ბიდით!`, 'success');
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

    const amount = bidAmount;
    
    // Validation
    if (isNaN(amount) || amount <= 0) {
      setBidError('გთხოვთ, შეიყვანეთ ბიდის ვალიდური თანხა');
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
        // Reset bid amount to new minimum (current bid + step)
        const newMinBid = Math.max(car.currentBid + BID_STEP, car.startPrice + BID_STEP);
        setBidAmount(newMinBid);
        showToast('ბიდი განთავსდა', 'თქვენი ბიდი წარმატებით განთავსდა!', 'success');
        setTimeout(() => setBidSuccess(false), 3000);
      } else {
        setBidError('ბიდის განთავსება ვერ მოხერხდა. გთხოვთ, კვლავ სცადეთ.');
        showToast('ბიდი ვერ განთავსდა', 'ბიდის განთავსებისას პრობლემა იყო. გთხოვთ, კვლავ სცადეთ.', 'error');
      }
    } catch (err) {
      const errorMessage = 'ბიდის განთავსებისას შეცდომა მოხდა. გთხოვთ, კვლავ სცადეთ.';
      setBidError(errorMessage);
      showToast('შეცდომა', errorMessage, 'error');
      console.error('Error placing bid:', err);
    }
  };

  // Direct sale order handlers
  const handleOrderDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOrderData(prev => ({ ...prev, [name]: value }));
  };

  const handleShowOrderModal = () => {
    if (car) {
      setOrderData(prev => ({ ...prev, carId: car.id }));
      setShowOrderModal(true);
    }
  };

  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setOrderError(null);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!car || !user) return;

    setOrderLoading(true);
    setOrderError(null);

    try {
      // Place direct sale order
      await buyDirectSaleCar(orderData);
      setShowOrderModal(false);
      showToast('შეძენა წარმატებულია', 'თქვენი შეკვეთა წარმატებით განთავსდა!', 'success');
      
      // Refresh car details to show it's been purchased
      const response = await getCarDetails(Number(id));
      setCar(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to place order. Please try again.';
      setOrderError(errorMessage);
      showToast('შეკვეთა ვერ მოხერხდა', errorMessage, 'error');
    } finally {
      setOrderLoading(false);
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
              showToast('აუქციონი დაიწყო', 'ეს აუქციონი ახლა აქტიურია!', 'info');
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
          showToast('აუქციონის განახლება', 'აუქციონი ახლა აქტიურია!', 'info');
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
          showToast('აუქციონის განახლება', 'აუქციონი დასრულდა!', 'info');
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

  // Bid amount management functions
  const getMinimumBid = () => {
    if (!car) return 0;
    return Math.max(car.currentBid + BID_STEP, car.startPrice);
  };

  const increaseBidAmount = () => {
    setBidAmount(prev => prev + BID_STEP);
  };

  const decreaseBidAmount = () => {
    const minBid = getMinimumBid();
    setBidAmount(prev => Math.max(prev - BID_STEP, minBid));
  };

  // Initialize bid amount when car data changes
  useEffect(() => {
    if (car && car.saleType === 'Auction') {
      const minBid = getMinimumBid();
      setBidAmount(minBid);
    }
  }, [car?.currentBid, car?.startPrice, car?.saleType]);

  if (loading) {
    return <div className="text-center mt-5">მანქანის დეტალები იტვირთება...</div>;
  }

  if (error || !car) {
    return <div className="alert alert-danger">{error || 'მანქანა ვერ მოიძებნა'}</div>;
  }

  return (
    <>
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
                <strong>Sale Type:</strong> {car.saleType === 'DirectSale' ? 'Direct Sale' : 'Auction'}
              </Col>
              <Col md={6}>
                <strong>გამყიდველი:</strong> {car.sellerName}
              </Col>
              {car.saleType === 'DirectSale' ? (
                <>
                  <Col md={6} className="mt-2">
                    <strong>Price:</strong> ${car.fixedPrice?.toFixed(2)}
                  </Col>
                  {car.buyerName && (
                    <Col md={6} className="mt-2">
                      <strong>Buyer:</strong> {car.buyerName}
                    </Col>
                  )}
                </>
              ) : (
                <>
                  <Col md={6} className="mt-2">
                    <strong>საწყისი ფასი:</strong> ${car.startPrice.toFixed(2)}
                  </Col>
                  <Col md={6} className="mt-2">
                    <strong>მიმდინარე ბიდი:</strong> ${car.currentBid.toFixed(2) || car.startPrice.toFixed(2)}
                  </Col>
                  <Col md={6} className="mt-2">
                    <strong>აუქციონის დაწყება:</strong> {formatDate(car.auctionStartDate)}
                  </Col>
                  <Col md={6} className="mt-2">
                    <strong>აუქციონის დასრულება:</strong> {formatDate(car.auctionEndDate)}
                  </Col>
                  <Col md={6} className="mt-2">
                    <strong>სულ ბიდები:</strong> {car.bidCount}
                  </Col>
                  {car.winnerName && (
                    <Col md={6} className="mt-2">
                      <strong>Winner:</strong> {car.winnerName}
                    </Col>
                  )}
                </>
              )}
            </Row>
          </Card.Body>
        </Card>

        {/* Bid History - Only show for auctions */}
        {car.saleType === 'Auction' && (
          <Card className="mt-4">
          <Card.Header>ბოლო ბიდები</Card.Header>
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
                          <i className="bi bi-trophy"></i> თქვენ ხართ გამარჯვებული!
                        </Badge>
                      )}
                      {isCurrentUserBid && !isWinningBid && (
                        <Badge bg="primary" className="ms-2">თქვენი ბიდი</Badge>
                      )}
                    </div>
                    <small>{new Date(bid.placedAt).toLocaleString()}</small>
                  </ListGroup.Item>
                );
              })
            ) : (
              <ListGroup.Item>ჯერ ბიდები არ არის</ListGroup.Item>
            )}
          </ListGroup>
        </Card>
        )}
      </Col>

      <Col md={4}>
        {/* Bidding/Buying Panel */}
        <Card>
          <Card.Header>
            {car.saleType === 'DirectSale' ? 'ამ მანქანის შეძენა' : 'ბიდის განთავსება'}
          </Card.Header>
          <Card.Body>
            {!user ? (
              <Alert variant="info">
                {car.saleType === 'DirectSale' ? 'მანქანის შესაძენად გთხოვთ, შეხვიდეთ სისტემაში' : 'ბიდის განსათავსებლად გთხოვთ, შეხვიდეთ სისტემაში'}
              </Alert>
            ) : isUserSeller ? (
              <Alert variant="warning">თქვენ არ შეგიძლიათ საკუთარი მანქანის შეძენა/ბიდის განთავსება</Alert>
            ) : car.saleType === 'DirectSale' ? (
              // Direct Sale Section
              <>
                {car.status === 'Sold' || car.buyerName ? (
                  <Alert variant="info">ეს მანქანა უკვე გაყიდულია {car.buyerName}-ისთვის</Alert>
                ) : (
                  <>
                    <div className="mb-3">
                      <h5 className="text-primary">${car.fixedPrice?.toFixed(2)}</h5>
                      <p className="text-muted">ფიქსირებული ფასი</p>
                    </div>
                    <Button 
                      variant="success" 
                      size="lg" 
                      className="w-100"
                      onClick={handleShowOrderModal}
                    >
                      ახლავე შეძენა
                    </Button>
                  </>
                )}
              </>
            ) : !isAuctionOngoing ? (
              <Alert variant="info">ეს აუქციონი ამჟამად არ არის აქტიური</Alert>
            ) : (
              // Auction Section
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
                          <strong>თქვენ ამჟამად იმარჯვებთ!</strong>
                          <br />
                          <small>თქვენი ბიდი: ${highestBid.amount.toFixed(2)}</small>
                        </Alert>
                      );
                    }
                    return null;
                  })()
                )}
                
                {/* Current Highest Bid Display */}
                <div className="text-center mb-3 p-3 bg-primary bg-opacity-10 rounded border border-primary">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small">მიმდინარე ბიდი:</span>
                    <div className="d-flex align-items-center">
                      <span className="h4 fw-bold text-primary mb-0 me-2">
                        ${car.currentBid > 0 ? car.currentBid.toFixed(2) : car.startPrice.toFixed(2)}
                      </span>
                      {car.recentBids && car.recentBids.length > 0 ? (
                        <small className="text-muted">
                          ({car.recentBids[0].bidderName})
                        </small>
                      ) : (
                        <small className="text-muted">
                          (საწყისი ფასი)
                        </small>
                      )}
                    </div>
                  </div>
                </div>
                
                <Form onSubmit={handleBidSubmit}>
                  {bidError && <Alert variant="danger">{bidError}</Alert>}
                  {bidSuccess && <Alert variant="success">ბიდი წარმატებით განთავსდა!</Alert>}
                <Form.Group className="mb-3" controlId="bidAmount">
                  <Form.Label>თქვენი ბიდის რაოდენობა ($)</Form.Label>
                  <div className="input-group">
                    <Button 
                      variant="outline-secondary" 
                      type="button"
                      onClick={decreaseBidAmount}
                      disabled={bidAmount <= getMinimumBid()}
                      className="px-3"
                    >
                      <i className="bi bi-dash fs-5"></i>
                    </Button>
                    <Form.Control
                      type="text"
                      value={`$${bidAmount.toFixed(2)}`}
                      readOnly
                      className="text-center fw-bold bg-light"
                      style={{ fontSize: '1.2rem', border: '2px solid #dee2e6' }}
                    />
                    <Button 
                      variant="outline-secondary" 
                      type="button"
                      onClick={increaseBidAmount}
                      className="px-3"
                    >
                      <i className="bi bi-plus fs-5"></i>
                    </Button>
                  </div>
                  <div className="mt-2">
                    <small className="text-muted">
                      მინიმალური ბიდი: <strong>${getMinimumBid().toFixed(2)}</strong> • ნაბიჯი: <strong>${BID_STEP}</strong>
                    </small>
                  </div>
                  
                  {/* Quick bid buttons */}
                  <div className="mt-3">
                    <small className="text-muted d-block mb-2">სწრაფი ბიდი:</small>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        type="button"
                        onClick={() => setBidAmount(getMinimumBid())}
                      >
                        ${getMinimumBid().toFixed(2)}
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        type="button"
                        onClick={() => setBidAmount(getMinimumBid() + BID_STEP)}
                      >
                        ${(getMinimumBid() + BID_STEP).toFixed(2)}
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        type="button"
                        onClick={() => setBidAmount(getMinimumBid() + BID_STEP * 2)}
                      >
                        ${(getMinimumBid() + BID_STEP * 2).toFixed(2)}
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        type="button"
                        onClick={() => setBidAmount(getMinimumBid() + BID_STEP * 5)}
                      >
                        ${(getMinimumBid() + BID_STEP * 5).toFixed(2)}
                      </Button>
                    </div>
                  </div>
                </Form.Group>
                <Button variant="primary" type="submit" size="lg" className="w-100 mt-3">
                  <i className="bi bi-hammer me-2"></i>
                  ბიდის განთავსება - ${bidAmount.toFixed(2)}
                </Button>
                </Form>
              </>
            )}
          </Card.Body>
        </Card>

        {/* Auction Info */}
        <Card className="mt-4">
          <Card.Header>აუქციონის ინფორმაცია</Card.Header>
          <Card.Body>
            <div className="mb-2">
              <strong>სტატუსი:</strong> {formatStatus(car.status)}
            </div>
            <div className="mb-2">
              <strong>დაწყების დრო:</strong> {formatDate(car.auctionStartDate)}
            </div>
            <div className="mb-2">
              <strong>დასრულების დრო:</strong> {formatDate(car.auctionEndDate)}
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
                      <strong>თქვენ ამჟამად იმარჯვებთ ამ აუქციონში!</strong>
                      <br />
                      <small>თქვენი გამარჯვებული ბიდი: ${highestBid.amount.toFixed(2)}</small>
                    </Alert>
                  );
                } else if (isWinning && car.status === 'Sold') {
                  return (
                    <Alert variant="success" className="mb-3">
                      <i className="bi bi-trophy me-2"></i>
                      <strong>გილოცავთ! თქვენ მოიგეთ ეს აუქციონი!</strong>
                      <br />
                      <small>გამარჯვებული ბიდი: ${highestBid.amount.toFixed(2)}</small>
                    </Alert>
                  );
                }
                return null;
              })()
            )}
            
            {car.status === 'OngoingAuction' && (
              <div className="mb-2">
                <strong>დარჩენილი დრო:</strong>{' '}
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
                      ბოლო წამები!
                    </small>
                  </div>
                )}
              </div>
            )}
            
            {car.status === 'UpcomingAuction' && (
              <div className="mb-2">
                <strong>იწყება:</strong>{' '}
                <span className="text-primary fw-bold">{startTimeRemaining}</span>
                <div className="mt-1">
                  <small className="text-muted">
                    შენიშვნა: აუქციონის სტატუსი ავტომატურად განახლდება დაწყების დროის მისაღწევად.
                  </small>
                </div>
              </div>
            )}
            
            <div className="mt-3">
              <small className="text-muted">
                ბიდები მავალი ხელშეკრულებებია. ბიდის განთავსებით თქვენ ეთანხმებით მანქანის შეძენას, თუ იქნებით გამარჯვებული ბიდერი.
              </small>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>

    {/* Order Modal for Direct Sales */}
    {car && (
      <Modal show={showOrderModal} onHide={handleCloseOrderModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>თქვენი შეძენის დასრულება</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <h5>{car.name} {car.model} ({car.year})</h5>
            <p className="text-muted">ფასი: ${car.fixedPrice?.toFixed(2)}</p>
          </div>
          
          {orderError && <Alert variant="danger">{orderError}</Alert>}
          
          <Form onSubmit={handleOrderSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="personalNumber">
                  <Form.Label>პირადი ნომერი <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="personalNumber"
                    value={orderData.personalNumber}
                    onChange={handleOrderDataChange}
                    required
                    placeholder="შეიყვანეთ თქვენი პირადი ნომერი"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="mobile">
                  <Form.Label>მობილურის ნომერი <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="tel"
                    name="mobile"
                    value={orderData.mobile}
                    onChange={handleOrderDataChange}
                    required
                    placeholder="შეიყვანეთ თქვენი მობილურის ნომერი"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>ელ-ფოსტა <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={orderData.email}
                onChange={handleOrderDataChange}
                required
                placeholder="შეიყვანეთ თქვენი ელ-ფოსტის მისამართი"
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="address">
              <Form.Label>მისამართი</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={orderData.address}
                onChange={handleOrderDataChange}
                placeholder="შეიყვანეთ თქვენი მისამართი (არასავალდებულო)"
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="notes">
              <Form.Label>შენიშვნები</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={orderData.notes}
                onChange={handleOrderDataChange}
                placeholder="ნებისმიერი დამატებითი შენიშვნები (არასავალდებულო)"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseOrderModal}>
            გაუქმება
          </Button>
          <Button 
            variant="success" 
            onClick={handleOrderSubmit}
            disabled={orderLoading}
          >
            {orderLoading ? 'მუშავდება...' : `შეძენა $${car.fixedPrice?.toFixed(2)}-ად`}
          </Button>
        </Modal.Footer>
      </Modal>
    )}
    </>
  );
};

export default CarDetails;
