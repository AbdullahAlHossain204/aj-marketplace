# AJ Market — Testing Guide

## Unit tests — run anywhere, right now
cd apps/api && npm test
No database required. 47 tests, all passing as of Phase 15/16.

A real bug this suite caught: AppError's constructor called
Object.setPrototypeOf(this, AppError.prototype) unconditionally, silently breaking
instanceof for every subclass. See src/lib/errors.ts for the full explanation. Fixed.

## Integration tests — require a real Postgres database
cd apps/api && cp .env.example .env && npm run prisma:generate && npm run prisma:migrate && npm run test:integration
Written and believed correct, but could not be executed in this project's build sandbox
(network policy blocks binaries.prisma.sh, same limitation documented every phase).

## Not included yet
E2E/browser tests, responsive/visual testing, and load testing all need real running
infrastructure this build environment doesn't have — reasonable fast-follows once deployed.
