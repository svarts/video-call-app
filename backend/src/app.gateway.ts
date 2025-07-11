import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class AppGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-room')
  handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.roomId);
  }

  @SubscribeMessage('offer')
  handleOffer(@MessageBody() data: { roomId: string; offer: any }, @ConnectedSocket() client: Socket) {
    client.to(data.roomId).emit('offer-received', { offer: data.offer });
  }

  @SubscribeMessage('answer')
  handleAnswer(@MessageBody() data: { roomId: string; answer: any }, @ConnectedSocket() client: Socket) {
    client.to(data.roomId).emit('answer-received', { answer: data.answer });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(@MessageBody() data: { roomId: string; candidate: any }, @ConnectedSocket() client: Socket) {
    client.to(data.roomId).emit('ice-candidate-received', { candidate: data.candidate });
  }
} 