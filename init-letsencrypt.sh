#!/bin/bash

# ── Let's Encrypt SSL certificate initialization ────────────────────────────
# Run ONCE on the server to obtain the first certificate.
# After that, the certbot container auto-renews every 12h.

set -e

DOMAIN="domain-here"
EMAIL="email-here"   
COMPOSE="docker compose -f docker-compose.prod.yml"
DATA_PATH="./certbot"

echo "==> Creating temporary self-signed certificate for $DOMAIN ..."

# 1. Create dummy certificate so nginx can start
$COMPOSE run --rm --entrypoint "\
  mkdir -p /etc/letsencrypt/live/$DOMAIN" certbot

$COMPOSE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost'" certbot

echo "==> Starting nginx with dummy certificate ..."
$COMPOSE up -d nginx

echo "==> Waiting for nginx to start ..."
sleep 5

echo "==> Removing dummy certificate ..."
$COMPOSE run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "==> Requesting real certificate from Let's Encrypt ..."
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

echo "==> Reloading nginx with real certificate ..."
$COMPOSE exec nginx nginx -s reload

echo ""
echo "================================================"
echo "  SSL certificate obtained successfully!"
echo "  https://$DOMAIN is ready."
echo "================================================"
