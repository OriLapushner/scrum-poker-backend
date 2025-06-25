import Joi from "joi";

const cardsSchema = Joi.array().items(Joi.object({
    displayName: Joi.string().max(12),
    value: Joi.number().min(0)
}))

const deckSchema = Joi.object({
    name: Joi.string().max(30),
    cards: cardsSchema
})

const guestNameSchema = Joi.string().max(16);

const createRoomRequestSchema = Joi.object().keys({
    guestName: guestNameSchema,
    deck: deckSchema,
    roomName: Joi.string()

})

const joinRoomRequestSchema = Joi.object({
    guestName: guestNameSchema,
    roomId: Joi.string(),
})

const reconnectToRoomSchema = Joi.object({
    roomId: Joi.string(),
    secretId: Joi.string(),
})

const voteRequestSchema = Joi.number().min(0).allow(null);

const setGuestSpectatorStatusRequestSchema = Joi.boolean();

const setGuestNameRequestSchema = guestNameSchema

// Schema to validate that response is a function
const responseSchema = Joi.func().required();


export {
    cardsSchema,
    deckSchema,
    createRoomRequestSchema,
    joinRoomRequestSchema,
    voteRequestSchema,
    reconnectToRoomSchema,
    setGuestSpectatorStatusRequestSchema,
    setGuestNameRequestSchema,
    responseSchema,
}