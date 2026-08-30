import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { getPaymentProvider } from "./payments.registry";
import { ChargeResult } from "./payments.types";

/**
 * Charges for an order BEFORE the order row exists in the database. This
 * is a deliberate ordering: talking to an external payment gateway is I/O
 * that can be slow or time out, and it must never happen inside a database
 * transaction (that would hold locks/connections open for the duration of
 * a network call). If the charge fails, nothing has touched the database
 * yet — the customer's cart is untouched and they can simply retry.
 *
 * Returns the charge result; the caller (orders.service) is responsible
 * for creating the Order row and then calling `recordTransaction`.
 */
export async function chargeForCheckout(
  method: "COD" | "ONLINE",
  reference: string,
  amount: number,
  currency: string
): Promise<ChargeResult> {
  const provider = getPaymentProvider(method);
  const result = await provider.charge({ reference, amount, currency });

  if (result.status === "FAILED") {
    throw new AppError(
      `Payment failed${result.failureReason ? `: ${result.failureReason}` : ""}. Please try again.`,
      402
    );
  }

  return result;
}

/** Persists a transaction row after the order exists — called right after
 * the order-creation DB transaction commits, using the charge result that
 * was already obtained (and validated) beforehand. */
export async function recordTransaction(
  orderId: string,
  method: "COD" | "ONLINE",
  result: ChargeResult,
  amount: number,
  currency: string
) {
  const provider = getPaymentProvider(method);
  return prisma.transaction.create({
    data: {
      orderId,
      provider: provider.name,
      type: "PAYMENT",
      status: result.status === "PENDING" ? "PENDING" : "SUCCEEDED",
      amount,
      currency,
      providerRef: result.providerRef,
      rawResponse: (result.raw as any) ?? undefined,
    },
  });
}

/**
 * Compensating action for the rare case where a charge succeeds but the
 * subsequent order-creation database transaction fails (e.g. a stock race
 * lost between the charge and the DB write). Without this, the customer
 * would be charged with no order to show for it — an unacceptable outcome
 * that no amount of "the order attempt just failed" messaging fixes.
 */
export async function refundFailedCheckout(
  method: "COD" | "ONLINE",
  reference: string,
  amount: number,
  currency: string,
  originalProviderRef?: string
) {
  const provider = getPaymentProvider(method);
  await provider.refund({ reference, amount, currency, originalProviderRef });
  // No order exists to attach a Transaction row to in this failure path —
  // this is intentionally best-effort cleanup, logged by the caller.
}

/**
 * Refunds a previously successful payment on an order that's being
 * cancelled. Looks up the original PAYMENT transaction to reuse its
 * provider reference, then records a REFUND transaction.
 */
export async function refundOrder(orderId: string, method: "COD" | "ONLINE", amount: number, currency: string) {
  const originalPayment = await prisma.transaction.findFirst({
    where: { orderId, type: "PAYMENT", status: "SUCCEEDED" },
    orderBy: { createdAt: "desc" },
  });

  const provider = getPaymentProvider(method);
  const result = await provider.refund({
    reference: orderId,
    amount,
    currency,
    originalProviderRef: originalPayment?.providerRef ?? undefined,
  });

  await prisma.transaction.create({
    data: {
      orderId,
      provider: provider.name,
      type: "REFUND",
      status: result.status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
      amount,
      currency,
      providerRef: result.providerRef,
      failureReason: result.failureReason,
    },
  });

  return result;
}

export async function listOrderTransactions(orderId: string) {
  return prisma.transaction.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } });
}
