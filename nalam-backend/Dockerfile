# ========================================================
# NALAM CLINIC BACKEND - DOCKERFILE FOR RENDER DEPLOYMENT
# ========================================================
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Install dependencies using clean install for reproducible builds
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start Express REST API server
CMD ["node", "server.js"]
