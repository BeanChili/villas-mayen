FROM node:20-bullseye-slim

WORKDIR /app

# Install system dependencies needed by Prisma native engines
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates openssl libssl1.1 && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy Prisma schema and source code
COPY prisma ./prisma/
COPY src ./src/
COPY public ./public/

# Copy config files
COPY next.config.js tailwind.config.js postcss.config.js tsconfig.json .env* ./

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

EXPOSE 3000

# Start the application
# Intenta migrate deploy primero. Si falla (ej: no hay historial de migraciones),
# hace db push y marca la migración como aplicada para que futuros deploys usen migrate deploy
CMD ["sh", "-c", "(npx prisma migrate deploy 2>/dev/null || (npx prisma db push --accept-data-loss && npx prisma migrate resolve --applied 20260529160125_reunion2_schema_v2)) && npx prisma db seed && npm start"]