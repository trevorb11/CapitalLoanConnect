import { useState, useCallback, useRef } from "react";
import { usePlaidLink } from "react-plaid-link";
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
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address")
});

type FormData = z.infer<typeof formSchema>;

export default function ConnectBank() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'connecting' | 'uploading' | 'success'>('input');
  const [connectionMethod, setConnectionMethod] = useState<'plaid' | 'upload' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      email: ""
    }
  });

  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/create-link-token");
      return res.json();
    },
    onSuccess: (data) => {
      setLinkToken(data.link_token);
    },
    onError: () => {
      toast({
        title: "Connection Error",
        description: "Failed to initialize bank connection. Please try again later.",
        variant: "destructive"
      });
    }
  });

  const exchangeTokenMutation = useMutation({
    mutationFn: async (payload: { publicToken: string; metadata: any }) => {
      const res = await apiRequest("POST", "/api/plaid/exchange-token", {
        publicToken: payload.publicToken,
        metadata: payload.metadata,
        businessName: form.getValues("businessName"),
        email: form.getValues("email")
      });
      return res.json();
    },
    onSuccess: () => {
      setConnectionMethod('plaid');
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Bank Connected",
        description: "Your bank account has been successfully connected!"
      });
    },
    onError: () => {
      setStep('input');
      toast({
        title: "Connection Failed",
        description: "We couldn't connect to your bank. Please try again.",
        variant: "destructive"
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

  const onPlaidSuccess = useCallback(async (publicToken: string, metadata: any) => {
    setStep('connecting');
    exchangeTokenMutation.mutate({ publicToken, metadata });
  }, [exchangeTokenMutation]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  const handleConnectBank = () => {
    const isValid = form.trigger();
    isValid.then((valid) => {
      if (valid) {
        if (!linkToken) {
          createLinkTokenMutation.mutate();
          setTimeout(() => {
            if (ready) open();
          }, 1000);
        } else if (ready) {
          open();
        }
      }
    });
  };

  const initializePlaidLink = () => {
    if (!linkToken) {
      createLinkTokenMutation.mutate();
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

  if (step === 'connecting' || exchangeTokenMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#192F56] to-[#19112D] flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-16 h-16 animate-spin text-[#5FBFB8] mb-4" data-testid="loader-connecting" />
        <h2 className="text-2xl font-bold mb-2">Connecting Bank...</h2>
        <p className="text-white/70">Securely connecting to your bank account.</p>
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
              {connectionMethod === 'plaid' ? 'Bank Connected!' : 'Statement Uploaded!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {connectionMethod === 'plaid' 
                ? "Your bank account is now connected. We can access your statements for verification."
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
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-[#192F56] mb-4 text-center">
                  Choose Your Method
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                  {/* Plaid Option */}
                  <div className="border-2 border-[#5FBFB8] rounded-xl p-6 hover-elevate transition-all">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-[#5FBFB8]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-6 h-6 text-[#5FBFB8]" />
                      </div>
                      <h4 className="font-semibold text-[#192F56]">Instant Connect</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Securely connect via Plaid
                      </p>
                    </div>
                    <Button 
                      type="button"
                      onClick={() => {
                        initializePlaidLink();
                        handleConnectBank();
                      }}
                      disabled={createLinkTokenMutation.isPending}
                      className="w-full bg-[#5FBFB8] hover:bg-[#4ca8a1] text-white"
                      data-testid="button-connect-plaid"
                    >
                      {createLinkTokenMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Lock className="w-4 h-4 mr-2" />
                      )}
                      Connect Bank
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

                {createLinkTokenMutation.isError && (
                  <div 
                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mt-4" 
                    data-testid="text-error"
                  >
                    <AlertCircle className="w-5 h-5" />
                    Failed to initialize bank connection. Please try again.
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
