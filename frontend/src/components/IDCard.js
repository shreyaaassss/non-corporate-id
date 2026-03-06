// =============================================================================
// components/IDCard.js — The ID Card (matches resume_idcard_full.html)
// =============================================================================
// Replicates the exact card design from resume_idcard_full.html:
//   - Cream/paper (#f0ede7) background with noise texture
//   - Acid green (#c8f400) accent for photo bg, role tag, highlighted chips
//   - Bebas Neue for names, JetBrains Mono for metadata
//   - Photo with mix-blend-mode: multiply on acid background
//   - QR code section + decorative barcode + barcode ID
//   - Skills as bordered chips (first 2 highlighted)
//   - Email/info line below skills
// =============================================================================

import React, { useEffect, useRef } from "react";

function IDCard({ card }) {
  const { name, domain, skills, photoUrl, qrCode, email, location, college } = card;
  const qrRef = useRef(null);

  // Photo is already a full URL (data URI from FileReader or external avatar URL)
  const resolvedPhotoUrl = photoUrl;

  // Split name into first + last
  const nameParts = (name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "First";
  const lastName = nameParts.slice(1).join(" ") || "Last";

  // Build barcode pattern
  const barcodePattern = [2, 1, 3, 1, 4, 2, 1, 3, 1, 1, 2, 4, 1, 3, 1, 2, 1, 4, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 1, 2, 1, 4, 2, 3, 1];

  // Generate barcode ID
  const barcodeId = `${firstName.substring(0, 2).toUpperCase()}${lastName.substring(0, 2).toUpperCase()}-2025-${Math.floor(Math.random() * 9000 + 1000)}`;

  return (
    <>
      <style>{`
        /* ══════════════════════════════════════
           THE ID CARD — matches resume_idcard_full.html
        ══════════════════════════════════════ */
        .id-card {
          width: 340px;
          background: #f0ede7;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
          box-shadow:
            0 40px 100px rgba(0,0,0,0.8),
            0 0 0 1px rgba(200,244,0,0.15),
            0 0 80px rgba(200,244,0,0.05);
          animation: cardIn 0.9s cubic-bezier(0.22,1,0.36,1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(70px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Paper texture */
        .id-card::before {
          content: '';
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 30;
          border-radius: 20px;
        }

        .c-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 20px 13px;
        }

        .c-logo {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 19px;
          letter-spacing: 1.5px;
          color: #0d0d0d;
        }

        .c-logo-mark {
          width: 18px; height: 18px;
          background: #0d0d0d;
          clip-path: polygon(0 0, 65% 0, 100% 35%, 100% 100%, 35% 100%, 0 65%);
        }

        .c-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
        }

        .c-badge-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7.5px;
          color: #888;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .c-dots { display: flex; gap: 4px; }
        .c-dot { width: 6px; height: 6px; border-radius: 50%; }

        /* Photo */
        .c-photo-wrap {
          position: relative;
          margin: 0 20px;
          border-radius: 12px;
          overflow: hidden;
          height: 280px;
          background: #c8f400;
        }

        .c-photo-wrap img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: top center;
          display: block;
          mix-blend-mode: multiply;
        }

        .c-photo-wrap::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 50px;
          background: linear-gradient(to top, rgba(240,237,231,0.5), transparent);
        }

        /* Card body */
        .c-body { padding: 15px 20px 5px; }

        .c-name-row1 {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .c-first {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 50px;
          line-height: 0.88;
          color: #0d0d0d;
          text-transform: uppercase;
        }

        .c-arrow {
          width: 42px; height: 42px;
          border: 2.5px solid #0d0d0d;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #0d0d0d;
          margin-bottom: 2px;
          flex-shrink: 0;
        }

        .c-name-row2 {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 2px;
        }

        .c-last {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 50px;
          line-height: 0.88;
          color: #0d0d0d;
          text-transform: uppercase;
        }

        .c-role {
          background: #c8f400;
          color: #0d0d0d;
          font-family: 'Syne', sans-serif;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          padding: 5px 10px;
          border-radius: 4px;
          text-transform: uppercase;
          white-space: nowrap;
          max-width: 130px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Skills */
        .c-skills {
          padding: 8px 20px 4px;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .c-chip {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7.5px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          padding: 4px 8px;
          border: 1.5px solid #0d0d0d;
          border-radius: 3px;
          color: #0d0d0d;
        }

        .c-chip.hl {
          background: #0d0d0d;
          color: #c8f400;
        }

        /* Info */
        .c-info {
          padding: 5px 20px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7.5px;
          color: #777;
          letter-spacing: 0.4px;
          line-height: 1.8;
        }

        /* QR section */
        .c-qr-section {
          padding: 8px 20px 4px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .c-qr-box {
          background: #fff;
          border-radius: 6px;
          padding: 5px;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .c-qr-box img {
          width: 72px;
          height: 72px;
          display: block;
        }

        .c-qr-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .c-qr-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #555;
        }

        .c-qr-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          color: #aaa;
          letter-spacing: 0.5px;
        }

        /* Barcode */
        .c-barcode-section {
          padding: 6px 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .c-barcode {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 36px;
        }

        .c-barcode span {
          display: inline-block;
          background: #0d0d0d;
          border-radius: 1px;
          flex-shrink: 0;
        }

        .c-barcode-id {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          color: #aaa;
          letter-spacing: 3px;
          text-align: center;
        }

        /* Capture mode — disable things html2canvas can't render */
        .id-card.capturing::before { display: none !important; }
        .id-card.capturing .c-photo-wrap::after { display: none !important; }

        /* Print */
        @media print {
          .id-card {
            box-shadow: none;
            border: 2px solid #ccc;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="id-card" id="the-card">
        {/* Header */}
        <div className="c-header">
          <div className="c-logo">
            <div className="c-logo-mark"></div>
            DevID
          </div>
          <div className="c-header-right">
            <div className="c-badge-text">{location || "India"}</div>
            <div className="c-dots">
              <div className="c-dot" style={{ background: '#c8f400' }}></div>
              <div className="c-dot" style={{ background: '#333' }}></div>
              <div className="c-dot" style={{ background: '#222' }}></div>
            </div>
          </div>
        </div>

        {/* Photo */}
        <div className="c-photo-wrap">
          <img
            src={resolvedPhotoUrl}
            alt={`${name}'s profile`}
            onError={(e) => {
              e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=c8f400`;
            }}
          />
        </div>

        {/* Name + Role */}
        <div className="c-body">
          <div className="c-name-row1">
            <div className="c-first">{firstName}</div>
            <div className="c-arrow">↗</div>
          </div>
          <div className="c-name-row2">
            <div className="c-last">{lastName}</div>
            <div className="c-role">{domain || "Engineer"}</div>
          </div>
        </div>

        {/* Skills */}
        <div className="c-skills">
          {skills.slice(0, 8).map((skill, i) => (
            <div key={i} className={`c-chip${i < 2 ? " hl" : ""}`}>
              {skill}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="c-info">
          {email && <div>{email}</div>}
          {college && <div>{college}</div>}
        </div>

        {/* QR Code */}
        <div className="c-qr-section">
          <div className="c-qr-box" ref={qrRef}>
            <img src={qrCode} alt="QR Code — scan to view resume" />
          </div>
          <div className="c-qr-meta">
            <div className="c-qr-title">Scan to View</div>
            <div className="c-qr-sub">Resume link</div>
          </div>
        </div>

        {/* Barcode */}
        <div className="c-barcode-section">
          <div className="c-barcode">
            {barcodePattern.map((h, i) => {
              const isGap = i % 2 !== 0;
              return (
                <span
                  key={i}
                  style={{
                    width: isGap ? '3px' : `${Math.max(1, h - 1)}px`,
                    height: isGap ? '0' : `${14 + h * 5}px`,
                    background: isGap ? 'transparent' : '#0d0d0d',
                  }}
                />
              );
            })}
          </div>
          <div className="c-barcode-id">{barcodeId}</div>
        </div>
      </div>
    </>
  );
}

export default IDCard;
