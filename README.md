# Fleet Management System

Full-stack fleet management platform for vehicle tracking, driver assignment, maintenance regulation, expense management, and operational control — with a Telegram bot for field operations.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Django + Django REST Framework | 5.x + 3.16 |
| **Auth** | SimpleJWT (HttpOnly cookie-based) | 5.5 |
| **Database** | PostgreSQL | 16 |
| **Cache** | Redis | 7 |
| **Frontend** | Next.js (App Router) + React | 15 + 19 |
| **Styling** | Tailwind CSS | 3.4 |
| **i18n** | next-intl (Polish, Ukrainian) | 4.8 |
| **Bot** | aiogram (Telegram, FSM) | 3.4 |
| **CI/CD** | GitHub Actions | 5 parallel jobs |
| **Containers** | Docker Compose | dev + prod configs |
| **Web Server** | Nginx + Let's Encrypt | 1.27 |

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │  Telegram    │     │    Nginx     │
│  Next.js 15  │     │  Bot (FSM)   │     │  SSL/Proxy   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  HttpOnly JWT      │  SQLAlchemy        │  /api/ /media/
       │  cookies           │  (direct DB)       │  routing
       │                    │                    │
       └────────────┬───────┴────────────────────┘
                    │
            ┌───────▼───────┐
            │    Backend    │
            │  Django + DRF │
            └───────┬───────┘
                    │
          ┌─────────┼─────────┐
          │         │         │
    ┌─────▼──┐ ┌────▼───┐ ┌──▼──────┐
    │Postgres│ │ Redis  │ │ S3/Local│
    │   16   │ │ Cache  │ │ Storage │
    └────────┘ └────────┘ └─────────┘
```

```
backend/
├── config/            # Settings, URL root, cache utils, layout-aware search
├── account/           # Custom User (UUID, email login), JWT cookie auth
├── driver/            # Driver CRUD, phone validation, signal-managed flags
├── vehicle/           # Vehicle + photos, inspections, mileage, owner history
├── fleet_management/  # Regulations, equipment, service plans, service providers
├── expense/           # Polymorphic expenses with category-specific details
└── Dockerfile
```

---

## Backend — Business Logic

### Authentication (HttpOnly Cookie JWT)

Tokens are never exposed to JavaScript — the frontend uses `withCredentials: true` and never reads tokens directly.

- `access_token` (5 min) + `refresh_token` (1 day) stored as HttpOnly, SameSite=Lax cookies
- **Remember me**: persistent cookie (max_age=1 day) vs session cookie (cleared on browser close)
- **Token rotation** with blacklisting — every refresh issues a new token pair and blacklists the old one
- **Emergency recovery**: unauthenticated `unset-session` endpoint clears cookies when refresh fails (prevents infinite redirect loops)
- **Rate limiting**: 5/min for auth, 300/min for authenticated users, 30/min for anonymous

### Vehicle Management

Core entity with Kanban workflow and rich sub-resources:

- **9 statuses** (CTO → FOCUS → CLEANING → PREPARATION → READY → LEASING → RENT → SELLING → SOLD) with drag-and-drop Kanban board
- **Sparse positioning**: 1000-unit gaps in `status_position` allow insertions without renumbering; batch reorder endpoint supports cross-column drops
- **Soft delete** (archive) with permanent delete guard:
  - `DELETE` → archive (reversible, unassigns driver)
  - `/delete-check/` → returns related data counts per relation
  - `/permanent-delete/?confirm=true` → hard delete (requires explicit confirmation)
- **Sub-resources**: photos (max 10), technical inspections, mileage logs, owner history

### Signal-Driven Driver History

Driver assignment is tracked entirely via Django signals (pre_save, post_save, pre_delete) — not view logic. This ensures consistency across API, admin, bot, and shell:

- Every assignment creates a `VehicleDriverHistory` entry with `assigned_at`
- Unassignment closes the entry (`unassigned_at = now()`)
- `Driver.has_vehicle` flag is automatically toggled based on active assignments
- Cache invalidation fires only on `transaction.on_commit()` — no stale clears from rolled-back transactions

### Maintenance Regulation System

Configurable maintenance schedules with full audit trail:

- **Schema** → **Items** (e.g., "Oil change every 10,000 km, notify 1,000 km before")
- Assign schema to vehicle → creates per-item entries tracking `last_done_km`
- Computed properties: `next_due_km`, `is_due(current_km)`, `km_remaining(current_km)`
- **Immutable history** log: performed / km_updated / notified events
- **Notification system**: PENDING → SENT → FAILED status tracking
- `UniqueConstraint(condition=Q(is_default=True))` + `select_for_update()` ensures exactly one default schema (race-condition safe)

### Equipment Checklist

- Global default items seeded via migration (fire extinguisher, first aid kit, etc.)
- Auto-granted to every new vehicle on creation (`bulk_create` with `ignore_conflicts`)
- Per-vehicle `is_equipped` toggle with approval tracking

### Polymorphic Expense System

Single `Expense` base model with category-specific detail models driven by a `DETAIL_MAP` dict:

| Category | Detail Fields | Amount |
|----------|--------------|--------|
| Fuel | liters, fuel_type | manual |
| Service | FK to FleetService + service items | sum(items.price) |
| Parts / Accessories / Documents | line items (name, qty, unit_price) | sum(qty * price) |
| Washing | wash_type (exterior / interior / full) | manual |
| Inspection | official_cost, additional_cost | sum of costs |
| Fines | fine_number, violation_type, driver_at_time | manual |

- **INSPECTION** expenses auto-create a linked `TechnicalInspection` record (cascade-deleted with expense)
- Invoice uploads validated to PDF/Word only, organized by `expenses/invoices/{category_code}/`
- Supports multipart/form-data with JSON-encoded nested items (`parts_json`, `service_items_json`)

---

## Key Engineering Decisions

### Two-Tier Redis Caching

```
List caches (version-based):
  vehicle:list:v{N}:{query_hash}       — TTL 30s
  ↑ version bumped on any write → old keys expire naturally

Detail caches (per-PK):
  vehicle:detail:{pk}                  — TTL 60s
  ↑ explicitly deleted on update/delete
```

- **Fault-tolerant**: all cache ops wrapped in `try/except` — Redis outage = cache miss, never an error
- **Transaction-safe**: invalidation via `transaction.on_commit()` prevents clearing cache for rolled-back writes
- TTLs configurable via environment variables (vehicle 30s/60s, driver 300s, schema 600s)

### Keyboard-Layout-Aware Search

Custom `LayoutAwareSearchFilter` converts search terms between EN/UA keyboard layouts and ORs all variants. Typing "Njqjnf" (Ukrainian keyboard in EN mode) still finds "Тойота".

### Storage Abstraction

`media_url()` returns path-only URLs for local storage (Next.js proxies `/media/`) and full S3 URLs in production — zero serializer changes needed. Optional S3 via `django-storages` with `AWS_QUERYSTRING_AUTH=False`.

---

## API Reference

Base: `/api/v1/`

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `auth/login/` | Set JWT cookies, returns `{"detail": "ok"}` |
| POST | `auth/refresh/` | Rotate tokens |
| POST | `auth/logout/` | Blacklist token, clear cookies |
| GET/PATCH | `auth/me/` | User profile (email, role — read-only) |
| POST | `auth/unset-session/` | Emergency cookie clear (no auth required) |

### Driver `(paginated)`

| Method | Endpoint |
|--------|----------|
| GET/POST | `driver/` |
| GET/PUT/PATCH/DELETE | `driver/{uuid}/` |

### Vehicle `(not paginated)`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `vehicle/` | List / create |
| GET/PUT/PATCH/DELETE | `vehicle/{uuid}/` | Detail / soft-delete |
| POST | `vehicle/reorder/` | Batch Kanban reorder |
| GET | `vehicle/archive/` | Archived vehicles |
| POST | `vehicle/{uuid}/restore/` | Restore from archive |
| GET | `vehicle/{uuid}/delete-check/` | Related data counts |
| DELETE | `vehicle/{uuid}/permanent-delete/` | Hard delete (`?confirm=true`) |
| GET/POST/DELETE | `vehicle/{uuid}/photos/` | Photos (max 10) |
| GET/POST/PATCH | `vehicle/{uuid}/owner-history/` | Ownership records |
| GET/POST | `vehicle/{uuid}/inspections/` | Technical inspections |
| GET/PATCH/DELETE | `vehicle/{uuid}/inspections/{id}/` | Single inspection |
| GET/POST | `vehicle/{uuid}/mileage/` | Mileage logs |
| GET/POST | `vehicle/{uuid}/expenses/` | Vehicle-scoped expenses |

### Fleet Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `fleet/services/` | Service providers (paginated) |
| CRUD | `fleet/regulation/schemas/` | Maintenance schemas (paginated) |
| GET | `fleet/vehicles/{uuid}/regulation/` | Vehicle regulation plan |
| POST | `fleet/regulation/{uuid}/assign/` | Assign schema to vehicle |
| GET | `fleet/vehicles/{uuid}/regulation/history/` | Regulation event history |
| PATCH | `fleet/vehicles/{uuid}/regulation/entries/{id}/` | Mark entry as performed |
| CRUD | `fleet/vehicles/{uuid}/service-plans/` | Planned services |
| PATCH | `fleet/vehicles/{uuid}/service-plans/{id}/done/` | Mark plan done |
| GET/POST/DELETE | `fleet/vehicles/{uuid}/equipment/` | Vehicle equipment |
| PATCH | `fleet/vehicles/{uuid}/equipment/{id}/toggle/` | Toggle equipped status |
| CRUD | `fleet/equipment/defaults/` | Default equipment items |

### Expense

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `expense/categories/` | Active categories (cached 600s) |
| GET/POST | `expense/` | All expenses (paginated, multipart) |
| GET/PATCH/DELETE | `expense/{uuid}/` | Single expense |

### Filters

- **Vehicle**: `model`, `manufacturer`, `year`, `status`
- **Expense**: `category`, `category_code`, `vehicle`, `date_from/to`, `min/max_amount`, `payment_method`, `payer_type`
- **Regulation Schema**: `title` (icontains), `is_default`, `min/max_km`
- **All search endpoints**: keyboard-layout-aware (EN ↔ UA)

---

## Telegram Bot

FSM-based aiogram 3 bot for field operations:

- Driver phone authentication → Telegram ID linking
- Vehicle selection and mileage reporting
- Service type selection with photo capture
- Regulation plan PDF generation and download
- Direct PostgreSQL access via SQLAlchemy (shared database)

---

## Testing

### Backend

```bash
cd backend && python manage.py test --settings=config.test_settings
```

- Django `TestCase` with per-test database isolation
- JWT auth via cookie injection (`client.cookies["access_token"]`)
- `LocMemCache` in tests — no Redis dependency
- Coverage: auth flows, CRUD, signal side effects, validation rules, read-only field security, FK constraints (PROTECT), archive/restore, expense auto-computation, mileage tracking

### Frontend

```bash
cd frontend && npm run test:run
```

- Vitest 2 + React Testing Library + jsdom + user-event

### CI/CD

```
backend-lint  ──┐
backend-test  ──┤
                ├──▶  build (Docker)
frontend-lint ──┤
frontend-test ──┘
```

5 GitHub Actions jobs — lint and test in parallel, Docker build gates on all four passing. PostgreSQL 16 + Redis 7 as service containers for backend tests.

---

## Development Setup

### Prerequisites

- Docker & Docker Compose
- Make (optional)

### Quick Start

```bash
make up              # Start all services (Redis, PostgreSQL, backend, frontend, Nginx, bot)
make migrate         # Run Django migrations
make createsuperuser # Create admin user
make create-reg-schema  # Seed default regulation schema + equipment
```

### Commands

| Command | Description |
|---------|-------------|
| `make up` / `make down` | Start / stop dev stack |
| `make restart` | Restart all services |
| `make logs-backend` | Tail backend logs |
| `make migrate` | Run migrations |
| `make shell-backend` | Django shell |
| `make test` | Run all tests (backend + frontend) |
| `make lint-fix` | Auto-fix linting (ruff + eslint) |
| `make lint-check` | CI-mode lint check |
| `make pre-push` | Full pipeline: lint-fix → lint-check → test |
| `make db-dump` / `make db-seed` | Export / import database |
| `make ssl-init` / `make ssl-renew` | SSL certificate management |

---

## Production

```bash
make prod-build && make prod
```

- **Gunicorn** behind Nginx with Let's Encrypt SSL (auto-renew via Certbot)
- HTTP → HTTPS redirect, HSTS (2 years), OCSP stapling, TLS 1.2+
- gzip for JSON, JS, CSS, SVG
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff
- Static files: 30-day cache; media: 7-day cache
- `client_max_body_size 20M`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `POSTGRES_*` | Database connection (DB, USER, PASSWORD, HOST, PORT) |
| `REDIS_URL` | Redis connection string |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins |
| `CSRF_TRUSTED_ORIGINS` | Trusted CSRF origins |
| `SECURE_COOKIES` | Enable Secure flag on cookies (requires HTTPS) |
| `USE_S3` | Enable S3 storage (`django-storages`) |
| `AWS_*` | S3 configuration (bucket, region, keys) |
| `THROTTLE_AUTH` | Auth rate limit (default: `5/minute`) |
| `CACHE_TTL_*` | Per-entity cache TTLs |
