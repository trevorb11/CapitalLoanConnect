import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential.trim()) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential: credential.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess();
      } else {
        setError(data.error || "Invalid credentials. Please try again.");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#192F56] to-[#19112D]">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          {/* Circular mark only — paths extracted from full logo SVG, viewBox cropped to 0 0 138 138 */}
          <svg width="60" height="60" viewBox="0 0 138 138" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", margin: "0 auto 12px" }}>
            <path d="M68.9304 23.0204C81.0586 23.0204 92.6901 27.8387 101.266 36.4146C109.842 44.9906 114.66 56.6221 114.66 68.7503H103.838C103.838 59.4921 100.16 50.613 93.6137 44.0665C87.0672 37.5201 78.1885 33.8423 68.9304 33.8422C59.6723 33.8422 50.7932 37.52 44.2467 44.0665C37.7001 50.613 34.0219 59.4921 34.0219 68.7503H23.2005C23.2005 56.6221 28.0184 44.9906 36.5943 36.4146C45.1703 27.8387 56.8022 23.0204 68.9304 23.0204Z" fill="white"/>
            <path d="M113.719 77.9733C111.93 86.6637 107.634 94.717 101.266 101.085C92.6901 109.661 81.0582 114.48 68.9299 114.48C56.8018 114.48 45.1702 109.661 36.5943 101.085C30.226 94.717 25.9307 86.6637 24.1409 77.9733H35.2631C36.851 83.7689 39.9231 89.11 44.2467 93.4335C50.7931 99.9799 59.6719 103.658 68.9299 103.658C78.1881 103.658 87.0672 99.98 93.6137 93.4335C97.9373 89.11 101.009 83.7689 102.597 77.9733H113.719Z" fill="white"/>
            <path d="M68.9304 0.0991211C106.845 0.0992593 137.581 30.835 137.581 68.7497L126.954 68.7503C126.954 36.7047 100.976 10.7262 68.9304 10.726C36.8848 10.726 10.9062 36.7041 10.9062 68.7497C10.9062 100.795 36.8848 126.773 68.9304 126.773C97.8369 126.773 121.805 105.635 126.224 77.9733H136.966C132.46 111.526 103.717 137.401 68.9304 137.401C31.0156 137.401 0.279297 106.665 0.279297 68.7497C0.279297 30.8349 31.0156 0.0991211 68.9304 0.0991211Z" fill="white"/>
            <path d="M63.6356 26.7058H74.2252V59.5267H63.6356V26.7058Z" fill="white"/>
            <path d="M107.046 77.9733V88.5629H74.2255V77.9733H107.046Z" fill="white"/>
          </svg>
          <p className="text-sm text-blue-200/70">Admin Dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: "28px 24px",
          }}
        >
          <div className="mb-5">
            <label className="block text-sm text-blue-100/80 mb-2 font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
              <Input
                type="password"
                value={credential}
                onChange={e => setCredential(e.target.value)}
                placeholder="Enter password"
                autoFocus
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-400/50 focus:ring-0"
                data-testid="input-password"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            data-testid="button-login"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
