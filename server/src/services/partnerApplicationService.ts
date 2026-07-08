import { z } from "zod";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { submitApplicationSchema } from "../validators/applicationValidators";

type SubmitInput = z.infer<typeof submitApplicationSchema>;

const applicationInclude = {
  storageLocation: { include: { operatingHours: true, priceRules: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
  reviewedBy: { select: { id: true, name: true } },
} as const;

/**
 * Handles both a brand-new onboarding submission and a resubmission after
 * CHANGES_REQUESTED: if the partner already has an application sitting in
 * CHANGES_REQUESTED, this updates that application + its linked storage
 * location in place and flips status back to PENDING_REVIEW, rather than
 * creating a second application. A fresh partner (no prior application at
 * all) gets a brand-new StorageLocation + PartnerApplication created together
 * in one transaction.
 */
export async function submitApplication(userId: string, input: SubmitInput) {
  const partner = await prisma.storagePartner.findUnique({ where: { userId } });
  if (!partner) {
    throw AppError.forbidden("Only accounts registered as a storage partner can submit an application.");
  }

  const blockingExisting = await prisma.partnerApplication.findFirst({
    where: { userId, status: { in: ["PENDING_REVIEW", "APPROVED"] } },
  });
  if (blockingExisting) {
    throw AppError.conflict(
      blockingExisting.status === "APPROVED"
        ? "You already have an approved application. Use the partner storage endpoints to add another location."
        : "You already have an application pending review."
    );
  }

  const resubmitTarget = await prisma.partnerApplication.findFirst({
    where: { userId, status: "CHANGES_REQUESTED" },
  });

  return prisma.$transaction(async (tx) => {
    await tx.storagePartner.update({
      where: { id: partner.id },
      data: { businessName: input.businessName, businessType: input.businessType },
    });

    if (resubmitTarget) {
      await tx.storageOperatingHour.deleteMany({ where: { storageLocationId: resubmitTarget.storageLocationId } });
      await tx.storagePriceRule.deleteMany({ where: { storageLocationId: resubmitTarget.storageLocationId } });

      await tx.storageLocation.update({
        where: { id: resubmitTarget.storageLocationId },
        data: {
          name: input.storageLocation.name,
          description: input.storageLocation.description,
          address: input.storageLocation.address,
          city: input.storageLocation.city,
          latitude: input.storageLocation.latitude,
          longitude: input.storageLocation.longitude,
          landmark: input.storageLocation.landmark,
          safetyInfo: input.storageLocation.safetyInfo,
          photos: input.storageLocation.photos,
          capacityTotal: input.storageLocation.capacityTotal,
          status: "PENDING",
          operatingHours: { create: input.storageLocation.operatingHours },
          priceRules: { create: input.storageLocation.priceRules },
        },
      });

      return tx.partnerApplication.update({
        where: { id: resubmitTarget.id },
        data: {
          businessName: input.businessName,
          businessType: input.businessType,
          description: input.description,
          status: "PENDING_REVIEW",
          rejectionReason: null,
          adminNote: null,
          agreedToTermsAt: new Date(),
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedById: null,
        },
        include: applicationInclude,
      });
    }

    const location = await tx.storageLocation.create({
      data: {
        partnerId: partner.id,
        name: input.storageLocation.name,
        description: input.storageLocation.description,
        address: input.storageLocation.address,
        city: input.storageLocation.city,
        latitude: input.storageLocation.latitude,
        longitude: input.storageLocation.longitude,
        landmark: input.storageLocation.landmark,
        safetyInfo: input.storageLocation.safetyInfo,
        photos: input.storageLocation.photos,
        capacityTotal: input.storageLocation.capacityTotal,
        status: "PENDING",
        operatingHours: { create: input.storageLocation.operatingHours },
        priceRules: { create: input.storageLocation.priceRules },
      },
    });

    return tx.partnerApplication.create({
      data: {
        userId,
        partnerId: partner.id,
        businessName: input.businessName,
        businessType: input.businessType,
        description: input.description,
        storageLocationId: location.id,
        status: "PENDING_REVIEW",
        agreedToTermsAt: new Date(),
      },
      include: applicationInclude,
    });
  });
}

export async function getMyApplications(userId: string) {
  return prisma.partnerApplication.findMany({
    where: { userId },
    include: applicationInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getApplicationById(userId: string, role: string, applicationId: string) {
  const application = await prisma.partnerApplication.findUnique({
    where: { id: applicationId },
    include: applicationInclude,
  });
  if (!application) throw AppError.notFound("Application not found.");
  if (role !== "ADMIN" && application.userId !== userId) {
    throw AppError.forbidden("This application does not belong to you.");
  }
  return application;
}

export async function listApplications(status?: string) {
  return prisma.partnerApplication.findMany({
    where: status ? { status: status as any } : {},
    include: applicationInclude,
    orderBy: { submittedAt: "desc" },
  });
}

export async function approveApplication(adminId: string, applicationId: string) {
  const application = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw AppError.notFound("Application not found.");
  if (application.status !== "PENDING_REVIEW") {
    throw AppError.conflict(`Application is ${application.status}, not pending review.`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.partnerApplication.update({
      where: { id: applicationId },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: adminId },
    });
    await tx.storageLocation.update({
      where: { id: application.storageLocationId },
      data: { status: "APPROVED" },
    });
    await tx.storagePartner.update({ where: { id: application.partnerId }, data: { approved: true } });
    await tx.notification.create({
      data: {
        userId: application.userId,
        type: "STORAGE_APPROVED",
        message: `Your application for "${application.businessName}" was approved! Your storage location is now live on Luggo.`,
      },
    });
    return updated;
  });
}

export async function rejectApplication(adminId: string, applicationId: string, rejectionReason: string) {
  const application = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw AppError.notFound("Application not found.");
  if (application.status !== "PENDING_REVIEW") {
    throw AppError.conflict(`Application is ${application.status}, not pending review.`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.partnerApplication.update({
      where: { id: applicationId },
      data: { status: "REJECTED", rejectionReason, reviewedAt: new Date(), reviewedById: adminId },
    });
    await tx.storageLocation.update({ where: { id: application.storageLocationId }, data: { status: "REJECTED" } });
    await tx.notification.create({
      data: {
        userId: application.userId,
        type: "APPLICATION_REJECTED",
        message: `Your application for "${application.businessName}" was rejected. Reason: ${rejectionReason}`,
      },
    });
    return updated;
  });
}

export async function requestChanges(adminId: string, applicationId: string, adminNote: string) {
  const application = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw AppError.notFound("Application not found.");
  if (application.status !== "PENDING_REVIEW") {
    throw AppError.conflict(`Application is ${application.status}, not pending review.`);
  }

  const updated = await prisma.partnerApplication.update({
    where: { id: applicationId },
    data: { status: "CHANGES_REQUESTED", adminNote, reviewedAt: new Date(), reviewedById: adminId },
  });
  await prisma.notification.create({
    data: {
      userId: application.userId,
      type: "APPLICATION_CHANGES_REQUESTED",
      message: `Changes were requested on your application for "${application.businessName}": ${adminNote}`,
    },
  });
  return updated;
}

export async function suspendPartner(adminId: string, partnerId: string) {
  const partner = await prisma.storagePartner.findUnique({ where: { id: partnerId } });
  if (!partner) throw AppError.notFound("Partner not found.");

  return prisma.$transaction(async (tx) => {
    await tx.storagePartner.update({ where: { id: partnerId }, data: { approved: false } });
    await tx.storageLocation.updateMany({
      where: { partnerId, status: "APPROVED" },
      data: { status: "DISABLED" },
    });
    await tx.partnerApplication.updateMany({
      where: { partnerId, status: "APPROVED" },
      data: { status: "SUSPENDED", reviewedAt: new Date(), reviewedById: adminId },
    });
    await tx.notification.create({
      data: {
        userId: partner.userId,
        type: "PARTNER_SUSPENDED",
        message: "Your partner account has been suspended by Luggo. Your storage locations are no longer bookable.",
      },
    });
    return tx.storagePartner.findUniqueOrThrow({ where: { id: partnerId } });
  });
}

export async function reinstatePartner(partnerId: string) {
  const partner = await prisma.storagePartner.findUnique({ where: { id: partnerId } });
  if (!partner) throw AppError.notFound("Partner not found.");

  return prisma.$transaction(async (tx) => {
    await tx.storagePartner.update({ where: { id: partnerId }, data: { approved: true } });
    await tx.storageLocation.updateMany({
      where: { partnerId, status: "DISABLED" },
      data: { status: "APPROVED" },
    });
    return tx.storagePartner.findUniqueOrThrow({ where: { id: partnerId } });
  });
}
