# syntax=docker/dockerfile:1
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# BuildKit cache mount — npm cache persists between rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
