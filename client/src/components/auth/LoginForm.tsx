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
          <img
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg"
            alt="Today Capital Group"
            style={{ width: 180, height: "auto", margin: "0 auto 16px", display: "block" }}
          />
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
