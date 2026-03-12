import { useState } from "react";
import { useLocation, useSearch } from "wouter";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  .reset-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .reset-root {
    font-family: 'DM Sans', sans-serif;
    background: #080d18;
    color: #e8eaf0;
    min-height: 100vh;
  }

  .reset-bg {
    min-height: 100vh;
    background: radial-gradient(ellipse at 20% 0%, rgba(20, 184, 166, 0.12) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 100%, rgba(15, 23, 41, 0.9) 0%, transparent 60%),
                #080d18;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .reset-card {
    width: 100%;
    max-width: 420px;
    background: rgba(15, 23, 41, 0.8);
    border: 1px solid rgba(45, 212, 191, 0.2);
    border-radius: 20px;
    padding: 48px 40px;
    backdrop-filter: blur(20px);
    box-shadow: 0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(45,212,191,0.05) inset;
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
    background: linear-gradient(135deg, #14B8A6, #2dd4bf);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 16px;
    color: #080d18;
    flex-shrink: 0;
  }

  .reset-logo-text {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 13px;
    line-height: 1.3;
    color: #e8eaf0;
    letter-spacing: 0.02em;
  }

  .reset-logo-sub {
    font-size: 10px;
    color: #14B8A6;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .reset-title {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }

  .reset-sub {
    font-size: 14px;
    color: #7b8499;
    margin-bottom: 36px;
  }

  .reset-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #9ba3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }

  .reset-input {
    width: 100%;
    padding: 13px 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    color: #e8eaf0;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s;
    margin-bottom: 20px;
  }

  .reset-input:focus {
    border-color: rgba(45, 212, 191, 0.5);
    background: rgba(45,212,191,0.04);
  }

  .reset-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #14B8A6, #0d9488);
    border: none;
    border-radius: 10px;
    color: #080d18;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    letter-spacing: 0.02em;
  }

  .reset-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .reset-btn:active { transform: translateY(0); }
  .reset-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .reset-error {
    padding: 12px 14px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .reset-success {
    padding: 16px;
    background: rgba(20,184,166,0.1);
    border: 1px solid rgba(45,212,191,0.25);
    border-radius: 8px;
    color: #2dd4bf;
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
