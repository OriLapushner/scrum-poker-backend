import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import https from 'https';
import cors from 'cors';
import SocketService from './services/sockets';
import {
	createRoomHandler,
	joinRoomHandler,
	voteHandler,
	revealCards,
	startNewRound,
	disconnectedHandler,
	setGuestSpectatorStatus,
	setGuestName,
	reconnectToRoomHandler
} from './requestsHandlers'
import RoomsManager from './entities/RoomsManager'
dotenv.config();

const init = () => {
	const app = express();
	app.use(cors());

	const { PORT, SSL_ENABLED, SSL_CERT, SSL_PRIVKEY, SSL_FULLCHAIN } = process.env;
	let server;

	if (SSL_ENABLED === 'true' && SSL_CERT && SSL_PRIVKEY && SSL_FULLCHAIN) {
		const sslOptions = {
			cert: SSL_CERT,
			key: SSL_PRIVKEY,
			ca: SSL_FULLCHAIN
		};

		server = https.createServer(sslOptions, app);
		console.log('Server running in HTTPS mode');
	} else {
		server = http.createServer(app);
		console.log('Server running in HTTP mode');
	}

	const socketService = new SocketService();
	const io = socketService.init(server);

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
		socket.on('vote', (props, response) => voteHandler(socket, props, response));
		socket.on('reveal_cards', (props, response) => revealCards(socket, props, response));
		socket.on('start_new_round', (props, response) => startNewRound(socket, props, response));
		socket.on('set_guest_spectator_status', (props, response) => setGuestSpectatorStatus(socket, props, response));
		socket.on('set_guest_name', (props, response) => setGuestName(socket, props, response));
	});

	server.listen(PORT, () => {
		console.log(`server running on port ${PORT}`);
	});
};

init();