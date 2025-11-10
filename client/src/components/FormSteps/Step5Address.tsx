import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Step5Data } from "@shared/schema";

interface Step5AddressProps {
  form: UseFormReturn<Step5Data>;
}

const states = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export function Step5Address({ form }: Step5AddressProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-foreground mb-2">
          Business Address
        </h2>
        <p className="text-muted-foreground">
          Where is your business located?
        </p>
      </div>

      <div className="space-y-6">
        <FormField
          control={form.control}
          name="businessAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Street Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="123 Main Street"
                  className="h-12 text-base"
                  data-testid="input-businessaddress"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">City</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="New York"
                  className="h-12 text-base"
                  data-testid="input-city"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">State</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-base" data-testid="select-state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">ZIP Code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="10001"
                    className="h-12 text-base"
                    data-testid="input-zipcode"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground font-medium mb-1">Almost Done!</p>
          <p className="text-sm text-muted-foreground">
            Once you submit, our team will review your application and reach out within 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
