import argon2 from "argon2";
import { prisma } from "../../lib/prisma";
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import {
  generateRefreshToken,
  hashToken,
  parseDurationToMs,
  signAccessToken,
} from "../../lib/tokens";
import { env } from "../../config/env";
import { Role, VendorStatus } from "@prisma/client";
import { LoginInput, RegisterInput } from "./auth.schemas";

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

async function issueTokenPair(userId: string, role: Role): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_TTL)),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const hashedPassword = await argon2.hash(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
      phone: input.phone,
      role: input.role,
      // Every customer gets a cart + wishlist from day one.
      ...(input.role === "CUSTOMER" && {
        cart: { create: {} },
        wishlist: { create: {} },
      }),
      // Vendors get a profile pending admin approval — they cannot sell
      // until an admin approves them (Phase 5/10).
      ...(input.role === "VENDOR" && {
        vendorProfile: {
          create: {
            businessName: input.businessName!,
            businessEmail: input.email,
            status: VendorStatus.PENDING,
          },
        },
      }),
    },
  });

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Deliberately generic error — never reveal whether the email exists.
  if (!user || !user.isActive || user.deletedAt) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const validPassword = await argon2.verify(user.password, input.password);
  if (!validPassword) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const { accessToken, refreshToken } = await issueTokenPair(user.id, user.role);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

/**
 * Rotates a refresh token: the presented token is revoked and a brand new
 * one is issued along with a fresh access token. If a revoked or unknown
 * token is presented, every active refresh token for that user is revoked —
 * that pattern indicates the token was stolen and reused.
 */
export async function refresh(presentedToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(presentedToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    if (stored && !stored.revokedAt) {
      // Reuse of an already-invalidated token family — revoke everything
      // for this user as a precaution.
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  if (!stored.user.isActive || stored.user.deletedAt) {
    throw new UnauthorizedError("Account is no longer active");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const { accessToken, refreshToken } = await issueTokenPair(stored.user.id, stored.user.role);

  return {
    accessToken,
    refreshToken,
    user: {
      id: stored.user.id,
      email: stored.user.email,
      name: stored.user.name,
      role: stored.user.role,
    },
  };
}

export async function logout(presentedToken: string): Promise<void> {
  const tokenHash = hashToken(presentedToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
