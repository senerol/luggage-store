import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

const PAID_BOOKING_WHERE = { payments: { some: { status: "PAID" as const } } };

export async function getDashboard() {
  const [
    totalUsers,
    totalCustomers,
    totalPartners,
    activeStorageLocations,
    totalBookings,
    pendingPartners,
    pendingStorage,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    openReports,
    financials,
    totalTransactions,
    payoutTotals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "PARTNER" } }),
    prisma.storageLocation.count({ where: { status: "APPROVED" } }),
    prisma.booking.count(),
    prisma.storagePartner.count({ where: { approved: false } }),
    prisma.storageLocation.count({ where: { status: "PENDING" } }),
    prisma.partnerApplication.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.partnerApplication.count({ where: { status: "APPROVED" } }),
    prisma.partnerApplication.count({ where: { status: "REJECTED" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.booking.aggregate({
      _sum: { totalAmount: true, platformCommissionAmount: true, serviceFee: true, partnerEarningsAmount: true },
      where: PAID_BOOKING_WHERE,
    }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.payout.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
  ]);

  const grossBookingValue = Number(financials._sum.totalAmount ?? 0);
  // Platform revenue = everything Luggo keeps: the customer-facing service
  // fee plus its commission cut of the partner-facing split (see
  // pricingService.splitCommission for why these are two separate lines).
  const platformRevenue =
    Number(financials._sum.platformCommissionAmount ?? 0) + Number(financials._sum.serviceFee ?? 0);

  return {
    totalUsers,
    totalCustomers,
    totalPartners,
    activeStorageLocations,
    totalBookings,
    grossBookingValue,
    platformRevenue,
    totalPartnerEarnings: Number(financials._sum.partnerEarningsAmount ?? 0),
    partnerPayoutsSettled: Number(payoutTotals._sum.amount ?? 0),
    totalTransactions,
    pendingApprovals: pendingPartners + pendingStorage + pendingApplications,
    pendingPartners,
    pendingStorage,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    partnerConversionRate:
      pendingApplications + approvedApplications + rejectedApplications > 0
        ? Math.round(
            (approvedApplications / (pendingApplications + approvedApplications + rejectedApplications)) * 1000
          ) / 1000
        : 0,
    openReports,
  };
}

export async function listUsers() {
  return prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPartners() {
  return prisma.storagePartner.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      storageLocations: { select: { id: true, name: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function setPartnerApproval(partnerId: string, approved: boolean) {
  const partner = await prisma.storagePartner.findUnique({ where: { id: partnerId } });
  if (!partner) throw AppError.notFound("Partner not found.");

  const updated = await prisma.storagePartner.update({ where: { id: partnerId }, data: { approved } });

  if (approved) {
    await prisma.notification.create({
      data: {
        userId: partner.userId,
        type: "PARTNER_APPROVED",
        message: "Your storage partner account has been approved. You can now add storage locations.",
      },
    });
  }
  return updated;
}

export async function listStorageLocations(status?: string) {
  return prisma.storageLocation.findMany({
    where: status ? { status: status as any } : {},
    include: { partner: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function setStorageApproval(storageLocationId: string, approve: boolean) {
  const location = await prisma.storageLocation.findUnique({ where: { id: storageLocationId } });
  if (!location) throw AppError.notFound("Storage location not found.");

  const updated = await prisma.storageLocation.update({
    where: { id: storageLocationId },
    data: { status: approve ? "APPROVED" : "REJECTED" },
    include: { partner: true },
  });

  if (approve) {
    await prisma.notification.create({
      data: {
        userId: updated.partner.userId,
        type: "STORAGE_APPROVED",
        message: `Your storage location "${updated.name}" has been approved and is now live.`,
      },
    });
  }
  return updated;
}

export async function listAllBookings() {
  return prisma.booking.findMany({
    include: {
      customer: { select: { name: true, email: true } },
      storageLocation: { select: { name: true, city: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listAllPayments() {
  return prisma.payment.findMany({
    include: { booking: { select: { bookingCode: true, customerId: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listAllReviews() {
  return prisma.review.findMany({
    include: {
      customer: { select: { name: true } },
      storageLocation: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listReports(status?: string) {
  return prisma.report.findMany({
    where: status ? { status: status as any } : {},
    include: { reporter: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function resolveReport(reportId: string, status: "RESOLVED" | "DISMISSED", adminNote?: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw AppError.notFound("Report not found.");
  return prisma.report.update({ where: { id: reportId }, data: { status, adminNote } });
}
