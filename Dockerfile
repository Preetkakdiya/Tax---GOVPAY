# Stage 1: Build the React Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy package configurations and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy the frontend source code and compile
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Node.js Backend & Construct the Final Minimal Container
FROM node:18-alpine AS final

# Create a non-root group and user for zero-vulnerability security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app/backend

# Copy the backend package.json and only install production dependencies to minimize image size and attack surface
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy the backend source files
COPY backend/ ./

# Copy the compiled static React build from Stage 1 into the backend's "public" folder
COPY --from=frontend-builder /app/frontend/dist ./public

# Ensure the non-root user specifically owns the application directory
RUN chown -R appuser:appgroup /app/backend

# Switch to the non-root execution user
USER appuser

# Expose the API and UI internal serving port
EXPOSE 5000

# Harden production variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the unified unified production server
CMD ["node", "index.js"]
