import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface RoomUser {
  socketId: string;
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private rooms: Map<string, RoomUser[]> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.removeUserFromAllRooms(client.id);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, payload: { roomId: string; userId: string }) {
    const { roomId, userId } = payload;
    
    console.log(`User ${userId} joining room ${roomId}`);
    
    // Kullanıcıyı odaya ekle
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, []);
    }
    
    const room = this.rooms.get(roomId)!;
    room.push({ socketId: client.id, userId });
    
    // Socket'i odaya join et
    client.join(roomId);
    
    // Odadaki diğer kullanıcılara yeni kullanıcı bilgisini gönder
    client.to(roomId).emit('user-joined', { userId, socketId: client.id });
    
    console.log(`Room ${roomId} now has ${room.length} users`);
  }

  @SubscribeMessage('offer')
  handleOffer(client: Socket, payload: { roomId: string; offer: any; targetUserId: string }) {
    const { roomId, offer, targetUserId } = payload;
    
    console.log(`Offer from ${client.id} to ${targetUserId} in room ${roomId}`);
    
    // Hedef kullanıcıya offer'ı gönder
    client.to(roomId).emit('offer-received', {
      offer,
      fromUserId: this.getUserIdBySocketId(client.id, roomId),
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(client: Socket, payload: { roomId: string; answer: any; targetUserId: string }) {
    const { roomId, answer, targetUserId } = payload;
    
    console.log(`Answer from ${client.id} to ${targetUserId} in room ${roomId}`);
    
    // Hedef kullanıcıya answer'ı gönder
    client.to(roomId).emit('answer-received', {
      answer,
      fromUserId: this.getUserIdBySocketId(client.id, roomId),
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(client: Socket, payload: { roomId: string; candidate: any; targetUserId: string }) {
    const { roomId, candidate, targetUserId } = payload;
    
    console.log(`ICE candidate from ${client.id} to ${targetUserId} in room ${roomId}`);
    
    // Hedef kullanıcıya ICE candidate'ı gönder
    client.to(roomId).emit('ice-candidate-received', {
      candidate,
      fromUserId: this.getUserIdBySocketId(client.id, roomId),
    });
  }

  private getUserIdBySocketId(socketId: string, roomId: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    const user = room.find(u => u.socketId === socketId);
    return user ? user.userId : null;
  }

  private removeUserFromAllRooms(socketId: string) {
    for (const [roomId, users] of this.rooms.entries()) {
      const updatedUsers = users.filter(user => user.socketId !== socketId);
      this.rooms.set(roomId, updatedUsers);
      
      if (updatedUsers.length === 0) {
        this.rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (no users left)`);
      }
    }
  }
} 