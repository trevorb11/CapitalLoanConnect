import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, CheckCircle2, Landmark, Loader2, Mail, ShieldCheck } from "lucide-react";
import tcgLogo from "@assets/TCG_White_logo_1764664150165.png";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  email: z.string().trim().email("Enter a valid email address"),
});

type FormData = z.infer<typeof formSchema>;

export default function Plaid() {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [institutionName, setInstitutionName] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { businessName: "", email: "" },
  });

  const exchangeMutation = useMutation({
    mutationFn: async ({ publicToken, metadata }: { publicToken: string; metadata: any }) => {
      const values = form.getValues();
      const response = await apiRequest("POST", "/api/plaid/exchange-token", {
        publicToken,
        metadata,
        businessName: values.businessName,
        email: values.email,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setInstitutionName(data.institutionName || "");
      setConnected(true);
      queryClient.invalidateQueries({ queryKey: ["/api/plaid/all"] });
      toast({
        title: "Bank connected",
        description: "Your transaction data was securely connected and saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message || "We couldn't connect to your bank. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/plaid/create-link-token");
      return response.json();
    },
    onSuccess: (data) => setLinkToken(data.link_token),
    onError: (error: Error) => {
      toast({
        title: "Unable to start Plaid",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onPlaidSuccess = useCallback(
    (publicToken: string, metadata: any) => {
      exchangeMutation.mutate({ publicToken, metadata });
    },
    [exchangeMutation],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const handleConnect = async () => {
    const valid = await form.trigger();
    if (!valid || createTokenMutation.isPending || exchangeMutation.isPending) return;
    createTokenMutation.mutate();
  };

  const isLoading = createTokenMutation.isPending || exchangeMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#192F56] to-[#19112D] px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <img src={tcgLogo} alt="Today Capital Group" className="mx-auto mb-6 h-16" />
          <h1 className="text-3xl font-bold text-white">Connect Your Business Bank</h1>
          <p className="mt-3 text-white/70">
            Securely connect your bank through Plaid so our team can review your transaction history.
          </p>
        </div>

        <Card className="bg-card/95 p-6 shadow-xl backdrop-blur">
          {connected ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Bank connected successfully</h2>
              {institutionName && (
                <p className="mt-2 text-muted-foreground">{institutionName} is connected for transaction review.</p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                Your information has been saved to our dashboard for review.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Plaid securely connects to your bank. We only request transaction information for this review;
                    we do not see or store your bank login credentials.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="plaid-business-name" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Business name
                  </Label>
                  <Input
                    id="plaid-business-name"
                    placeholder="Your business name"
                    {...form.register("businessName")}
                  />
                  {form.formState.errors.businessName && (
                    <p className="text-sm text-destructive">{form.formState.errors.businessName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plaid-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email address
                  </Label>
                  <Input id="plaid-email" type="email" placeholder="you@example.com" {...form.register("email")} />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <Button className="w-full" size="lg" onClick={handleConnect} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Landmark className="mr-2 h-5 w-5" />}
                  {isLoading ? "Preparing secure connection..." : "Connect with Plaid"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}