import * as signalR from '@microsoft/signalr';
import { CarDetails, PlaceBidDto } from '../types';
import { API_CONFIG } from '../config/apiConfig';

// Define the interface for our SignalR service
export interface IAuctionSignalRService {
  startConnection(token: string): Promise<void>;
  stopConnection(): Promise<void>;
  joinCarAuction(carId: number): Promise<void>;
  leaveCarAuction(carId: number): Promise<void>;
  placeBid(bid: PlaceBidDto): Promise<boolean>;
  onBidPlaced(callback: (carDetails: CarDetails) => void): void;
  removeOnBidPlaced(): void;
  joinCarListings(): Promise<void>;
  onCarStatusChanged(callback: (carId: number, status: string) => void): void;
  removeOnCarStatusChanged(): void;
  onAuctionWon(callback: (carId: number, carName: string, winningBid: number) => void): void;
  removeOnAuctionWon(): void;
  onAuctionExtended(callback: (carId: number, newEndTime: string) => void): void;
  removeOnAuctionExtended(): void;
  onBidPlacedWithExtension(callback: (carId: number, amount: number, bidderId: string, auctionExtended: boolean, endTime: string) => void): void;
  removeOnBidPlacedWithExtension(): void;
  removeOnBidPlacedWithExtension(): void;
}

class AuctionSignalRService implements IAuctionSignalRService {
  private connection: signalR.HubConnection | null = null;

  async startConnection(token: string) {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_CONFIG.BASE_URL}${API_CONFIG.SIGNALR_HUB}?access_token=${token}`, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    try {
      await this.connection.start();
      console.log('SignalR connected successfully');
    } catch (error) {
      console.error('SignalR connection failed', error);
    }
  }

  async stopConnection() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  async joinCarAuction(carId: number) {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinCarAuction', carId);
        console.log(`Joined auction for car ${carId}`);
      } catch (error) {
        console.error(`Error joining car auction: ${error}`);
      }
    }
  }

  async leaveCarAuction(carId: number) {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveCarAuction', carId);
        console.log(`Left auction for car ${carId}`);
      } catch (error) {
        console.error(`Error leaving car auction: ${error}`);
      }
    }
  }

  async placeBid(bid: PlaceBidDto) {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        const result = await this.connection.invoke<boolean>('PlaceBid', bid);
        return result;
      } catch (error) {
        console.error(`Error placing bid: ${error}`);
        return false;
      }
    }
    return false;
  }

  onBidPlaced(callback: (carDetails: CarDetails) => void) {
    if (this.connection) {
      this.connection.on('BidPlaced', (carDetails: CarDetails) => {
        callback(carDetails);
      });
    }
  }

  removeOnBidPlaced() {
    if (this.connection) {
      this.connection.off('BidPlaced');
    }
  }

  async joinCarListings() {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinCarListings');
        console.log('Joined car listings group for real-time status updates');
      } catch (error) {
        console.error(`Error joining car listings group: ${error}`);
      }
    }
  }

  onCarStatusChanged(callback: (carId: number, status: string) => void) {
    if (this.connection) {
      this.connection.on('CarStatusChanged', (carId: number, status: string) => {
        callback(carId, status);
      });
    }
  }

  removeOnCarStatusChanged() {
    if (this.connection) {
      this.connection.off('CarStatusChanged');
    }
  }

  onAuctionWon(callback: (carId: number, carName: string, winningBid: number) => void) {
    if (this.connection) {
      this.connection.on('AuctionWon', (carId: number, carName: string, winningBid: number) => {
        callback(carId, carName, winningBid);
      });
    }
  }

  removeOnAuctionWon() {
    if (this.connection) {
      this.connection.off('AuctionWon');
    }
  }

  onAuctionExtended(callback: (carId: number, newEndTime: string) => void) {
    if (this.connection) {
      this.connection.on('AuctionExtended', (carId: number, newEndTime: string) => {
        callback(carId, newEndTime);
      });
    }
  }

  removeOnAuctionExtended() {
    if (this.connection) {
      this.connection.off('AuctionExtended');
    }
  }

  onBidPlacedWithExtension(callback: (carId: number, amount: number, bidderId: string, auctionExtended: boolean, endTime: string) => void) {
    if (this.connection) {
      this.connection.on('BidPlacedWithExtension', (carId: number, amount: number, bidderId: string, auctionExtended: boolean, endTime: string) => {
        callback(carId, amount, bidderId, auctionExtended, endTime);
      });
    }
  }

  removeOnBidPlacedWithExtension() {
    if (this.connection) {
      this.connection.off('BidPlacedWithExtension');
    }
  }
}

const signalRService = new AuctionSignalRService();
export default signalRService;
