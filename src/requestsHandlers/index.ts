import { Socket } from 'socket.io';
import { createRoomRequestSchema, joinRoomRequestSchema, voteRequestSchema, reconnectToRoomSchema, setGuestSpectatorStatusRequestSchema, setGuestNameRequestSchema, responseSchema } from '../dataSchemas/dataFromClient'
import RoomsManager from '../entities/RoomsManager';

const createRoomHandler = (socket: Socket, createRoomProps: CreateRoomProps, response: Function) => {
	if (responseSchema.validate(response).error) {
		return console.log('missing response param in createRoomHandler');
	}

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
	if (responseSchema.validate(response).error) {
		return console.log('missing response param in joinRoomHandler');
	}

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
	if (responseSchema.validate(response).error) {
		return console.log('missing response param in reconnectToRoomHandler');
	}

	const { error } = reconnectToRoomSchema.validate(reconnectToRoomProps);
	if (error) return console.log('invalid props to join room request', error.message);
	try {
		const roomInfo = RoomsManager.reconnectGuest({ ...reconnectToRoomProps, socket });
		response({
			localGuest: roomInfo.localGuest,
			isReaveled: roomInfo.isReaveled,
			roomName: roomInfo.roomName,
			deck: roomInfo.deck,
			guests: roomInfo.guests,
			currentRound: roomInfo.currentRound,
			previousRounds: roomInfo.previousRounds,
		})
	} catch (error) {
		response({ error: error.message });
		console.log(error.message);
	}
}

const voteHandler = (socket: Socket, voteValue: number, response: Function) => {
	if (responseSchema.validate(response).error) {
		return console.log('missing response param in voteHandler');
	}

	const { error } = voteRequestSchema.validate(voteValue);
	if (error) return console.log('invalid props to vote request', error.message);
	try {
		RoomsManager.vote(socket, voteValue);
		response({ error: null })
	} catch (error) {
		response({ error: error.message });
		console.log(error.message);
	}
};

const disconnectedHandler = (socket: Socket) => {
	try {
		RoomsManager.disconnectGuest(socket);
	} catch {
		console.log('disconnect guest failed')
	}
}

const revealCards = (socket: Socket, _: undefined, response: Function) => {
	if (responseSchema.validate(response).error) {
		return console.log('missing response param in revealCards');
	}

	try {
		RoomsManager.revealCards(socket);
		response({ error: null })
	} catch (error) {
		response({ error: error.message });
		console.log(error.message);
	}
};

const startNewRound = (socket: Socket, _: undefined, response: Function) => {
	if (responseSchema.validate(response).error) {
		return console.log('missing response param in startNewRound');
	}

	try {
		RoomsManager.startNewRound(socket);
		response({ error: null })
	}
	catch (error) {
		response({ error: error.message });
		console.log(error.message);
	}
}

const setGuestSpectatorStatus = (socket: Socket, isSpectator: boolean, response: Function) => {
	if (responseSchema.validate(response).error) {
		return console.log('missing response param in setGuestSpectatorStatus');
	}

	const { error } = setGuestSpectatorStatusRequestSchema.validate(isSpectator);
	if (error) return response({ error: error.message });
	try {
		RoomsManager.setGuestSpectatorStatus(socket, isSpectator);
		response({ error: null })
	} catch (error) { response({ error: error.message }); console.log(error.message); }
}

const setGuestName = (socket: Socket, guestName: string, response: Function) => {
	if (responseSchema.validate(response).error) {
		return console.log('missing response param in setGuestName');
	}

	const { error } = setGuestNameRequestSchema.validate(guestName);
	if (error) return response({ error: error.message });
	try {
		RoomsManager.setGuestName(socket, guestName);
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
	setGuestSpectatorStatus,
	setGuestName
}