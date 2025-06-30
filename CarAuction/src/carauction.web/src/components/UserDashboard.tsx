import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Card, Table, Badge, Alert } from 'react-bootstrap';
import { getCarsByStatus } from '../services/api';
import { Car, User, UserBid, WonCar } from '../types';
import apiClient from '../services/api';
import { formatDate } from '../utils/dateHelpers';

interface UserDashboardProps {
  user: User | null;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [pendingCars, setPendingCars] = useState<Car[]>([]);
  const [activeCars, setActiveCars] = useState<Car[]>([]);
  const [soldCars, setSoldCars] = useState<Car[]>([]);
  const [myBids, setMyBids] = useState<UserBid[]>([]);
  const [wonCars, setWonCars] = useState<WonCar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyCarsData = async () => {
      try {
        // Fetch cars by status
        const pendingResponse = await getCarsByStatus('PendingApproval');
        const activeResponse = await getCarsByStatus('OngoingAuction');
        const upcomingResponse = await getCarsByStatus('UpcomingAuction');
        const soldResponse = await getCarsByStatus('Sold');

        // Filter cars that belong to the current user
        const filterByUser = (cars: Car[]) => cars.filter(car => car.sellerId && user && car.sellerId === user.id);

        setPendingCars(filterByUser(pendingResponse.data));
        setActiveCars([
          ...filterByUser(activeResponse.data),
          ...filterByUser(upcomingResponse.data)
        ]);
        setSoldCars(filterByUser(soldResponse.data));
        
        // Combine all cars for the "My Cars" tab
        setMyCars([
          ...filterByUser(pendingResponse.data),
          ...filterByUser(activeResponse.data),
          ...filterByUser(upcomingResponse.data),
          ...filterByUser(soldResponse.data)
        ]);

        // Fetch user's bids and won cars
        const [bidsResponse, wonCarsResponse] = await Promise.all([
          apiClient.get('/cars/mybids'),
          apiClient.get('/cars/won')
        ]);
        
        setMyBids(bidsResponse.data);
        setWonCars(wonCarsResponse.data);
        
      } catch (err) {
        setError('Failed to fetch your data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMyCarsData();
    }
  }, [user?.id]);

  const getStatusBadge = (status: string) => {
    let variant;
    switch (status) {
      case 'PendingApproval':
        variant = 'warning';
        break;
      case 'UpcomingAuction':
        variant = 'primary';
        break;
      case 'OngoingAuction':
        variant = 'success';
        break;
      case 'Sold':
        variant = 'secondary';
        break;
      default:
        variant = 'info';
    }
    
    // Format status text
    const formattedStatus = status.replace(/([A-Z])/g, ' $1').trim();
    
    return <Badge bg={variant}>{formattedStatus}</Badge>;
  };

  const renderCarTable = (cars: Car[]) => {
    if (cars.length === 0) {
      return <Alert variant="info">No cars found in this category</Alert>;
    }

    return (
      <Table striped bordered responsive>
        <thead>
          <tr>
            <th>Car</th>
            <th>Status</th>
            <th>Start Price</th>
            <th>Current Bid</th>
            <th>Auction Dates</th>
          </tr>
        </thead>
        <tbody>
          {cars.map(car => (
            <tr key={car.id}>
              <td>
                <a href={`/car/${car.id}`}>
                  {car.name} {car.model} ({car.year})
                </a>
              </td>
              <td>{getStatusBadge(car.status)}</td>
              <td>${car.startPrice.toFixed(2)}</td>
              <td>${car.currentBid ? car.currentBid.toFixed(2) : '0.00'}</td>
              <td>
                From: {formatDate(car.auctionStartDate)}<br />
                To: {formatDate(car.auctionEndDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderBidsTable = (bids: UserBid[]) => {
    if (bids.length === 0) {
      return <Alert variant="info">You haven't placed any bids yet</Alert>;
    }

    return (
      <Table striped bordered responsive>
        <thead>
          <tr>
            <th>Car</th>
            <th>Your Bid</th>
            <th>Current Highest Bid</th>
            <th>Status</th>
            <th>Placed At</th>
          </tr>
        </thead>
        <tbody>
          {bids.map(bid => (
            <tr key={bid.id} className={bid.isWinning ? 'bg-success-subtle' : ''}>
              <td>
                <a href={`/car/${bid.carId}`}>
                  {bid.carName} {bid.carModel} ({bid.carYear})
                </a>
              </td>
              <td>
                ${bid.amount.toFixed(2)}
                {bid.isWinning && (
                  <Badge bg="success" className="ms-2">
                    <i className="bi bi-trophy"></i> Winning
                  </Badge>
                )}
                {bid.hasWon && (
                  <Badge bg="success" className="ms-2">
                    <i className="bi bi-trophy"></i> Won
                  </Badge>
                )}
              </td>
              <td>${bid.currentHighestBid.toFixed(2)}</td>
              <td>{getStatusBadge(bid.auctionStatus)}</td>
              <td>{new Date(bid.placedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderWonCarsTable = (cars: WonCar[]) => {
    if (cars.length === 0) {
      return <Alert variant="info">You haven't won any auctions yet</Alert>;
    }

    return (
      <Table striped bordered responsive>
        <thead>
          <tr>
            <th>Car</th>
            <th>Start Price</th>
            <th>Your Winning Bid</th>
            <th>Auction Ended</th>
            <th>Seller</th>
          </tr>
        </thead>
        <tbody>
          {cars.map(car => (
            <tr key={car.id} className="bg-success-subtle">
              <td>
                <a href={`/car/${car.id}`}>
                  {car.name} {car.model} ({car.year})
                </a>
                <Badge bg="success" className="ms-2">
                  <i className="bi bi-trophy"></i> Won
                </Badge>
              </td>
              <td>${car.startPrice.toFixed(2)}</td>
              <td>
                <strong className="text-success">${car.winningBid.toFixed(2)}</strong>
              </td>
              <td>{formatDate(car.auctionEndDate)}</td>
              <td>{car.sellerName}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  if (loading) {
    return <div className="text-center my-5">Loading your dashboard...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <>
      <h1 className="mb-4">My Dashboard</h1>
      <Card>
        <Card.Header>
          <h4>Welcome, {user?.firstName || 'User'}!</h4>
        </Card.Header>
        <Card.Body>
          <Tabs defaultActiveKey="myCars" className="mb-3">
            <Tab eventKey="myCars" title="All My Cars">
              {renderCarTable(myCars)}
            </Tab>
            <Tab eventKey="pending" title="Pending Approval">
              {renderCarTable(pendingCars)}
            </Tab>
            <Tab eventKey="active" title="Active/Upcoming">
              {renderCarTable(activeCars)}
            </Tab>
            <Tab eventKey="sold" title="Sold Cars">
              {renderCarTable(soldCars)}
            </Tab>
            <Tab eventKey="myBids" title={`My Bids ${myBids.length > 0 ? `(${myBids.length})` : ''}`}>
              {renderBidsTable(myBids)}
            </Tab>
            <Tab eventKey="wonCars" title={`Won Cars ${wonCars.length > 0 ? `(${wonCars.length})` : ''}`}>
              {renderWonCarsTable(wonCars)}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </>
  );
};

export default UserDashboard;
