// =============================================================================
// routes/resume.js — API Route Definitions
// =============================================================================
// This file defines the URL endpoints (routes) that the frontend can call.
// Routes act as a "table of contents" — they map URLs to controller functions.
//
// Think of it this way:
//   - Routes say WHAT URL to respond to
//   - Controllers say HOW to respond (the actual logic)
//
// WHY SEPARATE ROUTES FROM CONTROLLERS?
//   It keeps code organized. If you want to add a new endpoint, you add one
//   line here and one function in the controller. Each file has a single job.
// =============================================================================

const express = require("express");

// Create a new Router instance — this is like a mini Express app for just routes
const router = express.Router();

// Import the controller functions that contain the actual business logic
const {
    uploadResume,
    getCardById,
    getResumeFile,
} = require("../controllers/resumeController");

// =============================================================================
// Route Definitions
// =============================================================================

// POST /api/upload-resume
// Purpose: Accept a PDF resume (and optional photo), extract data, generate ID card
// The actual file upload handling (multer) is set up inside the controller
router.post("/upload-resume", uploadResume);

// GET /api/id/:id
// Purpose: Fetch a previously generated ID card by its MongoDB document ID
// The ":id" is a URL parameter — e.g., /api/id/abc123 → req.params.id = "abc123"
router.get("/id/:id", getCardById);

// GET /api/resume/:filename
// Purpose: Serve a specific uploaded resume PDF file for download
// Example: /api/resume/resume-1234567890.pdf
router.get("/resume/:filename", getResumeFile);

// Export the router so server.js can mount it under /api
module.exports = router;
