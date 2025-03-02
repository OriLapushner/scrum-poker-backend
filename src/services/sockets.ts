import { Server } from 'socket.io';

class SocketService {
	io: Server = null;

	init(httpServer: any) {
		return this.create(httpServer);
	}
	create(httpServer: any) {
		this.io = new Server(httpServer, {
			cors: {
				origin: process.env.CORS_ORIGIN,
				methods: ['GET', 'POST'],
			},
		});
		return this.io;
	}
	getServer() {
		return this.io;
	}
}

export default SocketService;