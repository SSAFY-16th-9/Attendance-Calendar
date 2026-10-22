// Join codes: 8 characters without look-alikes (no I, O, 0, 1), shown as ABCD-EFGH and accepted with or without the dash.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newJoinCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
export const normalizeJoinCode = (value: unknown) => typeof value === "string" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
export const formatJoinCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
