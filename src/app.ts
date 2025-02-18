import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import cors from 'cors';
import SocketService from './services/sockets';
import { createRoomHandler, joinRoomHandler, leaveRoomHandler, voteHandler, revealCards, startNewRound, disconnectedHandler } from './requestsHandlers'
import RoomsManager from './entities/RoomsManager'
dotenv.config();

const init = () => {
	const app = express();
	app.use(cors());
	const server = http.createServer(app);
	const socketService = new SocketService();
	const io = socketService.init(server);
	const { SERVER_PORT } = process.env;

	RoomsManager.init(io);
	io.on('connection', (socket: Socket) => {
		console.log(`⚡: ${socket.id} user just connected!`);

		socket.on('create_room', createRoomHandler.bind(null, socket));
		socket.on('join_room', joinRoomHandler.bind(null, socket));
		socket.on('disconnect', disconnectedHandler.bind(null, socket));
		socket.on('leaveRoom', leaveRoomHandler.bind(null, socket));
		socket.on('vote', voteHandler.bind(null, socket));
		socket.on('reveal_cards', revealCards.bind(null, socket));
		socket.on('start_new_round', startNewRound.bind(null, socket));
	});

	server.listen(SERVER_PORT, () => {
		console.log(`server running on port ${SERVER_PORT}`);
	});
};

init();
