// =============================================================================
// controllers/resumeController.js — Business Logic for All Endpoints
// =============================================================================
// This file contains the ACTUAL LOGIC for each API endpoint.
// When a request hits a route, the route calls the corresponding function here.
//
// Flow for POST /api/upload-resume:
//   1. Multer saves the uploaded files to disk
//   2. pdfParser extracts raw text from the PDF
//   3. fieldExtractor pulls out name, domain, and skills using Gemini AI (with regex fallback)
//   4. qrGenerator creates a QR code pointing to the resume URL
//   5. Everything is saved to MongoDB via the IDCard model
//   6. The complete card data is returned as JSON to the frontend
// =============================================================================

const path = require("path"); // Node utility for file path operations
const fs = require("fs"); // Node file system module — for reading files
const multer = require("multer"); // Middleware for handling file uploads

// Import our custom utility functions
const { parsePdf } = require("../utils/pdfParser");
const { extractFields } = require("../utils/fieldExtractor");
const { generateQR } = require("../utils/qrGenerator");

// Import the Mongoose model for saving to MongoDB
const IDCard = require("../models/IDCard");

// =============================================================================
// Multer Configuration — How and Where to Store Uploaded Files
// =============================================================================
// Multer handles multipart/form-data (the format used for file uploads).
// We use "diskStorage" to save files directly to the uploads/ directory.

const storage = multer.diskStorage({
    // destination: WHERE to save uploaded files
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "..", "..", "uploads");

        // Create the uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // cb = callback(error, destination) — null means no error
        cb(null, uploadDir);
    },

    // filename: WHAT to name the saved file
    // We prepend a timestamp to avoid filename collisions
    // Example: 1700000000000-resume.pdf
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

// File filter — only accept PDFs for the resume field and images for the photo
const fileFilter = (req, file, cb) => {
    if (file.fieldname === "resume") {
        // Only allow PDF files for the resume
        if (file.mimetype === "application/pdf") {
            cb(null, true); // Accept the file
        } else {
            cb(new Error("Only PDF files are allowed for resume"), false);
        }
    } else if (file.fieldname === "photo") {
        // Allow common image formats for the profile photo
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed for photo"), false);
        }
    } else {
        cb(null, false); // Reject unexpected fields
    }
};

// Create the multer upload instance with our configuration
// .fields() allows us to accept multiple named file inputs
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
}).fields([
    { name: "resume", maxCount: 1 }, // One PDF file, required
    { name: "photo", maxCount: 1 }, // One image file, optional
]);

// =============================================================================
// Controller: Upload Resume & Generate ID Card
// =============================================================================
// POST /api/upload-resume
// This is the main endpoint — it handles the entire flow from upload to card.

const uploadResume = (req, res) => {
    // Step 1: Use multer to handle the file upload
    upload(req, res, async (err) => {
        try {
            // --- Handle multer errors (file too large, wrong type, etc.) ---
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    error: `Upload error: ${err.message}`,
                    hint: "Make sure your PDF is under 10MB",
                });
            }
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            // --- Check that a resume file was actually uploaded ---
            if (!req.files || !req.files.resume || req.files.resume.length === 0) {
                return res.status(400).json({
                    error: "No resume PDF uploaded",
                    hint: "Please select a PDF file to upload",
                });
            }

            // --- Get references to the uploaded files ---
            const resumeFile = req.files.resume[0]; // The uploaded PDF
            const photoFile = req.files.photo ? req.files.photo[0] : null; // Optional photo

            console.log(`📄 Processing resume: ${resumeFile.originalname}`);

            // Step 2: Extract raw text from the PDF using pdf-parse
            const rawText = await parsePdf(resumeFile.path);
            console.log(
                `📝 Extracted ${rawText.length} characters of text from PDF`
            );

            // Step 3: Extract structured fields using Gemini AI (or regex fallback)
            // extractFields is async — it calls Gemini first, falls back to regex
            const { name, domain, skills, email, location, college } = await extractFields(rawText);
            console.log(`👤 Extracted — Name: ${name}, Domain: ${domain}`);
            console.log(`🛠️  Skills found: ${skills.join(", ")}`);
            console.log(`📧 Email: ${email || 'N/A'}, 📍 Location: ${location || 'N/A'}`);

            // Step 4: Build the public URL where the resume can be accessed
            // Use relative path for storage, but full URL for QR code
            const resumeUrl = `/uploads/${resumeFile.filename}`;
            // QR code needs a full URL so phones can open it
            // Use the request's Host header to dynamically get the current IP/domain
            const fullResumeUrl = `http://${req.get('host')}${resumeUrl}`;

            // Step 5: Generate a QR code image (as base64 data URI) pointing to the resume
            const qrCode = await generateQR(fullResumeUrl);

            // Step 6: Determine the photo URL
            // If a photo was uploaded, build its public URL
            // Otherwise, use a placeholder avatar (DiceBear generates avatars from names)
            const photoUrl = photoFile
                ? `/uploads/${photoFile.filename}`
                : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

            // Step 7: Save everything to MongoDB using our IDCard model
            const idCard = new IDCard({
                name,
                domain,
                skills,
                email,
                location,
                college,
                photoUrl,
                resumeUrl,
                qrCode,
                resumeFilename: resumeFile.filename,
            });

            const savedCard = await idCard.save();
            console.log(`💾 ID Card saved to MongoDB with ID: ${savedCard._id}`);

            // Step 8: Return the complete card data as JSON to the frontend
            res.status(201).json({
                message: "ID Card generated successfully!",
                card: {
                    cardId: savedCard._id, // MongoDB document ID — used to fetch later
                    name: savedCard.name,
                    domain: savedCard.domain,
                    skills: savedCard.skills,
                    email: savedCard.email,
                    location: savedCard.location,
                    college: savedCard.college,
                    photoUrl: savedCard.photoUrl,
                    resumeUrl: savedCard.resumeUrl,
                    qrCode: savedCard.qrCode, // Base64 QR code image
                },
            });
        } catch (error) {
            // --- Catch any unexpected errors and return a helpful message ---
            console.error("❌ Error processing resume:", error.message);
            res.status(500).json({
                error: "Failed to process resume",
                details: error.message,
                hint: "Make sure you uploaded a valid PDF file",
            });
        }
    });
};

// =============================================================================
// Controller: Get ID Card by MongoDB ID
// =============================================================================
// GET /api/id/:id
// Fetches a previously generated card from the database

const getCardById = async (req, res) => {
    try {
        // req.params.id comes from the URL — e.g., /api/id/abc123
        const card = await IDCard.findById(req.params.id);

        // If no card found with that ID, return 404
        if (!card) {
            return res.status(404).json({
                error: "ID Card not found",
                hint: "Check that the card ID is correct",
            });
        }

        // Return the card data
        res.json({ card });
    } catch (error) {
        console.error("❌ Error fetching card:", error.message);
        res.status(500).json({
            error: "Failed to fetch ID card",
            details: error.message,
        });
    }
};

// =============================================================================
// Controller: Serve Resume File
// =============================================================================
// GET /api/resume/:filename
// Returns the actual PDF file for download

const getResumeFile = (req, res) => {
    // Build the full path to the requested file
    const filePath = path.join(
        __dirname,
        "..",
        "..",
        "uploads",
        req.params.filename
    );

    // Check if the file exists before trying to send it
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            error: "Resume file not found",
            hint: "The file may have been deleted",
        });
    }

    // Send the file — Express handles setting the correct headers
    res.sendFile(filePath);
};

// =============================================================================
// Export all controller functions so routes/resume.js can use them
// =============================================================================
module.exports = {
    uploadResume,
    getCardById,
    getResumeFile,
};
