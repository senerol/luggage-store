import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { z } from "zod";
import { registerSchema, loginSchema } from "../validators/authValidators";

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

const publicUser = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict("An account with this email already exists.");
  }

  if (input.role === "PARTNER" && !input.businessName) {
    throw AppError.badRequest("businessName is required when registering as a storage partner.");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
      ...(input.role === "PARTNER"
        ? { partnerProfile: { create: { businessName: input.businessName! } } }
        : {}),
    },
    select: publicUser,
  });

  return issueTokensFor(user.id, user.role, user);
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw AppError.unauthorized("Invalid email or password.");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized("Invalid email or password.");
  }

  const { passwordHash: _omit, ...safeUser } = user;
  return issueTokensFor(user.id, user.role, safeUser);
}

export async function refreshSession(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized("Session expired. Please log in again.");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: publicUser });
  if (!user) {
    throw AppError.unauthorized("Session expired. Please log in again.");
  }

  return issueTokensFor(user.id, user.role, user);
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...publicUser, partnerProfile: { select: { id: true, businessName: true, approved: true } } },
  });
  if (!user) throw AppError.notFound("User not found.");
  return user;
}

function issueTokensFor(userId: string, role: string, safeUser: unknown) {
  const accessToken = signAccessToken({ sub: userId, role: role as any });
  const refreshToken = signRefreshToken({ sub: userId });
  return { accessToken, refreshToken, user: safeUser };
}
