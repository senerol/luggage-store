import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

const SINGLETON_ID = "singleton";
const DEFAULT_COMMISSION_PERCENT = 15;

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * The commission percentage Luggo takes out of every booking's totalAmount
 * (see Booking.platformCommissionPercent) is never hardcoded anywhere in the
 * pricing/booking code - it is always read from this single admin-editable
 * row. Auto-creates the row with a sensible default on first read so the app
 * works out of the box before an admin ever visits the settings page.
 */
export async function getCommissionPercent(client: Client = prisma): Promise<number> {
  const config = await client.platformConfig.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, commissionPercent: DEFAULT_COMMISSION_PERCENT },
  });
  return Number(config.commissionPercent);
}

export async function getPlatformConfig() {
  return prisma.platformConfig.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, commissionPercent: DEFAULT_COMMISSION_PERCENT },
  });
}

export async function setCommissionPercent(percent: number) {
  if (percent < 0 || percent > 100) {
    throw AppError.badRequest("Commission percent must be between 0 and 100.");
  }
  return prisma.platformConfig.upsert({
    where: { id: SINGLETON_ID },
    update: { commissionPercent: percent },
    create: { id: SINGLETON_ID, commissionPercent: percent },
  });
}
