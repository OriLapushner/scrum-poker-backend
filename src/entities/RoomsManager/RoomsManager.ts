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

		const votingGuest = room.guests.find(guest => guest.socketIds.includes(socket.id));
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
			if (guest.isConnected) {
				guest.isInRound = true
				room.currentRound.push({ guestId: guest.id, voteValue: null });
			}
		});

		room.isRevealed = false;
		this.io.to(room.id).except(socket.id).emit('new_round_started');
	}

	static disconnectGuest(socket: Socket) {
		const room = this.findRoomBySocketId(socket.id);
		if (!room) throw new Error(guestDoesNotExist())
		const guest = room.guests.find(guest => guest.socketIds.includes(socket.id));
		if (!guest) throw new Error(guestDoesNotExist())
		guest.isConnected = false;
		guest.isInRound = false;
		guest.isSpectator = false;
		guest.socketIds = guest.socketIds.filter(socketId => socketId !== socket.id);
		room.currentRound = room.currentRound.filter(vote => vote.guestId !== guest.id);
		if (guest.socketIds.length === 0) this.io.to(room.id).emit('guest_disconnected', guest.id);
	}

	static reconnectGuest({ roomId, secretId, socket }: { roomId: string, secretId: string, socket: Socket }) {
		const room = this.rooms.find(room => room.id === roomId);
		if (!room) throw new Error(roomDoesNotExist(roomId));
		const guest = room.guests.find(guest => guest.secretId === secretId);
		if (!guest) throw new Error(guestDoesNotExist());

		guest.isInRound = !room.isRevealed;
		guest.isConnected = true;
		if (!room.currentRound.some(vote => vote.guestId === guest.id) && !room.isRevealed) {
			room.currentRound.push({ guestId: guest.id, voteValue: null });
		}
		guest.socketIds.push(socket.id);
		socket.join(roomId);
		const filteredGuests = room.guests.filter(guest => !guest.socketIds.includes(socket.id));
		this.io.to(roomId).except(socket.id).emit('guest_reconnected', guest.id);
		return {
			localGuest: {
				id: guest.id,
				name: guest.name,
				isInRound: guest.isInRound,
				isConnected: guest.isConnected,
				secretId: guest.secretId
			},
			deck: room.deck,
			guests: filteredGuests,
			currentRound: room.currentRound,
			roomName: room.roomName,
			isReaveled: room.isRevealed,
			previousRounds: room.previousRounds
		};

	}
	private static findRoomBySocketId(socketId: string) {
		return RoomsManager.rooms.find(room => room.guests.find(guest => guest.socketIds.includes(socketId)));
	}

	static setGuestSpectatorStatus(socket: Socket, isSpectator: boolean) {
		const room = this.findRoomBySocketId(socket.id);
		if (!room) throw new Error(guestDoesNotExist());
		const guest = room.guests.find(guest => guest.socketIds.includes(socket.id));
		if (!guest) throw new Error(guestDoesNotExist());

		guest.isSpectator = isSpectator;
		if (isSpectator) {
			room.currentRound = room.currentRound.filter(vote => vote.guestId !== guest.id);
		}
		if (isSpectator === false && !room.currentRound.some(vote => vote.guestId === guest.id)) {
			room.currentRound.push({ guestId: guest.id, voteValue: null });
		}
		const guestChanges = { id: guest.id, isSpectator }

		this.io.to(room.id).except(socket.id).emit('guest_changed', guestChanges);
	}

	static setGuestName(socket: Socket, guestName: string) {
		const room = this.findRoomBySocketId(socket.id);
		if (!room) throw new Error(guestDoesNotExist());
		const guest = room.guests.find(guest => guest.socketIds.includes(socket.id));
		if (!guest) throw new Error(guestDoesNotExist());
		guest.name = guestName;
		this.io.to(room.id).except(socket.id).emit('guest_changed', { id: guest.id, name: guestName });
	}
}

export default RoomsManager