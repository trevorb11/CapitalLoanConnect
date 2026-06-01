import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Building2,
  Mail,
  X,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  AlertTriangle,
  DollarSign,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link, useSearch, useLocation } from "wouter";
import tcgLogo from "@assets/TCG_White_logo_1764664150165.png";

interface UploadedFile {
  id: string;
  originalFileName: string;
  fileSize: number;
}

interface UnderwritingSnapshot {
  worthSubmitting: boolean;
  confidence: 'high' | 'medium' | 'low';
  overallScore: number;
  qualificationTier: string;
  avgMonthlyRevenue: number;
  revenueTrend: 'growing' | 'stable' | 'declining';
  avgDailyBalance: number;
  lowestBalance: number;
  nsfCount: number;
  negativeDays: number;
  existingPositions: Array<{ funder: string; estimatedPayment: string; frequency: string }>;
  totalMonthlyDebtPayments: number;
  debtServiceRatio: number;
  redFlags: Array<{ flag: string; severity: 'low' | 'medium' | 'high' }>;
  positiveIndicators: string[];
  maxRecommendedAdvance: number;
  recommendedProduct: string;
  estimatedFactor: string;
  summary: string;
  underwriterNotes: string[];
}

export default function BankStatementsUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchString = useSearch();

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showApplicationSuccess, setShowApplicationSuccess] = useState(false);
  const [submittedToUnderwriting, setSubmittedToUnderwriting] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [snapshot, setSnapshot] = useState<UnderwritingSnapshot | null>(null);
  const [reportExpanded, setReportExpanded] = useState(true);

  // Read URL parameters and pre-fill form
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const emailParam = params.get("email");
    const businessNameParam = params.get("businessName");
    const submittedParam = params.get("submitted");
    const internalParam = params.get("internal");

    if (emailParam) setEmail(decodeURIComponent(emailParam));
    if (businessNameParam) setBusinessName(decodeURIComponent(businessNameParam));
    if (submittedParam === "true") setShowApplicationSuccess(true);
    if (internalParam === "true") setIsInternal(true);
  }, [searchString]);

  // Build HTML representation of snapshot for email
  const buildSnapshotHtml = (s: UnderwritingSnapshot): string => {
    const verdict = s.worthSubmitting
      ? `<span style="color:#16a34a;font-weight:bold;">YES — Worth Submitting</span>`
      : `<span style="color:#dc2626;font-weight:bold;">NO — Do Not Submit</span>`;
    const trendIcon = s.revenueTrend === 'growing' ? '↑' : s.revenueTrend === 'declining' ? '↓' : '→';
    const positionsHtml = s.existingPositions.length > 0
      ? s.existingPositions.map(p => `<li>${p.funder} — ${p.estimatedPayment} (${p.frequency})</li>`).join('')
      : '<li>None detected</li>';
    const redFlagsHtml = s.redFlags.length > 0
      ? s.redFlags.map(f => `<li>[${f.severity.toUpperCase()}] ${f.flag}</li>`).join('')
      : '<li>None</li>';
    const positivesHtml = s.positiveIndicators.slice(0, 5).map(p => `<li>${p}</li>`).join('');
    const notesHtml = s.underwriterNotes.map(n => `<li>${n}</li>`).join('');

    return `
      <p><strong>Verdict:</strong> ${verdict} &nbsp;|&nbsp; <strong>Score:</strong> ${s.overallScore}/100 &nbsp;|&nbsp; <strong>Tier:</strong> ${s.qualificationTier} &nbsp;|&nbsp; <strong>Confidence:</strong> ${s.confidence}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:8px 0;">
        <tr><td style="padding:4px 8px;font-weight:bold;">Avg Monthly Revenue</td><td style="padding:4px 8px;">$${s.avgMonthlyRevenue.toLocaleString()} ${trendIcon}</td>
            <td style="padding:4px 8px;font-weight:bold;">Avg Daily Balance</td><td style="padding:4px 8px;">$${s.avgDailyBalance.toLocaleString()}</td></tr>
        <tr style="background:#eef2ff;"><td style="padding:4px 8px;font-weight:bold;">NSF Count</td><td style="padding:4px 8px;">${s.nsfCount}</td>
            <td style="padding:4px 8px;font-weight:bold;">Negative Days</td><td style="padding:4px 8px;">${s.negativeDays}</td></tr>
        <tr><td style="padding:4px 8px;font-weight:bold;">Existing Debt/mo</td><td style="padding:4px 8px;">$${s.totalMonthlyDebtPayments.toLocaleString()}</td>
            <td style="padding:4px 8px;font-weight:bold;">Debt Service Ratio</td><td style="padding:4px 8px;">${Math.round(s.debtServiceRatio * 100)}%</td></tr>
        <tr style="background:#eef2ff;"><td style="padding:4px 8px;font-weight:bold;">Max Advance</td><td style="padding:4px 8px;">$${s.maxRecommendedAdvance.toLocaleString()}</td>
            <td style="padding:4px 8px;font-weight:bold;">Product / Factor</td><td style="padding:4px 8px;">${s.recommendedProduct} @ ${s.estimatedFactor}</td></tr>
      </table>
      <p><strong>Existing Positions:</strong></p><ul style="margin:4px 0;padding-left:20px;">${positionsHtml}</ul>
      <p><strong>Red Flags:</strong></p><ul style="margin:4px 0;padding-left:20px;">${redFlagsHtml}</ul>
      <p><strong>Positives:</strong></p><ul style="margin:4px 0;padding-left:20px;">${positivesHtml}</ul>
      <p><strong>Underwriter Notes:</strong></p><ul style="margin:4px 0;padding-left:20px;">${notesHtml}</ul>
      <p style="margin-top:8px;font-style:italic;color:#444;">${s.summary}</p>
    `;
  };

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/bank-statements/analyze-for-rep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, businessName }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Analysis failed");
      }
      return response.json() as Promise<{ success: boolean; snapshot: UnderwritingSnapshot; filesProcessed: number }>;
    },
    onSuccess: (data) => {
      setSnapshot(data.snapshot);
      setReportExpanded(true);
      toast({
        title: "Report Ready",
        description: `Analyzed ${data.filesProcessed} statement${data.filesProcessed !== 1 ? 's' : ''}.`,
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("Authentication")) {
        toast({
          title: "Sign In Required",
          description: "Log into the dashboard to generate an AI report.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const submitToUnderwritingMutation = useMutation({
    mutationFn: async () => {
      const snapshotHtml = snapshot ? buildSnapshotHtml(snapshot) : undefined;
      const response = await fetch("/api/bank-statements/submit-to-underwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, businessName, snapshotHtml }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }
      return response.json();
    },
    onSuccess: () => {
      setSubmittedToUnderwriting(true);
      toast({
        title: "Submitted to Underwriting",
        description: snapshot
          ? "Email sent with full application details, statements, and AI snapshot."
          : "underwriting@todaycapitalgroup.com has been notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", email);
      formData.append("businessName", businessName);

      const response = await fetch("/api/bank-statements/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setUploadedFiles((prev) => [...prev, data.upload]);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    if (file.size > 25 * 1024 * 1024) {
      return "File size must be under 25MB";
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addFiles = (files: File[]) => {
    const validFiles: File[] = [];
    
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid File",
          description: `${file.name}: ${error}`,
          variant: "destructive",
        });
      } else {
        validFiles.push(file);
      }
    }
    
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one bank statement PDF to upload",
        variant: "destructive",
      });
      return;
    }

    setUploadProgress(0);
    const totalFiles = selectedFiles.length;
    
    for (let i = 0; i < totalFiles; i++) {
      await uploadMutation.mutateAsync(selectedFiles[i]);
      setUploadProgress(((i + 1) / totalFiles) * 100);
    }
    
    setSelectedFiles([]);
    setIsSubmitted(true);
    
    toast({
      title: "Upload Complete",
      description: `Successfully uploaded ${totalFiles} statement${totalFiles > 1 ? "s" : ""}`,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isSubmitted && uploadedFiles.length > 0) {
    // ── INTERNAL / REP SUCCESS SCREEN ──────────────────────────────────────
    if (isInternal) {
      const scoreColor = snapshot
        ? snapshot.overallScore >= 70 ? 'text-green-500' : snapshot.overallScore >= 45 ? 'text-yellow-500' : 'text-red-500'
        : '';
      const trendIcon = snapshot?.revenueTrend === 'growing'
        ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
        : snapshot?.revenueTrend === 'declining'
          ? <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          : <Minus className="w-3.5 h-3.5 text-muted-foreground" />;

      return (
        <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D] py-8 px-4">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Header card */}
            <Card className="p-6 bg-card/95 backdrop-blur" data-testid="card-rep-success">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold" data-testid="text-upload-success-title">
                    {uploadedFiles.length} Statement{uploadedFiles.length !== 1 ? 's' : ''} Uploaded
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {businessName && <span className="font-medium text-foreground">{businessName}</span>}
                    {businessName && email && ' · '}
                    {email}
                  </p>
                </div>
              </div>

              {/* File list */}
              <ul className="mt-4 space-y-1.5">
                {uploadedFiles.map((file) => (
                  <li key={file.id} className="flex items-center gap-2 text-sm" data-testid={`text-uploaded-file-${file.id}`}>
                    <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="truncate flex-1 text-muted-foreground">{file.originalFileName}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Action cards */}
            {!submittedToUnderwriting && (
              <div className="grid grid-cols-1 gap-3">
                <p className="text-sm text-white/60 text-center">What would you like to do next?</p>

                {/* Get Statement Report */}
                {!snapshot && (
                  <Card className="p-5 bg-card/95 backdrop-blur border-primary/30" data-testid="card-action-report">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-base">Get Statement Report</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Claude analyzes the statements and gives you a quick underwriting snapshot — revenue, positions, red flags, and whether the file is worth submitting.
                        </p>
                        <Button
                          className="mt-3 w-full"
                          onClick={() => generateReportMutation.mutate()}
                          disabled={generateReportMutation.isPending}
                          data-testid="button-get-report"
                        >
                          {generateReportMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing statements...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Get Statement Report
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Submit to Underwriting */}
                <Card className="p-5 bg-card/95 backdrop-blur" data-testid="card-action-submit">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-base">Submit to Underwriting</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {snapshot
                          ? "Send the application details, bank statements, and AI snapshot to the underwriting team."
                          : "Send the application details and bank statements to underwriting@todaycapitalgroup.com."}
                        {snapshot && (
                          <span className="ml-1 text-primary font-medium">Includes AI report.</span>
                        )}
                      </p>
                      <Button
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => submitToUnderwritingMutation.mutate()}
                        disabled={submitToUnderwritingMutation.isPending}
                        data-testid="button-submit-to-underwriting"
                      >
                        {submitToUnderwritingMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Submit to Underwriting
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Close */}
                <Button
                  variant="ghost"
                  className="w-full text-white/60"
                  onClick={() => {
                    setIsSubmitted(false);
                    setUploadedFiles([]);
                    setSubmittedToUnderwriting(false);
                    setSnapshot(null);
                  }}
                  data-testid="button-close-upload"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close / Upload More
                </Button>
              </div>
            )}

            {/* Submitted confirmation */}
            {submittedToUnderwriting && (
              <Card className="p-5 bg-card/95 backdrop-blur" data-testid="card-submitted-confirmation">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Submitted to Underwriting</h2>
                    <p className="text-sm text-muted-foreground">underwriting@todaycapitalgroup.com has been notified{snapshot ? ' with the AI snapshot included' : ''}.</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsSubmitted(false);
                    setUploadedFiles([]);
                    setSubmittedToUnderwriting(false);
                    setSnapshot(null);
                  }}
                  data-testid="button-upload-another"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Another File
                </Button>
              </Card>
            )}

            {/* AI Snapshot Report */}
            {snapshot && (
              <Card className="bg-card/95 backdrop-blur overflow-hidden" data-testid="card-snapshot-report">
                <button
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => setReportExpanded(v => !v)}
                  data-testid="button-toggle-report"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <div>
                      <span className="font-semibold">AI Underwriting Snapshot</span>
                      <span className={`ml-2 text-sm font-bold ${scoreColor}`}>{snapshot.overallScore}/100</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {snapshot.worthSubmitting ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-green-500">
                        <ThumbsUp className="w-4 h-4" /> Worth Submitting
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                        <ThumbsDown className="w-4 h-4" /> Do Not Submit
                      </span>
                    )}
                    {reportExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {reportExpanded && (
                  <div className="px-5 pb-5 space-y-5 border-t border-border">
                    {/* Key metrics grid */}
                    <div className="grid grid-cols-2 gap-3 pt-4">
                      <div className="bg-muted/40 rounded-md p-3">
                        <p className="text-xs text-muted-foreground mb-1">Avg Monthly Revenue</p>
                        <p className="font-semibold flex items-center gap-1">
                          ${snapshot.avgMonthlyRevenue.toLocaleString()}
                          {trendIcon}
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <p className="text-xs text-muted-foreground mb-1">Avg Daily Balance</p>
                        <p className="font-semibold">${snapshot.avgDailyBalance.toLocaleString()}</p>
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <p className="text-xs text-muted-foreground mb-1">NSFs / Neg. Days</p>
                        <p className={`font-semibold ${snapshot.nsfCount > 3 ? 'text-red-500' : snapshot.nsfCount > 0 ? 'text-yellow-500' : ''}`}>
                          {snapshot.nsfCount} NSFs · {snapshot.negativeDays} days
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <p className="text-xs text-muted-foreground mb-1">Debt Service Ratio</p>
                        <p className={`font-semibold ${snapshot.debtServiceRatio > 0.4 ? 'text-red-500' : snapshot.debtServiceRatio > 0.25 ? 'text-yellow-500' : ''}`}>
                          {Math.round(snapshot.debtServiceRatio * 100)}% of revenue
                        </p>
                      </div>
                    </div>

                    {/* Existing positions */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        Existing Positions ({snapshot.existingPositions.length})
                        {snapshot.totalMonthlyDebtPayments > 0 && (
                          <span className="text-xs text-muted-foreground font-normal">
                            ~${snapshot.totalMonthlyDebtPayments.toLocaleString()}/mo total
                          </span>
                        )}
                      </h3>
                      {snapshot.existingPositions.length > 0 ? (
                        <ul className="space-y-1">
                          {snapshot.existingPositions.map((p, i) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                              <span className="font-medium">{p.funder}</span>
                              <span className="text-muted-foreground">— {p.estimatedPayment} ({p.frequency})</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-green-500">No existing positions detected</p>
                      )}
                    </div>

                    {/* Red flags */}
                    {snapshot.redFlags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          Red Flags
                        </h3>
                        <ul className="space-y-1">
                          {snapshot.redFlags.map((f, i) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                f.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                                f.severity === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                'bg-muted text-muted-foreground'
                              }`}>{f.severity}</span>
                              {f.flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Positives */}
                    {snapshot.positiveIndicators.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Positive Indicators
                        </h3>
                        <ul className="space-y-1">
                          {snapshot.positiveIndicators.slice(0, 5).map((p, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 mt-1.5" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendation */}
                    <div className="bg-muted/40 rounded-md p-4">
                      <h3 className="text-sm font-semibold mb-2">Recommendation</h3>
                      <div className="flex flex-wrap gap-3 text-sm mb-2">
                        <span><span className="text-muted-foreground">Max Advance:</span> <span className="font-medium">${snapshot.maxRecommendedAdvance.toLocaleString()}</span></span>
                        <span><span className="text-muted-foreground">Product:</span> <span className="font-medium">{snapshot.recommendedProduct}</span></span>
                        <span><span className="text-muted-foreground">Factor:</span> <span className="font-medium">{snapshot.estimatedFactor}</span></span>
                        <span><span className="text-muted-foreground">Tier:</span> <span className="font-medium">{snapshot.qualificationTier}</span></span>
                      </div>
                      <p className="text-sm text-muted-foreground italic leading-relaxed">{snapshot.summary}</p>
                    </div>

                    {/* Underwriter notes */}
                    {snapshot.underwriterNotes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Notes for Underwriter</h3>
                        <ul className="space-y-1">
                          {snapshot.underwriterNotes.map((n, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">·</span>
                              {n}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

          </div>
        </div>
      );
    }

    // ── CLIENT / PUBLIC SUCCESS SCREEN ─────────────────────────────────────
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
        <Card className="w-full max-w-xl p-8 bg-card/95 backdrop-blur text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold mb-3" data-testid="text-upload-success-title">
            Thank you!
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Your bank statements have been received. We should have an answer on financing options for you within 48 hours.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-3 text-left">Uploaded Files:</h3>
            <ul className="space-y-2">
              {uploadedFiles.map((file) => (
                <li key={file.id} className="flex items-center gap-3 text-sm text-left" data-testid={`text-uploaded-file-${file.id}`}>
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="truncate flex-1">{file.originalFileName}</span>
                  <span className="text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              variant="outline"
              onClick={() => { setIsSubmitted(false); setUploadedFiles([]); }}
              data-testid="button-upload-more"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload More Statements
            </Button>
            <Link href="/">
              <Button variant="ghost" className="w-full" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Have questions?{" "}
            <a href="https://bit.ly/3Zxj0Kq" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" data-testid="link-schedule-call-success">
              Schedule a call with a funding specialist
            </a>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <img
            src={tcgLogo}
            alt="Today Capital Group"
            className="h-16 mx-auto mb-6"
            data-testid="img-logo"
          />

          {/* Application Submitted Success Banner */}
          {showApplicationSuccess && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/20 border border-green-500/40" data-testid="success-banner">
              <div className="flex items-center justify-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-semibold text-green-400">Application Received!</h2>
              </div>
              <p className="text-white/80 text-sm">
                Your funding application has been submitted successfully. Please upload your bank statements below to complete your application.
              </p>
            </div>
          )}

          <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-page-title">
            Upload Bank Statements
          </h1>
          <p className="text-white/70 mb-6">
            {showApplicationSuccess
              ? "Upload your last 3-6 months of business bank statements to finalize your application"
              : "Securely upload your business bank statements for review"}
          </p>

          {/* Why We Need Bank Statements Section */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-5 text-left border border-white/10 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Why We Need Your Bank Statements
            </h2>
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              Bank statements help us quickly assess your business's financial health and determine the best funding options available to you. By reviewing your recent transaction history, we can:
            </p>
            <ul className="text-white/70 text-sm space-y-2 ml-4 mb-4">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Verify your monthly revenue and cash flow patterns</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Match you with the right funding product for your needs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Speed up the approval process — often within 24-48 hours</span>
              </li>
            </ul>
          </div>
        </div>

        <Card className="p-6 bg-card/95 backdrop-blur">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Business Name
                </Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your Business Name"
                  data-testid="input-business-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? "border-primary bg-primary/10" 
                  : "border-muted-foreground/30 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone-files"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />

              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              
              <p className="text-lg font-medium mb-2">
                Drag & drop your bank statements here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse (PDF only, max 25MB per file)
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-browse-files"
              >
                <FileText className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
                <ul className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <li 
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                      data-testid={`card-selected-file-${index}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        data-testid={`button-remove-file-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSubmit}
                disabled={uploadMutation.isPending || selectedFiles.length === 0 || !email}
                className="w-full"
                data-testid="button-submit-upload"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {selectedFiles.length > 0 ? `${selectedFiles.length} Statement${selectedFiles.length > 1 ? "s" : ""}` : "Statements"}
                  </>
                )}
              </Button>

              <Link href="/">
                <Button variant="ghost" className="w-full text-muted-foreground" data-testid="button-cancel">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Your Information is Protected Section */}
        <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-5 text-left border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400" />
            Your Information is Protected
          </h3>
          <p className="text-white/70 text-sm leading-relaxed">
            We take your privacy seriously. All uploaded documents are encrypted using bank-level 256-bit SSL encryption and stored on secure servers.
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/50">
            We recommend uploading your last 3-6 months of business bank statements
          </p>
          <p className="text-xs text-white/40 mt-3">
            Have questions?{" "}
            <a 
              href="https://bit.ly/3Zxj0Kq" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary/80 hover:text-primary hover:underline"
              data-testid="link-schedule-call"
            >
              Schedule a call with a funding specialist
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
