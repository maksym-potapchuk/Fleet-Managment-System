.RECIPEPREFIX := >

COMPOSE := docker compose
COMPOSE_PROD := docker compose -f docker-compose.prod.yml
COMPOSE_MON := docker compose -f docker-compose.yml -f docker-compose.monitoring.yml
COMPOSE_PROD_MON := docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml
BACKEND_SERVICE := backend
FRONTEND_SERVICE := frontend
NGINX_SERVICE := nginx
BOT_SERVICE := bot
DB_SERVICE := postgres

DB_NAME ?= fleet_db
DB_USER ?= fleet_user
DUMP_FILE ?= backups/fleet_db.sql

SU_USERNAME ?= admin
SU_EMAIL ?= admin@example.com
SU_PASSWORD ?= admin12345

.PHONY: help up down restart build build-bot prod prod-build prod-down prod-up docker-clean docker-nuke ps logs logs-backend logs-frontend logs-nginx logs-bot logs-db shell-backend shell-frontend shell-db migrate makemigrations createsuperuser createsuperuser-auto delete-superuser db-dump db-seed db-reset dump seed seed-defaults seed-categories create-reg-schema force-reg-schema prod-force-reg-schema create-driver-vehicle create-driver-vehicle-force show-regulation assign-regulation drop-reg-schema drop-vehicles reset-vehicle-reg prod-reset-vehicle-reg trello-lists import-trello import-trello-dry import-trello-all import-trello-all-dry import-trello-reposition set-user-color prod-set-user-color lint-fix lint-check lint-fix-backend lint-fix-frontend lint-check-backend lint-check-frontend test test-backend test-frontend pre-push monitoring-up monitoring-down monitoring-restart monitoring-logs

help:
>@echo "Available commands:"
>@echo ""
>@echo "  Monitoring:"
>@echo "  make monitoring-up       - Start all services + Prometheus/Grafana monitoring"
>@echo "  make monitoring-down     - Stop all services including monitoring"
>@echo "  make monitoring-restart  - Restart monitoring stack"
>@echo "  make monitoring-logs     - Show monitoring logs (prometheus, grafana, exporters)"
>@echo ""
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
>@echo "  make docker-nuke         - Full clean: containers, volumes, images, build cache"
>@echo "  make ps                  - Show container status"
>@echo "  make logs                - Show all logs"
>@echo "  make logs-backend        - Show backend logs"
>@echo "  make logs-frontend       - Show frontend logs"
>@echo "  make logs-nginx          - Show nginx logs"
>@echo "  make logs-bot            - Show bot logs"
>@echo "  make logs-db             - Show postgres logs"
>@echo "  make shell-backend       - Open backend shell"
>@echo "  make shell-frontend      - Open frontend shell"
>@echo "  make shell-db            - Open postgres shell"
>@echo "  make migrate             - Run Django migrations"
>@echo "  make makemigrations      - Create Django migrations"
>@echo "  make createsuperuser     - Create Django superuser (interactive)"
>@echo "  make createsuperuser-auto - Create Django superuser (non-interactive)"
>@echo "  make db-dump             - Export DB as JSON fixture to backups/"
>@echo "  make db-seed             - Load latest JSON fixture from backups/"
>@echo "  make db-reset            - Flush database and re-apply migrations"
>@echo "  make seed-defaults       - Seed all defaults (categories, regulation schema, equipment)"
>@echo "  make seed-categories     - Seed expense categories only (idempotent)"
>@echo "  make create-reg-schema   - Seed default vehicle regulation schema"
>@echo "  make force-reg-schema    - Update regulation schema in-place (safe for prod)"
>@echo "  make prod-force-reg-schema - Same but on prod stack"
>@echo "  make create-driver-vehicle - Create driver +380663234712, vehicle, assign"
>@echo "  make create-driver-vehicle-force - Same, recreate/reassign if exists"
>@echo "  make show-regulation CAR=AA6601BB - Show regulation plan for vehicle by car number"
>@echo "  make assign-regulation CAR=AA6601BB - Assign (fill) default regulation for vehicle"
>@echo "  make drop-reg-schema             - Delete default regulation schema + all vehicle regulation data"
>@echo "  make drop-vehicles               - Delete ALL vehicles from the database (with confirmation)"
>@echo "  make reset-vehicle-reg CAR=AA6601BB - Reset mileage + regulation for vehicle"
>@echo "  make prod-reset-vehicle-reg CAR=AA6601BB - Same on prod"
>@echo "  make set-user-color USERNAME=x COLOR=#E53E3E - Set user display color (dev)"
>@echo "  make prod-set-user-color USERNAME=x COLOR=#E53E3E - Set user display color (prod)"
>@echo "  make delete-superuser EMAIL=x    - Delete superuser by email"
>@echo "  make trello-lists                - Show available Trello lists with indices"
>@echo "  make import-trello N=0           - Import vehicles from Trello list by index"
>@echo "  make import-trello-dry N=0       - Dry run (preview without writing)"
>@echo "  make import-trello-all           - Import ALL Trello lists with status mapping"
>@echo "  make import-trello-all-dry       - Dry run for all lists"
>@echo "  make import-trello-reposition    - Reorder vehicles to match Trello card order"
>@echo ""
>@echo "  SSL:"
>@echo "  make ssl-init            - Obtain first Let's Encrypt certificate"
>@echo "  make ssl-renew           - Force certificate renewal + reload nginx"
>@echo "  make ssl-status          - Show certificate expiry info"
>@echo ""
>@echo "  Lint & Test:"
>@echo "  make lint-fix            - Auto-fix lint (backend ruff + frontend eslint)"
>@echo "  make lint-check          - Check lint without fixing (CI mode)"
>@echo "  make test                - Run all tests (backend + frontend)"
>@echo "  make test-backend        - Run Django tests only"
>@echo "  make test-frontend       - Run Vitest tests only"
>@echo "  make pre-push            - Fix lint → check lint → run tests (full pre-push pipeline)"

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

ssl-init:
>chmod +x init-letsencrypt.sh && bash init-letsencrypt.sh

ssl-renew:
>$(COMPOSE_PROD) run --rm certbot renew && $(COMPOSE_PROD) exec nginx nginx -s reload

ssl-status:
>$(COMPOSE_PROD) run --rm --entrypoint "certbot certificates" certbot

docker-clean:
>$(COMPOSE_PROD) down -v --remove-orphans
>$(COMPOSE) down -v --remove-orphans
>@echo "Docker cleaned: containers, volumes, orphans removed."

docker-nuke:
>$(COMPOSE_PROD) down -v --remove-orphans --rmi all
>$(COMPOSE) down -v --remove-orphans --rmi all
>docker builder prune -f
>@echo "Docker nuked: containers, volumes, images, build cache removed."

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

logs-nginx:
>$(COMPOSE) logs -f $(NGINX_SERVICE)

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
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py db_dump
>@echo "Dump saved to backups/"

db-seed:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py db_load
>@echo "Database loaded from latest dump"

db-reset:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py flush --noinput
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py migrate
>@echo "Database reset: flushed and migrations re-applied."

dump: db-dump

seed: db-seed

seed-defaults:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py seed_expense_categories
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py create_vehicle_reg_basic_schema
>@echo "Default data seeded (expense categories, regulation schema, equipment)."

seed-categories:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py seed_expense_categories

create-reg-schema: seed-defaults

force-reg-schema:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py create_vehicle_reg_basic_schema --force

prod-force-reg-schema:
>$(COMPOSE_PROD) exec $(BACKEND_SERVICE) python manage.py create_vehicle_reg_basic_schema --force

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

delete-superuser:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py shell -c "from account.models import User; u = User.objects.filter(email='$(EMAIL)', is_superuser=True); print(f'Deleted {u.count()} superuser(s)') if u.exists() else print('No superuser found with that email'); u.delete()"

set-user-color:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py shell -c "from account.models import User; u = User.objects.get(username='$(USERNAME)'); u.color = '$(COLOR)'; u.save(update_fields=['color']); print(f'{u.username} → {u.color}')"

prod-set-user-color:
>$(COMPOSE_PROD) exec $(BACKEND_SERVICE) python manage.py shell -c "from account.models import User; u = User.objects.get(username='$(USERNAME)'); u.color = '$(COLOR)'; u.save(update_fields=['color']); print(f'{u.username} → {u.color}')"

reset-vehicle-reg:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py reset_vehicle_regulation $(CAR) --force

prod-reset-vehicle-reg:
>$(COMPOSE_PROD) exec $(BACKEND_SERVICE) python manage.py reset_vehicle_regulation $(CAR) --force

drop-reg-schema:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py drop_reg_schema --force

trello-lists:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py import_trello_vehicles --show-lists

import-trello:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py import_trello_vehicles --list-index $(N)

import-trello-dry:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py import_trello_vehicles --list-index $(N) --dry-run

import-trello-all:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py import_trello_vehicles --all

import-trello-all-dry:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py import_trello_vehicles --all --dry-run

import-trello-reposition:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py import_trello_vehicles --reposition

import-trello-retry:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py import_trello_vehicles --retry-skipped

import-trello-retry-dry:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py import_trello_vehicles --retry-skipped --dry-run

# ── Monitoring ────────────────────────────────────────────

monitoring-up:
>$(COMPOSE_MON) up -d

monitoring-down:
>$(COMPOSE_MON) down

monitoring-restart:
>$(COMPOSE_MON) restart prometheus grafana node-exporter redis-exporter loki promtail

monitoring-logs:
>$(COMPOSE_MON) logs -f prometheus grafana node-exporter redis-exporter loki promtail

prod-monitoring-up:
>$(COMPOSE_PROD_MON) up -d

prod-monitoring-down:
>$(COMPOSE_PROD_MON) down

prod-monitoring-logs:
>$(COMPOSE_PROD_MON) logs -f prometheus grafana node-exporter redis-exporter loki promtail

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

# ── Pre-push pipeline ──────────────────────────────────────

pre-push: lint-fix lint-check test
>@echo ""
>@echo "================================================"
>@echo "  All checks passed. Safe to push."
>@echo "================================================"

test-backend:
>$(COMPOSE) exec $(BACKEND_SERVICE) python manage.py test --settings=config.test_settings --verbosity=2 --noinput

test-frontend:
>$(COMPOSE) exec $(FRONTEND_SERVICE) npm run test:run
