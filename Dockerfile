# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=lts
FROM node:${NODE_VERSION}-slim AS base

# Set up environment variables and working directory
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

# Enable corepack for package management
RUN corepack enable

# Throw-away build stage to reduce size of the final image
FROM base AS build

# Install necessary build dependencies
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends build-essential openssl pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY --link package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy and generate prisma client
COPY --link prisma .
RUN pnpm run generate

# Copy application code and build the application
COPY --link . .
RUN pnpm run build

# Remove unnecessary dependencies and clean up
RUN pnpm install --prod --frozen-lockfile && \
    rm -rf /usr/share/doc /usr/share/man /var/cache/apt/* /root/.cache

# Final stage for the production image
FROM base AS prod

# Set production environment
ENV NODE_ENV="production"
WORKDIR /app

# Install only the necessary runtime packages
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Copy the built application from the build stage
COPY --from=build /app /app

# Expose the application port and define the startup command
EXPOSE 8888
CMD ["pnpm", "run", "start"]
