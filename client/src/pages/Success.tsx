import { useEffect, useState } from "react";
import { CheckCircle, Mail, Phone, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Success() {
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    // Get application ID before clearing
    const savedId = localStorage.getItem("applicationId");
    setApplicationId(savedId);
    
    // Clear application ID from localStorage on success
    localStorage.removeItem("applicationId");
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="p-8 sm:p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Application Submitted Successfully!
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            Thank you for applying with Today Capital Group. Your application has been received and is being reviewed by our team.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">Quick Review</p>
              <p className="text-xs text-muted-foreground">24-48 hour response</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Mail className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">Email Updates</p>
              <p className="text-xs text-muted-foreground">Check your inbox</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Phone className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">Direct Support</p>
              <p className="text-xs text-muted-foreground">We'll reach out soon</p>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-foreground mb-3">What Happens Next?</h3>
            <div className="space-y-3 text-left">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Application Review</p>
                  <p className="text-sm text-muted-foreground">Our team reviews your information and matches you with the best lenders</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Initial Contact</p>
                  <p className="text-sm text-muted-foreground">We'll reach out via email or phone within 24-48 hours</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Funding Decision</p>
                  <p className="text-sm text-muted-foreground">Receive your offer and funding timeline details</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {applicationId && (
              <div className="flex gap-3 justify-center flex-wrap">
                <a
                  href={`/applications/${applicationId}?pdf=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="button-download-full-pdf"
                  className="h-12 px-8 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-all no-underline flex items-center justify-center"
                >
                  Download Full PDF
                </a>
                <a
                  href={`/applications/${applicationId}?pdf=true&redacted=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="button-download-redacted-pdf"
                  className="h-12 px-8 bg-muted text-muted-foreground rounded-md font-semibold hover:bg-muted/80 transition-all no-underline flex items-center justify-center"
                >
                  Download Redacted PDF
                </a>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              Questions? Contact us at{" "}
              <a href="mailto:support@todaycapitalgroup.com" className="text-primary hover:underline font-medium">
                support@todaycapitalgroup.com
              </a>
            </p>
            <Button
              onClick={() => window.location.href = "/"}
              variant="outline"
              className="h-12 px-8"
              data-testid="button-newhome"
            >
              Return to Home
            </Button>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>SSL Encrypted</span>
            </div>
            <span className="text-border">•</span>
            <span>Your data is safe with us</span>
          </div>
        </div>
      </div>
    </div>
  );
}
