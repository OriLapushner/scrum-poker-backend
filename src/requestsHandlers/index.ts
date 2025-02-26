import { Socket } from 'socket.io';
import { createRoomRequestSchema, joinRoomRequestSchema, voteRequestSchema, reconnectToRoomSchema } from '../dataSchemas/dataFromClient'
import RoomsManager from '../entities/RoomsManager';

const createRoomHandler = (socket: Socket, createRoomProps: CreateRoomProps, response: Function) => {
	const { error } = createRoomRequestSchema.validate(createRoomProps);
	if (error) return console.log('invalid props to create room request', error.message);
	const { room, guest } = RoomsManager.createRoom({ ...createRoomProps, socket });
	response({
		roomId: room.id,
		secretId: guest.secretId,
		localGuestId: guest.id
	});
};

const joinRoomHandler = (socket: Socket, joinRoomProps: JoinRoomProps, response: Function) => {
	const { error } = joinRoomRequestSchema.validate(joinRoomProps);
	if (error) return console.log('invalid props to join room request', error.message);
	try {
		const roomInfo = RoomsManager.addGuest({ ...joinRoomProps, socket });
		response(roomInfo)
	} catch (error) {
		response({ error: error.message });
		console.log(error.message);
	}
};

const reconnectToRoomHandler = (socket: Socket, reconnectToRoomProps: ReconnectToRoomProps, response: Function) => {
	const { error } = reconnectToRoomSchema.validate(reconnectToRoomProps);
	if (error) return console.log('invalid props to join room request', error.message);
	try {
		const roomInfo = RoomsManager.reconnectGuest({ ...reconnectToRoomProps, socket });
		response(roomInfo)
	} catch (error) {
		response({ error: error.message });
		console.log(error.message);
	}
}

const voteHandler = (socket: Socket, voteValue: number) => {
	const { error } = voteRequestSchema.validate(voteValue);
	if (error) return console.log('invalid props to vote request', error.message);
	RoomsManager.vote(socket, voteValue);
};

const leaveRoomHandler = (socket: Socket) => {
	console.log(`socket with id ${socket.id} has disconnected`);
	RoomsManager.removeGuest(socket);
};

const disconnectedHandler = (socket: Socket) => {
	console.log(`socket with id ${socket.id} has disconnected`);
	RoomsManager.disconnectGuest(socket);
}

const revealCards = (socket: Socket, _: undefined, response: Function) => {
	console.log('revealCards')
	try {
		RoomsManager.revealCards(socket);
		response({ error: null })
	} catch (error) {
		response({ error: error.message });
		console.log(error.message);
	}
};

const startNewRound = (socket: Socket, _: undefined, response: Function) => {
	console.log('startNewRound')
	try {
		RoomsManager.startNewRound(socket);
		response({ error: null })
	}
	catch (error) {
		response({ error: error.message });
		console.log(error.message);
	}

}

export {
	createRoomHandler,
	joinRoomHandler,
	leaveRoomHandler,
	voteHandler,
	revealCards,
	startNewRound,
	disconnectedHandler,
	reconnectToRoomHandler,
}