import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Building2,
  Mail,
  X,
  Search,
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import type { LoanApplication } from "@shared/schema";

interface UploadedFile {
  id: string;
  originalFileName: string;
  fileSize: number;
}

interface ApplicationSearchResult {
  id: string;
  businessName: string;
  email: string;
  createdAt: string;
}

export default function InternalStatementsUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<ApplicationSearchResult | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { data: applications, isLoading: isSearching } = useQuery<LoanApplication[]>({
    queryKey: ['/api/applications'],
  });

  const filteredApplications = (applications || []).filter((app) => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase();
    return (
      app.businessName?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query) ||
      app.fullName?.toLowerCase().includes(query)
    );
  }).slice(0, 10);

  const selectApplication = (app: LoanApplication) => {
    setSelectedApplication({
      id: app.id,
      businessName: app.businessName || '',
      email: app.email || '',
      createdAt: app.createdAt ? app.createdAt.toString() : ''
    });
    setBusinessName(app.businessName || '');
    setEmail(app.email || '');
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const clearSelection = () => {
    setSelectedApplication(null);
    setBusinessName('');
    setEmail('');
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", email);
      formData.append("businessName", businessName);
      if (selectedApplication) {
        formData.append("applicationId", selectedApplication.id);
      }

      const response = await fetch("/api/bank-statements/upload", {
        method: "POST",
        body: formData,
        credentials: 'include',
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
        description: "Please enter an email address or select a merchant",
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (isSubmitted && uploadedFiles.length > 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            
            <h1 className="text-2xl font-bold mb-3" data-testid="text-upload-success-title">
              Thank you!
            </h1>

            <p className="text-muted-foreground mb-6">
              The bank statements have been received. We should have an answer on financing options within 48 hours.
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
                variant="outline"
                onClick={() => {
                  setIsSubmitted(false);
                  setUploadedFiles([]);
                  setSelectedApplication(null);
                  setBusinessName('');
                  setEmail('');
                }}
                data-testid="button-upload-more"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload More Statements
              </Button>
              
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full" data-testid="button-back-dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Internal Statement Upload
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload bank statements for a merchant. Search for an existing application or enter details manually.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Merchant Search */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search Merchant
              </Label>
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Search by business name, email, or owner name..."
                  data-testid="input-merchant-search"
                />
                {showSearchResults && searchQuery && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      </div>
                    ) : filteredApplications.length > 0 ? (
                      filteredApplications.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => selectApplication(app)}
                          className="w-full p-3 text-left hover-elevate border-b last:border-b-0 flex items-start gap-3"
                          data-testid={`button-select-merchant-${app.id}`}
                        >
                          <Building2 className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{app.businessName || 'No Business Name'}</p>
                            <p className="text-sm text-muted-foreground truncate">{app.email}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(app.createdAt ? app.createdAt.toString() : '')}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No matching merchants found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Merchant Display */}
            {selectedApplication && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{selectedApplication.businessName}</p>
                      <p className="text-sm text-muted-foreground">{selectedApplication.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={clearSelection}
                    data-testid="button-clear-selection"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Manual Entry (shown when no merchant selected) */}
            {!selectedApplication && (
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
                    placeholder="Enter business name"
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
                    placeholder="merchant@email.com"
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>
            )}

            {/* File Upload Area */}
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
                Drag & drop bank statements here
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

            {/* Selected Files List */}
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

            {/* Upload Progress */}
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

            {/* Submit Button */}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
