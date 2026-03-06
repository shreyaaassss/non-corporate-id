# =============================================================================
# Frontend Dockerfile — Builds the React application container
# =============================================================================
# Same layered approach as the backend:
#   1. Start from Node.js base image
#   2. Copy package.json and install deps (cached layer)
#   3. Copy source code
#   4. Run the React dev server
#
# NOTE: In production, you'd build the React app and serve it with Nginx.
# For this academic project, we use the dev server for simplicity.
# =============================================================================

# Step 1: Use the same Node.js Alpine base image as the backend
FROM node:18-alpine

# Step 2: Set working directory
WORKDIR /app

# Step 3: Copy package files first (layer caching)
COPY package*.json ./

# Step 4: Install dependencies (this layer is cached if package.json doesn't change)
RUN npm install

# Step 5: Copy the rest of the frontend source code
COPY . .

# Step 6: Expose port 3000 (React dev server default port)
EXPOSE 3000

# Step 7: Start the React development server
# This serves the app and enables hot-reloading for development
CMD ["npm", "start"]
