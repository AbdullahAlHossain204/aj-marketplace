/**
 * Error monitoring abstraction — same pattern as payments/providers,
 * notifications/channels, and delivery/providers elsewhere in this
 * codebase: one interface, a working default implementation, and a single
 * place to swap in a real provider (Sentry, Bugsnag, Datadog, etc.) later
 * without touching errorHandler.ts or anywhere else that reports an error.
 */
export interface ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

class ConsoleErrorReporter implements ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        level: "error",
        source: "error-reporter",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
        time: new Date().toISOString(),
      })
    );
  }
}

/**
 * To wire in a real provider (example: Sentry):
 *   import * as Sentry from "@sentry/node";
 *   Sentry.init({ dsn: process.env.SENTRY_DSN });
 *   class SentryErrorReporter implements ErrorReporter {
 *     captureException(error: unknown, context?: Record<string, unknown>) {
 *       Sentry.captureException(error, { extra: context });
 *     }
 *   }
 *   export const errorReporter: ErrorReporter = process.env.SENTRY_DSN
 *     ? new SentryErrorReporter()
 *     : new ConsoleErrorReporter();
 * Nothing else in the codebase needs to change.
 */
export const errorReporter: ErrorReporter = new ConsoleErrorReporter();
