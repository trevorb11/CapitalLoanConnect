import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { FullApplicationData, fullApplicationSchema, type LoanApplication } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber, formatCurrency, parseCurrency } from "@/lib/formatters";

const states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export default function FullApplication() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(true);

  // Check for Application ID
  useEffect(() => {
    const savedId = localStorage.getItem("applicationId");
    if (!savedId) {
      navigate("/"); 
    } else {
      setApplicationId(savedId);
    }
    setIsCheckingId(false);
  }, [navigate]);

  // Fetch existing data to pre-fill
  const { data: existingData, isLoading } = useQuery<LoanApplication>({
    queryKey: [`/api/applications/${applicationId}`],
    enabled: !!applicationId,
  });

  const form = useForm<FullApplicationData>({
    resolver: zodResolver(fullApplicationSchema),
    defaultValues: {
      legalBusinessName: "", doingBusinessAs: "", companyWebsite: "", businessStartDate: "",
      ein: "", stateOfIncorporation: "", industry: "", businessAddress: "", city: "", state: "", zipCode: "",
      requestedAmount: "", mcaBalanceAmount: "", mcaBalanceBankName: "",
      fullName: "", businessEmail: "", phone: "", socialSecurityNumber: "", ficoScoreExact: "",
      ownerAddress1: "", ownerAddress2: "", ownerCity: "", ownerState: "", ownerZip: "",
      dateOfBirth: "", ownership: ""
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingData) {
      form.reset({
        legalBusinessName: existingData.legalBusinessName || existingData.businessName || "",
        doingBusinessAs: existingData.doingBusinessAs || existingData.businessName || "",
        companyWebsite: existingData.companyWebsite || "",
        businessStartDate: existingData.businessStartDate || "",
        ein: existingData.ein || "",
        stateOfIncorporation: existingData.stateOfIncorporation || existingData.state || "",
        doYouProcessCreditCards: existingData.doYouProcessCreditCards as "Yes" | "No" | undefined,
        industry: existingData.industry || "",
        businessAddress: existingData.businessAddress || "",
        city: existingData.city || "",
        state: existingData.state || "",
        zipCode: existingData.zipCode || "",
        requestedAmount: existingData.requestedAmount ? formatCurrency(existingData.requestedAmount.toString()) : "",
        mcaBalanceAmount: existingData.mcaBalanceAmount ? formatCurrency(existingData.mcaBalanceAmount.toString()) : "",
        mcaBalanceBankName: existingData.mcaBalanceBankName || "",
        fullName: existingData.fullName || "",
        businessEmail: existingData.businessEmail || existingData.email || "",
        phone: existingData.phone ? formatPhoneNumber(existingData.phone) : "",
        socialSecurityNumber: existingData.socialSecurityNumber || "",
        ficoScoreExact: existingData.ficoScoreExact || existingData.creditScore || "",
        ownerAddress1: existingData.ownerAddress1 || existingData.businessAddress || "",
        ownerAddress2: existingData.ownerAddress2 || "",
        ownerCity: existingData.ownerCity || existingData.city || "",
        ownerState: existingData.ownerState || existingData.state || "",
        ownerZip: existingData.ownerZip || existingData.zipCode || "",
        dateOfBirth: existingData.dateOfBirth || "",
        ownership: existingData.ownership || "",
      });
    }
  }, [existingData, form]);

  // Submit & Save
  const mutation = useMutation({
    mutationFn: async (data: FullApplicationData) => {
      const payload = { ...data };
      // Clean currency fields
      if (payload.requestedAmount) payload.requestedAmount = parseCurrency(payload.requestedAmount);
      if (payload.mcaBalanceAmount) payload.mcaBalanceAmount = parseCurrency(payload.mcaBalanceAmount);

      return await apiRequest("PATCH", `/api/applications/${applicationId}`, {
        ...payload,
        isFullApplicationCompleted: true,
      });
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Application submitted successfully." });
      navigate("/success");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit application.", variant: "destructive" });
    }
  });

  if (isCheckingId || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center border-b pb-6 bg-white p-6 rounded-t-xl shadow-sm">
          <h1 className="text-3xl font-bold">Complete Your Application</h1>
          <p className="text-muted-foreground mt-2">Please provide additional details about your business and ownership.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-8">
            
            {/* Business Information */}
            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="bg-gray-50/50 pb-4">
                <CardTitle className="text-xl text-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" /> Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField control={form.control} name="legalBusinessName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Company Name *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-legalbusinessname" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="companyWebsite" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Website</FormLabel>
                      <FormControl><Input {...field} placeholder="https://..." data-testid="input-website" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ein" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / EIN *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-ein" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="stateOfIncorporation" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State of Incorporation *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-stateofincorporation">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-city" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mcaBalanceAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current MCA Balance</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={e => field.onChange(formatCurrency(e.target.value))}
                          placeholder="$0"
                          data-testid="input-mcabalance"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="space-y-4">
                  <FormField control={form.control} name="doingBusinessAs" render={({ field }) => (
                    <FormItem>
                      <FormLabel>DBA (Doing Business As)</FormLabel>
                      <FormControl><Input {...field} data-testid="input-dba" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="businessStartDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Start Date *</FormLabel>
                      <FormControl><Input {...field} type="date" data-testid="input-startdate" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="businessEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Email</FormLabel>
                      <FormControl><Input {...field} type="email" data-testid="input-businessemail" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="doYouProcessCreditCards" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do You Process Credit Cards?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-processcreditcards">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="zipCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-zipcode" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="requestedAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Financing Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={e => field.onChange(formatCurrency(e.target.value))}
                          placeholder="$0"
                          data-testid="input-requestedamount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Owner Information */}
            <Card className="border-t-4 border-t-secondary shadow-md">
              <CardHeader className="bg-gray-50/50 pb-4">
                <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                  <Lock className="w-5 h-5" /> Owner Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-fullname" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="socialSecurityNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Social Security Number *</FormLabel>
                      <FormControl><Input {...field} placeholder="XXX-XX-XXXX" data-testid="input-ssn" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ownerAddress1" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home Address *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-owneraddress1" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ownerAddress2" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl><Input {...field} placeholder="Apt, Suite, etc." data-testid="input-owneraddress2" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ownerCity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-ownercity" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <FormControl><Input {...field} type="date" data-testid="input-dob" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="space-y-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Phone *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={e => field.onChange(formatPhoneNumber(e.target.value))}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ficoScoreExact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>FICO Score</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g., 720" data-testid="input-fico" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ownerState" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ownerstate">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ownerZip" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl><Input {...field} data-testid="input-ownerzip" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ownership" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership %</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g., 100%" data-testid="input-ownership" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mcaBalanceBankName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>MCA Balance Bank Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g., Chase" data-testid="input-mcabankname" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button size="lg" type="submit" disabled={mutation.isPending} data-testid="button-submit">
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Full Application"
                )}
              </Button>
            </div>

            {/* Security Notice */}
            <div className="text-center text-sm text-muted-foreground mt-4">
              <Lock className="inline-block w-4 h-4 mr-1" />
              Your information is securely encrypted and protected
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
