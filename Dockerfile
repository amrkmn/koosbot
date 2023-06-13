# syntax = docker/dockerfile:1.4

FROM node:18.16.0-slim as base

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -qq && \
    apt-get install -y python-is-python3 pkg-config build-essential openssl 

FROM base as build

COPY --link package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false
COPY --link prisma ./prisma
RUN yarn prisma generate
COPY --link . .
RUN yarn build

RUN yarn install --production=true

FROM base

COPY --from=build /app /app
EXPOSE 3000
CMD [ "yarn", "run", "start" ]