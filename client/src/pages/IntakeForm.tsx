import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator";
import { Step1Contact } from "@/components/FormSteps/Step1Contact";
import { Step2Business } from "@/components/FormSteps/Step2Business";
import { Step3Financial } from "@/components/FormSteps/Step3Financial";
import { Step4Funding } from "@/components/FormSteps/Step4Funding";
import { Step5Address } from "@/components/FormSteps/Step5Address";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export default function IntakeForm() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | undefined>();

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

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: Partial<LoanApplication>) => {
      // Always include email from form1 for initial creation
      const email = form1.getValues("email");
      const payload = { ...data };
      
      if (!applicationId && email) {
        payload.email = email;
      }

      if (applicationId) {
        return await apiRequest("PATCH", `/api/applications/${applicationId}`, payload);
      } else {
        const response = await apiRequest("POST", "/api/applications", {
          ...payload,
          currentStep,
        });
        return response;
      }
    },
    onMutate: () => {
      setAutoSaveStatus("saving");
    },
    onSuccess: (data: any) => {
      if (data.id && !applicationId) {
        setApplicationId(data.id);
        localStorage.setItem("applicationId", data.id);
      }
      setAutoSaveStatus("saved");
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId] });
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
    if (existingApplication) {
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
  }, [existingApplication]);

  // Auto-save on form changes
  useEffect(() => {
    const subscription = getCurrentForm().watch((data) => {
      const timeoutId = setTimeout(() => {
        if (Object.keys(data).length > 0) {
          autoSaveMutation.mutate(data as any);
        }
      }, 1000);
      return () => clearTimeout(timeoutId);
    });
    return () => {
      if (subscription && typeof subscription === 'object' && 'unsubscribe' in subscription) {
        subscription.unsubscribe();
      }
    };
  }, [currentStep, applicationId]);

  const handleNext = async () => {
    const form = getCurrentForm();
    const isValid = await form.trigger();

    if (isValid) {
      const formData = form.getValues();
      await autoSaveMutation.mutateAsync({
        ...formData,
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
      await autoSaveMutation.mutateAsync({
        ...formData,
        isCompleted: true,
        currentStep: 5,
      });
      navigate("/success");
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
        </div>

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
