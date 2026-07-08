import { describe, it, expect } from "vitest";
import { assertTransition, canCancel } from "../src/services/bookingStateMachine";

describe("booking state machine", () => {
  it("allows the full happy-path lifecycle", () => {
    expect(() => assertTransition("PENDING_PAYMENT", "CONFIRMED")).not.toThrow();
    expect(() => assertTransition("CONFIRMED", "CHECKED_IN")).not.toThrow();
    expect(() => assertTransition("CHECKED_IN", "IN_STORAGE")).not.toThrow();
    expect(() => assertTransition("IN_STORAGE", "READY_FOR_PICKUP")).not.toThrow();
    expect(() => assertTransition("READY_FOR_PICKUP", "COLLECTED")).not.toThrow();
  });

  it("rejects skipping backwards from a terminal state", () => {
    expect(() => assertTransition("COLLECTED", "CHECKED_IN")).toThrow();
  });

  it("rejects jumping straight from CONFIRMED to COLLECTED", () => {
    expect(() => assertTransition("CONFIRMED", "COLLECTED")).toThrow();
  });

  it("rejects re-entering a terminal CANCELLED/EXPIRED state", () => {
    expect(() => assertTransition("CANCELLED", "PENDING_PAYMENT")).toThrow();
    expect(() => assertTransition("EXPIRED", "CONFIRMED")).toThrow();
  });

  it("allows retrying payment after a failure", () => {
    expect(() => assertTransition("PAYMENT_FAILED", "PENDING_PAYMENT")).not.toThrow();
  });

  it("canCancel is only true while nothing has happened physically yet", () => {
    expect(canCancel("PENDING_PAYMENT")).toBe(true);
    expect(canCancel("CONFIRMED")).toBe(true);
    expect(canCancel("CHECKED_IN")).toBe(false);
    expect(canCancel("IN_STORAGE")).toBe(false);
    expect(canCancel("COLLECTED")).toBe(false);
  });
});
