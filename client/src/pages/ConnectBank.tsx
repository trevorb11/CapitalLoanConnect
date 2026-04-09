import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, CheckCircle2, Lock, AlertCircle, Upload, Building2, FileText, Mail, ExternalLink } from "lucide-react";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid phone number"),
});

type FormData = z.infer<typeof formSchema>;

const CHIRP_REQUEST_STORAGE_KEY = "tcg.chirp.pendingRequestCode";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function ConnectBank() {
  const [step, setStep] = useState<'input' | 'awaiting' | 'uploading' | 'success'>('input');
  const [connectionMethod, setConnectionMethod] = useState<'chirp' | 'upload' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingRequestCode, setPendingRequestCode] = useState<string | null>(null);
  const [pollExpired, setPollExpired] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollStartRef = useRef<number>(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      businessName: "",
      email: "",
      phone: "",
    }
  });

  // Resume a pending Chirp verification on mount, either from a return URL
  // param or from sessionStorage (when the user completes verification in a
  // new tab and returns to this page).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("requestCode");
    const fromStorage = sessionStorage.getItem(CHIRP_REQUEST_STORAGE_KEY);
    const code = fromUrl || fromStorage;
    if (code) {
      setPendingRequestCode(code);
      setConnectionMethod('chirp');
      setStep('awaiting');
      pollStartRef.current = Date.now();
    }
  }, []);

  // Polling effect - while in 'awaiting' state with a pending request code,
  // poll /api/chirp/status every few seconds until Verified/Rejected/Expired
  // or until we hit the timeout.
  useEffect(() => {
    if (step !== 'awaiting' || !pendingRequestCode) return;

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
          setStep('success');
          toast({
            title: "Bank Verified",
            description: "Your bank account has been successfully verified!",
          });
          return;
        }

        if (data.status === "Rejected" || data.status === "Expired") {
          sessionStorage.removeItem(CHIRP_REQUEST_STORAGE_KEY);
          setStep('input');
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

      if (!cancelled) {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    const handle = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [step, pendingRequestCode, toast]);

  const createChirpRequestMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const res = await apiRequest("POST", "/api/chirp/create-request", {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        businessName: payload.businessName,
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
      setConnectionMethod('chirp');
      setStep('awaiting');
      pollStartRef.current = Date.now();
      // Open the Chirp hosted verification flow in a new tab. Polling on
      // this page will detect the Verified state when the user returns.
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

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", form.getValues("email"));
      formData.append("businessName", form.getValues("businessName"));

      const response = await fetch("/api/bank-statements/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Upload failed";
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      setConnectionMethod('upload');
      setStep('success');
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/bank-statements/uploads"] });
      toast({
        title: "Upload Complete",
        description: "Your bank statement has been uploaded successfully!"
      });
    },
    onError: (error: Error) => {
      setStep('input');
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload bank statement. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleConnectBank = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const values = form.getValues();
    createChirpRequestMutation.mutate(values);
  }, [form, createChirpRequestMutation]);

  const handleCancelAwaiting = () => {
    sessionStorage.removeItem(CHIRP_REQUEST_STORAGE_KEY);
    setPendingRequestCode(null);
    setPollExpired(false);
    setStep('input');
  };

  const handleCheckNow = async () => {
    if (!pendingRequestCode) return;
    try {
      const res = await apiRequest("GET", `/api/chirp/status/${pendingRequestCode}`);
      const data = await res.json();
      if (data.status === "Verified") {
        sessionStorage.removeItem(CHIRP_REQUEST_STORAGE_KEY);
        queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
        setStep('success');
      } else {
        toast({
          title: "Still waiting",
          description: `Current status: ${data.status}. Complete verification in the other tab and try again.`,
        });
      }
    } catch (err) {
      toast({
        title: "Check Failed",
        description: "Couldn't check verification status right now.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file.",
          variant: "destructive"
        });
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File must be under 25MB.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    const isValid = form.trigger();
    isValid.then((valid) => {
      if (valid && selectedFile) {
        setStep('uploading');
        setUploadProgress(30);
        uploadMutation.mutate(selectedFile);
      }
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file.",
          variant: "destructive"
        });
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File must be under 25MB.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  if (step === 'awaiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-0">
          <CardContent className="p-8 text-center bg-white rounded-xl">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              {pollExpired
                ? <AlertCircle className="w-10 h-10 text-blue-500" data-testid="icon-poll-expired" />
                : <Loader2 className="w-10 h-10 animate-spin text-[#5FBFB8]" data-testid="loader-awaiting" />
              }
            </div>
            <h2 className="text-2xl font-bold text-[#192F56] mb-3" data-testid="heading-awaiting">
              {pollExpired ? "Still Waiting?" : "Verifying Your Bank"}
            </h2>
            <p className="text-gray-600 mb-6">
              {pollExpired
                ? "We haven't received verification yet. If you've finished the process in the other tab, click below to check now."
                : "Complete the bank verification in the tab that just opened. We'll automatically detect when it's done."
              }
            </p>
            <div className="space-y-3">
              <Button
                className="w-full bg-[#192F56] hover:bg-[#2a4575] text-white"
                onClick={handleCheckNow}
                data-testid="button-check-now"
              >
                Check Verification Status
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCancelAwaiting}
                data-testid="button-cancel-awaiting"
              >
                Start Over
              </Button>
            </div>
            {pendingRequestCode && (
              <p className="text-xs text-gray-400 mt-4" data-testid="text-request-code">
                Request code: {pendingRequestCode}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'uploading' || uploadMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#192F56] to-[#19112D] flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-16 h-16 animate-spin text-[#5FBFB8] mb-4" data-testid="loader-uploading" />
        <h2 className="text-2xl font-bold mb-2">Uploading Statement...</h2>
        <p className="text-white/70">Securely uploading your bank statement.</p>
        <div className="w-64 h-2 bg-white/20 rounded-full mt-4">
          <div
            className="h-full bg-[#5FBFB8] rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-0">
          <CardContent className="p-8 text-center bg-white rounded-xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#192F56] mb-3" data-testid="heading-success">
              {connectionMethod === 'chirp' ? 'Bank Verified!' : 'Statement Uploaded!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {connectionMethod === 'chirp'
                ? "Your bank account is now verified. We can access your statements for underwriting."
                : "Your bank statement has been received and will be reviewed by our team."}
            </p>
            <div className="space-y-3">
              <Button
                className="w-full bg-[#192F56] hover:bg-[#2a4575] text-white"
                onClick={() => setLocation("/")}
                data-testid="button-go-to-application"
              >
                Go to Application
              </Button>
              <a href="https://www.todaycapitalgroup.com/#contact-us" target="_blank" rel="noopener noreferrer" className="block">
                <Button
                  variant="outline"
                  className="w-full"
                  data-testid="button-contact-team"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Get in Touch with Our Team
                </Button>
              </a>
              <a href="https://fund.todaycapitalgroup.com" target="_blank" rel="noopener noreferrer" className="block">
                <Button
                  variant="outline"
                  className="w-full"
                  data-testid="button-view-offerings"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Offerings
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#192F56] to-[#19112D] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader className="bg-[#192F56] text-white rounded-t-xl p-8 text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Building2 className="w-7 h-7" />
            Connect Your Bank
          </CardTitle>
          <p className="text-white/70 mt-2">
            Provide your bank information to expedite your funding application.
          </p>
        </CardHeader>
        <CardContent className="p-8 bg-white rounded-b-xl">
          <Form {...form}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane"
                          data-testid="input-first-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          data-testid="input-last-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Acme Corp"
                          data-testid="input-business-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@company.com"
                          type="email"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(555) 123-4567"
                          type="tel"
                          data-testid="input-phone"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-[#192F56] mb-4 text-center">
                  Choose Your Method
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                  {/* Chirp Instant Verification */}
                  <div className="border-2 border-[#5FBFB8] rounded-xl p-6 hover-elevate transition-all">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-[#5FBFB8]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-6 h-6 text-[#5FBFB8]" />
                      </div>
                      <h4 className="font-semibold text-[#192F56]">Instant Verification</h4>
                      <p className="text-sm text-gray-500 mt-1">
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
                    <p className="text-xs text-center text-gray-400 mt-2">
                      Fast & automatic verification
                    </p>
                  </div>

                  {/* Or Divider */}
                  <div className="hidden md:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-white px-3 py-1 border border-gray-300 rounded-full text-sm text-gray-500 font-medium">
                      or
                    </div>
                  </div>

                  {/* Upload Option */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover-elevate transition-all">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-gray-600" />
                      </div>
                      <h4 className="font-semibold text-[#192F56]">Upload Statement</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Upload PDF bank statements
                      </p>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".pdf,application/pdf"
                      className="hidden"
                      data-testid="input-file"
                    />

                    {!selectedFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-[#192F56] transition-colors"
                        data-testid="dropzone-upload"
                      >
                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Click or drag PDF here
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Max 25MB</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                          <FileText className="w-5 h-5 text-[#192F56]" />
                          <span className="text-sm text-gray-700 truncate flex-1">
                            {selectedFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="text-gray-400 hover:text-gray-600"
                            data-testid="button-remove-file"
                          >
                            &times;
                          </button>
                        </div>
                        <Button
                          type="button"
                          onClick={handleUpload}
                          disabled={uploadMutation.isPending}
                          className="w-full bg-[#192F56] hover:bg-[#2a4575] text-white"
                          data-testid="button-upload-statement"
                        >
                          {uploadMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Upload Statement
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-center text-gray-400 mt-2">
                      PDF files only
                    </p>
                  </div>
                </div>

                {createChirpRequestMutation.isError && (
                  <div
                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mt-4"
                    data-testid="text-error"
                  >
                    <AlertCircle className="w-5 h-5" />
                    Failed to initialize bank verification. Please try again.
                  </div>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
