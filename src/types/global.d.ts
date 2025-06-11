import { Socket as SocketFromLib } from 'socket.io'
export { };

declare global {
    // business logic
    type Card = {
        displayName: string;
        value: number;
    }

    type Deck = {
        name: string,
        cards: Card[]
    }

    type CreateRoomProps = {
        deck: Deck,
        guestName: string
        roomName: string
    }

    type JoinRoomProps = {
        guestName: string,
        roomId: string,
        secretId?: string | null
    }

    type ReconnectToRoomProps = {
        roomId: string,
        secretId: string
    }

    type vote = {
        guestId: string,
        voteValue: number | null
    }

    type GameRound = vote[]

    // tech logic
    type Socket = SocketFromLib

}