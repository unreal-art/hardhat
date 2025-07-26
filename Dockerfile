# Build stage
FROM node:20 AS builder
WORKDIR /app

COPY ./package*.json  ./
COPY ./pnpm-lock.yaml ./

COPY . .

RUN npm install -g pnpm
RUN pnpm install


# Deploy stage
FROM node:20-alpine

LABEL maintainer="Hiro <laciferin@gmail.com>"

ENV NODE_ENV="production"

WORKDIR /app


COPY --from=builder /app ./

RUN

ENTRYPOINT ["npm", "run", ""]