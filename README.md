# Fleet Management System

A pet project for managing a vehicle fleet — tracking vehicles, drivers, service plans, equipment, and maintenance regulations.

## Stack

**Backend**
- Python 3.12, Django 5, Django REST Framework
- PostgreSQL (psycopg3)
- JWT authentication via `djangorestframework-simplejwt` (HTTP-only cookies)
- `django-filter` for filtering querysets
- Ruff for linting and formatting
- Docker + Docker Compose

**Frontend**
- Next.js 15 (App Router), TypeScript, Tailwind CSS
- next-intl (i18n: `pl`, `uk`)

---

## Project Structure

```
fleet-management-system/
├── backend/
│   ├── account/          # Auth: login, refresh, logout, user profile
│   ├── driver/           # Driver CRUD
│   ├── vehicle/          # Vehicle CRUD, driver history
│   ├── fleet_management/ # Service plans, equipment, regulation schemas
│   └── config/           # Django settings, root URLs
├── frontend/
└── docker-compose.yml
```

---

## API Endpoints

Base URL: `http://localhost:8000`

### Auth — `/api/auth/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Obtain JWT tokens (set in HTTP-only cookies) |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Blacklist refresh token |
| GET | `/api/auth/me/` | Get current user profile |
| PATCH | `/api/auth/me/` | Update current user profile |

### Drivers — `/api/driver/`

Standard DRF router (ModelViewSet).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/driver/` | List all drivers |
| POST | `/api/driver/` | Create a driver |
| GET | `/api/driver/{id}/` | Retrieve a driver |
| PATCH | `/api/driver/{id}/` | Update a driver |
| DELETE | `/api/driver/{id}/` | Delete a driver |

### Vehicles — `/api/vehicle/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicle/` | List vehicles (filterable) |
| POST | `/api/vehicle/` | Create a vehicle |
| GET | `/api/vehicle/{uuid}/` | Retrieve a vehicle |
| PUT/PATCH | `/api/vehicle/{uuid}/` | Update a vehicle |
| DELETE | `/api/vehicle/{uuid}/` | Delete a vehicle |

### Fleet Management — `/api/fleet/`

**Fleet Services**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/fleet/services/` | List / create fleet services |
| GET/PUT/DELETE | `/api/fleet/services/{id}/` | Retrieve / update / delete |

**Regulation Schemas**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/regulation/schemas/` | List regulation schemas |

**Service Plans** (scoped to vehicle)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/fleet/vehicles/{uuid}/service-plans/` | List / create service plans |
| GET/PUT/DELETE | `/api/fleet/vehicles/{uuid}/service-plans/{id}/` | Retrieve / update / delete |
| PATCH | `/api/fleet/vehicles/{uuid}/service-plans/{id}/done/` | Mark plan as done |

**Equipment** (scoped to vehicle)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/vehicles/{uuid}/equipment/` | List equipment for vehicle |
| GET/PUT/DELETE | `/api/fleet/vehicles/{uuid}/equipment/{id}/` | Retrieve / update / delete |
| POST | `/api/fleet/vehicles/{uuid}/equipment/grant-defaults/` | Assign default equipment items |

**Equipment Defaults**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/fleet/equipment/defaults/` | List / create default equipment items |
| GET/PUT/DELETE | `/api/fleet/equipment/defaults/{id}/` | Retrieve / update / delete |

---

## Local Setup

### Prerequisites

- Python 3.12
- [Poetry](https://python-poetry.org/)
- PostgreSQL

### Install & Run

```bash
cd backend

# Install dependencies
poetry install

# Copy and fill in environment variables
cp .env.example .env

# Apply migrations
poetry run python manage.py migrate

# Create a superuser
poetry run python manage.py createsuperuser

# Seed the default vehicle regulation schema (optional)
poetry run python manage.py create_vehicle_reg_basic_schema

# Run the dev server
poetry run python manage.py runserver
```

### Environment Variables (`.env`)

```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=["*"]

POSTGRES_DB=fleet_db
POSTGRES_USER=fleet_user
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

ACCESS_TOKEN_LIFETIME=86400    # seconds (1 day)
REFRESH_TOKEN_LIFETIME=604800  # seconds (7 days)

SECURE_COOKIES=False           # set True in production (requires HTTPS)
```

---

## Docker Setup

```bash
# Start all services
make up

# Stop
make down

# Rebuild
make build
```

### Useful Make Commands

| Command | Description |
|---------|-------------|
| `make up` | Start all services in background |
| `make down` | Stop and remove containers |
| `make logs-backend` | Tail backend logs |
| `make shell-backend` | Open shell inside backend container |
| `make migrate` | Run Django migrations inside container |
| `make makemigrations` | Create new migrations inside container |
| `make createsuperuser` | Create superuser (interactive) |
| `make createsuperuser-auto` | Create superuser (non-interactive, uses defaults) |
| `make create-reg-schema` | Seed default vehicle regulation schema |
| `make db-dump` | Export DB to `backups/fleet_db.sql` |
| `make db-seed` | Import DB from `backups/fleet_db.sql` |

---

## Code Quality

```bash
cd backend

# Lint (with auto-fix)
poetry run ruff check --fix .

# Format
poetry run ruff format .
```

Ruff is configured in `pyproject.toml` with Django-aware rules (DJ, UP, B, SIM, PERF, etc.).

---

## Data Models Overview

- **Driver** — name, phone number, active status, last active date
- **Vehicle** — manufacturer, model, year, VIN, plate number, status, assigned driver
- **VehicleDriverHistory** — log of driver↔vehicle assignments
- **FleetService** — named service types
- **ServicePlan** — planned maintenance per vehicle with a due date
- **FleetVehicleRegulationSchema** — named package of maintenance rules (e.g. "Basic Regulation")
- **FleetVehicleRegulationItem** — single rule: service every N km, notify before M km
- **FleetVehicleRegulation** — schema assigned to a specific vehicle
- **FleetVehicleRegulationEntry** — current state: last done km, next due km
- **FleetVehicleRegulationHistory** — immutable log of regulation events
- **EquipmentDefaultItem** — global list of standard equipment
- **EquipmentList** — per-vehicle equipment with approval tracking
