FROM node:20-alpine

# Set to production mode
ENV NODE_ENV=production

# Some libraries (like better-sqlite3) need python/g++ to compile in alpine
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package and lock files to install dependencies
COPY package*.json ./

# Install all dependencies (we need devDependencies to build TypeScript)
RUN npm ci --include=dev

# Copy the rest of the application code
COPY . .

# Build TypeScript
RUN npm run build

# Create necessary directories for local storage and temp files
RUN mkdir -p /app/temp && mkdir -p /app/data

# Ensure persistent database goes to the data folder so it can be mounted if needed
ENV DB_PATH=/app/data/memory.db

# Expose port for health checks (Anti-Sleep)
EXPOSE 8080

# Command to start the application
CMD ["npm", "start"]
