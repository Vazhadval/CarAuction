import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Card, Table, Badge, Alert, Button } from 'react-bootstrap';
import { 
  getPendingCars, 
  getCarsByStatus, 
  approveCar, 
  rejectCar, 
  getUsers,
  getStatistics
} from '../services/api';
import { Car, User, Statistics } from '../types';

const AdminDashboard: React.FC = () => {
  const [pendingCars, setPendingCars] = useState<Car[]>([]);
  const [activeCars, setActiveCars] = useState<Car[]>([]);
  const [soldCars, setSoldCars] = useState<Car[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch cars by status
      const pendingResponse = await getPendingCars();
      const activeResponse = await getCarsByStatus('OngoingAuction');
      const upcomingResponse = await getCarsByStatus('UpcomingAuction');
      const soldResponse = await getCarsByStatus('Sold');
      const usersResponse = await getUsers();
      const statsResponse = await getStatistics();

      setPendingCars(pendingResponse.data);
      setActiveCars([...activeResponse.data, ...upcomingResponse.data]);
      setSoldCars(soldResponse.data);
      setUsers(usersResponse.data);
      setStats(statsResponse.data);
    } catch (err) {
      setError('Failed to fetch data. Please try again later.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveCar = async (id: number) => {
    try {
      await approveCar(id);
      // Refresh data after approval
      fetchData();
    } catch (err) {
      setError('Failed to approve car. Please try again.');
      console.error('Error approving car:', err);
    }
  };

  const handleRejectCar = async (id: number) => {
    if (window.confirm('Are you sure you want to reject this car?')) {
      try {
        await rejectCar(id);
        // Refresh data after rejection
        fetchData();
      } catch (err) {
        setError('Failed to reject car. Please try again.');
        console.error('Error rejecting car:', err);
      }
    }
  };

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

  const renderPendingCarsTable = () => {
    if (pendingCars.length === 0) {
      return <Alert variant="info">No cars pending approval</Alert>;
    }

    return (
      <Table striped bordered responsive>
        <thead>
          <tr>
            <th>Car</th>
            <th>Seller</th>
            <th>Start Price</th>
            <th>Auction Dates</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingCars.map(car => (
            <tr key={car.id}>
              <td>
                <a href={`/car/${car.id}`}>
                  {car.name} {car.model} ({car.year})
                </a>
              </td>
              <td>{car.sellerName}</td>
              <td>${car.startPrice.toFixed(2)}</td>
              <td>
                From: {new Date(car.auctionStartDate).toLocaleDateString()}<br />
                To: {new Date(car.auctionEndDate).toLocaleDateString()}
              </td>
              <td>
                <Button 
                  variant="success" 
                  size="sm" 
                  className="me-2"
                  onClick={() => handleApproveCar(car.id)}
                >
                  Approve
                </Button>
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => handleRejectCar(car.id)}
                >
                  Reject
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderCarsTable = (cars: Car[]) => {
    if (cars.length === 0) {
      return <Alert variant="info">No cars found in this category</Alert>;
    }

    return (
      <Table striped bordered responsive>
        <thead>
          <tr>
            <th>Car</th>
            <th>Status</th>
            <th>Seller</th>
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
              <td>{car.sellerName}</td>
              <td>${car.startPrice.toFixed(2)}</td>
              <td>${car.currentBid ? car.currentBid.toFixed(2) : '0.00'}</td>
              <td>
                From: {new Date(car.auctionStartDate).toLocaleDateString()}<br />
                To: {new Date(car.auctionEndDate).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderUsersTable = () => {
    if (users.length === 0) {
      return <Alert variant="info">No users found</Alert>;
    }

    return (
      <Table striped bordered responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.email}</td>
              <td>{user.registeredDate ? new Date(user.registeredDate).toLocaleDateString() : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderStats = () => {
    if (!stats) {
      return <Alert variant="info">No statistics available</Alert>;
    }

    return (
      <div className="row">
        <div className="col-md-4 mb-4">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Total Cars</Card.Title>
              <h2>{stats.totalCars}</h2>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4 mb-4">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Active Bids</Card.Title>
              <h2>{stats.activeBids}</h2>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4 mb-4">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Total Users</Card.Title>
              <h2>{stats.totalUsers}</h2>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-6 mb-4">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Sold Cars</Card.Title>
              <h2>{stats.soldCars}</h2>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-6 mb-4">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Pending Cars</Card.Title>
              <h2>{stats.pendingCars}</h2>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center my-5">Loading admin dashboard...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <>
      <h1 className="mb-4">Admin Dashboard</h1>
      
      <Tabs defaultActiveKey="pending" className="mb-3">
        <Tab eventKey="pending" title="Pending Approval">
          <Card>
            <Card.Body>
              <Card.Title>Cars Pending Approval</Card.Title>
              {renderPendingCarsTable()}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="active" title="Active Auctions">
          <Card>
            <Card.Body>
              <Card.Title>Active & Upcoming Auctions</Card.Title>
              {renderCarsTable(activeCars)}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="sold" title="Sold Cars">
          <Card>
            <Card.Body>
              <Card.Title>Sold Cars</Card.Title>
              {renderCarsTable(soldCars)}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="users" title="Users">
          <Card>
            <Card.Body>
              <Card.Title>Registered Users</Card.Title>
              {renderUsersTable()}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="stats" title="Statistics">
          <Card>
            <Card.Body>
              <Card.Title>System Statistics</Card.Title>
              {renderStats()}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </>
  );
};

export default AdminDashboard;
