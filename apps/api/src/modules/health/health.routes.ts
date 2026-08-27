import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";

export const healthRouter = Router();

// Basic liveness check — API process is up.
healthRouter.get("/", (req, res) => {
  res.json({
    success: true,
    data: { status: "ok", uptime: process.uptime() },
    error: null,
  });
});

// Readiness check — API can actually reach the database.
healthRouter.get(
  "/db",
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: { status: "ok", database: "connected" },
      error: null,
    });
  })
);
