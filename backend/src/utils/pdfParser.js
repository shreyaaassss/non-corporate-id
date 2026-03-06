// =============================================================================
// utils/pdfParser.js — Extract Text from PDF Files
// =============================================================================
// This utility uses the 'pdf-parse' npm package to read a PDF file and
// extract all the text content from it.
//
// HOW IT WORKS:
//   1. Read the PDF file from disk into a buffer (raw bytes)
//   2. Pass the buffer to pdf-parse, which decodes the PDF format
//   3. Return the extracted plain text string
//
// The extracted text is then passed to fieldExtractor.js to pull out
// structured data (name, skills, domain) using regex patterns.
// =============================================================================

const fs = require("fs"); // Node.js file system module — for reading files
const pdfParse = require("pdf-parse"); // Third-party PDF text extraction library

/**
 * parsePdf — Extracts all text content from a PDF file
 *
 * @param {string} filePath — Absolute path to the PDF file on disk
 * @returns {Promise<string>} — The extracted plain text from the PDF
 * @throws {Error} — If the file cannot be read or parsed
 *
 * EXAMPLE:
 *   const text = await parsePdf("/app/uploads/resume.pdf");
 *   // text = "John Doe\nSoftware Engineer\nSkills: React, Node.js..."
 */
const parsePdf = async (filePath) => {
    try {
        // Step 1: Read the PDF file as a buffer (raw binary data)
        // readFileSync = synchronous read (blocks until file is fully read)
        // We use sync here because the file is small and already on disk
        const fileBuffer = fs.readFileSync(filePath);

        // Step 2: Parse the buffer using pdf-parse
        // This decodes the PDF format and extracts text from all pages
        const pdfData = await pdfParse(fileBuffer);

        // Step 3: Return the extracted text
        // pdfData.text contains all text from all pages, separated by newlines
        // We trim whitespace from the start and end for cleaner output
        return pdfData.text.trim();
    } catch (error) {
        // Provide a descriptive error message if something goes wrong
        console.error(`❌ Failed to parse PDF at ${filePath}:`, error.message);
        throw new Error(
            `Could not read the PDF file. Make sure it's a valid PDF document. Details: ${error.message}`
        );
    }
};

// Export the function so other modules can use it
module.exports = { parsePdf };
