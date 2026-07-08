import { customAlphabet } from "nanoid";

// Unambiguous alphabet (no 0/O, 1/I) for human-facing codes.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nanoid = customAlphabet(alphabet, 8);

export function generateBookingCode(): string {
  return `BG-${nanoid()}`;
}

export function generateTagCode(): string {
  return `TAG-${nanoid()}`;
}

// Opaque random tokens embedded in QR codes. These are unguessable but carry
// no information about the booking — the backend looks them up rather than
// decoding anything from them, so a QR image alone is worthless without a
// matching database row.
const tokenAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const tokenId = customAlphabet(tokenAlphabet, 32);

export function generateQrToken(): string {
  return tokenId();
}
