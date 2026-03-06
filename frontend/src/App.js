// =============================================================================
// App.js — Single-Page Resume → ID Card Generator (Vercel Edition)
// =============================================================================
// Everything happens in the browser. No backend server needed.
//
// FLOW:
//   1. User uploads PDF + optional photo
//   2. PDF text extracted in-browser using pdfjs-dist
//   3. Extracted text sent to /api/parse-resume (Vercel serverless function)
//   4. Gemini AI returns structured data (name, skills, domain, etc.)
//   5. QR code generated client-side
//   6. ID card rendered with React state
//   7. User downloads card as PNG
//   8. On refresh → React state cleared → NO DATA PERSISTED
// =============================================================================

import React, { useState, useRef } from "react";
import IDCard from "./components/IDCard";

// ── PDF.js setup ──
// pdfjs-dist extracts text from PDFs entirely in the browser.
// We use the legacy build for maximum compatibility with CRA's webpack.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ── QR Code ──
import QRCode from "qrcode";

function App() {
  // ── State ──
  const [resumeFile, setResumeFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState("");
  const [card, setCard] = useState(null); // null = show upload screen
  const [downloading, setDownloading] = useState(false);

  // Editable fields (for card screen)
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCollege, setEditCollege] = useState("");
  const [editSkills, setEditSkills] = useState("");

  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Decorative barcode pattern
  const barcodePattern = [3, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 2, 1, 4, 3, 1, 2, 1, 1, 4, 2, 3, 1, 1, 2, 1, 3, 1, 2, 4, 1, 3, 1, 2, 3, 1, 1, 2, 4, 1, 2, 3, 1, 1, 2, 1, 4];

  // ═══════════════════════════════════════════════════════════════════
  // FILE HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  const handleResumeDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setResumeFile(file);
      setError("");
    } else {
      setError("Only PDF files are accepted");
    }
  };

  const handleResumeSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setError("");
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      // Create a preview URL for the photo
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // MAIN GENERATION FLOW
  // ═══════════════════════════════════════════════════════════════════

  const handleGenerate = async () => {
    if (!resumeFile) return;
    setLoading(true);
    setError("");

    try {
      // ── Step 1: Extract text from PDF in the browser ──
      setProgress(10);
      setProgressMsg("Reading PDF…");

      const arrayBuffer = await resumeFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n";
      }

      if (fullText.trim().length < 10) {
        throw new Error("Could not extract text from this PDF. It may be a scanned image — try a text-based PDF.");
      }

      setProgress(30);
      setProgressMsg("Analyzing resume with AI…");

      // ── Step 2: Send text to Vercel serverless function for AI analysis ──
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to analyze resume");
      }

      const extracted = await response.json();

      setProgress(70);
      setProgressMsg("Generating QR code…");

      // ── Step 3: Generate QR code client-side ──
      // Since there's no hosted resume URL, we encode a vCard-style text
      const qrText = [
        extracted.name,
        extracted.domain,
        extracted.email,
        extracted.location,
      ]
        .filter(Boolean)
        .join(" | ");

      const qrCode = await QRCode.toDataURL(qrText || "DevID Card", {
        width: 300,
        margin: 3,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#ffffff" },
      });

      setProgress(90);
      setProgressMsg("Building ID card…");

      // ── Step 4: Build the card object ──
      const cardData = {
        name: extracted.name || "Not specified",
        domain: extracted.domain || "Not specified",
        skills: extracted.skills || ["General"],
        email: extracted.email || "",
        location: extracted.location || "",
        college: extracted.college || "",
        photoUrl: photoPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(extracted.name)}&backgroundColor=c8f400`,
        qrCode: qrCode,
      };

      setCard(cardData);

      // Populate edit fields
      const nameParts = (cardData.name || "").trim().split(/\s+/);
      setEditFirst(nameParts[0] || "");
      setEditLast(nameParts.slice(1).join(" ") || "");
      setEditRole(cardData.domain || "");
      setEditEmail(cardData.email || "");
      setEditLocation(cardData.location || "");
      setEditCollege(cardData.college || "");
      setEditSkills((cardData.skills || []).join(", "));

      setProgress(100);
      setProgressMsg("Done!");

      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // EDIT + DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════

  const applyEdits = () => {
    if (!card) return;
    setCard({
      ...card,
      name: `${editFirst} ${editLast}`.trim(),
      domain: editRole,
      email: editEmail,
      location: editLocation,
      college: editCollege,
      skills: editSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") applyEdits();
  };

  const goBack = () => {
    // Clear everything — fresh start
    setCard(null);
    setResumeFile(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setError("");
    setProgress(0);
    setProgressMsg("");
  };

  // ═══════════════════════════════════════════════════════════════════
  // DOWNLOAD AS PNG (same clean export pipeline from original)
  // ═══════════════════════════════════════════════════════════════════

  const downloadCard = async () => {
    // Dynamic import — html2canvas is only needed here
    const html2canvas = (await import("html2canvas")).default;
    const cardEl = document.getElementById("the-card");
    if (!cardEl) return;

    setDownloading(true);
    let exportContainer = null;

    try {
      exportContainer = document.createElement("div");
      exportContainer.id = "export-container";
      Object.assign(exportContainer.style, {
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "340px",
        zIndex: "-1",
        opacity: "1",
        filter: "none",
        transform: "none",
        backdropFilter: "none",
        mixBlendMode: "normal",
        background: "#f0ede7",
        overflow: "visible",
        pointerEvents: "none",
      });
      document.body.appendChild(exportContainer);

      const clone = cardEl.cloneNode(true);
      clone.removeAttribute("id");

      const overrideStyle = document.createElement("style");
      overrideStyle.textContent = `
                #export-container * {
                    opacity: 1 !important;
                    filter: none !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    mix-blend-mode: normal !important;
                    animation: none !important;
                    transition: none !important;
                }
                #export-container *::before,
                #export-container *::after {
                    display: none !important;
                    content: none !important;
                }
            `;
      document.head.appendChild(overrideStyle);

      Object.assign(clone.style, {
        background: "#f0ede7",
        boxShadow: "none",
        opacity: "1",
        filter: "none",
        animation: "none",
        transform: "none",
        borderRadius: "20px",
        overflow: "hidden",
      });

      const photoWrap = clone.querySelector(".c-photo-wrap");
      if (photoWrap) {
        Object.assign(photoWrap.style, {
          background: "#c8f400",
          mixBlendMode: "normal",
          filter: "none",
        });
      }
      const photoImg = clone.querySelector(".c-photo-wrap img");
      if (photoImg) {
        Object.assign(photoImg.style, {
          mixBlendMode: "normal",
          opacity: "1",
          filter: "none",
        });
      }

      const logoMarks = clone.querySelectorAll(".c-logo-mark");
      logoMarks.forEach((el) => {
        Object.assign(el.style, {
          clipPath: "none",
          WebkitClipPath: "none",
          borderRadius: "3px",
          background: "#0d0d0d",
        });
      });

      const arrows = clone.querySelectorAll(".c-arrow");
      arrows.forEach((el) => {
        Object.assign(el.style, { opacity: "1", filter: "none" });
      });

      const qrBox = clone.querySelector(".c-qr-box");
      if (qrBox) {
        Object.assign(qrBox.style, {
          background: "#ffffff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        });
      }

      clone.querySelectorAll(".c-chip").forEach((el) => {
        el.style.opacity = "1";
      });

      const allElements = clone.querySelectorAll("*");
      allElements.forEach((el) => {
        const cs = window.getComputedStyle(el);
        if (cs.mixBlendMode !== "normal") el.style.mixBlendMode = "normal";
        if (cs.filter !== "none") el.style.filter = "none";
        if (cs.backdropFilter && cs.backdropFilter !== "none")
          el.style.backdropFilter = "none";
        if (parseFloat(cs.opacity) < 1) el.style.opacity = "1";
      });

      exportContainer.appendChild(clone);

      const images = clone.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve();
              } else {
                img.onload = resolve;
                img.onerror = resolve;
              }
            })
        )
      );

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((r) => setTimeout(r, 200));

      const canvas = await html2canvas(clone, {
        scale: 3,
        backgroundColor: "#f0ede7",
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000,
        windowWidth: 340,
        windowHeight: clone.scrollHeight,
      });

      const link = document.createElement("a");
      link.download = `${(card?.name || "idcard").replace(/\s+/g, "_")}_IDCard.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      overrideStyle.remove();
      exportContainer.remove();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download card. Please try again.");
    } finally {
      if (exportContainer && exportContainer.parentNode) {
        exportContainer.remove();
      }
      setDownloading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <>
      <style>{`
                /* ══════════════════════════════════════
                   TOP NAV BAR
                ══════════════════════════════════════ */
                .topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 18px 40px;
                    border-bottom: 1px solid #1e1e1e;
                    position: sticky;
                    top: 0;
                    background: #0d0d0d;
                    z-index: 100;
                }
                .logo {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 24px;
                    letter-spacing: 2px;
                    color: #fff;
                    text-decoration: none;
                    cursor: pointer;
                }
                .logo-mark {
                    width: 22px; height: 22px;
                    background: #c8f400;
                    clip-path: polygon(0 0, 65% 0, 100% 35%, 100% 100%, 35% 100%, 0 65%);
                }
                .nav-right { display: flex; align-items: center; gap: 20px; }
                .nav-dot-row { display: flex; gap: 5px; align-items: center; }
                .nav-dot { width: 7px; height: 7px; border-radius: 50%; }
                .nav-tag {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px; letter-spacing: 2px;
                    text-transform: uppercase; color: #888;
                    border: 1px solid #222; border-radius: 20px;
                    padding: 4px 12px;
                }

                /* ══════════════════════════════════════
                   UPLOAD SCREEN
                ══════════════════════════════════════ */
                .upload-screen {
                    min-height: calc(100vh - 65px);
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    padding: 60px 20px; position: relative;
                }
                .bg-barcode {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    height: 80px; display: flex; align-items: flex-end;
                    gap: 3px; padding: 0 40px; opacity: 0.04;
                    pointer-events: none; overflow: hidden;
                }
                .corner-accent {
                    position: absolute; top: 30px; right: 30px;
                    width: 50px; height: 50px;
                    border-top: 2px solid #c8f400;
                    border-right: 2px solid #c8f400; opacity: 0.3;
                }
                .corner-accent.bl {
                    top: auto; right: auto; bottom: 100px; left: 30px;
                    border-top: none; border-right: none;
                    border-bottom: 2px solid #c8f400;
                    border-left: 2px solid #c8f400;
                }
                .hero-label {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px; letter-spacing: 4px;
                    text-transform: uppercase; color: #c8f400;
                    margin-bottom: 18px;
                    display: flex; align-items: center; gap: 10px;
                }
                .hero-label::before, .hero-label::after {
                    content: ''; display: block;
                    width: 24px; height: 1px;
                    background: #c8f400; opacity: 0.5;
                }
                .hero-title {
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: clamp(64px, 10vw, 110px);
                    letter-spacing: 3px; line-height: 0.88;
                    text-align: center; color: #fff; margin-bottom: 6px;
                }
                .hero-title .accent { color: #c8f400; }
                .hero-sub {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 12px; color: #888; letter-spacing: 0.5px;
                    text-align: center; max-width: 400px;
                    line-height: 1.8; margin-top: 16px; margin-bottom: 52px;
                }
                .upload-panel {
                    width: 100%; max-width: 520px;
                    background: #111; border: 1px solid #222;
                    border-radius: 20px; padding: 30px;
                    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
                    position: relative;
                }
                .panel-header {
                    display: flex; align-items: center;
                    justify-content: space-between;
                    margin-bottom: 22px; padding-bottom: 16px;
                    border-bottom: 1px solid #1e1e1e;
                }
                .panel-header-left {
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 18px; letter-spacing: 2px; color: #fff;
                }
                .panel-status {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px; letter-spacing: 1.5px;
                    text-transform: uppercase; color: #555;
                    display: flex; align-items: center; gap: 6px;
                }
                .status-dot {
                    width: 6px; height: 6px; border-radius: 50%;
                    background: #c8f400;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                .drop-zone {
                    border: 2px dashed #2a2a2a; border-radius: 14px;
                    padding: 44px 24px; text-align: center;
                    cursor: pointer; transition: all 0.25s;
                    background: #0d0d0d; position: relative; overflow: hidden;
                }
                .drop-zone::before {
                    content: ''; position: absolute; inset: 0;
                    background: #c8f400; opacity: 0; transition: opacity 0.25s;
                }
                .drop-zone:hover::before,
                .drop-zone.drag-over::before { opacity: 0.04; }
                .drop-zone:hover,
                .drop-zone.drag-over {
                    border-color: #c8f400; transform: scale(1.01);
                }
                .drop-zone.has-file {
                    border-color: #c8f400; border-style: solid;
                }
                .drop-icon {
                    margin: 0 auto 14px;
                    width: 48px; height: 56px;
                    position: relative; z-index: 1;
                }
                .drop-title {
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 22px; letter-spacing: 2px; color: #fff;
                    margin-bottom: 6px; position: relative; z-index: 1;
                }
                .drop-sub {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px; color: #555; letter-spacing: 1px;
                    position: relative; z-index: 1;
                }
                .file-tag {
                    display: none; align-items: center; gap: 8px;
                    margin-top: 14px;
                    background: rgba(200,244,0,0.07);
                    border: 1px solid rgba(200,244,0,0.2);
                    border-radius: 8px; padding: 10px 14px;
                    position: relative; z-index: 1;
                }
                .file-tag.show { display: flex; }
                .file-tag-name {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px; color: #c8f400;
                    overflow: hidden; text-overflow: ellipsis;
                    white-space: nowrap; flex: 1;
                }
                .panel-divider {
                    display: flex; align-items: center;
                    gap: 12px; margin: 20px 0;
                }
                .panel-divider::before, .panel-divider::after {
                    content: ''; flex: 1; height: 1px; background: #1e1e1e;
                }
                .panel-divider span {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px; letter-spacing: 2px;
                    color: #333; text-transform: uppercase;
                }
                .photo-selector {
                    display: flex; align-items: center; gap: 12px;
                    background: #0d0d0d; border: 1px solid #222;
                    border-radius: 12px; padding: 13px 16px;
                    cursor: pointer; transition: all 0.2s;
                }
                .photo-selector:hover {
                    border-color: #444; background: #151515;
                }
                .photo-selector.chosen {
                    border-color: #c8f400;
                    background: rgba(200,244,0,0.05);
                }
                .photo-icon-box {
                    width: 32px; height: 32px;
                    background: #1a1a1a; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 16px; flex-shrink: 0; transition: background 0.2s;
                }
                .photo-selector.chosen .photo-icon-box {
                    background: rgba(200,244,0,0.1);
                }
                .photo-info { flex: 1; }
                .photo-label-text {
                    font-size: 13px; font-weight: 700;
                    color: #eee; margin-bottom: 2px;
                }
                .photo-sub-text {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px; color: #555; letter-spacing: 0.5px;
                }
                .photo-selector.chosen .photo-label-text { color: #c8f400; }
                .photo-chevron { color: #444; flex-shrink: 0; }
                .gen-btn {
                    width: 100%; margin-top: 22px;
                    background: #c8f400; border: none;
                    border-radius: 12px; padding: 16px;
                    color: #0d0d0d;
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 20px; letter-spacing: 3px;
                    cursor: pointer; transition: all 0.2s;
                    display: flex; align-items: center;
                    justify-content: center; gap: 10px;
                    box-shadow: 0 8px 30px rgba(200,244,0,0.2);
                }
                .gen-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 14px 40px rgba(200,244,0,0.35);
                }
                .gen-btn:disabled {
                    opacity: 0.35; cursor: not-allowed; transform: none;
                }
                .progress-wrap { margin-top: 14px; }
                .progress-track {
                    background: #1a1a1a; border-radius: 6px;
                    height: 5px; overflow: hidden;
                }
                .progress-fill {
                    height: 100%; background: #c8f400;
                    border-radius: 6px; transition: width 0.35s ease;
                }
                .progress-msg {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px; color: #555;
                    margin-top: 8px; letter-spacing: 0.5px;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .spinner {
                    width: 14px; height: 14px;
                    border: 2px solid rgba(0,0,0,0.2);
                    border-top-color: #0d0d0d;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    display: inline-block;
                }
                .upload-error {
                    margin-top: 12px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px; color: #ff5f5f; letter-spacing: 0.5px;
                }
                .tech-strip {
                    margin-top: 48px; display: flex;
                    align-items: center; gap: 6px;
                    flex-wrap: wrap; justify-content: center;
                }
                .tech-label {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px; color: #333;
                    letter-spacing: 1px; margin-right: 8px;
                }
                .tech-chip {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px; color: #444;
                    border: 1px solid #1e1e1e; border-radius: 20px;
                    padding: 4px 12px; letter-spacing: 0.5px;
                    transition: all 0.2s;
                }
                .tech-chip:hover { border-color: #c8f400; color: #c8f400; }
                .privacy-note {
                    margin-top: 20px; padding: 12px 18px;
                    background: rgba(200,244,0,0.04);
                    border: 1px solid rgba(200,244,0,0.1);
                    border-radius: 10px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9px; color: #666;
                    letter-spacing: 0.3px; text-align: center;
                    line-height: 1.8; max-width: 520px;
                }
                .privacy-note strong { color: #c8f400; }
                input[type="file"] { display: none; }

                /* ══════════════════════════════════════
                   CARD SCREEN
                ══════════════════════════════════════ */
                .card-screen {
                    min-height: calc(100vh - 65px);
                    display: flex; flex-direction: column;
                    align-items: center;
                    padding: 50px 20px 80px;
                    animation: screenIn 0.6s ease both;
                }
                @keyframes screenIn {
                    from { opacity: 0; transform: translateY(50px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .card-screen-title { text-align: center; margin-bottom: 50px; }
                .card-screen-title h2 {
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 52px; letter-spacing: 3px; color: #fff;
                }
                .card-screen-title h2 span { color: #c8f400; }
                .card-screen-title p {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px; color: #555;
                    letter-spacing: 2px; text-transform: uppercase;
                    margin-top: 8px;
                }
                .card-layout {
                    display: flex; gap: 36px;
                    align-items: flex-start; justify-content: center;
                    flex-wrap: wrap; width: 100%; max-width: 800px;
                }
                .controls {
                    width: 280px; display: flex;
                    flex-direction: column; gap: 14px;
                }
                .ctrl-box {
                    background: #111; border: 1px solid #1e1e1e;
                    border-radius: 16px; padding: 20px;
                }
                .ctrl-box h3 {
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 15px; letter-spacing: 2.5px; color: #c8f400;
                    margin-bottom: 14px;
                    display: flex; align-items: center; gap: 8px;
                }
                .ctrl-field { margin-bottom: 9px; }
                .ctrl-field label {
                    display: block;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 8px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 1.5px;
                    color: #444; margin-bottom: 4px;
                }
                .ctrl-field input, .ctrl-field textarea {
                    width: 100%; background: #0d0d0d;
                    border: 1px solid #222; border-radius: 8px;
                    padding: 8px 11px; color: #ddd;
                    font-family: 'Syne', sans-serif; font-size: 12px;
                    outline: none; transition: border-color 0.2s;
                }
                .ctrl-field textarea {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px; resize: vertical; min-height: 60px;
                }
                .ctrl-field input:focus, .ctrl-field textarea:focus {
                    border-color: #c8f400;
                }
                .ctrl-field input::placeholder, .ctrl-field textarea::placeholder {
                    color: #2a2a2a;
                }
                .apply-btn {
                    width: 100%; background: #c8f400; border: none;
                    border-radius: 10px; padding: 10px; color: #0d0d0d;
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 16px; letter-spacing: 2px;
                    cursor: pointer; transition: all 0.2s;
                }
                .apply-btn:hover { opacity: 0.88; transform: scale(0.99); }
                .back-btn {
                    width: 100%; background: transparent;
                    border: 1px solid #222; border-radius: 10px;
                    padding: 10px; color: #888;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px; letter-spacing: 1.5px;
                    cursor: pointer; transition: all 0.2s;
                    text-transform: uppercase;
                }
                .back-btn:hover { border-color: #444; color: #eee; }
                .download-btn {
                    width: 100%; background: #c8f400; border: none;
                    border-radius: 10px; padding: 12px; color: #0d0d0d;
                    font-family: 'Bebas Neue', sans-serif;
                    font-size: 16px; letter-spacing: 2px;
                    cursor: pointer; transition: all 0.2s;
                    display: flex; align-items: center;
                    justify-content: center; gap: 8px;
                    box-shadow: 0 6px 20px rgba(200,244,0,0.2);
                }
                .download-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 30px rgba(200,244,0,0.3);
                }
                .download-btn:disabled { opacity: 0.6; cursor: wait; }
                .download-hint {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 8px; color: #444; letter-spacing: 1px;
                    text-align: center; margin-top: 8px;
                    text-transform: uppercase;
                }
                @keyframes dlSpin { to { transform: rotate(360deg); } }
                .dl-spinner {
                    width: 14px; height: 14px;
                    border: 2px solid rgba(0,0,0,0.2);
                    border-top-color: #0d0d0d;
                    border-radius: 50%;
                    animation: dlSpin 0.6s linear infinite;
                    display: inline-block;
                }
                @media print {
                    .controls, .card-screen-title, .topbar, .back-btn, body::after {
                        display: none !important;
                    }
                    .card-screen { padding: 0; min-height: auto; }
                    body { background: white !important; }
                }
            `}</style>

      {/* ── TOP NAV BAR ── */}
      <nav className="topbar">
        <div className="logo" onClick={goBack}>
          <div className="logo-mark"></div>
          DevID
        </div>
        <div className="nav-right">
          <div className="nav-tag">v2.0 · vercel</div>
          <div className="nav-dot-row">
            <div className="nav-dot" style={{ background: "#c8f400" }}></div>
            <div className="nav-dot" style={{ background: "#333" }}></div>
            <div className="nav-dot" style={{ background: "#222" }}></div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════ */}
      {/*  UPLOAD SCREEN (when card is null)            */}
      {/* ══════════════════════════════════════════════ */}
      {!card && (
        <div className="upload-screen" id="upload-screen">
          <div className="corner-accent"></div>
          <div className="corner-accent bl"></div>

          <div className="bg-barcode">
            {barcodePattern.map((h, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  width: i % 2 === 0 ? `${Math.max(2, h)}px` : "4px",
                  height: i % 2 === 0 ? `${30 + h * 8}px` : "0",
                  background: "#fff",
                  borderRadius: "1px",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          <div className="hero-label">Digital Identity System</div>
          <div className="hero-title">
            RESUME<br />
            <span className="accent">→ ID</span> CARD
          </div>
          <p className="hero-sub">
            Drop your PDF resume. We extract your data,<br />
            generate a styled ID card + QR code. Instantly.
          </p>

          <div className="upload-panel">
            <div className="panel-header">
              <div className="panel-header-left">UPLOAD RESUME</div>
              <div className="panel-status">
                <div className="status-dot"></div>
                System Ready
              </div>
            </div>

            <div
              className={`drop-zone${dragOver ? " drag-over" : ""}${resumeFile ? " has-file" : ""}`}
              id="drop-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleResumeDrop}
            >
              <div className="drop-icon">
                <svg viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="56">
                  <rect x="4" y="2" width="32" height="44" rx="3" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1.5" />
                  <rect x="8" y="8" width="14" height="1.5" rx="0.75" fill="#333" />
                  <rect x="8" y="12" width="20" height="1.5" rx="0.75" fill="#2a2a2a" />
                  <rect x="8" y="16" width="18" height="1.5" rx="0.75" fill="#2a2a2a" />
                  <rect x="8" y="20" width="22" height="1.5" rx="0.75" fill="#2a2a2a" />
                  <path d="M30 36 L40 36 L40 50 L24 50 L24 36 L30 36 Z" fill="#c8f400" opacity="0.9" />
                  <path d="M30 36 L30 30 L40 36 Z" fill="#a0c300" />
                  <path d="M30 42 L34 42 M30 45 L38 45 M30 48 L36 48" stroke="#0d0d0d" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="drop-title">DROP YOUR RESUME HERE</div>
              <div className="drop-sub">click to browse • PDF files only</div>

              {resumeFile && (
                <div className="file-tag show">
                  <span>📄</span>
                  <span className="file-tag-name">{resumeFile.name}</span>
                  <span style={{ color: "#c8f400", fontSize: "12px" }}>✓</span>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} accept=".pdf" onChange={handleResumeSelect} />

            <div className="panel-divider"><span>Optional</span></div>

            <div
              className={`photo-selector${photoFile ? " chosen" : ""}`}
              onClick={() => photoInputRef.current?.click()}
            >
              <div className="photo-icon-box">{photoFile ? "✓" : "🖼"}</div>
              <div className="photo-info">
                <div className="photo-label-text">
                  {photoFile ? photoFile.name : "Profile Photo"}
                </div>
                <div className="photo-sub-text">JPG, PNG — will appear on card</div>
              </div>
              <svg className="photo-chevron" width="14" height="14" fill="none" stroke="#444" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
            <input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoSelect} />

            <button
              className="gen-btn"
              disabled={!resumeFile || loading}
              onClick={handleGenerate}
              id="gen-btn"
            >
              {loading ? <span className="spinner"></span> : "✦ GENERATE MY ID CARD"}
            </button>

            {loading && (
              <div className="progress-wrap">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="progress-msg">{progressMsg}</div>
              </div>
            )}

            {error && <div className="upload-error">✗ {error}</div>}
          </div>

          {/* Privacy note */}
          <div className="privacy-note">
            🔒 <strong>Your data stays private.</strong> Resume text is processed
            once and never stored. Refreshing the page clears everything.
          </div>

          <div className="tech-strip">
            <span className="tech-label">Powered by</span>
            <span className="tech-chip">React</span>
            <span className="tech-chip">Vercel</span>
            <span className="tech-chip">Groq AI</span>
            <span className="tech-chip">PDF.js</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  CARD SCREEN (when card is not null)          */}
      {/* ══════════════════════════════════════════════ */}
      {card && (
        <div className="card-screen">
          <div className="card-screen-title">
            <h2>YOUR <span>ID CARD</span></h2>
            <p>Generated from resume · Edit fields below</p>
          </div>

          <div className="card-layout">
            <IDCard card={card} />

            <div className="controls">
              <div className="ctrl-box">
                <h3>✦ Edit Card</h3>
                <div className="ctrl-field">
                  <label>First Name</label>
                  <input type="text" value={editFirst} onChange={(e) => setEditFirst(e.target.value)} onKeyDown={handleKeyDown} placeholder="First name" />
                </div>
                <div className="ctrl-field">
                  <label>Last Name</label>
                  <input type="text" value={editLast} onChange={(e) => setEditLast(e.target.value)} onKeyDown={handleKeyDown} placeholder="Last name" />
                </div>
                <div className="ctrl-field">
                  <label>Role / Domain</label>
                  <input type="text" value={editRole} onChange={(e) => setEditRole(e.target.value)} onKeyDown={handleKeyDown} placeholder="Cloud & DevOps" />
                </div>
                <div className="ctrl-field">
                  <label>Email</label>
                  <input type="text" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} onKeyDown={handleKeyDown} placeholder="email@example.com" />
                </div>
                <div className="ctrl-field">
                  <label>Location</label>
                  <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} onKeyDown={handleKeyDown} placeholder="City, Country" />
                </div>
                <div className="ctrl-field">
                  <label>College / Info</label>
                  <input type="text" value={editCollege} onChange={(e) => setEditCollege(e.target.value)} onKeyDown={handleKeyDown} placeholder="College name" />
                </div>
                <div className="ctrl-field">
                  <label>Skills (comma-separated)</label>
                  <textarea value={editSkills} onChange={(e) => setEditSkills(e.target.value)} onKeyDown={handleKeyDown} placeholder="Docker, AWS, Python…" />
                </div>
                <button className="apply-btn" onClick={applyEdits}>
                  APPLY CHANGES
                </button>
              </div>

              <div className="ctrl-box">
                <h3>⬇ Download</h3>
                <button className="download-btn" onClick={downloadCard} disabled={downloading}>
                  {downloading ? (
                    <><span className="dl-spinner"></span> SAVING...</>
                  ) : (
                    "⬇ DOWNLOAD AS PNG"
                  )}
                </button>
                <p className="download-hint">High-res image · perfect for printing</p>
              </div>

              <button className="back-btn" onClick={goBack}>
                ← Generate New Card
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
