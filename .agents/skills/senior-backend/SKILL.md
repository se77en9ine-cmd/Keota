---
name: senior-backend
description: Comprehensive senior backend engineering skill covering production-grade API design, database modeling & optimization, transaction management, caching strategies, asynchronous message queues, security, and scalable system architecture. Use when designing backend architectures, writing Node.js/TypeScript/Go/Python backend services, optimizing SQL queries, implementing Redis caching, setting up queues, or hardening APIs.
---

# Senior Backend Engineering

Production-grade senior backend architecture patterns, database design, high-performance API engineering, and distributed system best practices.

## Core Architectural Pillars

### 1. Architecture Patterns & Clean Code
- **Clean / Hexagonal Architecture (Ports & Adapters)**:
  - `Domain`: Enterprise business rules and pure domain entities (framework-agnostic).
  - `Application / Use Cases`: Orchestration logic, DTOs, and interfaces (ports).
  - `Infrastructure`: Database repositories, external API clients, message queue publishers (adapters).
  - `Presentation / Controller`: HTTP routers, GraphQL resolvers, gRPC handlers.
- **Modular Monolith First**: Keep boundaries clean with explicit domain modules before decomposing into microservices.
- **Dependency Inversion**: High-level modules must never depend on low-level database drivers; depend on interfaces.

### 2. Database Engineering & Performance Optimization
- **ACID Transactions & Concurrency Control**:
  - Always wrap multi-entity state updates in transactional blocks (`BEGIN` ... `COMMIT` / `ROLLBACK`).
  - Use **Pessimistic Locking** (`SELECT ... FOR UPDATE`) for high-contention financial inventory/ledger balances.
  - Use **Optimistic Concurrency** (version/timestamp column) for document or record updates with low collision probability.
- **Indexing Strategy**:
  - Index all Foreign Keys (`fk_*`), filter columns (`WHERE`), and join criteria.
  - Use **Composite Indexes** following the *Equality, Range, Sort* (ESR) rule.
  - Use **Partial Indexes** for sparse status flags (e.g. `CREATE INDEX idx_orders_unsettled ON orders (created_at) WHERE status = 'PENDING'`).
  - Use **GIN Indexes** for JSONB columns and Full-Text Search.
- **N+1 Query Elimination**:
  - Use batch querying (`IN (...)`), SQL `JOIN` aggregation, or GraphQL `DataLoader` batching.
  - Never execute SQL queries inside loops.
- **Connection Pooling**:
  - Configure pool size (`min`, `max`, `idleTimeout`) appropriately according to database capacity (e.g. `(CPU cores * 2) + effective_spindle_count`).

### 3. API Design & Standards
- **RESTful API Principles**:
  - Proper HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
  - Standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, `429 Too Many Requests`, `500 Internal Error`).
  - Use **RFC 7807 (Problem Details for HTTP APIs)** for consistent, structured error payloads.
  - Support **Idempotency Keys** (`Idempotency-Key` header) for non-idempotent mutations (payments, checkouts, order submissions).
- **Pagination**:
  - Use **Cursor-based Pagination** (`limit` + `cursor`/`after_id`) for real-time, high-velocity feeds to prevent offset drift.
  - Use Offset pagination only for static administrative tables.

### 4. Caching & State Management
- **Redis Cache-Aside Pattern**:
  - Read: Check Redis cache ➔ On Cache Hit return ➔ On Cache Miss read from DB, populate Redis with TTL, return.
  - Write: Update DB in transaction ➔ Invalidate / delete corresponding Redis key.
- **Cache Stampede Prevention**:
  - Implement Distributed Locks (`Redlock`) or Mutual Exclusion (`Mutex`) when recomputing heavy cached aggregates.
  - Add Jitter (random 5-15% variance) to cache expiration times to prevent simultaneous mass expirations.

### 5. Asynchronous Processing & Message Queues
- **Job Queues (BullMQ / RabbitMQ / Kafka)**:
  - Offload heavy tasks (email notifications, PDF bill generation, webhook delivery, inventory sync) to background workers.
  - Implement **Exponential Backoff with Jitter** for retryable failures.
  - Route exhausted failures to a **Dead-Letter Queue (DLQ)** for inspection and manual replay.
- **Transactional Outbox Pattern**:
  - When publishing domain events, write the event into an outbox database table within the same ACID transaction as the business entity, then a background worker polls/streams events to the message broker.

### 6. Security, Hardening & Telemetry
- **Authentication & Authorization**:
  - Short-lived Access Tokens (JWT, 15m expiry) + Revocable Refresh Tokens stored in HTTP-only Secure Cookies with rotation.
  - Role-Based Access Control (RBAC) middleware verifying permissions on every protected endpoint.
- **Rate Limiting & DDoS Defense**:
  - Token Bucket / Sliding Window rate limiting per IP / authenticated user ID.
- **Input Validation**:
  - Strict schema validation at the controller boundary (e.g. `Zod`, `Joi`, `class-validator`).
  - Parameterized SQL queries to completely eliminate SQL injection.
- **Structured Logging & Observability**:
  - JSON structured logging with correlation IDs (`X-Request-ID`) attached to every log line.
  - Track response latency, error rates, and database query durations.

### 7. Reversible Workflow Pipelines & Human Error Recovery
- **Bi-directional Workflow Engineering**:
  - Linear state machines (orders, dispatches, checkouts) must accommodate backward rollback transitions (`step - 1`) and arbitrary stage overrides without corrupting entity integrity or inventory holds.
  - Interactive Stepper Interfaces: Stepper nodes must be clickable, allowing direct jumping/rollback to previous stages with visual feedback.
  - Recovery Guardrails: Always pair forward primary actions with explicit `Step Back (↩)` or `Edit Stage` controls to gracefully handle accidental barcode scans or rapid touch clicks.
  - Audit Trail: Log all manual stage overrides and rollbacks with cashier/operator attribution for reconciliation and compliance.

