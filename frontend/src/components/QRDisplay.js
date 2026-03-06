// =============================================================================
// components/QRDisplay.js — QR Code Image Display
// =============================================================================
// Renders a QR code image from a base64 data URI.
// Supports two modes:
//   - compact={true}  — For inside the ID card (small, no caption)
//   - compact={false} — Standalone display (larger, with caption)
//
// The QR code is generated on the backend with HIGH error correction
// and sufficient margin, making it reliably scannable by mobile phones.
//
// PROPS:
//   qrCode  — Base64 data URI string ("data:image/png;base64,...")
//   compact — (optional) If true, renders smaller without caption
// =============================================================================

import React from "react";

function QRDisplay({ qrCode, compact = false }) {
  return (
    <>
      <style>{`
        /* Standard (non-compact) QR display */
        .qr-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .qr-image {
          width: 130px;
          height: 130px;
          border-radius: 12px;
          background: white;
          padding: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s ease;
        }

        .qr-image:hover {
          transform: scale(1.05);
        }

        .qr-caption {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.3);
          text-align: center;
          font-weight: 400;
          letter-spacing: 0.5px;
        }

        .qr-caption span {
          display: block;
          margin-top: 2px;
          font-size: 0.65rem;
          opacity: 0.7;
        }

        /* Compact mode — fits inside the ID card design */
        .qr-compact {
          display: inline-block;
        }

        .qr-compact .qr-image-compact {
          width: 80px;
          height: 80px;
          border-radius: 4px;
          background: white;
          display: block;
        }
      `}</style>

      {compact ? (
        /* Compact mode — small QR code for inside the card */
        <div className="qr-compact" id="qr-display">
          <img
            src={qrCode}
            alt="QR Code — scan to view resume"
            className="qr-image-compact"
            id="qr-image"
          />
        </div>
      ) : (
        /* Full mode — larger QR code with caption (used on standalone pages) */
        <div className="qr-display" id="qr-display">
          <img
            src={qrCode}
            alt="QR Code — scan to view resume"
            className="qr-image"
            id="qr-image"
          />
          <p className="qr-caption">
            📱 Scan to view resume
            <span>or share this card's URL</span>
          </p>
        </div>
      )}
    </>
  );
}

export default QRDisplay;
