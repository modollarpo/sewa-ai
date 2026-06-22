# ADR 001: Multi-Tenant Architecture with Schema Isolation

## Status
Accepted

## Context
SEWA AI is an enterprise clinical platform serving multiple hospitals and clinics. We need strong tenant isolation to comply with HIPAA, GDPR, and NHS DSPT.

## Decision
Use a single PostgreSQL database with:
1. Tenant ID column on all tables
2. Prisma Client extensions to enforce tenant filtering
3. Row-level security (RLS) as a defense-in-depth measure
4. Separate blob storage containers per tenant

## Consequences
- Strong tenant isolation
- Efficient resource utilization
- Simplified schema management
- Requires careful query validation to prevent cross-tenant leaks
