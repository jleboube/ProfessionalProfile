# --- Build Stage ---
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --frozen-lockfile

# Copy the rest of the code
COPY . .

# Build the frontend and backend
RUN npm run build

# --- Production Stage ---
FROM node:20-slim AS runner

WORKDIR /app

# Copy only the built output and node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/client ./client

# Create a non-root user
RUN useradd -m appuser
USER appuser

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/index.js"] 