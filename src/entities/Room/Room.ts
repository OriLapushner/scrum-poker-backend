import { uniqueSid } from '../../utils';
import Guest from '../Guest';
import { guestDoesNotExist } from './errors';

export type Round = {
	[guestId: string]: number;
};

class Room {
	id: string;
	roomName: string;
	guests: Guest[];
	adminId: string;
	deck: Deck;
	currentRound: GameRound;
	isRevealed: boolean;
	previousRounds: GameRound[];

	constructor(room: { guests: Guest[]; deck: Deck, adminId: string, roomName: string }) {
		this.id = this.createId();
		this.guests = room.guests;
		this.adminId = room.adminId
		this.deck = room.deck;
		this.currentRound = []
		this.previousRounds = []
		this.isRevealed = false
		this.roomName = room.roomName
	}

	static create({ guestName, deck, socketId, roomName }: { guestName: string, deck: Deck, socketId: string, roomName: string }) {
		const host = new Guest({ socketId, name: guestName, isInRound: true });
		return new Room({ guests: [host], deck, adminId: socketId, roomName });
	}

	removeGuest(socketId: string) {
		const guestToRemove = this.guests.find(guest => guest.socketId === socketId);
		this.guests = this.guests.filter(guest => guest.socketId !== socketId);
		return guestToRemove
	}

	getGuest({ socketId, guestId }: { socketId?: string, guestId?: string }) {
		const guest = this.guests.find((roomGuest) => roomGuest.socketId === socketId || roomGuest.id === guestId);
		if (!guest) {
			throw new Error(guestDoesNotExist(socketId));
		}
		return guest;
	}

	createId() {
		return uniqueSid();
	}

}

export default Room;
