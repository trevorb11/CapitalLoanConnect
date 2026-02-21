import { useState, useRef } from "react";
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
  X,
  PartyPopper,
  CreditCard,
  IdCard,
  ShieldCheck,
  Image,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import tcgLogo from "@assets/TCG_White_logo_1764664150165.png";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) {
    return <Image className="w-5 h-5 text-primary flex-shrink-0" />;
  }
  return <FileText className="w-5 h-5 text-primary flex-shrink-0" />;
}

export default function Congratulations() {
  const { toast } = useToast();
  const searchString = useSearch();
  const voidedCheckInputRef = useRef<HTMLInputElement>(null);
  const driversLicenseInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill from URL params if available
  const params = new URLSearchParams(searchString);
  const [email, setEmail] = useState(params.get("email") ? decodeURIComponent(params.get("email")!) : "");
  const [businessName, setBusinessName] = useState(params.get("businessName") ? decodeURIComponent(params.get("businessName")!) : "");

  const [voidedCheckFile, setVoidedCheckFile] = useState<File | null>(null);
  const [driversLicenseFile, setDriversLicenseFile] = useState<File | null>(null);
  const [isDraggingCheck, setIsDraggingCheck] = useState(false);
  const [isDraggingLicense, setIsDraggingLicense] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, docType }: { file: File; docType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", email);
      formData.append("businessName", businessName);
      formData.append("docType", docType);

      const response = await fetch("/api/congratulations/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      return response.json();
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
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Only PDF, JPG, PNG, or WebP files are allowed";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be under 25MB";
    }
    return null;
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateFile(file);
    if (error) {
      toast({ title: "Invalid File", description: error, variant: "destructive" });
    } else {
      setFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = (
    e: React.DragEvent,
    setFile: (f: File | null) => void,
    setDragging: (v: boolean) => void,
  ) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const error = validateFile(file);
    if (error) {
      toast({ title: "Invalid File", description: error, variant: "destructive" });
    } else {
      setFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!email) {
      toast({ title: "Email Required", description: "Please enter your email address", variant: "destructive" });
      return;
    }
    if (!voidedCheckFile) {
      toast({ title: "Voided Check Required", description: "Please upload a voided check", variant: "destructive" });
      return;
    }
    if (!driversLicenseFile) {
      toast({ title: "Driver's License Required", description: "Please upload a copy of your driver's license", variant: "destructive" });
      return;
    }

    setUploadProgress(0);

    await uploadMutation.mutateAsync({ file: voidedCheckFile, docType: "voided_check" });
    setUploadProgress(50);

    await uploadMutation.mutateAsync({ file: driversLicenseFile, docType: "drivers_license" });
    setUploadProgress(100);

    setIsComplete(true);
    toast({ title: "Documents Uploaded", description: "All documents have been submitted successfully" });
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
        <Card className="w-full max-w-xl p-8 bg-card/95 backdrop-blur text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold mb-3">You're All Set!</h1>

          <p className="text-muted-foreground mb-6">
            We've received your voided check and driver's license. Your funding is now being finalized and you'll hear from us shortly with next steps.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-3 text-left">Documents Received:</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-3 text-sm text-left">
                <CreditCard className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="truncate flex-1">Voided Check</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </li>
              <li className="flex items-center gap-3 text-sm text-left">
                <IdCard className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="truncate flex-1">Driver's License</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </li>
            </ul>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 mb-6 text-left">
            <h3 className="font-semibold text-foreground mb-3">What Happens Next?</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Final Verification</p>
                  <p className="text-sm text-muted-foreground">Our team will verify your documents</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Contract & Agreement</p>
                  <p className="text-sm text-muted-foreground">You'll receive the final funding agreement to sign</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Funds Deposited</p>
                  <p className="text-sm text-muted-foreground">Funds will be deposited directly to your account</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Have questions?{" "}
            <a
              href="https://bit.ly/3Zxj0Kq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
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
          />

          <div className="mb-6 p-4 rounded-lg bg-green-500/20 border border-green-500/40">
            <div className="flex items-center justify-center gap-3 mb-2">
              <PartyPopper className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-green-400">Congratulations!</h2>
              <PartyPopper className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-white/80 text-sm">
              Your funding has been approved! Just two quick uploads below and you're all set to receive your new funding.
            </p>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Final Steps
          </h1>
          <p className="text-white/70 mb-6">
            Please upload a voided check and a copy of your driver's license to finalize your funding.
          </p>
        </div>

        <Card className="p-6 bg-card/95 backdrop-blur">
          <div className="space-y-6">
            {/* Business info fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your Business Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            {/* Voided Check Upload */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Voided Check</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload a voided check so we can set up your direct deposit for funding.
              </p>

              {voidedCheckFile ? (
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(voidedCheckFile)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{voidedCheckFile.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(voidedCheckFile.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setVoidedCheckFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    isDraggingCheck
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/30 hover:border-primary/50"
                  }`}
                  onDrop={(e) => handleDrop(e, setVoidedCheckFile, setIsDraggingCheck)}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingCheck(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingCheck(false); }}
                  onClick={() => voidedCheckInputRef.current?.click()}
                >
                  <input
                    ref={voidedCheckInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={(e) => handleFileSelect(e, setVoidedCheckFile)}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium mb-1">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, or PNG (max 25MB)
                  </p>
                </div>
              )}
            </div>

            {/* Driver's License Upload */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Driver's License</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload a clear photo or scan of your valid driver's license (front side).
              </p>

              {driversLicenseFile ? (
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(driversLicenseFile)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{driversLicenseFile.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(driversLicenseFile.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDriversLicenseFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    isDraggingLicense
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/30 hover:border-primary/50"
                  }`}
                  onDrop={(e) => handleDrop(e, setDriversLicenseFile, setIsDraggingLicense)}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingLicense(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingLicense(false); }}
                  onClick={() => driversLicenseInputRef.current?.click()}
                >
                  <input
                    ref={driversLicenseInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={(e) => handleFileSelect(e, setDriversLicenseFile)}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium mb-1">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, or PNG (max 25MB)
                  </p>
                </div>
              )}
            </div>

            {/* Upload progress */}
            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading documents...
                  </span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Submit */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSubmit}
                disabled={uploadMutation.isPending || !voidedCheckFile || !driversLicenseFile || !email}
                className="w-full h-12 text-base"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Documents
                  </>
                )}
              </Button>

              <Link href="/">
                <Button variant="ghost" className="w-full text-muted-foreground">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Security notice */}
        <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-5 text-left border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Your Documents Are Protected
          </h3>
          <p className="text-white/70 text-sm leading-relaxed">
            All uploaded documents are encrypted using bank-level 256-bit SSL encryption and stored on secure servers. Your information is never shared without your consent.
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-white/40 mt-3">
            Have questions?{" "}
            <a
              href="https://bit.ly/3Zxj0Kq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/80 hover:text-primary hover:underline"
            >
              Schedule a call with a funding specialist
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
