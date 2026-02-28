FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Create runtime directories
RUN mkdir -p data uploads

EXPOSE 3000

CMD ["node", "server.js"]
