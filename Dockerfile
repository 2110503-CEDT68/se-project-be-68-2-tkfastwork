FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Cloud Run injects PORT at runtime (default 8080)
# The app already reads process.env.PORT so no change needed
EXPOSE 8080

CMD ["node", "server.js"]
