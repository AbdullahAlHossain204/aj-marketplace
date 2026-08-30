import { PaymentProvider } from "./payments.types";
import { CodProvider } from "./providers/cod.provider";
import { MockProvider } from "./providers/mock.provider";

const codProvider = new CodProvider();
const onlineProvider = new MockProvider();

/**
 * Maps an order's payment method to the provider that handles it. This is
 * the ONLY place in the codebase that references a concrete provider class.
 * Adding Stripe/SSLCommerz/bKash later means: implement `PaymentProvider`,
 * then add one line here — checkout, cancellation, and refund logic never
 * change because they only ever call methods on the `PaymentProvider`
 * interface returned from this function.
 */
export function getPaymentProvider(method: "COD" | "ONLINE"): PaymentProvider {
  switch (method) {
    case "COD":
      return codProvider;
    case "ONLINE":
      return onlineProvider;
    default: {
      const exhaustiveCheck: never = method;
      throw new Error(`No payment provider registered for method: ${exhaustiveCheck}`);
    }
  }
}
