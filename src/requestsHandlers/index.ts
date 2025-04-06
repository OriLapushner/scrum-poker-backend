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
		response({
			secretId: roomInfo.secretId,
			isReaveled: roomInfo.isReaveled,
			roomName: roomInfo.roomName,
			deck: roomInfo.deck,
			guests: roomInfo.guests,
			localGuestId: roomInfo.localGuestId,
			currentRound: roomInfo.currentRound,
			previousRounds: roomInfo.previousRounds,
		})
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
		const filteredGuests = roomInfo.guests.filter(guest => guest.id !== roomInfo.localGuest.id);
		response({
			localGuest: roomInfo.localGuest,
			isReaveled: roomInfo.isReaveled,
			roomName: roomInfo.roomName,
			deck: roomInfo.deck,
			guests: filteredGuests,
			currentRound: roomInfo.currentRound,
			previousRounds: roomInfo.previousRounds,
		})
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
	voteHandler,
	revealCards,
	startNewRound,
	disconnectedHandler,
	reconnectToRoomHandler,
}