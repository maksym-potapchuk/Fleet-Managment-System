.RECIPEPREFIX := >

COMPOSE := docker compose
COMPOSE_PROD := docker compose -f docker-compose.yml -f docker-compose.prod.yml
BACKEND_SERVICE := backend
FRONTEND_SERVICE := frontend
BOT_SERVICE := bot
DB_SERVICE := postgres

DB_NAME ?= fleet_db
DB_USER ?= fleet_user
DUMP_FILE ?= backups/fleet_db.sql

SU_USERNAME ?= admin
SU_EMAIL ?= admin@example.com
SU_PASSWORD ?= admin12345

.PHONY: help up down restart build build-bot prod prod-build prod-down prod-up docker-clean ps logs logs-backend logs-frontend logs-bot logs-db shell-backend shell-frontend shell-db migrate makemigrations createsuperuser createsuperuser-auto db-dump db-seed dump seed create-reg-schema create-driver-vehicle create-driver-vehicle-force show-regulation assign-regulation drop-vehicles lint-fix lint-check lint-fix-backend lint-fix-frontend lint-check-backend lint-check-frontend test test-backend test-frontend

help:
>@echo "Available commands:"
>@echo "  make up                  - Start all services"
>@echo "  make down                - Stop and remove containers"
>@echo "  make restart             - Restart all services"
>@echo "  make build               - Rebuild all images"
>@echo "  make build-bot           - Rebuild and restart only bot"
>@echo "  make prod                - Start prod stack (recreate containers)"
>@echo "  make prod-build          - Rebuild and start with production frontend"
>@echo "  make prod-down           - Stop prod stack (when using make prod)"
>@echo "  make prod-up             - Start prod stack only, no rebuild (up -d)"
>@echo "  make docker-clean        - Stop all, remove containers, volumes, orphans"
>@echo "  make ps                  - Show container status"
>@echo "  make logs                - Show all logs"
>@echo "  make logs-backend        - Show backend logs"
>@echo "  make logs-frontend       - Show frontend logs"
>@echo "  make logs-bot            - Show bot logs"
>@echo "  make logs-db             - Show postgres logs"
>@echo "  make shell-backend       - Open backend shell"
>@echo "  make shell-frontend      - Open frontend shell"
>@echo "  make shell-db            - Open postgres shell"
>@echo "  make migrate             - Run Django migrations"
>@echo "  make makemigrations      - Create Django migrations"
>@echo "  make createsuperuser     - Create Django superuser (interactive)"
>@echo "  make createsuperuser-auto - Create Django superuser (non-interactive)"
>@echo "  make db-dump             - Export SQL dump to $(DUMP_FILE)"
>@echo "  make db-seed             - Import SQL dump from $(DUMP_FILE)"
>@echo "  make create-reg-schema   - Seed default vehicle regulation schema"
>@echo "  make create-driver-vehicle - Create driver +380663234712, vehicle, assign"
>@echo "  make create-driver-vehicle-force - Same, recreate/reassign if exists"
>@echo "  make show-regulation CAR=AA6601BB - Show regulation plan for vehicle by car number"
>@echo "  make assign-regulation CAR=AA6601BB - Assign (fill) default regulation for vehicle"
>@echo "  make drop-vehicles               - Delete ALL vehicles from the database (with confirmation)"
>@echo ""
>@echo "  Lint & Test:"
>@echo "  make lint-fix            - Auto-fix lint (backend ruff + frontend eslint)"
>@echo "  make lint-check          - Check lint without fixing (CI mode)"
>@echo "  make test                - Run all tests (backend + frontend)"
>@echo "  make test-backend        - Run Django tests only"
>@echo "  make test-frontend       - Run Vitest tests only"

up:
>$(COMPOSE) up -d

down:
>$(COMPOSE) down

restart:
>$(COMPOSE) restart

build:
>$(COMPOSE) up --build -d

build-bot:
>$(COMPOSE) up -d --build $(BOT_SERVICE)

prod:
>$(COMPOSE_PROD) up -d --force-recreate

prod-build:
>$(COMPOSE_PROD) up --build -d --force-recreate

prod-down:
>$(COMPOSE_PROD) down

prod-up:
>$(COMPOSE_PROD) up -d

docker-clean:
>$(COMPOSE_PROD) down -v --remove-orphans
>$(COMPOSE) down -v --remove-orphans
>@echo "Docker cleaned: containers, volumes, orphans removed."

ps:
>$(COMPOSE) ps

ps-all:
>$(COMPOSE) ps -a

logs:
>$(COMPOSE) logs -f

logs-backend:
>$(COMPOSE) logs -f $(BACKEND_SERVICE)

logs-frontend:
>$(COMPOSE) logs -f $(FRONTEND_SERVICE)

logs-bot:
>$(COMPOSE) logs -f $(BOT_SERVICE)

logs-db:
>$(COMPOSE) logs -f $(DB_SERVICE)

shell-backend:
>$(COMPOSE) exec $(BACKEND_SERVICE) sh

shell-frontend:
>$(COMPOSE) exec $(FRONTEND_SERVICE) sh

shell-db:
>$(COMPOSE) exec $(DB_SERVICE) psql -U $(DB_USER) -d $(DB_NAME)

migrate:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py migrate

makemigrations:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py makemigrations

createsuperuser:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py createsuperuser

createsuperuser-auto:
>$(COMPOSE) exec -e DJANGO_SUPERUSER_USERNAME=$(SU_USERNAME) -e DJANGO_SUPERUSER_EMAIL=$(SU_EMAIL) -e DJANGO_SUPERUSER_PASSWORD=$(SU_PASSWORD) $(BACKEND_SERVICE) python manage.py createsuperuser --noinput

db-dump:
>mkdir -p backups
>$(COMPOSE) exec -T $(DB_SERVICE) pg_dump -U $(DB_USER) -d $(DB_NAME) > $(DUMP_FILE)
>@echo "Dump created: $(DUMP_FILE)"

db-seed:
>$(COMPOSE) exec -T $(DB_SERVICE) psql -U $(DB_USER) -d $(DB_NAME) < $(DUMP_FILE)
>@echo "Seed loaded from: $(DUMP_FILE)"

dump: db-dump

seed: db-seed

create-reg-schema:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py create_vehicle_reg_basic_schema

force-reg-schema:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py create_vehicle_reg_basic_schema --force

create-driver-vehicle:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py create_driver_with_vehicle

create-driver-vehicle-force:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py create_driver_with_vehicle --force

show-regulation:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py show_regulation_plan $(CAR)

assign-regulation:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py assign_regulation $(CAR)

drop-vehicles:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py drop_all_vehicles --force

# ── Lint & Test ──────────────────────────────────────────────

lint-fix: lint-fix-backend lint-fix-frontend
>@echo "All lint fixes applied."

lint-check: lint-check-backend lint-check-frontend
>@echo "All lint checks passed."

lint-fix-backend:
>$(COMPOSE) exec $(BACKEND_SERVICE) ruff check --fix .
>$(COMPOSE) exec $(BACKEND_SERVICE) ruff format .
>@echo "Backend lint fixed."

lint-fix-frontend:
>$(COMPOSE) exec $(FRONTEND_SERVICE) npm run lint:fix
>@echo "Frontend lint fixed."

lint-check-backend:
>$(COMPOSE) exec $(BACKEND_SERVICE) ruff check .
>$(COMPOSE) exec $(BACKEND_SERVICE) ruff format --check .

lint-check-frontend:
>$(COMPOSE) exec $(FRONTEND_SERVICE) npm run lint
>$(COMPOSE) exec $(FRONTEND_SERVICE) npm run typecheck

test: test-backend test-frontend
>@echo "All tests passed."

test-backend:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py test --settings=config.test_settings --verbosity=2

test-frontend:
>$(COMPOSE) exec $(FRONTEND_SERVICE) npm run test:run
