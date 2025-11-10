import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type Step4Data } from "@shared/schema";

interface Step4FundingProps {
  form: UseFormReturn<Step4Data>;
}

export function Step4Funding({ form }: Step4FundingProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-foreground mb-2">
          Funding Request
        </h2>
        <p className="text-muted-foreground">
          Tell us about your funding needs
        </p>
      </div>

      <div className="space-y-6">
        <FormField
          control={form.control}
          name="requestedAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                How much funding do you need?
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    {...field}
                    type="text"
                    placeholder="50,000"
                    className="h-12 text-base pl-8"
                    data-testid="input-requestedamount"
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Enter the amount you're requesting
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="useOfFunds"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                How will you use the funds?
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe how you plan to use the funding (e.g., inventory purchase, equipment, marketing, expansion, working capital)"
                  className="min-h-32 text-base resize-none"
                  data-testid="textarea-useoffunds"
                />
              </FormControl>
              <FormDescription className="text-xs">
                Please provide specific details about your funding needs
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                Primary Business Bank{" "}
                <span className="text-muted-foreground font-normal">Optional</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Chase, Bank of America, etc."
                  className="h-12 text-base"
                  data-testid="input-bankname"
                />
              </FormControl>
              <FormDescription className="text-xs">
                The bank where your business operates its main account
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex items-start gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground font-medium mb-1">Fast Approval Process</p>
          <p className="text-sm text-muted-foreground">
            Most applications receive a decision within 24-48 hours. We work with multiple lenders to find you the best rates.
          </p>
        </div>
      </div>
    </div>
  );
}
