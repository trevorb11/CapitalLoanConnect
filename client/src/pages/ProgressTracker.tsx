import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Circle, ArrowRight, Phone, Loader2, Search, FileText, ClipboardList, Landmark, AlertCircle } from "lucide-react";
import { trackPageView } from "@/lib/analytics";

interface ProgressData {
  intakeCompleted: boolean;
  applicationCompleted: boolean;
  bankStatementsUploaded: boolean;
  bankStatementCount: number;
  hasPlaidConnection: boolean;
  applicationId: string;
  businessName: string;
  email: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function ProgressTracker() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    trackPageView('/check-status', 'Progress Tracker');
  }, []);

  const lookupMutation = useMutation({
    mutationFn: async (input: string) => {
      const response = await apiRequest("POST", "/api/applications/progress", { emailOrPhone: input });
      return response.json();
    },
    onSuccess: (data: ProgressData) => {
      setProgress(data);
      setError("");
    },
    onError: (err: Error) => {
      setError(err.message || "No application found with that email or phone number");
      setProgress(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOrPhone.trim().length < 3) {
      setError("Please enter a valid email or phone number");
      return;
    }
    lookupMutation.mutate(emailOrPhone);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Auto-format if it looks like a phone number (starts with digits)
    if (/^\d/.test(value.replace(/\D/g, ""))) {
      setEmailOrPhone(formatPhone(value));
    } else {
      setEmailOrPhone(value);
    }
  };

  const completedCount = progress ? 
    [progress.intakeCompleted, progress.applicationCompleted, progress.bankStatementsUploaded].filter(Boolean).length : 0;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#ffffff', color: '#1e293b', lineHeight: 1.7, minHeight: '100vh', fontSize: '1.05rem' }}>
      
      {/* Header */}
      <header style={{ backgroundColor: '#0f172a', padding: '0', height: '72px', display: 'flex', alignItems: 'center', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <img 
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg" 
            alt="Today Capital Group" 
            style={{ height: '40px', width: 'auto' }}
            data-testid="img-logo"
          />
          <a href="tel:8183510225" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={16} />
            (818) 351-0225
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: '#FFFFFF', marginBottom: '16px', letterSpacing: '-1px', lineHeight: 1.2 }}>
            Check Your Application Status
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: '#94a3b8', marginBottom: '32px' }}>
            Enter your email or phone number to see your progress
          </p>

          {/* Lookup Form */}
          <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type="text"
                value={emailOrPhone}
                onChange={handleInputChange}
                placeholder="Email or phone number"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  paddingLeft: '50px',
                  fontSize: '16px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                data-testid="input-email-phone"
              />
              <Search 
                size={20} 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'rgba(255,255,255,0.5)' 
                }} 
              />
            </div>
            
            <button
              type="submit"
              disabled={lookupMutation.isPending}
              style={{
                width: '100%',
                padding: '16px 24px',
                backgroundColor: '#0d9488',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '16px',
                border: 'none',
                borderRadius: '50px',
                cursor: lookupMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: lookupMutation.isPending ? 0.7 : 1,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              data-testid="button-check-status"
            >
              {lookupMutation.isPending ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  Check My Status
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {error && (
            <div style={{ 
              marginTop: '20px', 
              padding: '12px 20px', 
              backgroundColor: 'rgba(239, 68, 68, 0.2)', 
              borderRadius: '8px',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }} data-testid="error-message">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Progress Results */}
      {progress && (
        <section style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            
            {/* Welcome Message */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px',
              border: '1px solid #e2e8f0'
            }}>
              <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Welcome back{progress.businessName ? `, ${progress.businessName}` : ''}!
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                You've completed {completedCount} of 3 steps. {completedCount === 3 ? "Great job!" : "Complete the remaining steps to get funded faster."}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '20px', alignItems: 'start' }}>
              {/* Progress Checklist */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Your Progress</h3>
              </div>

                {/* Intake Form */}
              <div style={{ 
                padding: '20px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: progress.intakeCompleted ? 'rgba(13, 148, 136, 0.05)' : 'transparent'
              }} data-testid="progress-intake">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {progress.intakeCompleted ? (
                    <CheckCircle size={28} color="#0d9488" />
                  ) : (
                    <Circle size={28} color="#d1d5db" />
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ClipboardList size={18} color="#64748b" />
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>Intake Form</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                      {progress.intakeCompleted ? "Completed" : "Quick quiz about your business"}
                    </p>
                  </div>
                </div>
                {!progress.intakeCompleted && (
                  <Link href="/intake/quiz">
                    <button style={{
                      padding: '10px 20px',
                      backgroundColor: '#0d9488',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontSize: '14px',
                      border: 'none',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }} data-testid="button-start-intake">
                      Start <ArrowRight size={16} />
                    </button>
                  </Link>
                )}
              </div>

                {/* Full Application */}
              <div style={{ 
                padding: '20px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: progress.applicationCompleted ? 'rgba(13, 148, 136, 0.05)' : 'transparent'
              }} data-testid="progress-application">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {progress.applicationCompleted ? (
                    <CheckCircle size={28} color="#0d9488" />
                  ) : (
                    <Circle size={28} color="#d1d5db" />
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={18} color="#64748b" />
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>Full Application</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                      {progress.applicationCompleted ? "Completed" : "Complete your business details"}
                    </p>
                  </div>
                </div>
                {!progress.applicationCompleted && (
                  <Link href={progress.applicationId ? `/?applicationId=${progress.applicationId}` : "/"}>
                    <button style={{
                      padding: '10px 20px',
                      backgroundColor: '#0d9488',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontSize: '14px',
                      border: 'none',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }} data-testid="button-start-application">
                      {progress.intakeCompleted ? "Continue" : "Start"} <ArrowRight size={16} />
                    </button>
                  </Link>
                )}
              </div>

                {/* Bank Statements */}
              <div style={{ 
                padding: '20px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                backgroundColor: progress.bankStatementsUploaded ? 'rgba(13, 148, 136, 0.05)' : 'transparent'
              }} data-testid="progress-bank-statements">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {progress.bankStatementsUploaded ? (
                    <CheckCircle size={28} color="#0d9488" />
                  ) : (
                    <Circle size={28} color="#d1d5db" />
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Landmark size={18} color="#64748b" />
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>Bank Statements</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                      {progress.bankStatementsUploaded 
                        ? (progress.hasPlaidConnection 
                            ? "Bank connected via Plaid" 
                            : `${progress.bankStatementCount} statement${progress.bankStatementCount !== 1 ? 's' : ''} uploaded`)
                        : "Upload your recent bank statements"}
                    </p>
                  </div>
                </div>
                {!progress.bankStatementsUploaded && (
                  <Link href="/upload-statements">
                    <button style={{
                      padding: '10px 20px',
                      backgroundColor: '#0d9488',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontSize: '14px',
                      border: 'none',
                      borderRadius: '50px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }} data-testid="button-upload-statements">
                      Upload <ArrowRight size={16} />
                    </button>
                  </Link>
                )}
              </div>

              {/* Help Section */}
              <div style={{ 
                padding: '24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', textAlign: 'center' }}>
                  Need help completing your application?
                </p>
                <div style={{ textAlign: 'center' }}>
                  <a 
                    href="tel:8183510225" 
                    style={{ 
                      color: '#0d9488',
                      fontWeight: 600, 
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Phone size={16} />
                    (818) 351-0225
                  </a>
                </div>
              </div>
            </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Snapshot</h3>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Application ID: {progress.applicationId || 'Pending'}</p>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>Bank docs uploaded: {progress.bankStatementCount}</p>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: 0 }}>
                    Bank connected: {progress.hasPlaidConnection ? 'Yes' : 'Not yet'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Quick Actions</h3>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <Link href="/intake/quiz" style={{ color: '#0d9488', fontWeight: 500, textDecoration: 'none' }}>Go to Intake</Link>
                    <Link href="/full-application" style={{ color: '#0d9488', fontWeight: 500, textDecoration: 'none' }}>Open Full Application</Link>
                    <Link href="/upload-statements" style={{ color: '#0d9488', fontWeight: 500, textDecoration: 'none' }}>Upload Statements</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ backgroundColor: '#0f172a', padding: '40px 24px', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <img 
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg" 
            alt="Today Capital Group" 
            style={{ height: '32px', width: 'auto', marginBottom: '16px' }}
          />
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            © {new Date().getFullYear()} Today Capital Group. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
