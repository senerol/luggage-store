import { prisma } from "../config/prisma";
import { AnalyticsEventType, Prisma } from "@prisma/client";

export async function logEvent(
  type: AnalyticsEventType,
  userId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.analyticsEvent.create({
    data: { type, userId, metadata: metadata as Prisma.InputJsonValue | undefined },
  });
}

/**
 * The partner-acquisition funnel described in the product spec:
 *   page views -> applications started -> submitted -> approved -> partners receiving bookings
 * Page views / started come from AnalyticsEvent (no other table records
 * them); submitted/approved come directly from PartnerApplication; the last
 * step counts partners who own at least one booking that reached CONFIRMED
 * or later (i.e. actually got paid for), not just an approved location.
 */
export async function getPartnerFunnel() {
  const [pageViews, applicationsStarted, applicationsSubmitted, applicationsApproved, partnersWithBookings] =
    await Promise.all([
      prisma.analyticsEvent.count({ where: { type: "PARTNER_PAGE_VIEW" } }),
      prisma.analyticsEvent.count({ where: { type: "APPLICATION_STARTED" } }),
      prisma.partnerApplication.count(),
      prisma.partnerApplication.count({ where: { status: "APPROVED" } }),
      prisma.storagePartner.count({
        where: {
          storageLocations: {
            some: {
              bookings: {
                some: { status: { in: ["CONFIRMED", "CHECKED_IN", "IN_STORAGE", "READY_FOR_PICKUP", "COLLECTED"] } },
              },
            },
          },
        },
      }),
    ]);

  const conversionRate = applicationsSubmitted > 0 ? applicationsApproved / applicationsSubmitted : 0;

  return {
    pageViews,
    applicationsStarted,
    applicationsSubmitted,
    applicationsApproved,
    partnersReceivingBookings: partnersWithBookings,
    conversionRate: Math.round(conversionRate * 1000) / 1000,
  };
}
