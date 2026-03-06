// =============================================================================
// models/IDCard.js — Mongoose Schema for ID Card Records
// =============================================================================
// A Mongoose "schema" defines the SHAPE of documents stored in MongoDB.
// Think of it as a blueprint — every ID card saved to the database will
// have exactly these fields with these data types.
//
// MongoDB is a NoSQL database — it stores documents as JSON-like objects.
// Mongoose adds structure (schemas) on top of MongoDB's flexibility.
// =============================================================================

const mongoose = require("mongoose");

// Define the schema — what fields each ID card document will have
const idCardSchema = new mongoose.Schema({
    // The person's full name extracted from their resume
    name: {
        type: String,
        required: true, // This field MUST be provided when saving
        trim: true, // Automatically remove leading/trailing whitespace
    },

    // Their professional domain or role (e.g., "Full Stack Developer")
    domain: {
        type: String,
        default: "Not specified", // Default value if extraction fails
        trim: true,
    },

    // Array of technical skills (e.g., ["React", "Node.js", "Docker"])
    // In MongoDB, arrays are first-class citizens — no join tables needed!
    skills: {
        type: [String], // Array of strings
        default: [], // Empty array if no skills found
    },

    // Email extracted from resume
    email: {
        type: String,
        default: "",
        trim: true,
    },

    // Location / city extracted from resume
    location: {
        type: String,
        default: "",
        trim: true,
    },

    // College or university extracted from resume
    college: {
        type: String,
        default: "",
        trim: true,
    },

    // URL to the profile photo (either uploaded or a generated placeholder)
    photoUrl: {
        type: String,
        default: "", // Empty string if no photo
    },

    // Public URL where the resume PDF can be accessed/downloaded
    // This is what the QR code links to
    resumeUrl: {
        type: String,
        required: true,
    },

    // Base64-encoded QR code image (data URI format)
    // Stored as a string like "data:image/png;base64,iVBOR..."
    // Can be used directly in an <img src="..."> tag
    qrCode: {
        type: String,
        required: true,
    },

    // Original filename of the uploaded resume (for reference)
    resumeFilename: {
        type: String,
        required: true,
    },

    // Timestamp when the card was created
    // Date.now is a function reference — Mongoose calls it when creating a document
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Create a Mongoose "model" from the schema
// A model is a constructor function that creates and queries documents
// "IDCard" → MongoDB will create a collection called "idcards" (lowercase + plural)
const IDCard = mongoose.model("IDCard", idCardSchema);

// Export the model so controllers can use it to save/query documents
module.exports = IDCard;
