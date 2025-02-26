import { uniqueSid } from '../../utils';

type GuestPayload = {
	name: string;
	socketId: string;
	id?: string;
	isInRound: boolean;
};

class Guest {
	secretId: string;
	id: string;
	name: string;
	socketId: string;
	isConnected: boolean;
	isInRound: boolean;

	constructor(guest: GuestPayload) {
		this.id = guest.id || this.createId();
		this.secretId = this.createId();
		this.name = guest.name;
		this.socketId = guest.socketId;
		this.isConnected = true;
		this.isInRound = guest.isInRound;
	}

	createId() {
		return uniqueSid();
	}
}

export default Guest;
