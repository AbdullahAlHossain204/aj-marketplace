import { describe, it, expect, vi } from "vitest";
import { Request, Response } from "express";
import { requireRole } from "../requireRole";
import { ForbiddenError, UnauthorizedError } from "../../lib/errors";

function mockReq(user?: { id: string; role: string }): Partial<Request> {
  return { user: user as any };
}

describe("requireRole middleware", () => {
  it("throws UnauthorizedError when req.user is missing (not authenticated)", () => {
    const req = mockReq(undefined);
    const next = vi.fn();
    const middleware = requireRole("ADMIN" as any);

    expect(() => middleware(req as Request, {} as Response, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError when the user's role is not in the allowed list", () => {
    const req = mockReq({ id: "u1", role: "CUSTOMER" });
    const next = vi.fn();
    const middleware = requireRole("ADMIN" as any);

    expect(() => middleware(req as Request, {} as Response, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when the user's role is allowed", () => {
    const req = mockReq({ id: "u1", role: "ADMIN" });
    const next = vi.fn();
    const middleware = requireRole("ADMIN" as any);

    middleware(req as Request, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows any role listed among multiple allowed roles", () => {
    const req = mockReq({ id: "u1", role: "VENDOR" });
    const next = vi.fn();
    const middleware = requireRole("ADMIN" as any, "VENDOR" as any);

    middleware(req as Request, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects a role NOT in a multi-role allow-list", () => {
    const req = mockReq({ id: "u1", role: "CUSTOMER" });
    const next = vi.fn();
    const middleware = requireRole("ADMIN" as any, "VENDOR" as any);

    expect(() => middleware(req as Request, {} as Response, next)).toThrow(ForbiddenError);
  });
});
