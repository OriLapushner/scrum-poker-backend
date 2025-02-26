import { uniqueSid } from '../../utils';
import Guest from '../Guest';

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

	createId() {
		return uniqueSid();
	}

}


export default Room;
