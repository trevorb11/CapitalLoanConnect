import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Step1Contact } from "@/components/FormSteps/Step1Contact";
import { Step2Business } from "@/components/FormSteps/Step2Business";
import { Step3Financial } from "@/components/FormSteps/Step3Financial";
import { Step4Funding } from "@/components/FormSteps/Step4Funding";
import { Step5Address } from "@/components/FormSteps/Step5Address";
import { ChevronLeft, ChevronRight, Loader2, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  type Step1Data,
  type Step2Data,
  type Step3Data,
  type Step4Data,
  type Step5Data,
  type LoanApplication,
} from "@shared/schema";
import { parseCurrency, parsePhoneNumber, parseEIN } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export default function IntakeForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  
  // Use ref to always have current applicationId in mutation closure
  const applicationIdRef = useRef<string | null>(null);
  applicationIdRef.current = applicationId;
  
  // Track if we're creating the initial application to prevent race conditions
  const creatingApplicationRef = useRef(false);

  // Forms for each step
  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: "", fullName: "", phone: "" },
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      businessName: "",
      businessType: "",
      industry: "",
      ein: "",
      timeInBusiness: "",
      ownership: "",
    },
  });

  const form3 = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      monthlyRevenue: "",
      averageMonthlyRevenue: "",
      creditScore: "",
      hasOutstandingLoans: false,
      outstandingLoansAmount: "",
    },
  });

  const form4 = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      requestedAmount: "",
      useOfFunds: "",
      fundingUrgency: "",
      referralSource: "",
      bestTimeToContact: "",
      bankName: "",
    },
  });

  const form5 = useForm<Step5Data>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      businessAddress: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  const getCurrentForm = () => {
    switch (currentStep) {
      case 1:
        return form1;
      case 2:
        return form2;
      case 3:
        return form3;
      case 4:
        return form4;
      case 5:
        return form5;
      default:
        return form1;
    }
  };

  // Normalize formatted form data for backend persistence
  const normalizeFormData = (data: any, step: number) => {
    const normalized = { ...data };
    
    console.log('[NORMALIZE] Step:', step, 'Original data:', data);
    
    // Parse phone number (Step 1)
    if (step === 1 && normalized.phone) {
      normalized.phone = parsePhoneNumber(normalized.phone);
      console.log('[NORMALIZE] Phone:', data.phone, '→', normalized.phone);
    }
    
    // Parse EIN (Step 2)
    if (step === 2 && normalized.ein) {
      normalized.ein = parseEIN(normalized.ein);
      console.log('[NORMALIZE] EIN:', data.ein, '→', normalized.ein);
    }
    
    // Parse currency fields (Step 3) - convert to actual numbers
    if (step === 3) {
      if (normalized.monthlyRevenue) {
        const parsed = parseCurrency(normalized.monthlyRevenue);
        normalized.monthlyRevenue = parsed && parsed.length > 0 ? Number(parsed) : undefined;
        console.log('[NORMALIZE] monthlyRevenue:', data.monthlyRevenue, '→', normalized.monthlyRevenue);
      }
      if (normalized.averageMonthlyRevenue) {
        const parsed = parseCurrency(normalized.averageMonthlyRevenue);
        normalized.averageMonthlyRevenue = parsed && parsed.length > 0 ? Number(parsed) : undefined;
        console.log('[NORMALIZE] averageMonthlyRevenue:', data.averageMonthlyRevenue, '→', normalized.averageMonthlyRevenue);
      }
      if (normalized.outstandingLoansAmount) {
        const parsed = parseCurrency(normalized.outstandingLoansAmount);
        normalized.outstandingLoansAmount = parsed && parsed.length > 0 ? Number(parsed) : undefined;
        console.log('[NORMALIZE] outstandingLoansAmount:', data.outstandingLoansAmount, '→', normalized.outstandingLoansAmount);
      }
    }
    
    // Parse currency field (Step 4) - convert to actual number
    if (step === 4 && normalized.requestedAmount) {
      const parsed = parseCurrency(normalized.requestedAmount);
      normalized.requestedAmount = parsed && parsed.length > 0 ? Number(parsed) : undefined;
      console.log('[NORMALIZE] requestedAmount:', data.requestedAmount, '→', normalized.requestedAmount);
    }
    
    console.log('[NORMALIZE] Final normalized data:', normalized);
    return normalized;
  };

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: Partial<LoanApplication> & { currentStep?: number }) => {
      // Get current applicationId from ref to avoid stale closure
      const currentAppId = applicationIdRef.current;
      
      // Always include email from form1 for initial creation
      const email = form1.getValues("email");
      const payload = { ...data };
      
      if (!currentAppId && email) {
        payload.email = email;
      }

      if (currentAppId) {
        return await apiRequest("PATCH", `/api/applications/${currentAppId}`, payload);
      } else {
        // If we're already creating an application, skip to prevent race conditions
        if (creatingApplicationRef.current) {
          return null;
        }
        
        creatingApplicationRef.current = true;
        try {
          const response = await apiRequest("POST", "/api/applications", payload);
          return response;
        } finally {
          creatingApplicationRef.current = false;
        }
      }
    },
    onMutate: () => {
      setAutoSaveStatus("saving");
    },
    onSuccess: (data: any) => {
      if (!data) return; // Skip if creation was already in progress
      
      const appId = applicationIdRef.current ?? data.id;
      if (!applicationIdRef.current && data.id) {
        applicationIdRef.current = data.id;
        setApplicationId(data.id);
        localStorage.setItem("applicationId", data.id);
      }
      setAutoSaveStatus("saved");
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/applications", appId] });
    },
    onError: () => {
      setAutoSaveStatus("error");
    },
  });

  // Load existing application on mount
  useEffect(() => {
    const savedId = localStorage.getItem("applicationId");
    if (savedId) {
      setApplicationId(savedId);
    }
  }, []);

  // Fetch existing application data
  const { data: existingApplication } = useQuery<LoanApplication>({
    queryKey: ["/api/applications", applicationId],
    enabled: !!applicationId,
  });

  // Populate forms with existing data
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    
    if (existingApplication) {
      // Show welcome back message for returning users
      if (!existingApplication.isCompleted) {
        setShowWelcomeBack(true);
        timer = setTimeout(() => setShowWelcomeBack(false), 8000); // Hide after 8 seconds
      }
      
      form1.reset({
        email: existingApplication.email || "",
        fullName: existingApplication.fullName || "",
        phone: existingApplication.phone || "",
      });
      form2.reset({
        businessName: existingApplication.businessName || "",
        businessType: existingApplication.businessType || "",
        industry: existingApplication.industry || "",
        ein: existingApplication.ein || "",
        timeInBusiness: existingApplication.timeInBusiness || "",
        ownership: existingApplication.ownership || "",
      });
      form3.reset({
        monthlyRevenue: existingApplication.monthlyRevenue?.toString() || "",
        averageMonthlyRevenue: existingApplication.averageMonthlyRevenue?.toString() || "",
        creditScore: existingApplication.creditScore || "",
        hasOutstandingLoans: existingApplication.hasOutstandingLoans || false,
        outstandingLoansAmount: existingApplication.outstandingLoansAmount?.toString() || "",
      });
      form4.reset({
        requestedAmount: existingApplication.requestedAmount?.toString() || "",
        useOfFunds: existingApplication.useOfFunds || "",
        fundingUrgency: existingApplication.fundingUrgency || "",
        referralSource: existingApplication.referralSource || "",
        bestTimeToContact: existingApplication.bestTimeToContact || "",
        bankName: existingApplication.bankName || "",
      });
      form5.reset({
        businessAddress: existingApplication.businessAddress || "",
        city: existingApplication.city || "",
        state: existingApplication.state || "",
        zipCode: existingApplication.zipCode || "",
      });
      if (existingApplication.currentStep) {
        setCurrentStep(existingApplication.currentStep);
      }
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [existingApplication]);

  // Auto-save on form changes
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    const currentForm = getCurrentForm();
    const currentStepValue = currentStep;
    
    const subscription = currentForm.watch(() => {
      // Clear previous timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Set new timer
      debounceTimer = setTimeout(() => {
        // Don't auto-save if a mutation is already in progress
        if (autoSaveMutation.isPending) {
          return;
        }
        
        // Get all values from the captured form
        const formData = currentForm.getValues();
        
        // For step 1, only auto-save if email is valid
        if (currentStepValue === 1) {
          const emailValue = (formData as any).email;
          if (!emailValue || !emailValue.includes('@') || emailValue.length < 5) {
            return; // Skip auto-save for invalid/incomplete emails
          }
        }
        
        if (Object.keys(formData).length > 0) {
          // Normalize formatted fields before sending to backend
          const normalizedData = normalizeFormData(formData, currentStepValue);
          
          // CRITICAL: Always include currentStep in auto-save payload
          autoSaveMutation.mutate({
            ...normalizedData,
            currentStep: currentStepValue,
          } as any);
        }
      }, 1000);
    });
    
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (subscription && typeof subscription === 'object' && 'unsubscribe' in subscription) {
        subscription.unsubscribe();
      }
    };
  }, [currentStep, applicationId]);

  // Keyboard shortcut for Continue/Submit
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't hijack Enter when:
      // - User is in a textarea
      // - A dropdown/select is open (check for aria-expanded)
      // - Currently saving
      // - Target is a button (button's own handler will fire)
      if (
        event.key === "Enter" && 
        !autoSaveMutation.isPending &&
        target.tagName !== 'TEXTAREA' &&
        target.tagName !== 'BUTTON' &&
        !document.querySelector('[aria-expanded="true"]')
      ) {
        event.preventDefault();
        if (currentStep < 5) {
          handleNext();
        } else {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, autoSaveMutation.isPending]);

  const handleNext = async () => {
    const form = getCurrentForm();
    const isValid = await form.trigger();

    if (isValid) {
      const formData = form.getValues();
      const normalizedData = normalizeFormData(formData, currentStep);
      
      await autoSaveMutation.mutateAsync({
        ...normalizedData,
        currentStep: currentStep + 1,
      });
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const form = getCurrentForm();
    const isValid = await form.trigger();

    if (isValid) {
      const formData = form.getValues();
      const normalizedData = normalizeFormData(formData, currentStep);
      
      try {
        await autoSaveMutation.mutateAsync({
          ...normalizedData,
          isCompleted: true,
          currentStep: 5,
        });
        
        // Small delay to ensure save completes
        setTimeout(() => {
          navigate("/application");
        }, 100);
      } catch (error) {
        console.error("Submit error:", error);
        toast({
          title: "Error",
          description: "Failed to submit application. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Contact form={form1} />;
      case 2:
        return <Step2Business form={form2} />;
      case 3:
        return <Step3Financial form={form3} />;
      case 4:
        return <Step4Funding form={form4} />;
      case 5:
        return <Step5Address form={form5} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Today Capital Group
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                MCA Loan Application
              </p>
            </div>
            <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
          </div>

          <ProgressIndicator currentStep={currentStep} totalSteps={5} />
          
          {/* Progress Percentage */}
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              {Math.round((currentStep / 5) * 100)}% Complete
              {currentStep < 5 && (
                <span className="ml-2">
                  • About {6 - currentStep} {6 - currentStep === 1 ? 'minute' : 'minutes'} remaining
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Welcome Back Alert */}
        {showWelcomeBack && (
          <Alert className="mb-6 bg-primary/5 border-primary/20" data-testid="alert-welcomeback">
            <AlertDescription className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                <Check className="w-3 h-3" />
              </div>
              <span className="text-sm">
                <strong>Welcome back!</strong> Continue where you left off on Step {currentStep} of 5.
                Your progress is automatically saved.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Form Card */}
        <Card className="p-6 sm:p-8 mb-6">
          <Form {...getCurrentForm()}>
            <form onSubmit={(e) => e.preventDefault()}>
              {renderStep()}
            </form>
          </Form>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="h-12 px-6"
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < 5 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={autoSaveMutation.isPending}
              className="h-12 px-8"
              data-testid="button-continue"
              title="Press Enter to continue"
            >
              {autoSaveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={autoSaveMutation.isPending}
              className="h-12 px-8"
              data-testid="button-submit"
            >
              {autoSaveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>SSL Encrypted</span>
            </div>
            <span className="text-border">•</span>
            <span>Trusted by 10,000+ businesses</span>
            <span className="text-border">•</span>
            <span>24-48 hour approvals</span>
          </div>
          <p className="text-xs text-muted-foreground">
            By submitting this application, you agree to our{" "}
            <button className="underline hover-elevate">Privacy Policy</button> and{" "}
            <button className="underline hover-elevate">Terms of Service</button>
          </p>
        </div>
      </div>
    </div>
  );
}
