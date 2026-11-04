// Meeting room names look like "nazaakat-<24 hex chars>". They are derived from a
// server-side secret, so they can't be guessed from booking details.
export const ROOM_PATTERN = /^nazaakat-[a-f0-9]{24}$/;
