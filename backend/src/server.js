// =============================================================================
// server.js — Backend Entry Point
// =============================================================================
// This is the FIRST file that runs when the backend container starts.
// It does four things:
//   1. Connects to MongoDB
//   2. Sets up middleware (CORS, JSON parsing, static file serving)
//   3. Mounts API routes
//   4. Starts listening for HTTP requests on the configured port
// =============================================================================

// --- Load environment variables from .env file into process.env ---
// This must be called BEFORE accessing any process.env values
const dotenv = require("dotenv");
dotenv.config();

// --- Import required packages ---
const express = require("express"); // Web framework for handling HTTP requests
const mongoose = require("mongoose"); // MongoDB ODM (Object-Document Mapper)
const cors = require("cors"); // Middleware to allow cross-origin requests
const path = require("path"); // Node.js utility for working with file paths

// --- Import our route definitions ---
const resumeRoutes = require("./routes/resume");

// --- Create the Express application instance ---
const app = express();

// --- Read configuration from environment variables ---
// These come from the .env file (locally) or docker-compose (in containers)
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/resumedb";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// =============================================================================
// Middleware Setup
// =============================================================================
// Middleware are functions that run on EVERY request before reaching routes.
// Think of them as a pipeline: Request → Middleware1 → Middleware2 → Route

// CORS (Cross-Origin Resource Sharing):
// The frontend (port 3000) and backend (port 5000) are on different origins.
// Without CORS, the browser would BLOCK frontend requests to the backend.
// This middleware tells the browser "it's okay, allow requests from the frontend."
app.use(
  cors({
    origin: "*", // Allow any origin — IP changes on EC2 restart
    methods: ["GET", "POST"], // Only allow these HTTP methods
  })
);

// JSON Parser:
// Automatically parses incoming JSON request bodies (e.g., from fetch/axios)
// After this, req.body contains the parsed JavaScript object
app.use(express.json());

// Static File Serving:
// Makes the /app/uploads directory accessible via HTTP at /uploads
// Example: A file at /app/uploads/resume.pdf can be accessed at
//          http://localhost:5000/uploads/resume.pdf
// This is how the QR code links to the actual resume file.
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// =============================================================================
// Route Mounting
// =============================================================================
// All routes defined in resume.js will be prefixed with /api
// So a route defined as "/upload-resume" becomes "/api/upload-resume"
app.use("/api", resumeRoutes);

// --- Simple health-check endpoint ---
// Useful for verifying the server is running (visit http://localhost:5000/)
app.get("/", (req, res) => {
  res.json({
    message: "Resume ID Card Generator API is running!",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// MongoDB Connection & Server Start
// =============================================================================
// We connect to MongoDB FIRST, then start the server.
// If MongoDB isn't ready yet, we retry — this handles Docker startup order.

mongoose
  .connect(MONGO_URI)
  .then(() => {
    // MongoDB connected successfully — now start the Express server
    console.log("✅ Connected to MongoDB at:", MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`📁 Static files served from /uploads`);
      console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
    });
  })
  .catch((err) => {
    // If MongoDB connection fails, log the error and exit
    // Docker's restart policy will restart the container automatically
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1); // Exit with error code — Docker will restart the container
  });
