import { useState, useEffect, useCallback, useRef } from "react";

// ── EMBEDDED CSS ─────────────────────────────────────────────────────────
const LEAD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700;800&display=swap');

  .lead-portal * { box-sizing: border-box; margin: 0; padding: 0; }

  .lead-portal {
    font-family: 'Inter', sans-serif;
    background: radial-gradient(ellipse at 20% 0%, rgba(13,148,136,0.10) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 100%, rgba(15,23,42,0.9) 0%, transparent 60%),
                #0f172a;
    color: rgba(255,255,255,0.85);
    min-height: 100vh;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  /* ── HEADER ── */
  .lead-portal .lp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 72px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(15,23,42,0.95);
    backdrop-filter: blur(20px);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .lead-portal .lp-header-logo {
    display: flex; align-items: center; gap: 10px;
  }

  .lead-portal .lp-header-mark {
    width: 32px; height: 32px;
    background: linear-gradient(135deg, #0d9488, #14b8a6);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 13px; color: #0f172a;
  }

  .lead-portal .lp-header-brand {
    font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 13px; color: #fff;
  }

  .lead-portal .lp-header-right {
    display: flex; align-items: center; gap: 14px;
  }

  .lead-portal .lp-header-user {
    font-size: 12px; color: #94a3b8;
  }

  .lead-portal .lp-header-out {
    padding: 6px 14px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 50px;
    color: #94a3b8; font-size: 12px;
    font-family: 'Inter', sans-serif;
    cursor: pointer; transition: all 0.3s ease;
  }

  .lead-portal .lp-header-out:hover { background: rgba(255,255,255,0.1); color: #fff; }

  /* ── PAGE WRAP ── */
  .lead-portal .lp-wrap {
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 32px 80px;
  }

  .lead-portal .lp-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
    letter-spacing: -0.02em;
  }

  .lead-portal .lp-subtitle {
    font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 32px;
  }

  /* ── NAV TABS ── */
  .lead-portal .lp-nav {
    display: flex; gap: 6px;
    margin-bottom: 28px;
    background: rgba(15,23,42,0.7);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 50px;
    padding: 5px;
    overflow-x: auto; -webkit-overflow-scrolling: touch;
  }

  .lead-portal .lp-nav-btn {
    flex: 1; padding: 11px 16px;
    background: none; border: none; border-radius: 50px;
    color: #94a3b8; font-family: 'Inter', sans-serif;
    font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.3s ease;
    white-space: nowrap; min-width: 0;
    position: relative;
  }

  .lead-portal .lp-nav-btn:hover { color: #fff; background: rgba(255,255,255,0.04); }
  .lead-portal .lp-nav-btn.active { background: #0d9488; color: #fff; font-weight: 600; }

  /* ── CARDS ── */
  .lead-portal .card {
    background: rgba(15,23,42,0.7);
    border: 1px solid #e2e8f01a;
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 14px;
    transition: all 0.3s ease;
  }

  .lead-portal .card-hover:hover {
    border-color: #99f6e4;
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(13,148,136,0.1);
    cursor: pointer;
  }

  .lead-portal .card-hover::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #0d9488, #14b8a6);
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 16px 16px 0 0;
  }

  .lead-portal .card-hover:hover::before { opacity: 1; }

  /* ── BUTTONS ── */
  .lead-portal .btn-primary {
    width: 100%;
    padding: 13px;
    background: #0d9488;
    border: none;
    border-radius: 50px;
    color: #ffffff;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .lead-portal .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,148,136,0.35); background: #14b8a6; }
  .lead-portal .btn-primary:active { transform: translateY(0); }
  .lead-portal .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  .lead-portal .btn-secondary {
    padding: 8px 16px;
    background: rgba(13,148,136,0.1);
    border: 1px solid rgba(13,148,136,0.25);
    border-radius: 50px;
    color: #0d9488;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .lead-portal .btn-secondary:hover { background: rgba(13,148,136,0.2); color: #14b8a6; }
  .lead-portal .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  .lead-portal .btn-ghost {
    padding: 8px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 50px;
    color: #94a3b8;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .lead-portal .btn-ghost:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* ── FORM FIELDS ── */
  .lead-portal .field-label {
    display: block; font-size: 11px; font-weight: 600; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
  }

  .lead-portal .field-input, .lead-portal select {
    width: 100%; padding: 14px 16px;
    background: rgba(255,255,255,0.05); border: 1px solid #d1d5db33;
    border-radius: 10px; color: #fff; font-size: 14px;
    font-family: 'Inter', sans-serif; outline: none; transition: all 0.3s ease;
  }

  .lead-portal .field-input:focus, .lead-portal select:focus {
    border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.2); background: rgba(13,148,136,0.04);
  }

  /* ── SECTION LABELS ── */
  .lead-portal .section-label {
    font-family: 'Inter', sans-serif;
    font-size: 11px; font-weight: 600;
    color: #0d9488;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
    margin-top: 24px;
  }

  .lead-portal .section-label:first-child { margin-top: 0; }

  /* ── PROGRESS BAR ── */
  .lead-portal .progress-track {
    height: 8px; background: rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden;
  }

  .lead-portal .progress-track.big { height: 12px; border-radius: 8px; }

  .lead-portal .progress-fill {
    height: 100%; background: linear-gradient(90deg, #0d9488, #14b8a6);
    border-radius: 6px; transition: width 0.5s ease;
  }

  /* ── BADGES ── */
  .lead-portal .badge {
    display: inline-block; padding: 3px 12px; border-radius: 50px;
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  }

  .lead-portal .badge-active { background: #f0fdfa; color: #0d9488; }
  .lead-portal .badge-complete { background: rgba(148,163,184,0.15); color: #94a3b8; }
  .lead-portal .badge-alert { background: rgba(250,204,21,0.15); color: #facc15; }

  /* ── STAT CARDS ── */
  .lead-portal .stat-grid {
    display: grid; gap: 12px; margin-bottom: 16px;
  }

  .lead-portal .stat-grid-3 { grid-template-columns: repeat(3, 1fr); }
  .lead-portal .stat-grid-4 { grid-template-columns: repeat(4, 1fr); }

  .lead-portal .stat-card {
    background: rgba(15,23,42,0.7);
    border: 1px solid #e2e8f01a;
    border-radius: 16px;
    padding: 18px 16px;
    text-align: center;
  }

  .lead-portal .stat-label {
    color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
    margin-bottom: 6px;
  }

  .lead-portal .stat-val {
    font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; color: #fff;
  }

  .lead-portal .stat-sub {
    color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 2px;
  }

  .lead-portal .teal { color: #0d9488; }
  .lead-portal .red { color: #f87171; }

  /* ── POSITION CARD ── */
  .lead-portal .pos-card {
    background: rgba(15,23,42,0.7);
    border: 1px solid #e2e8f01a;
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .lead-portal .pos-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #0d9488, #14b8a6);
    opacity: 0; transition: opacity 0.3s ease;
  }

  .lead-portal .pos-card:hover {
    border-color: #99f6e4;
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(13,148,136,0.1);
  }

  .lead-portal .pos-card:hover::before { opacity: 1; }

  /* ── BACK BUTTON ── */
  .lead-portal .back-btn {
    background: none; border: none;
    color: #94a3b8; font-size: 14px;
    font-family: 'Inter', sans-serif;
    cursor: pointer; margin-bottom: 20px;
    display: flex; align-items: center; gap: 6px;
    transition: color 0.3s ease;
  }

  .lead-portal .back-btn:hover { color: #0d9488; }

  /* ── DETAIL PAGE ── */
  .lead-portal .detail-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 28px; padding-bottom: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .lead-portal .detail-title {
    font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; color: #fff; letter-spacing: -0.02em;
  }

  .lead-portal .detail-sub { color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 4px; }

  /* ── TRACKER CARD ── */
  .lead-portal .tracker-card {
    background: rgba(15,23,42,0.7);
    border: 1px solid rgba(13,148,136,0.15);
    border-radius: 16px;
    padding: 36px 32px;
    text-align: center;
    margin-bottom: 16px;
  }

  .lead-portal .tracker-pct {
    font-family: 'Playfair Display', Georgia, serif; font-size: 42px; font-weight: 700;
    color: #0d9488; margin-bottom: 4px; letter-spacing: -0.02em;
  }

  .lead-portal .tracker-pct-sub { color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 20px; }

  /* ── COUNTDOWN ── */
  .lead-portal .countdown-card {
    background: linear-gradient(135deg, rgba(13,148,136,0.08), rgba(13,148,136,0.03));
    border: 1px solid rgba(13,148,136,0.15);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 14px;
  }

  .lead-portal .countdown-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
    text-align: center;
  }

  .lead-portal .countdown-num {
    font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700;
    color: #0d9488;
  }

  .lead-portal .countdown-label {
    color: rgba(255,255,255,0.7); font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.06em; margin-top: 2px;
  }

  /* ── CONTACT STRIP ── */
  .lead-portal .contact-strip {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 16px 20px;
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 20px;
  }

  .lead-portal .contact-strip-text {
    font-size: 13px; color: rgba(255,255,255,0.7);
  }

  .lead-portal .contact-strip-text a {
    color: #0d9488; font-weight: 600; text-decoration: none;
  }

  .lead-portal .contact-strip-text a:hover { text-decoration: underline; }

  /* ── RESOURCES ── */
  .lead-portal .res-group-title {
    font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 700;
    margin-bottom: 12px; margin-top: 24px; color: #fff;
  }

  .lead-portal .res-group-title:first-child { margin-top: 0; }

  .lead-portal .res-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  }

  .lead-portal .res-card {
    background: rgba(15,23,42,0.7);
    border: 1px solid #e2e8f01a;
    border-radius: 16px;
    padding: 20px;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    display: block;
  }

  .lead-portal .res-card:hover {
    border-color: #99f6e4;
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(13,148,136,0.1);
  }

  .lead-portal .res-card-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 8px;
  }

  .lead-portal .res-card-title {
    font-weight: 600; font-size: 14px; line-height: 1.3;
  }

  .lead-portal .res-tag {
    padding: 2px 10px; border-radius: 50px;
    font-size: 10px; font-weight: 600;
    white-space: nowrap; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.05em;
  }

  .lead-portal .res-card-desc {
    font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.5;
  }

  .lead-portal .res-card-link {
    font-size: 12px; color: #0d9488; font-weight: 600;
    margin-top: 10px;
  }

  /* ── MISC ── */
  .lead-portal .spinner {
    width: 28px; height: 28px;
    border: 3px solid rgba(13,148,136,0.2); border-top-color: #0d9488;
    border-radius: 50%; animation: lead-spin 0.8s linear infinite;
    margin: 0 auto;
  }

  @keyframes lead-spin { to { transform: rotate(360deg); } }

  .lead-portal .loading { text-align: center; padding: 48px 20px; color: rgba(255,255,255,0.7); font-size: 14px; }
  .lead-portal .empty { text-align: center; padding: 32px 20px; color: #64748b; font-size: 14px; line-height: 1.6; }
  .lead-portal .empty strong { color: #94a3b8; display: block; margin-bottom: 6px; font-size: 15px; }

  .lead-portal .popup-fallback {
    margin-top: 12px; padding: 12px 16px;
    background: rgba(250,204,21,0.08); border: 1px solid rgba(250,204,21,0.2);
    border-radius: 10px; font-size: 13px; color: #facc15; text-align: center;
  }

  .lead-portal .popup-fallback a { color: #0d9488; font-weight: 600; text-decoration: underline; }

  .lead-portal .divider {
    height: 1px; background: rgba(255,255,255,0.06);
    margin: 16px 0;
  }

  /* ── AVATAR ── */
  .lead-portal .lp-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg, #0d9488, #14b8a6);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif; font-weight: 700; font-size: 12px;
    color: #fff; flex-shrink: 0; letter-spacing: 0.02em;
  }

  .lead-portal .lp-header-name {
    font-size: 12px; color: #94a3b8; font-weight: 500;
  }

  /* ── MAGIC LINK ── */
  .lead-portal .magic-link-area {
    margin-top: 20px; padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.06);
    text-align: center;
  }

  .lead-portal .magic-link-btn {
    background: none; border: none;
    color: #0d9488; font-size: 13px; cursor: pointer;
    font-family: 'Inter', sans-serif;
    text-decoration: underline; text-underline-offset: 3px;
    opacity: 0.85; transition: opacity 0.3s ease;
  }

  .lead-portal .magic-link-btn:hover { opacity: 1; }

  /* ── DROP ZONE ── */
  .lead-portal .drop-zone {
    border: 2px dashed rgba(13,148,136,0.3);
    border-radius: 16px; padding: 32px 20px;
    text-align: center; cursor: pointer;
    transition: all 0.3s ease; background: rgba(13,148,136,0.03);
  }

  .lead-portal .drop-zone:hover,
  .lead-portal .drop-zone.dragover {
    border-color: rgba(13,148,136,0.6);
    background: rgba(13,148,136,0.07);
  }

  .lead-portal .drop-zone-icon {
    width: 40px; height: 40px;
    background: #f0fdfa1a;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 12px;
  }

  .lead-portal .drop-zone-text {
    font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 4px;
  }

  .lead-portal .drop-zone-sub {
    font-size: 12px; color: #64748b;
  }

  /* ── WELCOME CARD ── */
  .lead-portal .welcome-card {
    background: linear-gradient(135deg, rgba(13,148,136,0.07) 0%, rgba(13,148,136,0.02) 100%);
    border: 1px solid rgba(13,148,136,0.15);
    border-radius: 16px; padding: 36px 32px; margin-bottom: 16px;
    text-align: center;
  }

  .lead-portal .welcome-card-title {
    font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 700;
    color: #fff; margin-bottom: 8px; letter-spacing: -0.02em;
  }

  .lead-portal .welcome-card-sub {
    font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 20px;
  }

  .lead-portal .value-props {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    margin-bottom: 20px; text-align: left;
  }

  .lead-portal .value-prop {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 12px 14px;
    display: flex; align-items: flex-start; gap: 10px;
  }

  .lead-portal .value-prop-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #0d9488; flex-shrink: 0; margin-top: 6px;
  }

  .lead-portal .value-prop-text {
    font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.5;
  }

  .lead-portal .value-prop-text strong {
    display: block; color: #fff; font-weight: 600; margin-bottom: 2px; font-size: 13px;
  }

  /* ── AUTH SPLIT LAYOUT ── */
  .lead-portal .auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding: 56px 32px;
  }

  .lead-portal .auth-split {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 40px;
    max-width: 1060px;
    width: 100%;
    margin: 0 auto;
    align-items: center;
  }

  .lead-portal .auth-hero { }

  .lead-portal .auth-logo {
    display: inline-flex; align-items: center; gap: 10px; margin-bottom: 40px;
  }

  .lead-portal .auth-logo-mark {
    width: 38px; height: 38px;
    background: linear-gradient(135deg, #0d9488, #14b8a6);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 14px; color: #0f172a;
  }

  .lead-portal .auth-logo-name {
    font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 15px; color: #fff;
  }

  .lead-portal .auth-logo-tag {
    font-size: 10px; color: #0d9488;
    text-transform: uppercase; letter-spacing: 0.08em; margin-top: 1px; font-weight: 600;
  }

  .lead-portal .auth-headline {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 42px; font-weight: 700; line-height: 1.2;
    color: #fff; margin-bottom: 20px; letter-spacing: -0.02em;
  }

  .lead-portal .auth-headline span { color: #0d9488; }

  .lead-portal .auth-sub {
    font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.8; margin-bottom: 40px;
  }

  .lead-portal .auth-benefits { margin-bottom: 40px; }

  .lead-portal .auth-benefit {
    display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px;
  }

  .lead-portal .auth-benefit-icon {
    width: 22px; height: 22px; flex-shrink: 0;
    background: rgba(13,148,136,0.12); border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin-top: 1px;
  }

  .lead-portal .auth-benefit-text { font-size: 14px; color: rgba(255,255,255,0.85); line-height: 1.5; }
  .lead-portal .auth-benefit-text strong { color: #fff; font-weight: 600; }

  .lead-portal .auth-stats {
    display: flex; gap: 0;
    border: 1px solid #e2e8f01a;
    border-radius: 16px; overflow: hidden;
    margin-bottom: 28px;
  }

  .lead-portal .auth-stat {
    flex: 1; padding: 14px 16px; text-align: center;
    border-right: 1px solid #e2e8f01a;
  }

  .lead-portal .auth-stat:last-child { border-right: none; }

  .lead-portal .auth-stat-num {
    font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 700;
    color: #0d9488; margin-bottom: 2px;
  }

  .lead-portal .auth-stat-label {
    font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
  }

  /* ── DASHBOARD PREVIEW CARD ── */
  .lead-portal .auth-preview {
    background: rgba(15,23,42,0.8);
    border: 1px solid #e2e8f01a;
    border-radius: 16px; padding: 18px 20px;
    position: relative; overflow: hidden;
  }

  .lead-portal .auth-preview::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #0d9488, #14b8a6, transparent);
  }

  .lead-portal .auth-preview-label {
    font-size: 10px; color: #0d9488; text-transform: uppercase;
    letter-spacing: 0.08em; margin-bottom: 14px; font-weight: 600;
  }

  .lead-portal .auth-preview-pos {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
  }

  .lead-portal .auth-preview-pos-name {
    font-size: 13px; font-weight: 600; color: #fff;
  }

  .lead-portal .auth-preview-pos-pct {
    font-size: 12px; color: #0d9488; font-weight: 700;
  }

  .lead-portal .auth-preview-bar {
    height: 5px; background: rgba(255,255,255,0.06); border-radius: 99px; margin-bottom: 16px;
  }

  .lead-portal .auth-preview-bar-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #0d9488, #14b8a6);
  }

  .lead-portal .auth-preview-metrics {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
  }

  .lead-portal .auth-preview-metric {
    background: rgba(255,255,255,0.04); border-radius: 8px; padding: 10px;
  }

  .lead-portal .auth-preview-metric-val {
    font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 2px;
  }

  .lead-portal .auth-preview-metric-key {
    font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;
  }

  /* ── AUTH FORM PANEL ── */
  .lead-portal .auth-form-panel .card {
    padding: 32px 28px; margin-bottom: 0;
  }

  .lead-portal .auth-trust {
    display: flex; align-items: center; justify-content: center; gap: 16px;
    margin-top: 14px; flex-wrap: wrap;
  }

  .lead-portal .auth-trust-item {
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; color: #64748b;
  }

  @media (max-width: 720px) {
    .lead-portal .auth-split {
      grid-template-columns: 1fr; gap: 32px;
    }
    .lead-portal .auth-page { padding: 32px 16px; align-items: flex-start; }
    .lead-portal .auth-headline { font-size: 26px; }
    .lead-portal .auth-hero { order: 2; }
    .lead-portal .auth-form-panel { order: 1; }
  }

  /* ── PULSE ── */
  @keyframes lead-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .lead-portal .pulse { animation: lead-pulse 2s ease-in-out infinite; }

  @media (max-width: 640px) {
    .lead-portal .lp-nav-btn { flex: none; padding: 10px 14px; font-size: 12px; border-radius: 50px; }
    .lead-portal .lp-wrap { padding: 24px 16px 60px; }
    .lead-portal .lp-title { font-size: 22px; }
    .lead-portal .stat-grid-3 { grid-template-columns: 1fr; }
    .lead-portal .stat-grid-4 { grid-template-columns: 1fr 1fr; }
    .lead-portal .res-grid { grid-template-columns: 1fr; }
    .lead-portal .countdown-grid { grid-template-columns: repeat(3, 1fr); }
    .lead-portal .pos-card { padding: 18px; }
    .lead-portal .lp-header { padding: 14px 16px; }
    .lead-portal .detail-header { flex-direction: column; align-items: flex-start; gap: 10px; }
    .lead-portal .contact-strip { flex-direction: column; gap: 10px; text-align: center; }
    .lead-portal .value-props { grid-template-columns: 1fr; }
  }
`;

// ── TYPES ────────────────────────────────────────────────────────────────
interface LeadPosition {
  id: string;
  funder_name: string;
  product_type: string;
  funded_amount: number;
  payback_amount: number;
  factor_rate: string;
  payment_amount: number;
  payment_frequency: string;
  funded_date: string;
  estimated_payoff_date: string;
  remaining_balance: number;
  status: string;
  notes: string | null;
}

interface BankingInsights {
  connected: boolean;
  hasPendingConnection?: boolean;
  status?: string | null;
  institutionName?: string | null;
  lastSyncedAt?: string | null;
  connectedAt?: string | null;
  accounts?: Array<{ name: string; type: string; balance: number }>;
  metrics?: {
    monthlyRevenue: number;
    monthlyExpenses: number;
    netCashFlow: number;
    avgBalance: number;
    currentBalance: number;
    monthsAnalyzed: number;
    revenueTrend?: string | null;
    healthScore?: number;
  };
  activityByMonth?: Array<{
    month: string;
    totalCredit: number;
    totalDebit: number;
    averageDailyBalance: number;
    net: number;
  }>;
  statementInsights?: {
    analyzedAt?: string | null;
    overallScore: number;
    scoreExplanation?: string;
    monthlyRevenue: number;
    monthlyExpenses: number;
    netCashFlow: number;
    avgDailyBalance: number;
    revenueConsistency?: string | null;
    monthlyBreakdown?: Array<{ month: string; revenue: number; expenses: number }>;
  } | null;
}

// ── HELPERS ───────────────────────────────────────────────────────────────
const fmt$ = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function calcPosition(pos: LeadPosition) {
  const funded = Number(pos.funded_amount) || 0;
  const payback = Number(pos.payback_amount) || funded;
  const remaining = Number(pos.remaining_balance) || payback;
  const payment = Number(pos.payment_amount) || 0;
  const paidSoFar = payback - remaining;
  const progress = payback > 0 ? (paidSoFar / payback) * 100 : 0;
  const freq = pos.payment_frequency || "daily";
  const paymentsPerMonth = freq === "daily" ? 21 : freq === "weekly" ? 4.33 : freq === "bi-weekly" || freq === "biweekly" ? 2.17 : 1;
  const monthlyLoad = payment * paymentsPerMonth;
  const paymentsLeft = payment > 0 ? Math.ceil(remaining / payment) : 0;

  // Estimate days to payoff
  const daysPerPayment = freq === "daily" ? 1 : freq === "weekly" ? 7 : freq === "bi-weekly" || freq === "biweekly" ? 14 : 30;
  const estDaysLeft = paymentsLeft * daysPerPayment;
  const projectedPayoff = new Date();
  projectedPayoff.setDate(projectedPayoff.getDate() + estDaysLeft);

  // Next payment date
  const nextPayment = new Date();
  if (freq === "daily") {
    nextPayment.setDate(nextPayment.getDate() + 1);
    while (nextPayment.getDay() === 0 || nextPayment.getDay() === 6) nextPayment.setDate(nextPayment.getDate() + 1);
  } else if (freq === "weekly") {
    nextPayment.setDate(nextPayment.getDate() + (7 - nextPayment.getDay() + 1) % 7 || 7);
  } else if (freq === "bi-weekly" || freq === "biweekly") {
    nextPayment.setDate(nextPayment.getDate() + 14);
  } else {
    nextPayment.setMonth(nextPayment.getMonth() + 1, 1);
  }

  return { funded, payback, remaining, paidSoFar, progress, monthlyLoad, paymentsLeft, estDaysLeft, projectedPayoff, nextPayment };
}

// ── LOGIN / SIGNUP ───────────────────────────────────────────────────────
function LeadAuth({ onAuth }: { onAuth: () => Promise<void> | void }) {
  const [mode, setMode] = useState<"signup" | "phone-entry" | "code-entry">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // OTP sign-in fields
  const [otpPhone, setOtpPhone] = useState("");
  const [otp, setOtp] = useState("");

  // Live platform stats for the signup hero
  const [publicStats, setPublicStats] = useState<{ businesses: number; totalTracked: number } | null>(null);
  useEffect(() => {
    fetch("/api/lead/public-stats").then(r => r.ok ? r.json() : null).then(setPublicStats).catch(() => {});
  }, []);

  // Handle any old magic-link URLs gracefully — redirect to phone sign-in
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magic = params.get("magic");
    if (!magic) return;
    window.history.replaceState({}, "", "/track");
    setMode("phone-entry");
    setError("That sign-in link is no longer valid. Enter your phone number below to get a code instead.");
  }, []);

  // Personal sign-in links (shared via CRM/SMS): /track?signin=1&phone=5551234567
  // lands on the OTP screen with the phone prefilled — no auto-auth, they still get texted a code.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") !== "1") return;
    const prefillPhone = params.get("phone") || "";
    window.history.replaceState({}, "", "/track");
    if (prefillPhone) setOtpPhone(prefillPhone);
    setMode("phone-entry");
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const savedRef = sessionStorage.getItem("lead_referral") || undefined;
      const res = await fetch("/api/lead/signup", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, phone, businessName, referralCode: savedRef }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error?.includes("already exists")) {
          setOtpPhone(phone);
          setMode("phone-entry");
          setError("You already have an account — enter your phone number to sign in.");
          return;
        }
        throw new Error(data.message || data.error || "Something went wrong");
      }
      onAuth();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/lead/request-otp", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to send code. Please try again.");
      }
      setOtp("");
      setMode("code-entry");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/lead/verify-otp", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone, code: otp }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Invalid code. Please try again.");
      }
      await onAuth();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (loading && !error) {
    return (
      <div className="lead-portal" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <style>{LEAD_CSS}</style>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>Signing you in...</p>
        </div>
      </div>
    );
  }

  const SmallBrand = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24 }}>
      <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#0d9488,#14b8a6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: 13, color: "#0f172a" }}>TCG</div>
      <div>
        <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: 13 }}>Today Capital Group</div>
        <div style={{ fontSize: 10, color: "#0d9488", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Funding Dashboard</div>
      </div>
    </div>
  );

  const Err = () => error ? <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>{error}</div> : null;

  // ── Phone-entry & Code-entry: centered card ──
  if (mode === "phone-entry" || mode === "code-entry") {
    return (
      <div className="lead-portal" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
        <style>{LEAD_CSS}</style>
        <div style={{ maxWidth: 420, width: "100%" }}>
          <SmallBrand />
          <div className="card" style={{ padding: "36px 32px" }}>
            {mode === "code-entry" ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ width: 52, height: 52, background: "rgba(13,148,136,0.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your texts</h2>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.6 }}>
                    We sent a 6-digit code to <strong style={{ color: "#fff" }}>{otpPhone}</strong>. Enter it below to sign in.
                  </p>
                </div>
                <Err />
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ marginBottom: 20 }}>
                    <label className="field-label">6-Digit Code</label>
                    <input
                      className="field-input"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      autoFocus
                      style={{ fontSize: 24, letterSpacing: "0.3em", textAlign: "center" }}
                    />
                  </div>
                  <button className="btn-primary" type="submit" disabled={loading || otp.length < 6}>
                    {loading ? "Verifying..." : "Sign In"}
                  </button>
                </form>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button
                    onClick={() => { setMode("phone-entry"); setError(null); setOtp(""); }}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer" }}
                  >
                    Wrong number or didn't receive it? Go back
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Welcome back</h1>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.6 }}>Enter your phone number and we'll text you a sign-in code.</p>
                </div>
                <Err />
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom: 20 }}>
                    <label className="field-label">Phone Number</label>
                    <input
                      className="field-input"
                      type="tel"
                      value={otpPhone}
                      onChange={e => setOtpPhone(e.target.value)}
                      placeholder="(555) 555-5555"
                      required
                      autoFocus
                    />
                  </div>
                  <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? "Sending..." : "Send Code"}
                  </button>
                </form>
                <div style={{ textAlign: "center", marginTop: 16, color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
                  New here? <button onClick={() => { setMode("signup"); setError(null); }} style={{ background: "none", border: "none", color: "#0d9488", cursor: "pointer", fontSize: 13 }}>Create a free account</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Signup: full split layout ──
  const benefits = [
    { text: <><strong>See your exact payoff date</strong> — know how many payments remain and when you'll be clear</> },
    { text: <><strong>Track renewal eligibility in real time</strong> — get notified the moment you qualify for more funding</> },
    { text: <><strong>Monitor daily cash flow</strong> — upload statements to see how payments affect your balance</> },
    { text: <><strong>Compare all your positions in one place</strong> — factor rates, remaining balances, payment schedules</> },
  ];

  return (
    <div className="lead-portal auth-page">
      <style>{LEAD_CSS}</style>
      <div className="auth-split">

        {/* ── Left: Value proposition ── */}
        <div className="auth-hero">
          <div className="auth-logo">
            <div className="auth-logo-mark">TCG</div>
            <div>
              <div className="auth-logo-name">Today Capital Group</div>
              <div className="auth-logo-tag">Funding Dashboard</div>
            </div>
          </div>

          <h1 className="auth-headline">
            Track Your <span>Financing Positions</span>
          </h1>
          <p className="auth-sub">
            Most MCA borrowers don't know their payoff date, their real factor rate, or when they qualify again. Your free dashboard shows you all of it — in real time.
          </p>

          <div className="auth-benefits">
            {benefits.map((b, i) => (
              <div key={i} className="auth-benefit">
                <div className="auth-benefit-icon">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="auth-benefit-text">{b.text}</div>
              </div>
            ))}
          </div>

          <div className="auth-stats">
            {publicStats && publicStats.businesses > 0 && (
              <div className="auth-stat">
                <div className="auth-stat-num">{publicStats.businesses >= 20 ? `${Math.floor(publicStats.businesses / 10) * 10}+` : String(publicStats.businesses)}</div>
                <div className="auth-stat-label">Businesses</div>
              </div>
            )}
            {publicStats && publicStats.totalTracked > 0 && (
              <div className="auth-stat">
                <div className="auth-stat-num">{publicStats.totalTracked >= 1_000_000 ? `$${(publicStats.totalTracked / 1_000_000).toFixed(1)}M+` : `$${Math.round(publicStats.totalTracked / 1000)}K+`}</div>
                <div className="auth-stat-label">Tracked</div>
              </div>
            )}
            <div className="auth-stat">
              <div className="auth-stat-num">Free</div>
              <div className="auth-stat-label">Forever</div>
            </div>
          </div>

          {/* Mini dashboard preview */}
          <div className="auth-preview">
            <div className="auth-preview-label">Dashboard preview — example data</div>
            <div className="auth-preview-pos">
              <div className="auth-preview-pos-name">Example Roofing Co. — Funder A</div>
              <div className="auth-preview-pos-pct">78% paid off</div>
            </div>
            <div className="auth-preview-bar">
              <div className="auth-preview-bar-fill" style={{ width: "78%" }} />
            </div>
            <div className="auth-preview-metrics">
              <div className="auth-preview-metric">
                <div className="auth-preview-metric-val">$8,400</div>
                <div className="auth-preview-metric-key">Remaining</div>
              </div>
              <div className="auth-preview-metric">
                <div className="auth-preview-metric-val">Jun 14</div>
                <div className="auth-preview-metric-key">Payoff Date</div>
              </div>
              <div className="auth-preview-metric">
                <div className="auth-preview-metric-val" style={{ color: "#0d9488" }}>Eligible</div>
                <div className="auth-preview-metric-key">Renewal</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Signup form ── */}
        <div className="auth-form-panel">
          <div className="card" style={{ padding: "32px 28px", marginBottom: 0 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Get your free dashboard</h2>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.6 }}>Takes 30 seconds. No credit card. No spam.</p>
            </div>
            <Err />
            <form onSubmit={handleSignup}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div><label className="field-label">First Name</label><input className="field-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" required /></div>
                <div><label className="field-label">Last Name</label><input className="field-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" required /></div>
              </div>
              <div style={{ marginBottom: 12 }}><label className="field-label">Business Name</label><input className="field-input" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Acme LLC" /></div>
              <div style={{ marginBottom: 12 }}><label className="field-label">Phone</label><input className="field-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" /></div>
              <div style={{ marginBottom: 20 }}><label className="field-label">Email</label><input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required /></div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ fontSize: 16 }}>
                {loading ? "Setting up your dashboard..." : "Get My Free Dashboard"}
              </button>
            </form>

            <div className="auth-trust">
              <div className="auth-trust-item">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                No credit card
              </div>
              <div className="auth-trust-item">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Free forever
              </div>
              <div className="auth-trust-item">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                No spam
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              Already have an account? <button onClick={() => { setMode("phone-entry"); setError(null); }} style={{ background: "none", border: "none", color: "#0d9488", cursor: "pointer", fontSize: 13 }}>Sign in</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


// ── ADD POSITION FORM ────────────────────────────────────────────────────
function AddPositionForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ funderName: "", productType: "MCA", fundedAmount: "", paybackAmount: "", factorRate: "", paymentAmount: "", paymentFrequency: "daily", fundedDate: "", remainingBalance: "" });
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/lead/positions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to save");
      onSave();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="card">
      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add Funding Position</h3>
      {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label className="field-label">Funder Name *</label><input className="field-input" value={form.funderName} onChange={set("funderName")} required /></div>
          <div><label className="field-label">Product Type</label>
            <select className="field-input" value={form.productType} onChange={set("productType")}>
              <option value="MCA">MCA</option><option value="LOC">Line of Credit</option><option value="Term Loan">Term Loan</option>
              <option value="SBA">SBA Loan</option><option value="Revenue Based">Revenue Based</option><option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label className="field-label">Funded Amount</label><input className="field-input" type="number" value={form.fundedAmount} onChange={set("fundedAmount")} placeholder="50000" /></div>
          <div><label className="field-label">Payback Amount</label><input className="field-input" type="number" value={form.paybackAmount} onChange={set("paybackAmount")} placeholder="65000" /></div>
          <div><label className="field-label">Factor Rate</label><input className="field-input" value={form.factorRate} onChange={set("factorRate")} placeholder="1.30" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label className="field-label">Payment Amount</label><input className="field-input" type="number" value={form.paymentAmount} onChange={set("paymentAmount")} placeholder="500" /></div>
          <div><label className="field-label">Frequency</label>
            <select className="field-input" value={form.paymentFrequency} onChange={set("paymentFrequency")}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="bi-weekly">Bi-Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label className="field-label">Remaining Balance</label><input className="field-input" type="number" value={form.remainingBalance} onChange={set("remainingBalance")} placeholder="32000" /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label className="field-label">Funded Date</label><input className="field-input" type="date" value={form.fundedDate} onChange={set("fundedDate")} style={{ maxWidth: 200 }} /></div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Save Position"}</button>
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── POSITION DETAIL VIEW ─────────────────────────────────────────────────
function PositionDetail({ pos: initialPos, onBack, onDeleted }: { pos: LeadPosition; onBack: () => void; onDeleted: () => void }) {
  const [pos, setPos] = useState(initialPos);
  const [editingBalance, setEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState(String(initialPos.remaining_balance || ""));
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceMsg, setBalanceMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const c = calcPosition(pos);
  const isRenewalReady = c.progress >= 50 && pos.status === "active";

  const handleUpdateBalance = async () => {
    setSavingBalance(true); setBalanceMsg(null);
    try {
      const res = await fetch(`/api/lead/positions/${pos.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remainingBalance: parseFloat(newBalance) }) });
      if (!res.ok) throw new Error("Failed");
      setPos(p => ({ ...p, remaining_balance: parseFloat(newBalance) }));
      setEditingBalance(false);
      setBalanceMsg("Balance updated.");
    } catch { setBalanceMsg("Failed to update."); }
    finally { setSavingBalance(false); }
  };

  const handleMarkPaid = async () => {
    setSavingBalance(true); setBalanceMsg(null);
    try {
      const res = await fetch(`/api/lead/positions/${pos.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid", remainingBalance: 0 }) });
      if (!res.ok) throw new Error("Failed");
      setPos(p => ({ ...p, status: "paid", remaining_balance: 0 }));
      setBalanceMsg("Position marked as paid off.");
    } catch { setBalanceMsg("Failed to update."); }
    finally { setSavingBalance(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/lead/positions/${pos.id}`, { method: "DELETE", credentials: "include" });
      onDeleted();
    } catch { setDeleting(false); }
  };

  return (
    <div>
      <button className="back-btn" onClick={onBack}>&larr; Back to my positions</button>

      <div className="detail-header">
        <div>
          <div className="detail-title">{pos.funder_name}</div>
          <div className="detail-sub">
            {pos.product_type}
            {pos.factor_rate ? ` \u00B7 ${pos.factor_rate}x factor` : ""}
            {pos.funded_date ? ` \u00B7 Funded ${fmtDate(pos.funded_date)}` : ""}
            {pos.payment_frequency ? ` \u00B7 ${pos.payment_frequency.charAt(0).toUpperCase() + pos.payment_frequency.slice(1)} payments` : ""}
          </div>
        </div>
        <span className={`badge ${pos.status === "active" ? "badge-active" : "badge-complete"}`}>
          {pos.status === "active" ? "Active" : pos.status === "paid" ? "Paid Off" : pos.status}
        </span>
      </div>

      {/* Payoff Tracker */}
      <div className="tracker-card">
        <div className="tracker-pct">{c.progress.toFixed(1)}%</div>
        <div className="tracker-pct-sub">of total payback complete</div>
        <div className="progress-track big" style={{ marginBottom: 20 }}>
          <div className="progress-fill" style={{ width: `${Math.min(100, c.progress)}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, fontSize: 13 }}>
          <div><span style={{ color: "#0d9488", fontWeight: 700 }}>{fmt$(c.paidSoFar)}</span> <span style={{ color: "rgba(255,255,255,0.7)" }}>paid</span></div>
          <div><span style={{ color: "#f87171", fontWeight: 700 }}>{fmt$(c.remaining)}</span> <span style={{ color: "rgba(255,255,255,0.7)" }}>remaining</span></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid stat-grid-4">
        <div className="stat-card">
          <div className="stat-label">Funded</div>
          <div className="stat-val">{fmt$(c.funded)}</div>
          <div className="stat-sub">original amount</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Payback</div>
          <div className="stat-val">{fmt$(c.payback)}</div>
          <div className="stat-sub">{pos.factor_rate ? `${pos.factor_rate}x factor` : "total owed"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Per Payment</div>
          <div className="stat-val teal">{fmt$(Number(pos.payment_amount) || 0)}</div>
          <div className="stat-sub">{pos.payment_frequency}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Payments Left</div>
          <div className="stat-val">{c.paymentsLeft}</div>
          <div className="stat-sub">{pos.payment_frequency} payments</div>
        </div>
      </div>

      {/* Countdown */}
      {pos.status === "active" && c.paymentsLeft > 0 && (
        <div className="countdown-card">
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, fontWeight: 700, color: "#0d9488", marginBottom: 16, textAlign: "center" }}>Payoff Countdown</p>
          <div className="countdown-grid">
            <div>
              <div className="countdown-num">{c.paymentsLeft}</div>
              <div className="countdown-label">Payments Left</div>
            </div>
            <div>
              <div className="countdown-num">{Math.max(0, c.estDaysLeft)}</div>
              <div className="countdown-label">Est. Days</div>
            </div>
            <div>
              <div className="countdown-num" style={{ fontSize: 16 }}>{fmtDate(c.projectedPayoff)}</div>
              <div className="countdown-label">Projected Payoff</div>
            </div>
          </div>
        </div>
      )}

      {/* Next Payment */}
      {pos.status === "active" && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 2 }}>Next Payment</p>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700 }}>{fmtDate(c.nextPayment)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 2 }}>Amount</p>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: "#0d9488" }}>{fmt$(Number(pos.payment_amount) || 0)}</p>
          </div>
        </div>
      )}

      {/* Monthly Load */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Monthly Payment Load</p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>What this position costs you per month</p>
        </div>
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: "#f87171" }}>{fmt$(c.monthlyLoad)}</p>
      </div>

      {/* Renewal Eligibility */}
      {isRenewalReady && (
        <div className="card" style={{ background: "linear-gradient(135deg, rgba(250,204,21,0.08), rgba(250,204,21,0.02))", border: "1px solid rgba(250,204,21,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span className="badge badge-alert">Renewal Eligible</span>
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>You may qualify for a renewal at better terms.</p>
          <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
            This position is {c.progress.toFixed(0)}% paid off. Many lenders allow renewals at 50%+, often at a lower factor rate or higher advance amount.
          </p>
          <a href="/intake/quiz" style={{ display: "inline-block", background: "#0d9488", color: "#fff", fontWeight: 700, padding: "10px 24px", borderRadius: 50, textDecoration: "none", fontFamily: "'Inter', sans-serif", fontSize: 14, transition: "all 0.3s ease" }}>
            Check Your Options
          </a>
        </div>
      )}

      {pos.notes && pos.notes.includes("Auto-detected") && (
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, fontStyle: "italic", textAlign: "center" }}>This position was auto-detected from your bank transactions</p>
      )}

      {/* Update Balance / Mark Paid */}
      {pos.status === "active" && (
        <div className="card">
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Update Position</p>
          {balanceMsg && <p style={{ fontSize: 13, color: balanceMsg.includes("Failed") ? "#f87171" : "#0d9488", marginBottom: 10 }}>{balanceMsg}</p>}
          {editingBalance ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="field-input" type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="Remaining balance" style={{ flex: 1 }} />
              <button className="btn-secondary" onClick={handleUpdateBalance} disabled={savingBalance}>{savingBalance ? "Saving..." : "Save"}</button>
              <button className="btn-ghost" onClick={() => setEditingBalance(false)}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-secondary" onClick={() => { setEditingBalance(true); setBalanceMsg(null); }}>Update Remaining Balance</button>
              <button className="btn-ghost" onClick={handleMarkPaid} disabled={savingBalance}>Mark as Paid Off</button>
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      <div style={{ marginTop: 8 }}>
        {confirmDelete ? (
          <div className="card" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Delete this position?</p>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: "8px 16px", background: "rgba(248,113,113,0.2)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 50, color: "#f87171", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{deleting ? "Deleting..." : "Yes, Delete"}</button>
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", padding: "4px 0" }}>Remove this position</button>
        )}
      </div>

      <div className="contact-strip" style={{ marginTop: 16 }}>
        <div className="contact-strip-text">
          Questions about this position? <a href={`mailto:trevor@todaycapitalgroup.com?subject=Question about my ${pos.funder_name} position`}>Reach out to our team</a>
        </div>
      </div>
    </div>
  );
}

// ── POSITION CARD ────────────────────────────────────────────────────────
function PositionCard({ pos, onClick }: { pos: LeadPosition; onClick: () => void }) {
  const c = calcPosition(pos);

  return (
    <div className="pos-card" onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700 }}>{pos.funder_name}</h4>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{pos.product_type}{pos.factor_rate ? ` \u00B7 ${pos.factor_rate}x` : ""}{pos.funded_date ? ` \u00B7 Funded ${fmtDate(pos.funded_date)}` : ""}</span>
        </div>
        <span className={`badge ${pos.status === "active" ? "badge-active" : "badge-complete"}`}>
          {pos.status === "active" ? "Active" : pos.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14, fontSize: 13 }}>
        <div>
          <span style={{ color: "#64748b", fontSize: 11 }}>Advance</span>
          <div style={{ fontWeight: 600 }}>{fmt$(c.funded)}</div>
        </div>
        <div>
          <span style={{ color: "#64748b", fontSize: 11 }}>Total Payback</span>
          <div style={{ fontWeight: 600 }}>{fmt$(c.payback)}</div>
        </div>
        <div>
          <span style={{ color: "#64748b", fontSize: 11 }}>Remaining</span>
          <div style={{ fontWeight: 600, color: "#f87171" }}>{fmt$(c.remaining)}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Paid off</span>
        <span style={{ color: "#0d9488", fontSize: 12, fontWeight: 600 }}>{c.progress.toFixed(1)}%</span>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, c.progress)}%` }} /></div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
          {pos.status === "active" ? (
            <>
              <div>
                <span style={{ color: "#64748b" }}>Next payment</span>
                <div style={{ fontWeight: 500, color: "#fff" }}>{fmtDate(c.nextPayment)}</div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Est. payoff</span>
                <div style={{ fontWeight: 500, color: "#fff" }}>{fmtDate(c.projectedPayoff)}</div>
              </div>
            </>
          ) : (
            <span style={{ color: "#64748b" }}>Position fully paid off</span>
          )}
        </div>
        <span style={{ color: "#0d9488", fontSize: 12, fontWeight: 600 }}>View details &rarr;</span>
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────────────
function OverviewTab({ positions, banking, onViewPosition, onSwitchTab }: {
  positions: LeadPosition[];
  banking: BankingInsights | null;
  onViewPosition: (pos: LeadPosition) => void;
  onSwitchTab: (tab: string) => void;
}) {
  const activePositions = positions.filter(p => p.status === "active");
  const totalRemaining = positions.reduce((s, p) => s + (Number(p.remaining_balance) || 0), 0);
  const totalMonthlyLoad = positions.reduce((s, p) => s + calcPosition(p).monthlyLoad, 0);
  const revenue = banking?.metrics?.monthlyRevenue || 0;
  const renewalReady = activePositions.filter(p => calcPosition(p).progress >= 50);
  const isFirstTime = positions.length === 0 && !banking?.connected;

  if (isFirstTime) {
    return (
      <div>
        <div className="welcome-card">
          <div style={{ width: 52, height: 52, background: "rgba(13,148,136,0.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div className="welcome-card-title">Your dashboard is ready</div>
          <div className="welcome-card-sub">
            This is your private portal for tracking your MCA positions, monitoring cash flow, and knowing exactly when you're ready to refinance or take on additional capital.
          </div>
          <div className="value-props">
            <div className="value-prop">
              <div className="value-prop-dot" />
              <div className="value-prop-text"><strong>Payoff tracking</strong>See exactly how far along each position is and when it'll be done.</div>
            </div>
            <div className="value-prop">
              <div className="value-prop-dot" />
              <div className="value-prop-text"><strong>Cash flow insights</strong>Upload statements for revenue and expense analysis.</div>
            </div>
            <div className="value-prop">
              <div className="value-prop-dot" />
              <div className="value-prop-text"><strong>Renewal timing</strong>Know the moment you're eligible for better terms or additional capital.</div>
            </div>
            <div className="value-prop">
              <div className="value-prop-dot" />
              <div className="value-prop-text"><strong>Auto-detect positions</strong>Upload bank statements and we'll find your MCA payments automatically.</div>
            </div>
          </div>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>Upload your bank statements and we'll automatically detect your funding positions.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" as const }}>
            <button className="btn-primary" onClick={() => onSwitchTab("positions")} style={{ flex: 1, maxWidth: 260 }}>Upload Bank Statements</button>
          </div>
        </div>
      </div>
    );
  }

  const sectionWrap = { marginBottom: 36, padding: "24px 22px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)" } as const;
  const sectionHeaderStyle = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700 as const, color: "#fff", marginBottom: 6 };
  const sectionSubStyle = { fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 16, lineHeight: 1.6 };

  return (
    <div>
      {/* ═══ SECTION 1: TRACK YOUR POSITIONS ═══ */}
      <div style={{ ...sectionWrap, background: "linear-gradient(180deg, rgba(13,148,136,0.06) 0%, rgba(15,23,42,0.4) 100%)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
          <div>
            <p style={sectionHeaderStyle}>Track Your Positions</p>
            <p style={sectionSubStyle}>Upload your bank statements and we'll auto-detect your funding positions, payment schedules, and estimated payoff dates.</p>
          </div>
          <button className="btn-primary" onClick={() => onSwitchTab("positions")} style={{ fontSize: 12, padding: "8px 18px", whiteSpace: "nowrap" as const, flexShrink: 0 }}>Upload Statements</button>
        </div>

        {activePositions.length > 0 ? (
          <>
            <div className="stat-grid stat-grid-4">
              <div className="stat-card">
                <div className="stat-label">Open Positions</div>
                <div className="stat-val">{activePositions.length}</div>
                <div className="stat-sub">active</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Remaining</div>
                <div className="stat-val red">{totalRemaining > 0 ? fmt$(totalRemaining) : "\u2014"}</div>
                <div className="stat-sub">across all positions</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Monthly Load</div>
                <div className="stat-val">{totalMonthlyLoad > 0 ? fmt$(totalMonthlyLoad) : "\u2014"}</div>
                <div className="stat-sub">total payments</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Monthly Revenue</div>
                <div className="stat-val teal">{revenue > 0 ? fmt$(revenue) : "\u2014"}</div>
                <div className="stat-sub">{revenue > 0 && totalMonthlyLoad > 0 ? `${(totalMonthlyLoad / revenue * 100).toFixed(0)}% to payments` : "upload statements"}</div>
              </div>
            </div>
            {activePositions.slice(0, 2).map(pos => (
              <PositionCard key={pos.id} pos={pos} onClick={() => onViewPosition(pos)} />
            ))}
            {activePositions.length > 2 && (
              <button className="btn-ghost" onClick={() => onSwitchTab("positions")} style={{ width: "100%", marginTop: 4 }}>
                View all {activePositions.length} positions
              </button>
            )}
            {renewalReady.length > 0 && (
              <div className="card" style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.2)", marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "#facc15", marginBottom: 2 }}>Renewal Opportunities</p>
                    <p style={{ color: "#94a3b8", fontSize: 12 }}>{renewalReady.length} position{renewalReady.length !== 1 ? "s" : ""} past 50% paid</p>
                  </div>
                  <a href="/intake/quiz" className="btn-primary" style={{ fontSize: 12, padding: "8px 18px", textDecoration: "none" }}>Check Options</a>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card" style={{ textAlign: "center" as const, padding: "24px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>&#128196;</div>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>No positions detected yet</p>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>Upload your most recent 3 months of bank statements to get started.</p>
            <button className="btn-primary" onClick={() => onSwitchTab("positions")}>Upload Bank Statements</button>
          </div>
        )}
      </div>

      {/* ═══ SECTION 2: TRACK YOUR FINANCIALS ═══ */}
      <div style={{ ...sectionWrap, background: "linear-gradient(180deg, rgba(59,130,246,0.05) 0%, rgba(15,23,42,0.4) 100%)" }}>
        <p style={sectionHeaderStyle}>Track Your Financials</p>
        <p style={sectionSubStyle}>See how your revenue, expenses, and cash flow are trending. Understand how your funding payments impact your bottom line.</p>

        {revenue > 0 ? (
          <div className="card">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: revenue > 0 && totalMonthlyLoad > 0 ? 16 : 0 }}>
              <div>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Monthly Revenue</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#0d9488" }}>{fmt$(revenue)}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Monthly Payments</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: totalMonthlyLoad > 0 ? "#f59e0b" : "#64748b" }}>{totalMonthlyLoad > 0 ? fmt$(totalMonthlyLoad) : "\u2014"}</p>
              </div>
            </div>
            {revenue > 0 && totalMonthlyLoad > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>Payment coverage</span>
                  <span style={{ color: (totalMonthlyLoad / revenue * 100) < 20 ? "#0d9488" : "#facc15", fontWeight: 600 }}>{(totalMonthlyLoad / revenue * 100).toFixed(1)}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min(100, totalMonthlyLoad / revenue * 100)}%`, background: (totalMonthlyLoad / revenue * 100) < 20 ? "linear-gradient(90deg, #0d9488, #14b8a6)" : "linear-gradient(90deg, #facc15, #f59e0b)" }} />
                </div>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                  {(totalMonthlyLoad / revenue * 100) < 15 ? "Your payment load is very manageable. You may have room for additional capital." :
                   (totalMonthlyLoad / revenue * 100) < 25 ? "Your payment load is moderate. Refinancing could free up meaningful cash flow." :
                   "Your payment load is heavy. Consolidation or refinancing could significantly reduce your monthly burden."}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Upload statements to see your financials</p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Revenue, expenses, and cash flow analysis from your bank data.</p>
            </div>
            <button className="btn-secondary" onClick={() => onSwitchTab("positions")} style={{ fontSize: 12, whiteSpace: "nowrap" as const }}>Upload</button>
          </div>
        )}
      </div>

      {/* ═══ SECTION 3: GET FUNDED ═══ */}
      <div style={{ ...sectionWrap, background: "linear-gradient(135deg, rgba(250,204,21,0.06) 0%, rgba(13,148,136,0.08) 100%)", border: "1px solid rgba(250,204,21,0.15)" }}>
        <p style={sectionHeaderStyle}>Ready for Funding?</p>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
          {activePositions.length > 0
            ? "Based on your current positions and financial profile, see if you qualify for a renewal, consolidation, or additional capital."
            : "Check what funding options are available for your business. SBA loans, MCAs, lines of credit, and more. Takes about 5 minutes."}
        </p>
        <button className="btn-primary" onClick={() => onSwitchTab("qualify")} style={{ padding: "12px 28px" }}>
          Check Options
        </button>
      </div>

      {/* ═══ SECTION 4: BUSINESS SERVICES ═══ */}
      <div style={{ ...sectionWrap, background: "linear-gradient(180deg, rgba(139,92,246,0.05) 0%, rgba(15,23,42,0.4) 100%)" }}>
        <p style={sectionHeaderStyle}>Business Services</p>
        <p style={sectionSubStyle}>Beyond funding, we help businesses grow with payment processing, professional websites, and CRM automation.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 8 }}>
          {[
            { id: "payments", icon: "\uD83D\uDCB3", title: "Payment Processing", sub: "Lower your processing fees and get faster deposits. We partner with processors built for small businesses.", bullets: ["Lower rates", "Next-day deposits", "No contracts"] },
            { id: "website", icon: "\uD83C\uDF10", title: "Website Build", sub: "A professional site that brings in customers. Mobile-ready, SEO-optimized, and built to convert.", bullets: ["Custom design", "SEO + Google Business", "Lead capture forms"] },
            { id: "crm", icon: "\uD83D\uDCCA", title: "CRM & Automation", sub: "Stop losing leads. Track your pipeline, automate follow-ups, and keep your team organized.", bullets: ["Pipeline tracking", "Auto follow-ups", "Lead scoring"] },
          ].map(svc => (
            <div key={svc.id} className="card" onClick={() => onSwitchTab("services")} style={{ cursor: "pointer", padding: "18px 20px", transition: "all 0.2s ease" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{svc.icon}</div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{svc.title}</p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>{svc.sub}</p>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                {svc.bullets.map(b => (
                  <span key={b} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 50, background: "rgba(13,148,136,0.1)", color: "#14b8a6", fontWeight: 500 }}>{b}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn-ghost" onClick={() => onSwitchTab("services")} style={{ width: "100%", fontSize: 12 }}>
          Learn more about our services &rarr;
        </button>
      </div>

      {/* ═══ SECTION 5: BUSINESS OWNER RESOURCES ═══ */}
      <div style={{ ...sectionWrap, background: "linear-gradient(180deg, rgba(52,211,153,0.05) 0%, rgba(15,23,42,0.4) 100%)" }}>
        <p style={sectionHeaderStyle}>Business Owner Resources</p>
        <p style={sectionSubStyle}>Free tools and resources to help you monitor credit, find funding programs, and grow your business.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 8 }}>
          {[
            { title: "Business Credit Scores", sub: "Check your D&B and Experian scores for free", url: "https://www.nav.com/business-credit-scores/", tag: "Free", tagColor: "#34d399" },
            { title: "SBA Loan Programs", sub: "Government-backed loans with lower rates and longer terms", url: "https://www.sba.gov/funding-programs/loans", tag: "Gov", tagColor: "#a78bfa" },
            { title: "Free Accounting", sub: "Wave app for invoicing, accounting, and receipt scanning", url: "https://www.waveapps.com/", tag: "Free", tagColor: "#34d399" },
            { title: "Federal Business Grants", sub: "Search for grant opportunities that don't need to be repaid", url: "https://www.grants.gov/", tag: "Grants", tagColor: "#fbbf24" },
            { title: "Google Business Profile", sub: "Claim your free listing to show up in local search", url: "https://business.google.com/", tag: "Free", tagColor: "#34d399" },
            { title: "IRS Tax Calendar", sub: "Never miss a tax deadline for your business type", url: "https://www.irs.gov/businesses/small-businesses-self-employed/tax-calendars", tag: "IRS", tagColor: "#a78bfa" },
          ].map(res => (
            <a key={res.title} href={res.url} target="_blank" rel="noopener noreferrer" className="card" style={{ textDecoration: "none", padding: "16px 18px", display: "block", transition: "all 0.2s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: "#fff" }}>{res.title}</p>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 50, background: `${res.tagColor}20`, color: res.tagColor, fontWeight: 600, flexShrink: 0 }}>{res.tag}</span>
              </div>
              <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.4 }}>{res.sub}</p>
            </a>
          ))}
        </div>
        <button className="btn-ghost" onClick={() => onSwitchTab("resources")} style={{ width: "100%", fontSize: 12 }}>
          View all resources &rarr;
        </button>
      </div>
    </div>
  );
}

// ── POSITIONS TAB ────────────────────────────────────────────────────────
function PositionsTab({ onViewPosition }: { onViewPosition: (pos: LeadPosition) => void }) {
  const [positions, setPositions] = useState<LeadPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetch_ = useCallback(async () => {
    try { const r = await fetch("/api/lead/positions", { credentials: "include" }); if (r.ok) setPositions(await r.json()); } catch (_) {}
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const processFiles = async (files: File[]) => {
    const pdfs = files.filter(f => f.type === "application/pdf");
    if (pdfs.length === 0) { setUploadMsg({ text: "Please upload PDF bank statements.", ok: false }); return; }

    setUploading(true); setUploadMsg(null);
    let totalFound = 0;

    for (const file of pdfs) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const r = await fetch("/api/lead/positions/extract", { method: "POST", credentials: "include", body: formData });
        const data = await r.json();
        if (!r.ok) { setUploadMsg({ text: data.error || `Failed to analyze ${file.name}`, ok: false }); continue; }

        // data is an array of extracted positions — save each one
        const extracted = Array.isArray(data) ? data : data.positions ? data.positions : [data];
        for (const pos of extracted) {
          if (!pos.funderName && !pos.funder_name) continue;
          try {
            await fetch("/api/lead/positions", {
              method: "POST", credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                funderName: pos.funderName || pos.funder_name || "Unknown",
                productType: pos.productType || pos.product_type || "MCA",
                fundedAmount: pos.fundedAmount || pos.funded_amount || pos.advanceAmount || pos.advance_amount || "",
                paybackAmount: pos.paybackAmount || pos.payback_amount || pos.totalPayback || pos.total_payback || "",
                factorRate: pos.factorRate || pos.factor_rate || "",
                paymentAmount: pos.paymentAmount || pos.payment_amount || pos.estimatedPayment || "",
                paymentFrequency: pos.paymentFrequency || pos.payment_frequency || pos.frequency || "daily",
                status: "active",
                notes: `Auto-extracted from ${file.name}`,
              }),
            });
            totalFound++;
          } catch (_) {}
        }
      } catch (err: any) {
        setUploadMsg({ text: `Error analyzing ${file.name}: ${err.message}`, ok: false });
      }
    }

    if (totalFound > 0) {
      setUploadMsg({ text: `Found ${totalFound} position${totalFound !== 1 ? "s" : ""} from ${pdfs.length} statement${pdfs.length !== 1 ? "s" : ""}.`, ok: true });
      fetch_();
    } else if (!uploadMsg) {
      setUploadMsg({ text: "No funding positions detected in the uploaded statements. Try uploading more recent months.", ok: false });
    }
    setUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) processFiles(Array.from(e.dataTransfer.files));
  };

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Loading positions...</p></div>;

  const active = positions.filter(p => p.status === "active");
  const completed = positions.filter(p => p.status !== "active");

  return (
    <div>
      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#0d9488" : "rgba(255,255,255,0.15)"}`,
          borderRadius: 14,
          padding: "28px 20px",
          textAlign: "center" as const,
          cursor: uploading ? "wait" : "pointer",
          marginBottom: 20,
          background: dragOver ? "rgba(13,148,136,0.06)" : "rgba(255,255,255,0.02)",
          transition: "all 0.2s ease",
        }}
      >
        <input ref={fileInputRef} type="file" accept=".pdf" multiple onChange={handleFileSelect} style={{ display: "none" }} />
        {uploading ? (
          <div>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "#0d9488", fontWeight: 500 }}>Analyzing your bank statements...</p>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>This may take a moment while we scan for funding positions</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>&#128196;</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Upload Bank Statements</p>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Drop PDF files here or click to browse</p>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>We'll automatically detect your funding positions, payment amounts, and lender details</p>
          </div>
        )}
      </div>

      {uploadMsg && (
        <div style={{ padding: "12px 16px", fontSize: 13, borderRadius: 10, marginBottom: 14,
          color: uploadMsg.ok ? "#0d9488" : "#f87171",
          background: uploadMsg.ok ? "rgba(13,148,136,0.08)" : "rgba(248,113,113,0.08)",
          border: `1px solid ${uploadMsg.ok ? "rgba(13,148,136,0.2)" : "rgba(248,113,113,0.2)"}` }}>
          {uploadMsg.text}
        </div>
      )}

      {active.length > 0 && (
        <>
          <div className="section-label">Active Positions</div>
          {active.map(pos => <PositionCard key={pos.id} pos={pos} onClick={() => onViewPosition(pos)} />)}
        </>
      )}

      {completed.length > 0 && (
        <>
          <div className="section-label">Completed</div>
          {completed.map(pos => <PositionCard key={pos.id} pos={pos} onClick={() => onViewPosition(pos)} />)}
        </>
      )}

      {positions.length === 0 && !uploading && (
        <div className="empty"><strong>No positions detected yet</strong>Upload your most recent 3 months of bank statements and we'll automatically find your current funding positions, payment schedules, and estimated payoff dates.</div>
      )}
    </div>
  );
}

// ── FINANCIALS TAB ───────────────────────────────────────────────────────
function LeadFinancialsTab() {
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showMonthly, setShowMonthly] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<number | null>(null);

  const fetchInsights = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const r = await fetch("/api/lead/banking/insights", { credentials: "include" });
      if (r.ok) setBanking(await r.json());
    } catch (_) {}
    if (!quiet) setLoading(false);
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  // Auto-poll every 30 s when a connection is pending but not yet confirmed
  useEffect(() => {
    if (banking?.hasPendingConnection && !banking?.connected) {
      if (pollRef.current) return;
      pollRef.current = window.setInterval(async () => {
        try {
          await fetch("/api/lead/chirp/sync", { method: "POST", credentials: "include" });
          const r = await fetch("/api/lead/banking/insights", { credentials: "include" });
          if (r.ok) {
            const data: BankingInsights = await r.json();
            setBanking(data);
            if (data.connected) {
              if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            }
          }
        } catch (_) {}
      }, 30000);
      // Also register webhook so Chirp can push status proactively
      fetch("/api/lead/chirp/register-webhook", { method: "POST", credentials: "include" }).catch(() => {});
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [banking?.hasPendingConnection, banking?.connected]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/lead/chirp/sync", { method: "POST", credentials: "include" });
      await fetchInsights();
    } catch (_) {}
    setSyncing(false);
  };

  const handleConnect = async () => {
    setPopupBlocked(null);
    setConnecting(true);
    try {
      const res = await fetch("/api/lead/chirp/connect", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: "{}",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Failed to start bank connection.");
        setConnecting(false);
        return;
      }
      const data = await res.json();
      const url = data.widgetUrl || data.verificationUrl;
      if (url) {
        const popup = window.open(url, "chirp-connect", "width=520,height=760");
        if (!popup || popup.closed) {
          setPopupBlocked(url);
        } else {
          // After popup opens, refresh insights to get hasPendingConnection=true
          await fetchInsights(true);
          // Poll via message from popup
          const onMsg = (e: MessageEvent) => {
            if (e.data === "chirp-connected" || e.data?.type === "chirp-connected") {
              fetchInsights();
              window.removeEventListener("message", onMsg);
            }
          };
          window.addEventListener("message", onMsg);
        }
      }
    } catch (_) {
      alert("Could not start the bank connection. Please check your internet connection and try again.");
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your bank? You can reconnect anytime.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/lead/chirp/connection", { method: "DELETE", credentials: "include" });
      setBanking({ connected: false, hasPendingConnection: false });
    } catch (_) {}
    setDisconnecting(false);
  };

  const handleDetect = async () => {
    setDetecting(true); setDetectMsg(null);
    try {
      const r = await fetch("/api/lead/detect-positions", { method: "POST", credentials: "include" });
      const data = await r.json();
      if (r.ok) setDetectMsg({ text: data.message || `Found ${data.detected} position(s).`, ok: true });
      else setDetectMsg({ text: data.error || "Detection failed.", ok: false });
    } catch (_) { setDetectMsg({ text: "Failed to scan transactions.", ok: false }); }
    setDetecting(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Loading financial data...</p></div>;

  const m = banking?.metrics;
  const hasMetrics = banking?.connected && m && m.monthlyRevenue > 0;
  const healthColor = (m?.healthScore ?? 0) >= 70 ? "#0d9488" : (m?.healthScore ?? 0) >= 40 ? "#facc15" : "#f87171";
  const healthLabel = (m?.healthScore ?? 0) >= 70 ? "Strong" : (m?.healthScore ?? 0) >= 45 ? "Moderate" : (m?.healthScore ?? 0) > 0 ? "Needs Attention" : null;
  const trendColor = m?.revenueTrend === "growing" ? "#0d9488" : m?.revenueTrend === "declining" ? "#f87171" : "#94a3b8";
  const trendIcon = m?.revenueTrend === "growing" ? "↗" : m?.revenueTrend === "declining" ? "↘" : "→";

  return (
    <div>
      {/* ── Bank Connection Card ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 600 }}>Bank Connection</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {banking?.connected && <span className="badge badge-active">Connected</span>}
            {!banking?.connected && banking?.hasPendingConnection && (
              <span style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>Pending</span>
            )}
          </div>
        </div>

        {banking?.connected ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0d9488", flexShrink: 0 }} />
              <span style={{ fontWeight: 500 }}>{banking.institutionName || "Connected Bank"}</span>
              {banking.lastSyncedAt && (
                <span style={{ color: "#64748b", fontSize: 11, marginLeft: "auto" }}>
                  Synced {fmtDate(banking.lastSyncedAt)}
                </span>
              )}
            </div>
            {banking.accounts && banking.accounts.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                {banking.accounts.map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                      <span>{a.name}</span>
                      {a.type && <span style={{ color: "#64748b", fontSize: 11, textTransform: "capitalize" }}>{a.type}</span>}
                    </span>
                    <span style={{ fontWeight: 700, color: "#0d9488" }}>{fmt$(a.balance)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-secondary" onClick={handleSync} disabled={syncing} style={{ flex: 1, minWidth: 120 }}>
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{ background: "none", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", borderRadius: 50, padding: "8px 14px", fontSize: 13, cursor: "pointer", transition: "all 0.3s ease" }}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </>
        ) : banking?.hasPendingConnection ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Awaiting Bank Verification</p>
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
              You started linking your bank. Once Chirp confirms the connection, your financial data will appear here automatically.
            </p>
            <p style={{ color: "#64748b", fontSize: 12, marginBottom: 14 }}>
              Status: <span style={{ color: "#fbbf24" }}>{banking.status || "Unverified"}</span>
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={handleConnect} disabled={connecting} style={{ maxWidth: 220 }}>
                {connecting ? "Opening..." : "Reconnect Bank"}
              </button>
              <button className="btn-secondary" onClick={handleSync} disabled={syncing} style={{ maxWidth: 180 }}>
                {syncing ? "Checking..." : "Check Status"}
              </button>
            </div>
            {popupBlocked && <div className="popup-fallback" style={{ marginTop: 12 }}>Browser blocked the popup. <a href={popupBlocked} target="_blank" rel="noopener noreferrer">Click here</a>, then return.</div>}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 8, lineHeight: 1.6, fontWeight: 500 }}>
              Connect your bank to unlock live cash flow insights.
            </p>
            <ul style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8, textAlign: "left", display: "inline-block", margin: "0 0 16px", paddingLeft: 18 }}>
              <li>Live revenue &amp; expense tracking</li>
              <li>Cash flow trends month over month</li>
              <li>Auto-detect existing MCA positions</li>
              <li>Faster renewal approvals — no re-uploading statements</li>
            </ul>
            <button className="btn-primary" onClick={handleConnect} disabled={connecting} style={{ maxWidth: 300, margin: "0 auto" }}>
              {connecting ? "Opening..." : "Connect Your Bank"}
            </button>
            {popupBlocked && <div className="popup-fallback" style={{ marginTop: 12 }}>Browser blocked the popup. <a href={popupBlocked} target="_blank" rel="noopener noreferrer">Click here to connect</a>, then come back.</div>}
          </div>
        )}
      </div>

      {/* ── Statement-Based Analysis (shown until a live bank connection exists) ── */}
      {!banking?.connected && banking?.statementInsights && (() => {
        const si = banking.statementInsights!;
        const siColor = si.overallScore >= 70 ? "#0d9488" : si.overallScore >= 40 ? "#facc15" : "#f87171";
        return (
          <>
            <div className="card" style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(13,148,136,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Avg Monthly Revenue</p>
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 36, fontWeight: 800, color: "#0d9488", lineHeight: 1.1 }}>{fmt$(si.monthlyRevenue)}</p>
              <p style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>
                From your most recent bank statements{si.analyzedAt ? ` · analyzed ${fmtDate(si.analyzedAt)}` : ""}
              </p>
            </div>

            <div className="stat-grid stat-grid-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="stat-card">
                <div className="stat-label">Monthly Expenses</div>
                <div className="stat-val" style={{ color: "#f87171" }}>{si.monthlyExpenses > 0 ? fmt$(si.monthlyExpenses) : "—"}</div>
                <div className="stat-sub">avg per month</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Net Cash Flow</div>
                <div className="stat-val" style={{ color: si.netCashFlow >= 0 ? "#0d9488" : "#f87171" }}>
                  {si.netCashFlow >= 0 ? "+" : "−"}{fmt$(si.netCashFlow)}
                </div>
                <div className="stat-sub">avg per month</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Daily Balance</div>
                <div className="stat-val">{si.avgDailyBalance > 0 ? fmt$(si.avgDailyBalance) : "—"}</div>
                <div className="stat-sub">over analyzed period</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Financial Health</div>
                <div className="stat-val" style={{ color: siColor }}>{si.overallScore}/100</div>
                <div className="stat-sub">{si.revenueConsistency || "statement-based"}</div>
              </div>
            </div>

            {si.scoreExplanation && (
              <div className="card" style={{ padding: "14px 18px" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>{si.scoreExplanation}</p>
                <p style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>
                  Based on your uploaded statements — connect your bank above for live, always-current insights.
                </p>
              </div>
            )}
          </>
        );
      })()}

      {/* ── Cash Flow Metrics ── */}
      {hasMetrics && m && (
        <>
          {/* Hero revenue + trend */}
          <div className="card" style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(13,148,136,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Avg Monthly Revenue</p>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 36, fontWeight: 800, color: "#0d9488", lineHeight: 1.1 }}>{fmt$(m.monthlyRevenue)}</p>
            {m.revenueTrend && (
              <p style={{ color: trendColor, fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                {trendIcon} {m.revenueTrend.charAt(0).toUpperCase() + m.revenueTrend.slice(1)}
                {m.monthsAnalyzed > 0 && <span style={{ color: "#64748b", fontWeight: 400 }}> · {m.monthsAnalyzed} months analyzed</span>}
              </p>
            )}
          </div>

          {/* 4-stat grid */}
          <div className="stat-grid stat-grid-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="stat-card">
              <div className="stat-label">Monthly Expenses</div>
              <div className="stat-val" style={{ color: "#f87171" }}>{m.monthlyExpenses > 0 ? fmt$(m.monthlyExpenses) : "—"}</div>
              <div className="stat-sub">avg per month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net Cash Flow</div>
              <div className="stat-val" style={{ color: m.netCashFlow >= 0 ? "#0d9488" : "#f87171" }}>
                {m.netCashFlow >= 0 ? "+" : "−"}{fmt$(m.netCashFlow)}
              </div>
              <div className="stat-sub">avg per month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Current Balance</div>
              <div className="stat-val">{m.currentBalance > 0 ? fmt$(m.currentBalance) : "—"}</div>
              <div className="stat-sub">in the bank</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Daily Balance</div>
              <div className="stat-val">{m.avgBalance > 0 ? fmt$(m.avgBalance) : "—"}</div>
              <div className="stat-sub">over analyzed period</div>
            </div>
          </div>

          {/* Health Score */}
          {(m.healthScore ?? 0) > 0 && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>Financial Health Score</p>
                  {healthLabel && <p style={{ color: healthColor, fontSize: 12, marginTop: 2 }}>{healthLabel}</p>}
                </div>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 800, color: healthColor }}>{m.healthScore}/100</p>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{
                  width: `${m.healthScore}%`,
                  background: (m.healthScore ?? 0) >= 70
                    ? "linear-gradient(90deg, #0d9488, #14b8a6)"
                    : (m.healthScore ?? 0) >= 40
                      ? "linear-gradient(90deg, #facc15, #f59e0b)"
                      : "linear-gradient(90deg, #f87171, #ef4444)",
                }} />
              </div>
              <p style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>
                Score factors: cash flow ratio, balance cushion, revenue trend
              </p>
            </div>
          )}

          {/* Month-by-Month Breakdown */}
          {banking?.activityByMonth && banking.activityByMonth.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <button
                onClick={() => setShowMonthly(p => !p)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: "16px 20px", color: "#fff" }}
              >
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 600 }}>Monthly Breakdown</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showMonthly ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showMonthly && (
                <div style={{ padding: "0 20px 20px" }}>
                  {/* Column headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
                    <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>MONTH</span>
                    <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textAlign: "right" }}>REVENUE</span>
                    <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textAlign: "right" }}>EXPENSES</span>
                    <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textAlign: "right" }}>NET</span>
                  </div>
                  {banking.activityByMonth.slice(0, 12).map((row, i) => {
                    const net = row.net || (row.totalCredit - row.totalDebit);
                    return (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
                        <span style={{ color: "#94a3b8" }}>{row.month}</span>
                        <span style={{ color: "#0d9488", textAlign: "right", fontWeight: 500 }}>
                          {row.totalCredit > 0 ? fmt$(row.totalCredit) : "—"}
                        </span>
                        <span style={{ color: "#f87171", textAlign: "right" }}>
                          {row.totalDebit > 0 ? fmt$(row.totalDebit) : "—"}
                        </span>
                        <span style={{ color: net >= 0 ? "#0d9488" : "#f87171", textAlign: "right", fontWeight: 600 }}>
                          {net !== 0 ? (net >= 0 ? "+" : "−") + fmt$(net) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Auto-detect MCA Positions */}
          <div className="card" style={{ background: "rgba(13,148,136,0.04)", border: "1px solid rgba(13,148,136,0.12)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Auto-Detect MCA Positions</p>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
                  Scan your bank transactions for recurring payments that look like MCA advances and add them automatically to your Positions tab.
                </p>
              </div>
            </div>
            <button className="btn-primary" onClick={handleDetect} disabled={detecting} style={{ width: "100%" }}>
              {detecting ? "Scanning transactions..." : "Scan for MCA Positions"}
            </button>
            {detectMsg && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: detectMsg.ok ? "rgba(13,148,136,0.08)" : "rgba(248,113,113,0.08)", color: detectMsg.ok ? "#0d9488" : "#f87171", border: `1px solid ${detectMsg.ok ? "rgba(13,148,136,0.2)" : "rgba(248,113,113,0.2)"}` }}>
                {detectMsg.text}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PDF Upload ── */}
      <div className="card">
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Upload Bank Statements</h3>
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
          {banking?.connected
            ? "Upload PDF statements for additional months or a different account."
            : "Upload PDF bank statements from the last 3 months for an instant financial snapshot."}
        </p>
        <StatementUploader />
      </div>
    </div>
  );
}

// ── STATEMENT UPLOADER ───────────────────────────────────────────────────
function StatementUploader() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ text: string; ok: boolean } | null>(null);
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { setUploadResult({ text: "Only PDF files are accepted.", ok: false }); return; }
    setUploading(true); setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/lead/upload-statement", { method: "POST", credentials: "include", body: formData });
      if (res.ok) { const data = await res.json(); setUploadResult({ text: `Statement uploaded: ${data.fileName}`, ok: true }); }
      else { const data = await res.json().catch(() => ({})); setUploadResult({ text: data.error || "Upload failed.", ok: false }); }
    } catch (_) { setUploadResult({ text: "Upload failed. Please try again.", ok: false }); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} style={{ display: "none" }} />
      <div
        className={`drop-zone${dragover ? " dragover" : ""}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <>
            <div className="spinner" style={{ margin: "0 auto 10px" }} />
            <div className="drop-zone-text">Uploading...</div>
          </>
        ) : (
          <>
            <div className="drop-zone-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </div>
            <div className="drop-zone-text">Drop a PDF here or click to browse</div>
            <div className="drop-zone-sub">Bank statements from the last 3 months · PDF only</div>
          </>
        )}
      </div>
      {uploadResult && (
        <div style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, fontSize: 12, background: uploadResult.ok ? "rgba(13,148,136,0.08)" : "rgba(248,113,113,0.08)", color: uploadResult.ok ? "#0d9488" : "#f87171", border: `1px solid ${uploadResult.ok ? "rgba(13,148,136,0.2)" : "rgba(248,113,113,0.2)"}` }}>
          {uploadResult.text}
        </div>
      )}
    </div>
  );
}

// ── QUALIFY TAB ──────────────────────────────────────────────────────────
function QualifyTab() {
  const [positions, setPositions] = useState<LeadPosition[]>([]);
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/lead/positions", { credentials: "include" }).then(r => r.ok ? r.json() : []),
      fetch("/api/lead/banking/insights", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([pos, bank]) => { setPositions(pos); setBanking(bank); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /><p style={{ marginTop: 12 }}>Checking your readiness...</p></div>;

  const revenue = banking?.metrics?.monthlyRevenue || 0;
  const totalMonthlyLoad = positions.reduce((s, p) => s + calcPosition(p).monthlyLoad, 0);
  const paymentShare = revenue > 0 ? (totalMonthlyLoad / revenue) * 100 : 0;
  const hasData = revenue > 0 || positions.length > 0;

  const signals: Array<{ label: string; met: boolean; detail: string }> = [];
  if (revenue > 0) signals.push({ label: "Monthly Revenue", met: revenue >= 10000, detail: revenue >= 10000 ? `${fmt$(revenue)}/mo exceeds the $10k minimum` : `${fmt$(revenue)}/mo \u2014 most options require $10k+` });
  if (positions.length > 0) {
    const nearing = positions.filter(p => calcPosition(p).progress >= 50);
    signals.push({ label: "Position Paydown", met: nearing.length > 0, detail: nearing.length > 0 ? `${nearing.length} position(s) past 50% paid \u2014 renewal territory` : "No positions past 50% yet" });
  }
  if (revenue > 0 && totalMonthlyLoad > 0) signals.push({ label: "Payment Coverage", met: (revenue / totalMonthlyLoad) >= 5, detail: `${(revenue / totalMonthlyLoad).toFixed(1)}x coverage ratio` });
  if (banking?.metrics?.healthScore) signals.push({ label: "Financial Health", met: banking.metrics.healthScore >= 60, detail: `Score: ${banking.metrics.healthScore}/100` });

  return (
    <div>
      {hasData ? (
        <>
          <div className="card">
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Funding Readiness</h3>
            {signals.length > 0 ? signals.map((sig, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: sig.met ? "rgba(13,148,136,0.15)" : "rgba(250,204,21,0.15)", color: sig.met ? "#0d9488" : "#facc15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  {sig.met ? "\u2713" : "\u2022"}
                </span>
                <div><p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{sig.label}</p><p style={{ color: "#94a3b8", fontSize: 13 }}>{sig.detail}</p></div>
              </div>
            )) : <p style={{ color: "#94a3b8" }}>Add positions and connect your bank to see readiness signals.</p>}
          </div>

          <div className="card" style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.08), rgba(13,148,136,0.04))", border: "1px solid rgba(13,148,136,0.2)", textAlign: "center" }}>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Ready to explore your options?</h3>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              {paymentShare > 0 && paymentShare < 20 ? "Your payment load is manageable. You may have room for additional capital or better terms."
                : paymentShare >= 20 ? "Refinancing could lower your daily payment and free up cash flow."
                : "We can match you with funding options tailored to your business."}
            </p>
            <a href="/intake/quiz" style={{ display: "inline-block", background: "#0d9488", color: "#fff", fontWeight: 700, padding: "12px 32px", borderRadius: 50, textDecoration: "none", fontFamily: "'Inter', sans-serif", fontSize: 15, transition: "all 0.3s ease" }}>See What You Qualify For</a>
          </div>
        </>
      ) : (
        <div className="empty"><strong>Get started</strong>Add your funding positions and connect your bank to see personalized qualification signals.</div>
      )}
    </div>
  );
}

// ── RESOURCES TAB ────────────────────────────────────────────────────────
function ResourcesTab() {
  const resources = [
    {
      category: "Credit Monitoring",
      items: [
        { title: "Nav.com \u2014 Free Business Credit Scores", description: "See your Dun & Bradstreet and Experian business credit scores for free. Understand what lenders see.", url: "https://www.nav.com/business-credit-scores/", tag: "Free", tagColor: "#34d399" },
        { title: "Experian Business Credit", description: "Monitor your Experian business credit profile. Get alerts when your score changes.", url: "https://www.experian.com/business/check-business-credit.html", tag: "Free Report", tagColor: "#60a5fa" },
        { title: "Dun & Bradstreet \u2014 Get Your D-U-N-S Number", description: "A D-U-N-S number is essential for building business credit. Get yours for free.", url: "https://www.dnb.com/duns-number/get-a-duns.html", tag: "Free", tagColor: "#34d399" },
      ],
    },
    {
      category: "SBA & Government Programs",
      items: [
        { title: "SBA Loan Programs Overview", description: "Explore SBA 7(a), 504, and Microloan programs. Government-backed loans with lower rates and longer terms.", url: "https://www.sba.gov/funding-programs/loans", tag: "Gov", tagColor: "#a78bfa" },
        { title: "Grants.gov \u2014 Federal Business Grants", description: "Search for federal grant opportunities. Unlike loans, grants don't need to be repaid.", url: "https://www.grants.gov/", tag: "Grants", tagColor: "#fbbf24" },
      ],
    },
    {
      category: "Financial Tools",
      items: [
        { title: "Wave \u2014 Free Accounting Software", description: "Free invoicing, accounting, and receipt scanning for small businesses. No credit card required.", url: "https://www.waveapps.com/", tag: "Free", tagColor: "#34d399" },
        { title: "IRS Tax Calendar for Businesses", description: "Never miss a tax deadline. See all federal tax due dates for your business type.", url: "https://www.irs.gov/businesses/small-businesses-self-employed/tax-calendars", tag: "IRS", tagColor: "#a78bfa" },
      ],
    },
    {
      category: "Business Growth",
      items: [
        { title: "Google Business Profile", description: "Claim and optimize your free Google Business listing. Show up in local search and Maps.", url: "https://business.google.com/", tag: "Free", tagColor: "#34d399" },
        { title: "NEXT Insurance \u2014 Business Insurance", description: "Get affordable business insurance in minutes. General liability, workers' comp, and more.", url: "https://www.nextinsurance.com/", tag: "Quote", tagColor: "#60a5fa" },
      ],
    },
  ];

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Business Resources</p>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.6 }}>Free tools and resources to help you monitor credit, find funding programs, and grow your business.</p>
      </div>
      {resources.map(group => (
        <div key={group.category}>
          <div className="res-group-title">{group.category}</div>
          <div className="res-grid" style={{ marginBottom: 20 }}>
            {group.items.map(item => (
              <a key={item.title} href={item.url} target="_blank" rel="noopener noreferrer" className="res-card">
                <div className="res-card-head">
                  <div className="res-card-title">{item.title}</div>
                  <span className="res-tag" style={{ background: `${item.tagColor}20`, color: item.tagColor }}>{item.tag}</span>
                </div>
                <div className="res-card-desc">{item.description}</div>
                <div className="res-card-link">Visit &rarr;</div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SERVICES TAB ─────────────────────────────────────────────────────────
const PORTAL_SERVICES_LIST = [
  {
    id: "payments",
    title: "Payment Processing",
    desc: "Lower your processing fees and get faster deposits. We partner with processors built for small businesses.",
    bullets: ["Lower rates than standard processors", "Next-day deposits", "No long-term contracts", "Works with your existing POS"],
  },
  {
    id: "website",
    title: "Website Build",
    desc: "A professional site that actually brings in customers. Mobile-ready, SEO-optimized, and built to convert.",
    bullets: ["Custom design, not a template", "Mobile-first & fast loading", "SEO + Google Business setup", "Lead capture forms built in"],
  },
  {
    id: "crm",
    title: "CRM & Automation",
    desc: "Stop losing leads. Get a CRM that tracks your pipeline, automates follow-ups, and keeps your team organized.",
    bullets: ["Pipeline tracking & automation", "Text + email follow-up sequences", "Lead scoring & tagging", "Integrates with your existing tools"],
  },
];

function LeadServicesTab({ email, name, businessName }: { email: string; name: string; businessName: string }) {
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleInterest = async (serviceId: string) => {
    if (submitting || submitted.has(serviceId)) return;
    setSubmitting(serviceId);
    try {
      await fetch("/api/services/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: name.split(" ")[0] || undefined,
          lastName: name.split(" ").slice(1).join(" ") || undefined,
          businessName: businessName || undefined,
          service: serviceId,
          source: "lead_portal",
        }),
      });
      setSubmitted(prev => new Set([...prev, serviceId]));
    } catch (_) {}
    setSubmitting(null);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Business Services</p>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.6 }}>
          We've expanded beyond funding. Let us know which services would help your business and we'll reach out with details — no commitment required.
        </p>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {PORTAL_SERVICES_LIST.map(svc => (
          <div key={svc.id} className="card" style={{ border: submitted.has(svc.id) ? "1.5px solid rgba(13,148,136,0.35)" : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#fff" }}>{svc.title}</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{svc.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: "4px 18px" }}>
                  {svc.bullets.map(b => (
                    <li key={b} style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#0d9488", display: "inline-block", flexShrink: 0 }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ flexShrink: 0, paddingTop: 2 }}>
                {submitted.has(svc.id) ? (
                  <span style={{ fontSize: 13, color: "#0d9488", fontWeight: 600 }}>Noted!</span>
                ) : (
                  <button
                    onClick={() => handleInterest(svc.id)}
                    disabled={submitting === svc.id}
                    style={{
                      padding: "8px 18px",
                      background: "rgba(13,148,136,0.12)",
                      border: "1.5px solid rgba(13,148,136,0.4)",
                      borderRadius: 50,
                      color: "#0d9488",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {submitting === svc.id ? "..." : "I'm Interested"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
        No commitment. We'll reach out with details and next steps. Your info is never shared or sold.
      </div>
    </div>
  );
}

// ── ONBOARDING GUIDE ─────────────────────────────────────────────────────
function OnboardingGuide({ step, onAdvance }: { step: string; onAdvance: (tab: string) => void }) {
  const steps = [
    { key: "add_position", label: "Track a Position", desc: "Add your current funding so we can monitor your payoff progress.", tab: "positions" },
    { key: "connect_bank", label: "Connect Your Bank", desc: "Link your bank account for live cash flow insights and auto-detection.", tab: "financials" },
    { key: "view_qualify", label: "Check Your Options", desc: "See what you qualify for based on your financial profile.", tab: "qualify" },
  ];
  const currentIdx = steps.findIndex(s => s.key === step);
  if (currentIdx < 0) return null;

  return (
    <div className="card" style={{ marginBottom: 16, background: "linear-gradient(135deg, rgba(13,148,136,0.06), rgba(13,148,136,0.02))", border: "1px solid rgba(13,148,136,0.15)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, fontWeight: 700, color: "#0d9488" }}>Getting Started</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>Step {currentIdx + 1} of {steps.length}</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= currentIdx ? "#0d9488" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      {steps.map((s, i) => (
        <div key={s.key} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 4,
          borderRadius: 8, background: i === currentIdx ? "rgba(13,148,136,0.08)" : "transparent",
          opacity: i < currentIdx ? 0.5 : 1,
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, flexShrink: 0,
            background: i < currentIdx ? "#0d9488" : i === currentIdx ? "rgba(13,148,136,0.2)" : "rgba(255,255,255,0.06)",
            color: i < currentIdx ? "#0f172a" : i === currentIdx ? "#0d9488" : "#64748b",
          }}>
            {i < currentIdx ? "\u2713" : i + 1}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: i === currentIdx ? "#fff" : "#94a3b8" }}>{s.label}</p>
            {i === currentIdx && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{s.desc}</p>}
          </div>
          {i === currentIdx && <button className="btn-secondary" onClick={() => onAdvance(s.tab)} style={{ fontSize: 12, whiteSpace: "nowrap" }}>Go</button>}
        </div>
      ))}
      <button onClick={() => {
        fetch("/api/lead/onboarding/advance", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "done" }) });
        onAdvance("__skip__");
      }} style={{ background: "none", border: "none", color: "#64748b", fontSize: 11, cursor: "pointer", marginTop: 8 }}>
        Skip setup
      </button>
    </div>
  );
}

// ── REFERRAL SECTION ─────────────────────────────────────────────────────
function ReferralSection({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ referralCount: number } | null>(null);

  useEffect(() => {
    fetch("/api/lead/referrals", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, []);

  if (!referralCode) return null;

  const link = `${window.location.origin}/track?ref=${referralCode}`;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 14 }}>Refer a business owner</p>
        {stats && stats.referralCount > 0 && <span className="badge badge-active">{stats.referralCount} referral{stats.referralCount !== 1 ? "s" : ""}</span>}
      </div>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
        Know someone paying too much on their MCA? Share your link and help them track their positions too.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="field-input" readOnly value={link} style={{ fontSize: 12, flex: 1 }} onClick={e => (e.target as HTMLInputElement).select()} />
        <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ whiteSpace: "nowrap" }}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ── MAIN LEAD PORTAL ─────────────────────────────────────────────────────
export default function LeadPortal() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [onboardingStep, setOnboardingStep] = useState("add_position");
  const [activeTab, setActiveTab] = useState<"overview" | "positions" | "financials" | "qualify" | "resources" | "services">(() => {
    const saved = sessionStorage.getItem("lp_tab");
    if (saved && ["overview","positions","financials","qualify","resources","services"].includes(saved)) return saved as any;
    return "overview";
  });
  const [positions, setPositions] = useState<LeadPosition[]>([]);
  const [banking, setBanking] = useState<BankingInsights | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<LeadPosition | null>(null);

  // Check for referral code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) sessionStorage.setItem("lead_referral", ref);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/lead/auth/check", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.isAuthenticated) {
          setLoggedIn(true);
          setLeadName(data.name || "");
          setLeadEmail(data.email || "");
          setBusinessName(data.businessName || "");
          setReferralCode(data.referralCode || "");
          setOnboardingStep(data.onboardingStep || "done");
        }
      }
    } catch (_) {}
    setAuthChecked(true);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Fetch positions and banking for overview
  useEffect(() => {
    if (loggedIn) {
      fetch("/api/lead/positions", { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setPositions).catch(() => {});
      fetch("/api/lead/banking/insights", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(setBanking).catch(() => {});
    }
  }, [loggedIn]);

  const handleLogout = async () => {
    await fetch("/api/lead/auth/logout", { method: "POST", credentials: "include" });
    setLoggedIn(false);
  };

  if (!authChecked) return (
    <div className="lead-portal" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
      <div className="spinner" />
    </div>
  );
  if (!loggedIn) return <LeadAuth onAuth={checkAuth} />;

  const firstName = leadName ? leadName.split(" ")[0] : "";
  const initials = leadName
    ? leadName.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : leadEmail ? leadEmail[0].toUpperCase() : "?";

  // Shared header component
  const PortalHeader = () => (
    <header className="lp-header">
      <div className="lp-header-logo">
        <div className="lp-header-mark">TCG</div>
        <div className="lp-header-brand">Today Capital Group</div>
      </div>
      <div className="lp-header-right">
        <div className="lp-avatar">{initials}</div>
        {firstName && <span className="lp-header-name">{firstName}</span>}
        <button className="lp-header-out" onClick={handleLogout}>Sign out</button>
      </div>
    </header>
  );

  // Position detail view
  if (selectedPosition) {
    return (
      <div className="lead-portal">
        <style>{LEAD_CSS}</style>
        <PortalHeader />
        <div className="lp-wrap">
          <PositionDetail pos={selectedPosition} onBack={() => setSelectedPosition(null)} onDeleted={() => { setSelectedPosition(null); }} />
        </div>
      </div>
    );
  }

  const tabs = [
    ["overview", "Overview"],
    ["positions", "Positions"],
    ["financials", "Financials"],
    ["qualify", "Get Funded"],
    ["resources", "Resources"],
    ["services", "Services"],
  ] as const;

  return (
    <div className="lead-portal">
      <style>{LEAD_CSS}</style>

      <PortalHeader />

      <div className="lp-wrap">
        <div className="lp-title">
          {firstName ? `Welcome back, ${firstName}` : "My Dashboard"}
        </div>
        <div className="lp-subtitle">
          {businessName
            ? businessName
            : "Track your MCA positions, cash flow, and renewal eligibility."}
        </div>

        {onboardingStep !== "done" && (
          <OnboardingGuide step={onboardingStep} onAdvance={(tab) => {
            if (tab === "__skip__") { setOnboardingStep("done"); return; }
            setActiveTab(tab as any);
            sessionStorage.setItem("lp_tab", tab);
            const nextStep = tab === "positions" ? "connect_bank" : tab === "financials" ? "view_qualify" : "done";
            fetch("/api/lead/onboarding/advance", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: nextStep }) });
            setOnboardingStep(nextStep);
          }} />
        )}

        {/* Navigation */}
        <div className="lp-nav">
          {tabs.map(([key, label]) => (
            <button key={key} className={`lp-nav-btn ${activeTab === key ? "active" : ""}`} onClick={() => { setActiveTab(key); sessionStorage.setItem("lp_tab", key); }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <OverviewTab
            positions={positions}
            banking={banking}
            onViewPosition={setSelectedPosition}
            onSwitchTab={(tab) => { setActiveTab(tab as any); sessionStorage.setItem("lp_tab", tab); }}
          />
        )}
        {activeTab === "positions" && <PositionsTab onViewPosition={setSelectedPosition} />}
        {activeTab === "financials" && <LeadFinancialsTab />}
        {activeTab === "qualify" && <QualifyTab />}
        {activeTab === "resources" && <ResourcesTab />}
        {activeTab === "services" && <LeadServicesTab email={leadEmail} name={leadName} businessName={businessName} />}

        {/* Referral + Contact — only on overview to avoid clutter on other tabs */}
        {activeTab === "overview" && (
          <div style={{ marginTop: 24 }}>
            {referralCode && <ReferralSection referralCode={referralCode} />}
            <div className="contact-strip" style={{ marginTop: referralCode ? 14 : 0 }}>
              <div className="contact-strip-text">
                Questions about your funding? <a href="mailto:trevor@todaycapitalgroup.com">Reach out to our team</a> — we typically respond within a few hours.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
