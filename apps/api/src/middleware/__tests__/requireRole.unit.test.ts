import { describe, it, expect, vi } from "vitest";
import { Request, Response } from "express";
import { requireRole } from "../requireRole";
import { ForbiddenError, UnauthorizedError } from "../../lib/errors";

function mockReq(user?: { id: string; role: string }): Partial<Request> {
  return { user: user as any };
}

describe("requireRole middleware", () => {
  it("throws UnauthorizedError when req.user is missing", () => {
    const next = vi.fn();
    expect(() => requireRole("ADMIN" as any)(mockReq(undefined) as Request, {} as Response, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });
  it("throws ForbiddenError when the user's role is not allowed", () => {
    const next = vi.fn();
    expect(() => requireRole("ADMIN" as any)(mockReq({ id: "u1", role: "CUSTOMER" }) as Request, {} as Response, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });
  it("calls next() when the user's role is allowed", () => {
    const next = vi.fn();
    requireRole("ADMIN" as any)(mockReq({ id: "u1", role: "ADMIN" }) as Request, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });
  it("allows any role listed among multiple allowed roles", () => {
    const next = vi.fn();
    requireRole("ADMIN" as any, "VENDOR" as any)(mockReq({ id: "u1", role: "VENDOR" }) as Request, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });
  it("rejects a role NOT in a multi-role allow-list", () => {
    const next = vi.fn();
    expect(() => requireRole("ADMIN" as any, "VENDOR" as any)(mockReq({ id: "u1", role: "CUSTOMER" }) as Request, {} as Response, next)).toThrow(ForbiddenError);
  });
});
