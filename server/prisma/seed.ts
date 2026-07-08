import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";
import { generateBookingCode, generateQrToken, generateTagCode } from "../src/utils/ids";
import { calculatePrice, splitCommission } from "../src/services/pricingService";
import { getCommissionPercent } from "../src/services/platformConfigService";

const prisma = new PrismaClient();

const DELHI_HOURS_ALL_WEEK = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  openTime: "07:00",
  closeTime: "22:00",
}));

const RAILWAY_HOURS_ALL_WEEK = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  openTime: "00:00",
  closeTime: "23:59",
}));

const STANDARD_PRICE_RULES = [
  { luggageType: "BACKPACK" as const, pricePerHour: 20 },
  { luggageType: "SMALL_SUITCASE" as const, pricePerHour: 35 },
  { luggageType: "LARGE_SUITCASE" as const, pricePerHour: 50 },
  { luggageType: "OTHER" as const, pricePerHour: 30 },
];

const LOCATIONS = [
  {
    name: "CP Central Cloakroom",
    description:
      "Centrally located luggage storage right on the inner circle of Connaught Place, a 2-minute walk from Rajiv Chowk metro station. Ideal for travelers exploring central Delhi between trains or meetings.",
    address: "Inner Circle, Connaught Place, New Delhi",
    city: "New Delhi",
    latitude: 28.6315,
    longitude: 77.2167,
    capacityTotal: 40,
    hours: DELHI_HOURS_ALL_WEEK,
  },
  {
    name: "NDLS Station Bag Point",
    description:
      "24-hour luggage drop right outside New Delhi Railway Station's Ajmeri Gate exit. Built for travelers with early trains or long layovers between connections.",
    address: "Ajmeri Gate Side, New Delhi Railway Station, New Delhi",
    city: "New Delhi",
    latitude: 28.6435,
    longitude: 77.2197,
    capacityTotal: 60,
    hours: RAILWAY_HOURS_ALL_WEEK,
  },
  {
    name: "India Gate Lawns Storage",
    description:
      "A short walk from the India Gate lawns, perfect for visitors who want to explore the monument and Kartavya Path hands-free.",
    address: "Rajpath Road, near India Gate, New Delhi",
    city: "New Delhi",
    latitude: 28.6129,
    longitude: 77.2295,
    capacityTotal: 25,
    hours: DELHI_HOURS_ALL_WEEK,
  },
  {
    name: "Karol Bagh Traveler Hub",
    description:
      "Located in the heart of Karol Bagh's shopping district, this storage point doubles as a rest point for shoppers passing through with heavy bags.",
    address: "Ajmal Khan Road, Karol Bagh, New Delhi",
    city: "New Delhi",
    latitude: 28.6519,
    longitude: 77.1909,
    capacityTotal: 30,
    hours: DELHI_HOURS_ALL_WEEK,
  },
  {
    name: "Paharganj Backpacker Storage",
    description:
      "A backpacker-friendly storage counter on the Main Bazaar strip, steps from budget hostels and the New Delhi railway station.",
    address: "Main Bazaar, Paharganj, New Delhi",
    city: "New Delhi",
    latitude: 28.6448,
    longitude: 77.2167,
    capacityTotal: 35,
    hours: DELHI_HOURS_ALL_WEEK,
  },
  {
    name: "Saket Mall Luggage Desk",
    description:
      "Storage counter attached to the Saket retail and cinema district, convenient for travelers with a day to kill before a flight from IGI.",
    address: "MGF Metropolitan Mall Road, Saket, New Delhi",
    city: "New Delhi",
    latitude: 28.5245,
    longitude: 77.2066,
    capacityTotal: 20,
    hours: DELHI_HOURS_ALL_WEEK,
  },
  {
    name: "Hauz Khas Village Storage",
    description:
      "Tucked into Hauz Khas Village among the cafes and boutiques, a favorite drop-off point for travelers spending the day exploring the deer park and lake.",
    address: "Hauz Khas Village, New Delhi",
    city: "New Delhi",
    latitude: 28.5494,
    longitude: 77.2001,
    capacityTotal: 22,
    hours: DELHI_HOURS_ALL_WEEK,
  },
  {
    name: "Aerocity Transit Storage",
    description:
      "Minutes from IGI Airport Terminal 3, purpose-built for fliers with long layovers who want to head into the city without dragging suitcases along.",
    address: "Aerocity Hospitality District, New Delhi",
    city: "New Delhi",
    latitude: 28.5507,
    longitude: 77.1219,
    capacityTotal: 50,
    hours: RAILWAY_HOURS_ALL_WEEK,
  },
  {
    name: "Kashmere Gate Interchange Storage",
    description:
      "Right by the Kashmere Gate ISBT and metro interchange, useful for bus travelers making a same-day trip into Old Delhi.",
    address: "Kashmere Gate ISBT Complex, New Delhi",
    city: "New Delhi",
    latitude: 28.6667,
    longitude: 77.228,
    capacityTotal: 28,
    hours: DELHI_HOURS_ALL_WEEK,
  },
  {
    name: "Chandni Chowk Heritage Storage",
    description:
      "A short walk from the Red Fort and the spice market, this storage point lets you explore Old Delhi's lanes without carrying your bags through the crowds.",
    address: "Chandni Chowk Main Road, near Red Fort, New Delhi",
    city: "New Delhi",
    latitude: 28.6506,
    longitude: 77.2303,
    capacityTotal: 18,
    hours: DELHI_HOURS_ALL_WEEK,
  },
];

const CUSTOMERS = [
  { name: "Aditi Sharma", email: "aditi.sharma@example.com", phone: "+919810000001" },
  { name: "Rohan Mehta", email: "rohan.mehta@example.com", phone: "+919810000002" },
  { name: "Priya Nair", email: "priya.nair@example.com", phone: "+919810000003" },
  { name: "Karan Verma", email: "karan.verma@example.com", phone: "+919810000004" },
  { name: "Sneha Iyer", email: "sneha.iyer@example.com", phone: "+919810000005" },
];

const PARTNER_USERS = [
  { name: "Vikram Bahl", email: "vikram.partner@example.com", business: "CP Cloakroom Services", businessType: "LUGGAGE_STORE" as const },
  { name: "Neha Kapoor", email: "neha.partner@example.com", business: "NDLS Storage Co.", businessType: "SHOP" as const },
  { name: "Arjun Malhotra", email: "arjun.partner@example.com", business: "Delhi Landmark Storage", businessType: "LUGGAGE_STORE" as const },
  { name: "Simran Kaur", email: "simran.partner@example.com", business: "Bazaar Bag Points", businessType: "SHOP" as const },
  { name: "Farhan Ali", email: "farhan.partner@example.com", business: "Village & Metro Storage", businessType: "CAFE" as const },
];

const DEFAULT_PASSWORD = "Password@123";

async function main() {
  console.log("Seeding Luggo database...");

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  // --- Admin -----------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@luggo.app" },
    update: {},
    create: {
      name: "Luggo Admin",
      email: "admin@luggo.app",
      passwordHash,
      role: "ADMIN",
    },
  });

  // --- Customers ---------------------------------------------------------
  const customers: Awaited<ReturnType<typeof prisma.user.upsert>>[] = [];
  for (const c of CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { name: c.name, email: c.email, phone: c.phone, passwordHash, role: "CUSTOMER" },
    });
    customers.push(user);
  }

  // --- Partners (approved) -----------------------------------------------
  const partners = [];
  for (const p of PARTNER_USERS) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { name: p.name, email: p.email, passwordHash, role: "PARTNER" },
    });
    const partner = await prisma.storagePartner.upsert({
      where: { userId: user.id },
      update: { approved: true, businessType: p.businessType },
      create: { userId: user.id, businessName: p.business, businessType: p.businessType, approved: true },
    });
    partners.push(partner);
  }

  // --- Storage locations (distributed across partners, all approved) -----
  const locations: (Awaited<ReturnType<typeof prisma.storageLocation.create>> & {
    priceRules?: any[];
  })[] = [];
  for (let i = 0; i < LOCATIONS.length; i++) {
    const loc = LOCATIONS[i];
    const partner = partners[i % partners.length];
    const existing = await prisma.storageLocation.findFirst({ where: { name: loc.name } });
    if (existing) {
      locations.push(existing);
      continue;
    }
    const created = await prisma.storageLocation.create({
      data: {
        partnerId: partner.id,
        name: loc.name,
        description: loc.description,
        address: loc.address,
        city: loc.city,
        latitude: loc.latitude,
        longitude: loc.longitude,
        photos: [
          `https://picsum.photos/seed/luggo-${i}-a/800/600`,
          `https://picsum.photos/seed/luggo-${i}-b/800/600`,
        ],
        capacityTotal: loc.capacityTotal,
        status: "APPROVED",
        operatingHours: { create: loc.hours },
        priceRules: { create: STANDARD_PRICE_RULES },
      },
      include: { priceRules: true },
    });
    locations.push(created);
  }

  console.log(`Seeded ${locations.length} storage locations across ${partners.length} partners.`);

  const now = new Date();
  const hour = 60 * 60 * 1000;

  // --- Backfill an APPROVED PartnerApplication per live location, so the
  // admin's application history/funnel isn't empty for the already-live
  // partners seeded above. ------------------------------------------------
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    const partner = partners[i % partners.length];
    const partnerInfo = PARTNER_USERS[i % partners.length];
    const existing = await prisma.partnerApplication.findUnique({ where: { storageLocationId: location.id } });
    if (existing) continue;
    await prisma.partnerApplication.create({
      data: {
        userId: partner.userId,
        partnerId: partner.id,
        businessName: partnerInfo.business,
        businessType: partnerInfo.businessType,
        description: `${partnerInfo.business} offers secure short-term luggage storage for travelers.`,
        storageLocationId: location.id,
        status: "APPROVED",
        agreedToTermsAt: new Date(now.getTime() - 20 * 24 * hour),
        submittedAt: new Date(now.getTime() - 20 * 24 * hour),
        reviewedAt: new Date(now.getTime() - 19 * 24 * hour),
        reviewedById: admin.id,
      },
    });
  }

  // --- Example applications in other stages, to populate the admin review
  // queue and partner-acquisition funnel metrics. --------------------------
  const applicantPending = await prisma.user.upsert({
    where: { email: "ritu.applicant@example.com" },
    update: {},
    create: { name: "Ritu Singh", email: "ritu.applicant@example.com", passwordHash, role: "PARTNER" },
  });
  const applicantPendingPartner = await prisma.storagePartner.upsert({
    where: { userId: applicantPending.id },
    update: {},
    create: { userId: applicantPending.id, businessName: "Lotus Hostel", businessType: "HOSTEL", approved: false },
  });
  const pendingLocation = await prisma.storageLocation.upsert({
    where: { id: "seed-pending-location" },
    update: {},
    create: {
      id: "seed-pending-location",
      partnerId: applicantPendingPartner.id,
      name: "Lotus Hostel Storage",
      description: "A small luggage room at the reception of Lotus Hostel, near Majnu Ka Tilla.",
      address: "Majnu Ka Tilla, New Delhi",
      city: "New Delhi",
      latitude: 28.7078,
      longitude: 77.2298,
      landmark: "Behind the Tibetan market",
      safetyInfo: "Locked room, reception staffed 24/7.",
      photos: [`https://picsum.photos/seed/luggo-pending/800/600`],
      capacityTotal: 12,
      status: "PENDING",
      operatingHours: { create: DELHI_HOURS_ALL_WEEK },
      priceRules: { create: STANDARD_PRICE_RULES },
    },
  });
  await prisma.partnerApplication.upsert({
    where: { storageLocationId: pendingLocation.id },
    update: {},
    create: {
      userId: applicantPending.id,
      partnerId: applicantPendingPartner.id,
      businessName: "Lotus Hostel",
      businessType: "HOSTEL",
      description: "Backpacker hostel with a small secure luggage room at reception.",
      storageLocationId: pendingLocation.id,
      status: "PENDING_REVIEW",
      agreedToTermsAt: new Date(now.getTime() - 2 * hour),
      submittedAt: new Date(now.getTime() - 2 * hour),
    },
  });

  const applicantChanges = await prisma.user.upsert({
    where: { email: "manoj.applicant@example.com" },
    update: {},
    create: { name: "Manoj Tiwari", email: "manoj.applicant@example.com", passwordHash, role: "PARTNER" },
  });
  const applicantChangesPartner = await prisma.storagePartner.upsert({
    where: { userId: applicantChanges.id },
    update: {},
    create: { userId: applicantChanges.id, businessName: "Metro Snacks Corner", businessType: "CAFE", approved: false },
  });
  const changesLocation = await prisma.storageLocation.upsert({
    where: { id: "seed-changes-requested-location" },
    update: {},
    create: {
      id: "seed-changes-requested-location",
      partnerId: applicantChangesPartner.id,
      name: "Metro Snacks Corner Storage",
      description: "A storage counter at the back of a snacks stall near the Kashmere Gate metro exit.",
      address: "Metro Exit Gate 2, Kashmere Gate, New Delhi",
      city: "New Delhi",
      latitude: 28.6672,
      longitude: 77.2285,
      photos: [`https://picsum.photos/seed/luggo-changes/800/600`],
      capacityTotal: 10,
      status: "PENDING",
      operatingHours: { create: DELHI_HOURS_ALL_WEEK },
      priceRules: { create: STANDARD_PRICE_RULES },
    },
  });
  await prisma.partnerApplication.upsert({
    where: { storageLocationId: changesLocation.id },
    update: {},
    create: {
      userId: applicantChanges.id,
      partnerId: applicantChangesPartner.id,
      businessName: "Metro Snacks Corner",
      businessType: "CAFE",
      description: "Snacks stall with unused back-room space.",
      storageLocationId: changesLocation.id,
      status: "CHANGES_REQUESTED",
      adminNote: "Please add clearer photos of the storage area and confirm CCTV coverage before we can approve this.",
      agreedToTermsAt: new Date(now.getTime() - 3 * 24 * hour),
      submittedAt: new Date(now.getTime() - 3 * 24 * hour),
      reviewedAt: new Date(now.getTime() - 2 * 24 * hour),
      reviewedById: admin.id,
    },
  });

  const applicantRejected = await prisma.user.upsert({
    where: { email: "olddelhi.applicant@example.com" },
    update: {},
    create: { name: "Old Delhi Traders", email: "olddelhi.applicant@example.com", passwordHash, role: "PARTNER" },
  });
  const applicantRejectedPartner = await prisma.storagePartner.upsert({
    where: { userId: applicantRejected.id },
    update: {},
    create: { userId: applicantRejected.id, businessName: "Old Delhi Traders", businessType: "SHOP", approved: false },
  });
  const rejectedLocation = await prisma.storageLocation.upsert({
    where: { id: "seed-rejected-location" },
    update: {},
    create: {
      id: "seed-rejected-location",
      partnerId: applicantRejectedPartner.id,
      name: "Old Delhi Traders Storage",
      description: "Storage space behind a textile shop in Chandni Chowk.",
      address: "Chandni Chowk, New Delhi",
      city: "New Delhi",
      latitude: 28.6508,
      longitude: 77.231,
      photos: [`https://picsum.photos/seed/luggo-rejected/800/600`],
      capacityTotal: 15,
      status: "REJECTED",
      operatingHours: { create: DELHI_HOURS_ALL_WEEK },
      priceRules: { create: STANDARD_PRICE_RULES },
    },
  });
  await prisma.partnerApplication.upsert({
    where: { storageLocationId: rejectedLocation.id },
    update: {},
    create: {
      userId: applicantRejected.id,
      partnerId: applicantRejectedPartner.id,
      businessName: "Old Delhi Traders",
      businessType: "SHOP",
      description: "Textile shop back room.",
      storageLocationId: rejectedLocation.id,
      status: "REJECTED",
      rejectionReason: "The storage area does not meet minimum safety requirements (no lockable door, no fire extinguisher on site).",
      agreedToTermsAt: new Date(now.getTime() - 10 * 24 * hour),
      submittedAt: new Date(now.getTime() - 10 * 24 * hour),
      reviewedAt: new Date(now.getTime() - 9 * 24 * hour),
      reviewedById: admin.id,
    },
  });

  // --- Partner-acquisition funnel analytics events ------------------------
  await prisma.analyticsEvent.createMany({
    data: [
      { type: "PARTNER_PAGE_VIEW" },
      { type: "PARTNER_PAGE_VIEW" },
      { type: "PARTNER_PAGE_VIEW" },
      { type: "PARTNER_PAGE_VIEW", userId: applicantPending.id },
      { type: "APPLICATION_STARTED", userId: applicantPending.id },
      { type: "PARTNER_PAGE_VIEW", userId: applicantChanges.id },
      { type: "APPLICATION_STARTED", userId: applicantChanges.id },
      { type: "PARTNER_PAGE_VIEW", userId: applicantRejected.id },
      { type: "APPLICATION_STARTED", userId: applicantRejected.id },
    ],
  });

  // --- Sample bookings across a spread of statuses ------------------------
  async function seedBooking(opts: {
    customer: (typeof customers)[number];
    location: (typeof locations)[number] & { priceRules: any[] };
    dropoffAt: Date;
    pickupAt: Date;
    items: { luggageType: "BACKPACK" | "SMALL_SUITCASE" | "LARGE_SUITCASE" | "OTHER"; quantity: number }[];
    status: "PENDING_PAYMENT" | "CONFIRMED" | "IN_STORAGE" | "COLLECTED" | "CANCELLED";
  }) {
    const priceRules = opts.location.priceRules.map((r: any) => ({
      luggageType: r.luggageType,
      pricePerHour: Number(r.pricePerHour),
    }));
    const priced = calculatePrice(priceRules, opts.items, opts.dropoffAt, opts.pickupAt);
    const commissionPercent = await getCommissionPercent(prisma);
    const commission = splitCommission(priced.totalAmount, commissionPercent);

    const booking = await prisma.booking.create({
      data: {
        bookingCode: generateBookingCode(),
        customerId: opts.customer.id,
        storageLocationId: opts.location.id,
        dropoffAt: opts.dropoffAt,
        pickupAt: opts.pickupAt,
        status: opts.status === "CANCELLED" ? "PENDING_PAYMENT" : opts.status,
        baseAmount: priced.baseAmount,
        platformCommissionPercent: commission.platformCommissionPercent,
        platformCommissionAmount: commission.platformCommissionAmount,
        partnerEarningsAmount: commission.partnerEarningsAmount,
        serviceFee: priced.serviceFee,
        totalAmount: priced.totalAmount,
        qrCheckinToken: generateQrToken(),
        qrCheckoutToken: generateQrToken(),
        checkedInAt: ["IN_STORAGE", "COLLECTED"].includes(opts.status) ? opts.dropoffAt : null,
        checkedOutAt: opts.status === "COLLECTED" ? opts.pickupAt : null,
        checkinUsedAt: ["IN_STORAGE", "COLLECTED"].includes(opts.status) ? opts.dropoffAt : null,
        checkoutUsedAt: opts.status === "COLLECTED" ? opts.pickupAt : null,
        cancelledAt: opts.status === "CANCELLED" ? now : null,
        cancelReason: opts.status === "CANCELLED" ? "Change of travel plans." : null,
        items: {
          create: priced.items.map((item) => ({
            luggageType: item.luggageType as any,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            subtotal: item.subtotal,
            luggageItems: {
              create: Array.from({ length: item.quantity }, () => ({
                tagCode: generateTagCode(),
                status:
                  opts.status === "COLLECTED"
                    ? "COLLECTED"
                    : opts.status === "IN_STORAGE"
                    ? "IN_STORAGE"
                    : "EXPECTED",
              })),
            },
          })),
        },
      },
    });

    if (opts.status !== "PENDING_PAYMENT" && opts.status !== "CANCELLED") {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          razorpayOrderId: `order_seed_${booking.id}`,
          razorpayPaymentId: `pay_seed_${booking.id}`,
          razorpaySignature: "seed-data-not-a-real-signature",
          amount: priced.totalAmount,
          status: "PAID",
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          razorpayOrderId: `order_seed_${booking.id}`,
          amount: priced.totalAmount,
          status: opts.status === "CANCELLED" ? "FAILED" : "CREATED",
        },
      });
    }

    return booking;
  }

  const b1 = await seedBooking({
    customer: customers[0],
    location: locations[0] as any,
    dropoffAt: new Date(now.getTime() - 3 * hour),
    pickupAt: new Date(now.getTime() + 3 * hour),
    items: [{ luggageType: "LARGE_SUITCASE", quantity: 2 }],
    status: "IN_STORAGE",
  });

  await seedBooking({
    customer: customers[1],
    location: locations[1] as any,
    dropoffAt: new Date(now.getTime() + 2 * hour),
    pickupAt: new Date(now.getTime() + 8 * hour),
    items: [{ luggageType: "BACKPACK", quantity: 1 }, { luggageType: "SMALL_SUITCASE", quantity: 1 }],
    status: "CONFIRMED",
  });

  const b3 = await seedBooking({
    customer: customers[2],
    location: locations[2] as any,
    dropoffAt: new Date(now.getTime() - 30 * hour),
    pickupAt: new Date(now.getTime() - 24 * hour),
    items: [{ luggageType: "SMALL_SUITCASE", quantity: 1 }],
    status: "COLLECTED",
  });

  const b4 = await seedBooking({
    customer: customers[3],
    location: locations[3] as any,
    dropoffAt: new Date(now.getTime() - 50 * hour),
    pickupAt: new Date(now.getTime() - 44 * hour),
    items: [{ luggageType: "LARGE_SUITCASE", quantity: 1 }, { luggageType: "BACKPACK", quantity: 2 }],
    status: "COLLECTED",
  });

  await seedBooking({
    customer: customers[4],
    location: locations[4] as any,
    dropoffAt: new Date(now.getTime() + hour),
    pickupAt: new Date(now.getTime() + 4 * hour),
    items: [{ luggageType: "BACKPACK", quantity: 1 }],
    status: "PENDING_PAYMENT",
  });

  await seedBooking({
    customer: customers[0],
    location: locations[5] as any,
    dropoffAt: new Date(now.getTime() + 26 * hour),
    pickupAt: new Date(now.getTime() + 30 * hour),
    items: [{ luggageType: "SMALL_SUITCASE", quantity: 1 }],
    status: "CANCELLED",
  });

  // --- Reviews for collected bookings -------------------------------------
  await prisma.review.upsert({
    where: { bookingId: b3.id },
    update: {},
    create: {
      bookingId: b3.id,
      storageLocationId: locations[2].id,
      customerId: customers[2].id,
      rating: 5,
      comment: "Super convenient right next to India Gate. Staff were friendly and my bag was safe all day.",
    },
  });

  await prisma.review.upsert({
    where: { bookingId: b4.id },
    update: {},
    create: {
      bookingId: b4.id,
      storageLocationId: locations[3].id,
      customerId: customers[3].id,
      rating: 4,
      comment: "Good value and easy check-in, though it got a bit crowded in the afternoon.",
    },
  });

  // --- Payout ledger example ----------------------------------------------
  // b3 and b4 are COLLECTED bookings with a PAID payment, so their partner
  // earnings are eligible for payout. They belong to different partners
  // (locations[2] vs locations[3]), so this creates one settled Payout per
  // partner and links each booking to its payout - demonstrating the ledger
  // without moving any real money (see Payout model doc / README).
  const b3Full = await prisma.booking.findUniqueOrThrow({ where: { id: b3.id } });
  const payout1 = await prisma.payout.create({
    data: {
      partnerId: locations[2].partnerId,
      amount: b3Full.partnerEarningsAmount,
      status: "PAID",
      note: "Seed data: simulated bank transfer for October settlement.",
      paidAt: new Date(now.getTime() - 12 * hour),
    },
  });
  await prisma.booking.update({ where: { id: b3.id }, data: { payoutId: payout1.id } });

  const b4Full = await prisma.booking.findUniqueOrThrow({ where: { id: b4.id } });
  const payout2 = await prisma.payout.create({
    data: {
      partnerId: locations[3].partnerId,
      amount: b4Full.partnerEarningsAmount,
      status: "PENDING",
      note: "Awaiting bank transfer confirmation.",
    },
  });
  await prisma.booking.update({ where: { id: b4.id }, data: { payoutId: payout2.id } });

  console.log("Seed complete.");
  console.log("---------------------------------------------");
  console.log("Login with any seeded account using password:", DEFAULT_PASSWORD);
  console.log("Admin:    admin@luggo.app");
  console.log("Customer: aditi.sharma@example.com");
  console.log("Partner:  vikram.partner@example.com");
  console.log("---------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
