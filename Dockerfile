# ========================================================
# NALAM CLINIC - ROOT DOCKERFILE FOR RENDER
# ========================================================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy backend package files
COPY nalam-backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY nalam-backend/ ./

# Expose port
EXPOSE 5000

CMD ["node", "server.js"]
