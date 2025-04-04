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
		const adminGuest = new Guest({ socketId: socket.id, name: guestName, isInRound: true });
		const newRoom = new Room({ guests: [adminGuest], deck, adminId: adminGuest.secretId, roomName });
		socket.join(newRoom.id);
		newRoom.currentRound.push({ guestId: adminGuest.id, voteValue: null });
		console.log(`room with id ${newRoom.id} created`);
		this.rooms.push(newRoom);
		return { room: newRoom, guest: adminGuest };
	}

	static addGuest({ roomId, guestName, socket }: { roomId: string, guestName: string, socket: Socket }) {
		const room = this.rooms.find(room => room.id === roomId);
		if (!room) throw new Error(roomDoesNotExist(roomId));
		const guest = new Guest({ name: guestName, socketId: socket.id, isInRound: !room.isRevealed });
		this.io.to(roomId).emit('guest_joined', guest)
		const { deck, guests, currentRound } = room;
		const guestsWithoutSecretId = guests.map(({ secretId, ...rest }) => rest);
		room.guests.push(guest);
		if (guest.isInRound) {
			room.currentRound.push({ guestId: guest.id, voteValue: null });
		}

		socket.join(roomId);
		return {
			deck,
			guests: guestsWithoutSecretId,
			currentRound,
			roomName: room.roomName,
			isReaveled: room.isRevealed,
			secretId: guest.secretId,
			localGuestId: guest.id,
			previousRounds: room.previousRounds
		};
	}

	static removeGuest(socket: Socket) {
		const room = RoomsManager.findRoomBySocketId(socket.id);
		if (!room) return console.log('guest does not exist in any room');
		const removedGuest = room.guests.find(guest => guest.socketId === socket.id);
		room.guests = room.guests.filter(guest => guest.socketId !== socket.id);
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
		if (!votingGuest.isInRound) return console.log('guest is not in round');

		const vote = room.currentRound.find(vote => vote.guestId === votingGuest.id)
		vote.voteValue = voteValue;
		this.io.to(room.id).except(socket.id).emit('guest_voted', { guestId: votingGuest.id, voteValue });
	}

	static revealCards(socket: Socket) {
		const room = this.findRoomBySocketId(socket.id);
		if (!room) throw new Error(guestDoesNotExist());
		const votingGuests = room.guests.filter(guest => guest.isInRound && guest.isConnected);
		if (room.currentRound.length !== votingGuests.length) throw new Error('not all guests voted');
		if (room.isRevealed) throw new Error('room is already revealed');
		room.isRevealed = true;
		this.io.to(room.id).except(socket.id).emit('cards_revealed');
	}

	static startNewRound(socket: Socket) {
		const room = this.findRoomBySocketId(socket.id);
		if (!room) throw new Error(guestDoesNotExist());
		if (!room.isRevealed) throw new Error('can\'t start new round when cards are not revealed');
		room.previousRounds.push(room.currentRound)
		room.currentRound = [];
		room.guests.forEach(guest => {
			// currently automatically add guest to round if he is connected on a new round
			if (guest.isConnected) guest.isInRound = true
			room.currentRound.push({ guestId: guest.id, voteValue: null });
		});

		room.isRevealed = false;
		this.io.to(room.id).except(socket.id).emit('new_round_started');
	}

	static disconnectGuest(socket: Socket) {
		const room = this.findRoomBySocketId(socket.id);
		if (!room) return console.log('guest does not exist in any room');
		const guest = room.guests.find(guest => guest.socketId === socket.id);
		if (!guest) return console.log('guest does not exist in any room');
		guest.isConnected = false;
		guest.isInRound = false;
		room.currentRound = room.currentRound.filter(vote => vote.guestId !== guest.id);
		this.io.to(room.id).emit('guest_disconnected', guest.id);
	}

	static reconnectGuest({ roomId, secretId, socket }: { roomId: string, secretId: string, socket: Socket }) {
		const room = this.rooms.find(room => room.id === roomId);
		if (!room) throw new Error(roomDoesNotExist(roomId));
		const guest = room.guests.find(guest => guest.secretId === secretId);
		if (!guest) throw new Error(guestDoesNotExist());

		guest.isInRound = !room.isRevealed;
		guest.isConnected = true;
		guest.socketId = socket.id;
		if (guest.isInRound) room.currentRound.push({ guestId: guest.id, voteValue: null });
		const filteredGuests = room.guests.filter(guest => guest.socketId !== socket.id);
		this.io.to(roomId).except(socket.id).emit('guest_reconnected', guest.id);

		return {
			deck: room.deck,
			guests: filteredGuests,
			currentRound: room.currentRound,
			roomName: room.roomName,
			isReaveled: room.isRevealed,
			secretId: guest.secretId,
			previousRounds: room.previousRounds
		};

	}
	private static findRoomBySocketId(socketId: string) {
		return RoomsManager.rooms.find(room => room.guests.find(guest => guest.socketId === socketId));
	}

}

export default RoomsManager