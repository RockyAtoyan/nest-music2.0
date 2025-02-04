import { Injectable } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/server',
  // path: '/server/ws/socket.io',
})
export class SocketService implements OnGatewayConnection, OnGatewayDisconnect {
  private clients = [];

  @SubscribeMessage('message')
  handleMessage(client, data) {
    switch (data.type) {
      case 'connection': {
        this.connectionHandler(data, client);
        break;
      }
      case 'message': {
        this.messageHandler(data);
        break;
      }
    }
  }

  handleConnection(client) {
    console.log('connection', client.id);
  }

  handleDisconnect(client: any): any {
    this.clients = this.clients.filter((c) => c.socket.id !== client.id);
  }

  private connectionHandler(data: any, client: any) {
    if (!this.clients.find((c) => c.id === data.id)) {
      this.clients.push({
        id: data.id,
        socket: client,
      });
    }
    client.emit('message', JSON.stringify({ type: 'connection' }));
    console.log('connected');
  }

  private messageHandler(data: any) {
    this.clients.forEach((client) => {
      client.socket.emit('message', JSON.stringify(data));
    });
  }

  sendMessage(msg: any, clients?: string[]) {
    this.clients.forEach(({ id, socket }) => {
      if (clients) {
        if (clients.includes(id)) {
          socket.emit('message', JSON.stringify(msg));
        }
      } else {
        socket.emit('message', JSON.stringify(msg));
      }
    });
  }
}
