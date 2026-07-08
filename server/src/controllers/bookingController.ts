import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import * as bookingService from "../services/bookingService";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.createBooking(req.user!.id, req.body);
  res.status(201).json({ success: true, data: { booking } });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await bookingService.listBookingsForCustomer(req.user!.id);
  res.status(200).json({ success: true, data: { bookings } });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.getBookingById(req.user!.id, req.user!.role, req.params.id);
  res.status(200).json({ success: true, data: { booking } });
});

export const getAvailabilityForBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.getBookingById(req.user!.id, req.user!.role, req.params.id);
  const bags = booking.items.reduce((sum, i) => sum + i.quantity, 0);
  const availability = await bookingService.checkAvailability(booking.storageLocationId, {
    dropoffAt: booking.dropoffAt,
    pickupAt: booking.pickupAt,
    bags,
  });
  res.status(200).json({ success: true, data: { availability } });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.cancelBooking(
    req.user!.id,
    req.user!.role,
    req.params.id,
    req.body?.reason
  );
  res.status(200).json({ success: true, data: { booking } });
});
