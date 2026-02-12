import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import type { LoanApplication, Lender } from "@shared/schema";

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
  const [receivedAt, setReceivedAt] = useState("");
  const [receivedMonth, setReceivedMonth] = useState("");
  const [receivedDay, setReceivedDay] = useState("");
  const [receivedYear, setReceivedYear] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [selectedLender, setSelectedLender] = useState<Lender | null>(null);
  const [lenderSearchQuery, setLenderSearchQuery] = useState("");
  const [showLenderResults, setShowLenderResults] = useState(false);
  
  // Approval form fields
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [term, setTerm] = useState("");
  const [paymentFrequency, setPaymentFrequency] = useState("Weekly");
  const [factorRate, setFactorRate] = useState("");
  const [totalPayback, setTotalPayback] = useState("");
  const [netAfterFees, setNetAfterFees] = useState("");
  const [approvalMonth, setApprovalMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [approvalDay, setApprovalDay] = useState(String(new Date().getDate()).padStart(2, '0'));
  const [approvalYear, setApprovalYear] = useState(String(new Date().getFullYear()));
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState<{ filesUploaded: number; decisionSaved: boolean; decisionType: string }>({ filesUploaded: 0, decisionSaved: false, decisionType: '' });
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { data: applications, isLoading: isSearching } = useQuery<LoanApplication[]>({
    queryKey: ['/api/applications'],
  });

  const { data: lenders } = useQuery<Lender[]>({
    queryKey: ['/api/lenders'],
  });

  const filteredLenders = (lenders || []).filter((lender) => {
    if (!lenderSearchQuery.trim()) return true;
    return lender.name.toLowerCase().includes(lenderSearchQuery.toLowerCase());
  }).slice(0, 10);

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
      const computedReceivedAt = receivedYear && receivedMonth && receivedDay
        ? `${receivedYear}-${receivedMonth}-${receivedDay}`
        : '';
      if (computedReceivedAt) {
        formData.append("receivedAt", computedReceivedAt);
      }
      if (approvalStatus && approvalStatus !== "pending") {
        formData.append("approvalStatus", approvalStatus);
      }
      if (approvalNotes) {
        formData.append("approvalNotes", approvalNotes);
      }
      if (selectedLender) {
        formData.append("lenderId", selectedLender.id);
        formData.append("lenderName", selectedLender.name);
      }
      // Approval details (when approved)
      if (approvalStatus === "approved") {
        if (advanceAmount) formData.append("advanceAmount", advanceAmount);
        if (term) formData.append("term", term);
        if (paymentFrequency) formData.append("paymentFrequency", paymentFrequency);
        if (factorRate) formData.append("factorRate", factorRate);
        if (totalPayback) formData.append("totalPayback", totalPayback);
        if (netAfterFees) formData.append("netAfterFees", netAfterFees);
        const computedApprovalDate = `${approvalYear}-${approvalMonth}-${approvalDay}`;
        if (computedApprovalDate) formData.append("approvalDate", computedApprovalDate);
      }
      
      // Mark as internal upload to skip GHL webhook
      formData.append("isInternal", "true");

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

  const hasFiles = selectedFiles.length > 0;
  const hasDecision = approvalStatus && approvalStatus !== "pending";
  const canSubmit = email && (hasFiles || hasDecision);

  const handleSubmit = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address or select a merchant",
        variant: "destructive",
      });
      return;
    }

    if (!hasFiles && !hasDecision) {
      toast({
        title: "Nothing to Submit",
        description: "Please upload bank statements, set an underwriting decision, or both",
        variant: "destructive",
      });
      return;
    }

    if (approvalStatus === "unqualified" && !approvalNotes?.trim()) {
      toast({
        title: "Reason Required",
        description: "Please enter a reason why this applicant is unqualified",
        variant: "destructive",
      });
      return;
    }

    let filesUploaded = 0;

    if (hasFiles) {
      setUploadProgress(0);
      const totalFiles = selectedFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        await uploadMutation.mutateAsync(selectedFiles[i]);
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }
      
      filesUploaded = totalFiles;
      setSelectedFiles([]);
    }

    let decisionSaved = false;

    if (hasDecision) {
      try {
        const decisionPayload: Record<string, any> = {
          businessEmail: email,
          businessName: businessName || email,
          status: approvalStatus,
        };

        if (approvalStatus === "approved") {
          const approvalDate = `${approvalYear}-${approvalMonth}-${approvalDay}`;
          const approvalEntry = {
            id: `appr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            lender: selectedLender?.name || "",
            advanceAmount: advanceAmount || "",
            term: term || "",
            paymentFrequency: paymentFrequency || "Weekly",
            factorRate: factorRate || "",
            totalPayback: totalPayback || "",
            netAfterFees: netAfterFees || "",
            notes: approvalNotes || "",
            approvalDate,
            isPrimary: true,
          };
          decisionPayload.additionalApprovals = [approvalEntry];
          decisionPayload.lender = selectedLender?.name || null;
          decisionPayload.advanceAmount = advanceAmount ? parseFloat(advanceAmount) : null;
          decisionPayload.term = term || null;
          decisionPayload.paymentFrequency = paymentFrequency || null;
          decisionPayload.factorRate = factorRate ? parseFloat(factorRate) : null;
          decisionPayload.totalPayback = totalPayback ? parseFloat(totalPayback) : null;
          decisionPayload.netAfterFees = netAfterFees ? parseFloat(netAfterFees) : null;
          decisionPayload.notes = approvalNotes || null;
          decisionPayload.approvalDate = approvalDate;
        } else if (approvalStatus === "declined" || approvalStatus === "unqualified") {
          decisionPayload.declineReason = approvalNotes || null;
          if (selectedLender) {
            decisionPayload.lender = selectedLender.name;
          }
        }

        const res = await fetch("/api/underwriting-decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(decisionPayload),
        });

        if (res.ok) {
          decisionSaved = true;
          const statusLabel = approvalStatus === "approved" ? "Approved" : approvalStatus === "declined" ? "Declined" : "Unqualified";
          toast({
            title: `Decision Saved: ${statusLabel}`,
            description: `${businessName || email} has been marked as ${statusLabel.toLowerCase()}`,
          });
        } else {
          const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
          toast({
            title: "Decision Save Failed",
            description: errorData.error || `Server returned ${res.status}`,
            variant: "destructive",
          });
        }
      } catch (decisionError: any) {
        console.error("Error saving underwriting decision:", decisionError);
        toast({
          title: "Decision Save Failed",
          description: decisionError.message || "An unexpected error occurred while saving the decision",
          variant: "destructive",
        });
      }
    }

    if (filesUploaded === 0 && !decisionSaved) {
      return;
    }

    setSubmittedInfo({ filesUploaded, decisionSaved, decisionType: approvalStatus });
    setIsSubmitted(true);
    
    const parts: string[] = [];
    if (filesUploaded > 0) parts.push(`${filesUploaded} statement${filesUploaded > 1 ? "s" : ""} uploaded`);
    if (decisionSaved) parts.push("decision saved");
    toast({
      title: "Submission Complete",
      description: parts.join(" and "),
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

  if (isSubmitted) {
    const successTitle = submittedInfo.decisionSaved && submittedInfo.filesUploaded > 0
      ? "Submission Complete"
      : submittedInfo.decisionSaved
      ? "Decision Saved"
      : "Statements Uploaded";

    const successDescription = (() => {
      const parts: string[] = [];
      if (submittedInfo.filesUploaded > 0) {
        parts.push(`${submittedInfo.filesUploaded} bank statement${submittedInfo.filesUploaded > 1 ? "s have" : " has"} been uploaded`);
      }
      if (submittedInfo.decisionSaved) {
        const label = submittedInfo.decisionType === "approved" ? "approved" : submittedInfo.decisionType === "declined" ? "declined" : "unqualified";
        parts.push(`the business has been marked as ${label}`);
      }
      parts.push("If an existing profile was found for this email, the data has been attached to it. Otherwise, a new profile was created.");
      return parts.join(". ") + ".";
    })();

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            
            <h1 className="text-2xl font-bold mb-3" data-testid="text-upload-success-title">
              {successTitle}
            </h1>

            <p className="text-muted-foreground mb-6">
              {successDescription}
            </p>

            {uploadedFiles.length > 0 && (
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
            )}

            <div className="flex flex-col gap-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setIsSubmitted(false);
                  setUploadedFiles([]);
                  setSelectedApplication(null);
                  setBusinessName('');
                  setEmail('');
                  setApprovalStatus('pending');
                  setApprovalNotes('');
                  setSelectedLender(null);
                  setLenderSearchQuery('');
                  setAdvanceAmount('');
                  setTerm('');
                  setPaymentFrequency('Weekly');
                  setFactorRate('');
                  setTotalPayback('');
                  setNetAfterFees('');
                  setSubmittedInfo({ filesUploaded: 0, decisionSaved: false, decisionType: '' });
                }}
                data-testid="button-upload-more"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another
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
              Internal Upload
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload bank statements, add an underwriting decision, or both. If a profile already exists for this email, the data will be attached to it automatically.
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

            {/* Date Received Field */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Received
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={receivedMonth} onValueChange={setReceivedMonth}>
                  <SelectTrigger data-testid="select-received-month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">January</SelectItem>
                    <SelectItem value="02">February</SelectItem>
                    <SelectItem value="03">March</SelectItem>
                    <SelectItem value="04">April</SelectItem>
                    <SelectItem value="05">May</SelectItem>
                    <SelectItem value="06">June</SelectItem>
                    <SelectItem value="07">July</SelectItem>
                    <SelectItem value="08">August</SelectItem>
                    <SelectItem value="09">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={receivedDay} onValueChange={setReceivedDay}>
                  <SelectTrigger data-testid="select-received-day">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = String(i + 1).padStart(2, '0');
                      return <SelectItem key={day} value={day}>{i + 1}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Select value={receivedYear} onValueChange={setReceivedYear}>
                  <SelectTrigger data-testid="select-received-year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                When were these statements sent over? Leave blank to use today's date.
              </p>
            </div>

            {/* Approval Decision Section */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <Label className="font-medium">Underwriting Decision (Optional)</Label>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant={approvalStatus === "pending" ? "default" : "outline"}
                  onClick={() => setApprovalStatus("pending")}
                  className="justify-start"
                  data-testid="button-status-pending"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Pending
                </Button>
                <Button
                  type="button"
                  variant={approvalStatus === "approved" ? "default" : "outline"}
                  onClick={() => setApprovalStatus("approved")}
                  className={`justify-start ${approvalStatus === "approved" ? "bg-green-600 text-white" : ""}`}
                  data-testid="button-status-approved"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approved
                </Button>
                <Button
                  type="button"
                  variant={approvalStatus === "declined" ? "default" : "outline"}
                  onClick={() => setApprovalStatus("declined")}
                  className={`justify-start ${approvalStatus === "declined" ? "bg-red-600 text-white" : ""}`}
                  data-testid="button-status-declined"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Declined
                </Button>
                <Button
                  type="button"
                  variant={approvalStatus === "unqualified" ? "default" : "outline"}
                  onClick={() => setApprovalStatus("unqualified")}
                  className={`justify-start ${approvalStatus === "unqualified" ? "bg-orange-600 text-white" : ""}`}
                  data-testid="button-status-unqualified"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Unqualified
                </Button>
              </div>

              {/* Full Approval Form */}
              {approvalStatus === "approved" && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="advanceAmount">Advance Amount</Label>
                      <Input
                        id="advanceAmount"
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        placeholder="$50,000"
                        data-testid="input-advance-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="term">Term</Label>
                      <Input
                        id="term"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="6 months"
                        data-testid="input-term"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentFrequency">Payment Frequency</Label>
                    <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                      <SelectTrigger data-testid="select-payment-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="factorRate">Factor Rate</Label>
                      <Input
                        id="factorRate"
                        value={factorRate}
                        onChange={(e) => setFactorRate(e.target.value)}
                        placeholder="1.25"
                        data-testid="input-factor-rate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalPayback">Total Payback</Label>
                      <Input
                        id="totalPayback"
                        value={totalPayback}
                        onChange={(e) => setTotalPayback(e.target.value)}
                        placeholder="$62,500"
                        data-testid="input-total-payback"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="netAfterFees">Net After Fees</Label>
                      <Input
                        id="netAfterFees"
                        value={netAfterFees}
                        onChange={(e) => setNetAfterFees(e.target.value)}
                        placeholder="$48,500"
                        data-testid="input-net-after-fees"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lenderSearch">Lender</Label>
                      <div className="relative">
                        <Input
                          id="lenderSearch"
                          value={selectedLender ? selectedLender.name : lenderSearchQuery}
                          onChange={(e) => {
                            setLenderSearchQuery(e.target.value);
                            setSelectedLender(null);
                            setShowLenderResults(true);
                          }}
                          onFocus={() => setShowLenderResults(true)}
                          placeholder="Search lender..."
                          data-testid="input-lender-search"
                        />
                        {showLenderResults && !selectedLender && (
                          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-auto">
                            {filteredLenders.length > 0 ? (
                              filteredLenders.map((lender) => (
                                <button
                                  key={lender.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLender(lender);
                                    setLenderSearchQuery("");
                                    setShowLenderResults(false);
                                  }}
                                  className="w-full p-2 text-left hover-elevate border-b last:border-b-0"
                                  data-testid={`button-select-lender-${lender.id}`}
                                >
                                  <p className="font-medium">{lender.name}</p>
                                  {lender.tier && (
                                    <p className="text-xs text-muted-foreground">Tier: {lender.tier}</p>
                                  )}
                                </button>
                              ))
                            ) : (
                              <div className="p-2 text-center text-muted-foreground text-sm">
                                No lenders found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Approval Date</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={approvalMonth} onValueChange={setApprovalMonth}>
                        <SelectTrigger data-testid="select-approval-month">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01">January</SelectItem>
                          <SelectItem value="02">February</SelectItem>
                          <SelectItem value="03">March</SelectItem>
                          <SelectItem value="04">April</SelectItem>
                          <SelectItem value="05">May</SelectItem>
                          <SelectItem value="06">June</SelectItem>
                          <SelectItem value="07">July</SelectItem>
                          <SelectItem value="08">August</SelectItem>
                          <SelectItem value="09">September</SelectItem>
                          <SelectItem value="10">October</SelectItem>
                          <SelectItem value="11">November</SelectItem>
                          <SelectItem value="12">December</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={approvalDay} onValueChange={setApprovalDay}>
                        <SelectTrigger data-testid="select-approval-day">
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = String(i + 1).padStart(2, '0');
                            return <SelectItem key={day} value={day}>{i + 1}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                      <Select value={approvalYear} onValueChange={setApprovalYear}>
                        <SelectTrigger data-testid="select-approval-year">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                            <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="approvalNotes">Notes</Label>
                    <Textarea
                      id="approvalNotes"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                      data-testid="input-approval-notes"
                    />
                  </div>
                </div>
              )}

              {/* Unqualified Reason */}
              {approvalStatus === "unqualified" && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="unqualifiedReason" className="text-orange-600 font-medium">Reason for Unqualified (Required)</Label>
                    <Textarea
                      id="unqualifiedReason"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Required: Enter the reason this applicant did not qualify to be sent to lenders..."
                      rows={3}
                      data-testid="input-unqualified-reason"
                    />
                  </div>
                </div>
              )}

              {/* Decline Reason */}
              {approvalStatus === "declined" && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="lenderSearch">Lender (who declined)</Label>
                    <div className="relative">
                      <Input
                        id="lenderSearch"
                        value={selectedLender ? selectedLender.name : lenderSearchQuery}
                        onChange={(e) => {
                          setLenderSearchQuery(e.target.value);
                          setSelectedLender(null);
                          setShowLenderResults(true);
                        }}
                        onFocus={() => setShowLenderResults(true)}
                        placeholder="Search lender..."
                        data-testid="input-lender-search-decline"
                      />
                      {showLenderResults && !selectedLender && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-auto">
                          {filteredLenders.length > 0 ? (
                            filteredLenders.map((lender) => (
                              <button
                                key={lender.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLender(lender);
                                  setLenderSearchQuery("");
                                  setShowLenderResults(false);
                                }}
                                className="w-full p-2 text-left hover-elevate border-b last:border-b-0"
                                data-testid={`button-select-lender-decline-${lender.id}`}
                              >
                                <p className="font-medium">{lender.name}</p>
                                {lender.tier && (
                                  <p className="text-xs text-muted-foreground">Tier: {lender.tier}</p>
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="p-2 text-center text-muted-foreground text-sm">
                              No lenders found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approvalNotes">Decline Reason</Label>
                    <Textarea
                      id="approvalNotes"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Required: Enter the reason for declining..."
                      rows={3}
                      data-testid="input-decline-reason"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* File Upload Area */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Bank Statements (Optional)
              </Label>
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
              disabled={uploadMutation.isPending || !canSubmit}
              className="w-full"
              data-testid="button-submit-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {hasFiles && hasDecision
                    ? `Upload ${selectedFiles.length} Statement${selectedFiles.length > 1 ? "s" : ""} & Save Decision`
                    : hasFiles
                    ? `Upload ${selectedFiles.length} Statement${selectedFiles.length > 1 ? "s" : ""}`
                    : hasDecision
                    ? "Save Decision"
                    : "Submit"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
