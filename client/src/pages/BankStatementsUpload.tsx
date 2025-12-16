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
  X
} from "lucide-react";
import { Link, useSearch } from "wouter";
import tcgLogo from "@assets/TCG_White_logo_1764664150165.png";

interface UploadedFile {
  id: string;
  originalFileName: string;
  fileSize: number;
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

  // Read URL parameters and pre-fill form
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const emailParam = params.get("email");
    const businessNameParam = params.get("businessName");
    const submittedParam = params.get("submitted");

    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    if (businessNameParam) {
      setBusinessName(decodeURIComponent(businessNameParam));
    }
    if (submittedParam === "true") {
      setShowApplicationSuccess(true);
    }
  }, [searchString]);

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

          <div className="flex flex-col gap-3">
            <Button 
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
              <Button variant="outline" className="w-full" data-testid="button-back-home">
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
            
            <div className="border-t border-white/10 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                Your Information is Protected
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                We take your privacy seriously. All uploaded documents are encrypted using bank-level 256-bit SSL encryption and stored on secure servers. Your financial information is never shared with third parties without your explicit consent and is only used to process your funding application.
              </p>
            </div>
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

        <div className="mt-6 text-center">
          <p className="text-sm text-white/50">
            We recommend uploading your last 3-6 months of business bank statements
          </p>
        </div>
      </div>
    </div>
  );
}
