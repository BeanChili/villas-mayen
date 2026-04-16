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

# Copy config files
COPY next.config.js tailwind.config.js postcss.config.js tsconfig.json .env* ./

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

EXPOSE 3000

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]