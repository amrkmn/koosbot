# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=lts
FROM node:${NODE_VERSION}-alpine AS base

# Node.js/Prisma app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apk upgrade --no-cache
RUN apk add --no-cache \
    build-base \
    openssl \
    python3 \
    py3-pip

# Install node modules
COPY --link package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Generate Prisma Client
COPY --link prisma .
RUN yarn prisma generate

# Copy application code
COPY --link . .

# Build application
RUN yarn run build

# Remove development dependencies
RUN yarn install --production=true && \
    rm -rf /usr/share/doc && \
    rm -rf /usr/share/man && \
    rm -rf /root/.cache

# Final stage for app image
FROM base

# Install packages needed for deployment
RUN apk add --no-cache openssl

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 8888
CMD [ "yarn", "run", "start" ]
