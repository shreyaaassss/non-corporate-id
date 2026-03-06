// =============================================================================
// utils/qrGenerator.js — Generate Mobile-Scannable QR Code Images
// =============================================================================
// This utility uses the 'qrcode' npm package to convert a URL into a
// QR code image optimized for MOBILE PHONE SCANNING.
//
// KEY SETTINGS FOR SCANNABILITY:
//   - errorCorrectionLevel: 'H' (High — 30% recovery)
//     → The QR code can still be scanned even if 30% is obscured/damaged
//   - width: 300px — large enough for phone cameras to read easily
//   - margin: 3 — sufficient white border (quiet zone) around the code
//     → Phone cameras need this border to detect where the QR code starts
//   - High contrast (black on white) — maximum readability
//
// The image is returned as a base64 data URI that can be embedded
// directly in an HTML <img src="..."> tag.
// =============================================================================

const QRCode = require("qrcode"); // npm package for QR code generation

/**
 * generateQR — Creates a mobile-scannable QR code image from a URL
 *
 * @param {string} url — The URL to encode in the QR code
 * @returns {Promise<string>} — Base64 data URI of the QR code PNG image
 *
 * EXAMPLE:
 *   const qr = await generateQR("http://localhost:5000/uploads/resume.pdf");
 *   // qr = "data:image/png;base64,iVBOR..." (use in <img src>)
 */
const generateQR = async (url) => {
    try {
        // QRCode.toDataURL converts a string into a base64 PNG image
        //
        // SETTINGS EXPLAINED:
        //   width: 300   → 300x300 pixels — large & clear for phone cameras
        //   margin: 3    → 3-module white "quiet zone" around the QR code
        //                  (phones need this to detect the code boundaries)
        //   errorCorrectionLevel: 'H'
        //                → HIGH error correction — the QR code remains scannable
        //                  even if up to 30% of it is damaged or obscured
        //                → Uses more data modules but much more reliable scanning
        //   color.dark:  → Pure black (#000000) for maximum contrast
        //   color.light: → Pure white (#ffffff) for maximum contrast
        //                → High contrast = easier scanning in varied lighting
        const dataUri = await QRCode.toDataURL(url, {
            width: 300,              // Large size for reliable scanning
            margin: 3,               // Quiet zone — essential for mobile scanners
            errorCorrectionLevel: "H", // High error correction (30% recovery)
            color: {
                dark: "#000000",       // Black modules — maximum contrast
                light: "#ffffff",      // White background — maximum contrast
            },
            type: "image/png",       // PNG format — crisp edges, no JPEG blur
        });

        return dataUri; // Returns "data:image/png;base64,iVBOR..."
    } catch (error) {
        console.error("❌ Failed to generate QR code:", error.message);
        throw new Error(`QR code generation failed: ${error.message}`);
    }
};

module.exports = { generateQR };
