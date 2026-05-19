import { useState } from "react";
import { useLocation, useSearch } from "wouter";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap');

  .reset-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .reset-root {
    font-family: 'Inter', sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    min-height: 100vh;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .reset-bg {
    min-height: 100vh;
    background: radial-gradient(ellipse at 20% 0%, rgba(13, 148, 136, 0.10) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 100%, rgba(15, 23, 41, 0.9) 0%, transparent 60%),
                #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .reset-card {
    width: 100%;
    max-width: 420px;
    background: rgba(30, 41, 59, 0.85);
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 48px 40px;
    backdrop-filter: blur(20px);
    box-shadow: 0 32px 64px rgba(0,0,0,0.4);
  }

  .reset-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 36px;
  }

  .reset-logo-mark {
    width: 38px;
    height: 38px;
    background: #0d9488;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 14px;
    color: #ffffff;
    flex-shrink: 0;
  }

  .reset-logo-text {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 700;
    font-size: 14px;
    line-height: 1.3;
    color: #ffffff;
    letter-spacing: 0.02em;
  }

  .reset-logo-sub {
    font-size: 10px;
    color: #0d9488;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .reset-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }

  .reset-sub {
    font-size: 14px;
    color: #94a3b8;
    margin-bottom: 36px;
  }

  .reset-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }

  .reset-input {
    width: 100%;
    padding: 14px 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 15px;
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    margin-bottom: 20px;
  }

  .reset-input:focus {
    border-color: #0d9488;
    box-shadow: 0 0 0 3px rgba(13,148,136,0.25);
    background: rgba(13,148,136,0.04);
  }

  .reset-btn {
    width: 100%;
    padding: 14px;
    background: #0d9488;
    border: none;
    border-radius: 50px;
    color: #ffffff;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    letter-spacing: 0.02em;
  }

  .reset-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,148,136,0.35); }
  .reset-btn:active { transform: translateY(0); }
  .reset-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  .reset-error {
    padding: 12px 14px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 10px;
    color: #fca5a5;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .reset-success {
    padding: 16px;
    background: rgba(13,148,136,0.1);
    border: 1px solid rgba(13,148,136,0.3);
    border-radius: 10px;
    color: #14b8a6;
    font-size: 14px;
    text-align: center;
  }
`;

export default function MerchantResetPassword() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/merchant/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setLocation("/merchant"), 1500);
      } else {
        setError(data.error || "Reset failed. The link may have expired.");
      }
    } catch {
      setError("Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="reset-root">
        <style>{CSS}</style>
        <div className="reset-bg">
          <div className="reset-card">
            <div className="reset-logo">
              <div className="reset-logo-mark">TCG</div>
              <div>
                <div className="reset-logo-text">Today Capital Group</div>
                <div className="reset-logo-sub">Merchant Portal</div>
              </div>
            </div>
            <div className="reset-title">Invalid Link</div>
            <div className="reset-sub">
              This reset link is invalid or has expired. Please request a new password reset from the login page.
            </div>
            <button className="reset-btn" onClick={() => setLocation("/merchant")}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-root">
      <style>{CSS}</style>
      <div className="reset-bg">
        <div className="reset-card">
          <div className="reset-logo">
            <div className="reset-logo-mark">TCG</div>
            <div>
              <div className="reset-logo-text">Today Capital Group</div>
              <div className="reset-logo-sub">Merchant Portal</div>
            </div>
          </div>

          {success ? (
            <div className="reset-success">
              Password reset successfully! Redirecting to your portal...
            </div>
          ) : (
            <>
              <div className="reset-title">Set New Password</div>
              <div className="reset-sub">
                Choose a new password for your merchant portal account.
              </div>

              {error && <div className="reset-error">{error}</div>}

              <label className="reset-label">New Password</label>
              <input
                className="reset-input"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="At least 6 characters"
              />

              <label className="reset-label">Confirm Password</label>
              <input
                className="reset-input"
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
                placeholder="Re-enter your password"
                onKeyDown={e => e.key === "Enter" && handleReset()}
              />

              <button
                className="reset-btn"
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
