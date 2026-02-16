.RECIPEPREFIX := >

COMPOSE := docker compose
BACKEND_SERVICE := backend
FRONTEND_SERVICE := frontend
DB_SERVICE := postgres

DB_NAME ?= fleet_db
DB_USER ?= fleet_user
DUMP_FILE ?= backups/fleet_db.sql

SU_USERNAME ?= admin
SU_EMAIL ?= admin@example.com
SU_PASSWORD ?= admin12345

.PHONY: help up down restart build ps logs logs-backend logs-frontend logs-db shell-backend shell-frontend shell-db migrate makemigrations createsuperuser createsuperuser-auto db-dump db-seed dump seed

help:
>@echo "Available commands:"
>@echo "  make up                  - Start all services"
>@echo "  make down                - Stop and remove containers"
>@echo "  make restart             - Restart all services"
>@echo "  make build               - Rebuild all images"
>@echo "  make ps                  - Show container status"
>@echo "  make logs                - Show all logs"
>@echo "  make logs-backend        - Show backend logs"
>@echo "  make logs-frontend       - Show frontend logs"
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

up:
>$(COMPOSE) up -d

down:
>$(COMPOSE) down

restart:
>$(COMPOSE) restart

build:
>$(COMPOSE) up --build -d

ps:
>$(COMPOSE) ps

logs:
>$(COMPOSE) logs -f

logs-backend:
>$(COMPOSE) logs -f $(BACKEND_SERVICE)

logs-frontend:
>$(COMPOSE) logs -f $(FRONTEND_SERVICE)

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
