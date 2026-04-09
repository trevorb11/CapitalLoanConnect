import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Lock,
  Landmark,
  ExternalLink,
  Calendar,
  Phone
} from "lucide-react";
import { Link, useSearch } from "wouter";
import tcgLogo from "@assets/TCG_White_logo_1764664150165.png";

const CHIRP_REQUEST_STORAGE_KEY = "tcg.chirp.pendingRequestCode";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

interface UploadedFile {
  id: string;
  originalFileName: string;
  fileSize: number;
}

export default function Statements() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchString = useSearch();

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showApplicationSuccess, setShowApplicationSuccess] = useState(false);
  const [pendingRequestCode, setPendingRequestCode] = useState<string | null>(null);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [pollExpired, setPollExpired] = useState(false);
  const pollStartRef = useRef<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const emailParam = params.get("email");
    const businessNameParam = params.get("businessName");
    const firstNameParam = params.get("firstName");
    const lastNameParam = params.get("lastName");
    const phoneParam = params.get("phone");
    const submittedParam = params.get("submitted");

    if (emailParam) setEmail(decodeURIComponent(emailParam));
    if (businessNameParam) setBusinessName(decodeURIComponent(businessNameParam));
    if (firstNameParam) setFirstName(decodeURIComponent(firstNameParam));
    if (lastNameParam) setLastName(decodeURIComponent(lastNameParam));
    if (phoneParam) setPhone(decodeURIComponent(phoneParam));
    if (submittedParam === "true") setShowApplicationSuccess(true);

    // Resume an in-flight Chirp verification if we stored one previously
    const storedCode = sessionStorage.getItem(CHIRP_REQUEST_STORAGE_KEY);
    if (storedCode) {
      setPendingRequestCode(storedCode);
      setAwaitingVerification(true);
      pollStartRef.current = Date.now();
    }
  }, [searchString]);

  // Polling effect - while awaiting Chirp verification, poll the status
  // endpoint every few seconds until we reach a terminal state.
  useEffect(() => {
    if (!awaitingVerification || !pendingRequestCode) return;

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;

      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        setPollExpired(true);
        return;
      }

      try {
        const res = await apiRequest("GET", `/api/chirp/status/${pendingRequestCode}`);
        const data = await res.json();
        if (cancelled) return;

        if (data.status === "Verified") {
          sessionStorage.removeItem(CHIRP_REQUEST_STORAGE_KEY);
          queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
          setAwaitingVerification(false);
          setVerificationSuccess(true);
          toast({ title: "Bank Verified", description: "Your bank has been verified successfully!" });
          return;
        }

        if (data.status === "Rejected" || data.status === "Expired") {
          sessionStorage.removeItem(CHIRP_REQUEST_STORAGE_KEY);
          setAwaitingVerification(false);
          setPendingRequestCode(null);
          toast({
            title: "Verification Failed",
            description: `Verification was ${data.status.toLowerCase()}. Please try again.`,
            variant: "destructive",
          });
          return;
        }
      } catch (err) {
        console.warn("[CHIRP POLL] Transient error:", err);
      }

      if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
    };

    const handle = setTimeout(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [awaitingVerification, pendingRequestCode, toast]);

  const createChirpRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chirp/create-request", {
        firstName,
        lastName,
        email,
        phone,
        businessName,
        useAIAnalysis: true,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.requestCode || !data.verificationUrl) {
        toast({
          title: "Connection Error",
          description: "Chirp did not return a verification URL. Please try again.",
          variant: "destructive",
        });
        return;
      }
      sessionStorage.setItem(CHIRP_REQUEST_STORAGE_KEY, data.requestCode);
      setPendingRequestCode(data.requestCode);
      setAwaitingVerification(true);
      pollStartRef.current = Date.now();
      window.open(data.verificationUrl, "_blank", "noopener,noreferrer");
    },
    onError: () => {
      toast({
        title: "Connection Error",
        description: "Failed to initialize bank verification. Please try again later.",
        variant: "destructive",
      });
    }
  });

  const handleConnectBank = () => {
    if (!email || !firstName || !lastName || !phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in first name, last name, email, and phone before verifying.",
        variant: "destructive",
      });
      return;
    }
    createChirpRequestMutation.mutate();
  };

  const handleCheckNow = async () => {
    if (!pendingRequestCode) return;
    try {
      const res = await apiRequest("GET", `/api/chirp/status/${pendingRequestCode}`);
      const data = await res.json();
      if (data.status === "Verified") {
        sessionStorage.removeItem(CHIRP_REQUEST_STORAGE_KEY);
        queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
        setAwaitingVerification(false);
        setVerificationSuccess(true);
      } else {
        toast({
          title: "Still waiting",
          description: `Current status: ${data.status}. Complete verification in the other tab and try again.`,
        });
      }
    } catch (err) {
      toast({ title: "Check Failed", description: "Couldn't check verification status right now.", variant: "destructive" });
    }
  };

  const handleCancelAwaiting = () => {
    sessionStorage.removeItem(CHIRP_REQUEST_STORAGE_KEY);
    setPendingRequestCode(null);
    setAwaitingVerification(false);
    setPollExpired(false);
  };

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

  if (awaitingVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
        <Card className="w-full max-w-xl p-8 bg-card/95 backdrop-blur text-center">
          {pollExpired ? (
            <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" data-testid="icon-poll-expired" />
          ) : (
            <Loader2 className="w-16 h-16 animate-spin text-[#5FBFB8] mx-auto mb-4" data-testid="loader-awaiting" />
          )}
          <h2 className="text-2xl font-bold mb-2">
            {pollExpired ? "Still Waiting?" : "Verifying Your Bank"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {pollExpired
              ? "We haven't received verification yet. If you've finished in the other tab, check now."
              : "Complete bank verification in the tab that just opened. We'll detect it automatically."}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleCheckNow} data-testid="button-check-now">
              Check Verification Status
            </Button>
            <Button variant="outline" onClick={handleCancelAwaiting} data-testid="button-cancel-awaiting">
              Start Over
            </Button>
          </div>
          {pendingRequestCode && (
            <p className="text-xs text-muted-foreground mt-4" data-testid="text-request-code">
              Request code: {pendingRequestCode}
            </p>
          )}
        </Card>
      </div>
    );
  }

  if (verificationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
        <Card className="w-full max-w-xl p-8 bg-card/95 backdrop-blur text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold mb-3" data-testid="text-verification-success-title">
            Bank Verified Successfully
          </h1>

          <p className="text-muted-foreground mb-6">
            Your bank account has been securely verified. We can now access your statements for underwriting.
          </p>

          {/* Schedule a Call CTA - Primary action after bank connection */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-center mb-2">What's Next?</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Schedule a call with one of our funding specialists to discuss your options and get answers to any questions.
            </p>
            <a 
              href="https://bit.ly/3Zxj0Kq" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full" data-testid="button-schedule-call-verification-success">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule a Call with a Funding Specialist
              </Button>
            </a>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-go-to-application">
                <FileText className="w-4 h-4 mr-2" />
                Go to Application
              </Button>
            </Link>
            
            <a href="https://www.todaycapitalgroup.com/#contact-us" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" className="w-full" data-testid="button-contact-team">
                <Mail className="w-4 h-4 mr-2" />
                Get in Touch with Our Team
              </Button>
            </a>
          </div>
        </Card>
      </div>
    );
  }

  if (isSubmitted && uploadedFiles.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
        <Card className="w-full max-w-xl p-8 bg-card/95 backdrop-blur text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold mb-3" data-testid="text-upload-success-title">
            Statements Uploaded Successfully
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Your bank statements have been received and will be reviewed by our team.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-3 text-left">Uploaded Files:</h3>
            <ul className="space-y-2">
              {uploadedFiles.map((file) => (
                <li 
                  key={file.id} 
                  className="flex items-center gap-3 text-sm text-left"
                  data-testid={`text-uploaded-file-${file.id}`}
                >
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="truncate flex-1">{file.originalFileName}</span>
                  <span className="text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Schedule a Call CTA - Primary action after upload */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-center mb-2">What's Next?</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Schedule a call with one of our funding specialists to discuss your options and get answers to any questions.
            </p>
            <a 
              href="https://bit.ly/3Zxj0Kq" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full" data-testid="button-schedule-call-success">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule a Call with a Funding Specialist
              </Button>
            </a>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              variant="outline"
              onClick={() => {
                setIsSubmitted(false);
                setUploadedFiles([]);
              }}
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

          {showApplicationSuccess && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/20 border border-green-500/40" data-testid="success-banner">
              <div className="flex items-center justify-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-semibold text-green-400">Application Received!</h2>
              </div>
              <p className="text-white/80 text-sm">
                Your funding application has been submitted successfully. Please provide your bank statements below to complete your application.
              </p>
            </div>
          )}

          <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-page-title">
            Provide Bank Statements
          </h1>
          <p className="text-white/70 mb-6">
            {showApplicationSuccess
              ? "Connect your bank or upload your last 3-6 months of statements to finalize your application"
              : "Securely provide your business bank statements for review"}
          </p>

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
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  data-testid="input-last-name"
                />
              </div>
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-center">
                Choose Your Method
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                <div className="border-2 border-[#5FBFB8] rounded-xl p-6 hover-elevate transition-all">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-[#5FBFB8]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-6 h-6 text-[#5FBFB8]" />
                    </div>
                    <h4 className="font-semibold">Instant Verification</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Verify your bank securely in seconds
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleConnectBank}
                    disabled={createChirpRequestMutation.isPending}
                    className="w-full bg-[#5FBFB8] hover:bg-[#4ca8a1] text-white"
                    data-testid="button-connect-bank"
                  >
                    {createChirpRequestMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    Verify Bank
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Fast & automatic verification
                  </p>
                </div>

                <div className="hidden md:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="bg-card px-3 py-1 border rounded-full text-sm text-muted-foreground font-medium">
                    or
                  </div>
                </div>

                <div className="md:hidden text-center py-2">
                  <span className="text-sm text-muted-foreground font-medium">or</span>
                </div>

                <div className="border-2 border-muted rounded-xl p-6 hover-elevate transition-all">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold">Upload Statements</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload PDF bank statements
                    </p>
                  </div>
                  
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                      isDragging 
                        ? "border-primary bg-primary/10" 
                        : "border-muted-foreground/30 hover:border-primary/50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
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

                    <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click or drag PDFs here
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Max 25MB per file</p>
                  </div>
                </div>
              </div>
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
                      Upload {selectedFiles.length} Statement{selectedFiles.length > 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Secondary CTA - Schedule a call */}
            <div className="pt-4 border-t">
              <div className="text-center mb-3">
                <span className="text-sm text-muted-foreground">Prefer to talk to someone first?</span>
              </div>
              <a 
                href="https://bit.ly/3Zxj0Kq" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full" data-testid="button-schedule-call">
                  <Phone className="w-4 h-4 mr-2" />
                  Schedule a Call with a Funding Specialist
                </Button>
              </a>
            </div>

            <div className="pt-3">
              <Link href="/">
                <Button variant="ghost" className="w-full text-muted-foreground" data-testid="button-cancel">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-5 text-left border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400" />
            Your Information is Protected
          </h3>
          <p className="text-white/70 text-sm leading-relaxed">
            We take your privacy seriously. All uploaded documents are encrypted using bank-level 256-bit SSL encryption and stored on secure servers. Instant verification uses the same security as your bank.
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/50">
            We recommend providing your last 3-6 months of business bank statements
          </p>
        </div>
      </div>
    </div>
  );
}
