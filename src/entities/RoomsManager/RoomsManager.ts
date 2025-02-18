import Room from '../Room';
import { Server } from 'socket.io';
import Guest from '../Guest';
import { roomDoesNotExist, guestDoesNotExist } from './errors';

class RoomsManager {
	static io: Server;
	static rooms: Room[] = []

	static init(io: Server) {
		RoomsManager.io = io;
	}

	static createRoom({ guestName, deck, socket, roomName }: { guestName: string, deck: Deck, socket: Socket, roomName: string }) {
		const newRoom = Room.create({ guestName, deck, socketId: socket.id, roomName });
		socket.join(newRoom.id);
		this.rooms.push(newRoom);
		console.log(`room with id ${newRoom.id} created`);
		return newRoom;
	}

	static addGuest({ roomId, guestName, socket }: { roomId: string, guestName: string, socket: Socket }) {
		const room = this.rooms.find(room => room.id === roomId);
		if (!room) throw new Error(roomDoesNotExist(roomId));
		const guest = new Guest({ name: guestName, socketId: socket.id, isInRound: !room.isRevealed });
		this.io.to(roomId).emit('guest_joined', guest)
		const { deck, guests, currentRound } = room;
		const filteredGuests = guests.filter(guest => guest.socketId !== socket.id);
		room.addGuest(guest);
		socket.join(roomId);
		return {
			deck,
			guests: filteredGuests,
			currentRound,
			roomName: room.roomName,
			isReaveled: room.isRevealed,
			secretId: guest.secretId
		};
	}

	static removeGuest(socket: Socket) {
		const room = RoomsManager.findRoomBySocketId(socket.id);
		if (!room) return console.log('guest does not exist in any room');
		const removedGuest = room.removeGuest(socket.id);
		if (room.guests.length === 0) return this.rooms = this.rooms.filter(filterRoom => filterRoom.id !== room.id);
		this.io.to(room.id).emit('guest_left', removedGuest.id);
	}

	static setCloseRoomTimeout(roomId: string) {
		setTimeout(() => {
			const room = this.rooms.find(room => room.id === roomId);
			if (!room) return console.log('room does not exist');
			if (room.guests.length === 0) return this.rooms = this.rooms.filter(filterRoom => filterRoom.id !== room.id);
			room.guests.forEach(guest => guest.isConnected = false);
		}, 1000 * 60 * 10)
	}

	static vote(socket: Socket, voteValue: number | null) {
		const room = RoomsManager.findRoomBySocketId(socket.id);
		if (!room) return console.log('guest does not exist in any room');
		if (room.deck.cards.length - 1 < voteValue) return console.log('vote value is out of boundries');
		if (room.isRevealed) return console.log('can\'t vote when revealed')
		const votingGuest = room.guests.find(guest => guest.socketId === socket.id);
		const vote = room.currentRound.find(vote => vote.guestId === votingGuest.id)
		if (voteValue === null) room.currentRound = room.currentRound.filter(vote => vote.guestId !== votingGuest.id);
		else if (vote) vote.voteValue = voteValue;
		else room.currentRound.push({ guestId: votingGuest.id, voteValue })
		this.io.to(room.id).except(socket.id).emit('guest_voted', { guestId: votingGuest.id, voteValue });
	}

	static revealCards(socket: Socket) {
		const room = this.findRoomBySocketId(socket.id);
		if (!room) throw new Error(guestDoesNotExist());
		// if (room.adminId !== socket.id) throw new Error('unallowed to reveal');
		const votingGuests = room.guests.filter(guest => guest.isInRound && guest.isConnected);
		if (room.currentRound.length !== votingGuests.length) throw new Error('not all guests voted');
		if (room.isRevealed) throw new Error('room is already revealed');
		room.isRevealed = true;
		this.io.to(room.id).except(socket.id).emit('cards_revealed');
	}

	static startNewRound(socket: Socket) {
		const room = this.findRoomBySocketId(socket.id);
		if (!room) throw new Error(guestDoesNotExist());
		// if (room.adminId !== socket.id) throw new Error('unallowed to start new round');
		if (!room.isRevealed) throw new Error('can\'t start new round when cards are not revealed');
		room.previousRounds.push(room.currentRound)
		room.currentRound = [];
		room.isRevealed = false;
		this.io.to(room.id).except(socket.id).emit('new_round_started');
	}

	static disconnectGuest(socket: Socket) {
		const room = this.findRoomBySocketId(socket.id);
		if (!room) return console.log('guest does not exist in any room');
		const guest = room.guests.find(guest => guest.socketId === socket.id);
		if (!guest) return console.log('guest does not exist in any room');
		guest.isConnected = false;
		this.io.to(room.id).emit('guest_disconnected', guest.id);
	}

	static reconnectGuest({ roomId, secretId, socket }: { roomId: string, secretId: string, socket: Socket }) {
		const room = this.rooms.find(room => room.id === roomId);
		if (!room) throw new Error(roomDoesNotExist(roomId));
		const guest = room.guests.find(guest => guest.secretId === secretId);
		if (!guest) throw new Error(guestDoesNotExist());

		guest.isConnected = true;
		guest.socketId = socket.id;
		const filteredGuests = room.guests.filter(guest => guest.socketId !== socket.id);
		this.io.to(roomId).except(socket.id).emit('guest_reconnected', guest.id);

		return {
			deck: room.deck,
			guests: filteredGuests,
			currentRound: room.currentRound,
			roomName: room.roomName,
			isReaveled: room.isRevealed,
			secretId: guest.secretId
		};

	}
	private static findRoomBySocketId(socketId: string) {
		return RoomsManager.rooms.find(room => room.guests.find(guest => guest.socketId === socketId));
	}

}

export default RoomsManager
