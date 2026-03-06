# =============================================================================
# Backend Dockerfile — Builds the Express.js API container
# =============================================================================
# This file tells Docker how to create the backend container step-by-step.
#
# KEY CONCEPT — Layer Caching:
#   We copy package.json FIRST and run npm install BEFORE copying source code.
#   Why? Docker caches each step (layer). If only your source code changes,
#   Docker reuses the cached npm install layer — making rebuilds much faster.
# =============================================================================

# Step 1: Start from the official Node.js 18 image (Alpine = small Linux distro)
FROM node:18-alpine

# Step 2: Set the working directory inside the container
# All subsequent commands run relative to /app
WORKDIR /app

# Step 3: Copy ONLY package files first (for layer caching optimization)
COPY package*.json ./

# Step 4: Install all npm dependencies
# This layer is cached and only re-runs if package.json changes
RUN npm install

# Step 5: Copy the rest of the source code into the container
COPY . .

# Step 6: Create the uploads directory inside the container
# This is where uploaded PDFs and photos will be stored
RUN mkdir -p /app/uploads

# Step 7: Tell Docker this container will listen on port 5000
# (This is documentation — the actual port mapping is in docker-compose.yml)
EXPOSE 5000

# Step 8: Define the command to start the server when the container runs
CMD ["node", "src/server.js"]
