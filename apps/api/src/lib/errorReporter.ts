/**
 * Error monitoring abstraction — same pattern as payments/providers,
 * notifications/channels, and delivery/providers elsewhere in this
 * codebase: one interface, a working default implementation, and a single
 * place to swap in a real provider (Sentry, Bugsnag, Datadog, etc.) later
 * without touching errorHandler.ts or anywhere else that reports an error.
 *
 * Only genuinely unexpected errors should go through this — AppError
 * instances (404s, validation failures, permission denials) are expected,
 * operational outcomes, not bugs, and errorHandler.ts already filters on
 * exactly that distinction before calling captureException.
 */
export interface ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

/**
 * Default implementation — logs through the existing structured logger.
 * This is genuinely useful on its own (every hosting platform worth using
 * captures stdout/stderr into searchable logs), but it has no alerting,
 * no deduplication, and no stack-trace source-mapping the way a real
 * error-tracking service does. Replace with a real provider before launch;
 * see docs/PRODUCTION.md for how.
 */
class ConsoleErrorReporter implements ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void {
    // Intentionally a plain console.error, not logger.error — this keeps
    // error-reporter output visually distinct from routine request logs
    // when scanning a terminal, without adding a second logging system.
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
 *
 *   import * as Sentry from "@sentry/node";
 *   Sentry.init({ dsn: process.env.SENTRY_DSN });
 *
 *   class SentryErrorReporter implements ErrorReporter {
 *     captureException(error: unknown, context?: Record<string, unknown>) {
 *       Sentry.captureException(error, { extra: context });
 *     }
 *   }
 *
 *   export const errorReporter: ErrorReporter = process.env.SENTRY_DSN
 *     ? new SentryErrorReporter()
 *     : new ConsoleErrorReporter();
 *
 * Nothing else in the codebase needs to change — errorHandler.ts only
 * ever calls errorReporter.captureException(...).
 */
export const errorReporter: ErrorReporter = new ConsoleErrorReporter();
