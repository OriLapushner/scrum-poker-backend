import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import cors from 'cors';
import SocketService from './services/sockets';
import {
	createRoomHandler,
	joinRoomHandler,
	leaveRoomHandler,
	voteHandler,
	revealCards,
	startNewRound,
	disconnectedHandler,
	reconnectToRoomHandler
} from './requestsHandlers'
import RoomsManager from './entities/RoomsManager'
dotenv.config();

const init = () => {
	const app = express();
	app.use(cors());
	const server = http.createServer(app);
	const socketService = new SocketService();
	const io = socketService.init(server);
	const { PORT } = process.env;

	app.get('/healthcheck', (req, res) => {
		res.status(200).json({
			status: 'ok',
			uptime: process.uptime(),
			timestamp: new Date().toISOString()
		});
	});

	RoomsManager.init(io);
	io.on('connection', (socket: Socket) => {
		console.log(`⚡: ${socket.id} user just connected!`);

		socket.on('create_room', (props, response) => createRoomHandler(socket, props, response));
		socket.on('join_room', (props, response) => joinRoomHandler(socket, props, response));
		socket.on('rejoin_room', (props, response) => reconnectToRoomHandler(socket, props, response));
		socket.on('disconnect', () => disconnectedHandler(socket));
		socket.on('leaveRoom', () => leaveRoomHandler(socket));
		socket.on('vote', (props) => voteHandler(socket, props));
		socket.on('reveal_cards', (props, response) => revealCards(socket, props, response));
		socket.on('start_new_round', (props, response) => startNewRound(socket, props, response));
	});

	server.listen(PORT, () => {
		console.log(`server running on port ${PORT}`);
	});
};

init();