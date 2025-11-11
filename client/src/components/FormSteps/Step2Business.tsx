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
import { type Step2Data } from "@shared/schema";
import { formatEIN } from "@/lib/formatters";

interface Step2BusinessProps {
  form: UseFormReturn<Step2Data>;
}

const businessTypes = [
  "Sole Proprietorship",
  "Partnership",
  "LLC",
  "Corporation",
  "S-Corporation",
  "Non-Profit",
];

const industries = [
  "Retail",
  "Restaurant/Food Service",
  "Healthcare",
  "Construction",
  "Professional Services",
  "Manufacturing",
  "Technology",
  "Transportation",
  "Real Estate",
  "Wholesale",
  "Other",
];

const timeInBusinessOptions = [
  "Less than 6 months",
  "6-12 months",
  "1-2 years",
  "2-3 years",
  "3-5 years",
  "5+ years",
];

const ownershipOptions = [
  "100%",
  "75-99%",
  "50-74%",
  "25-49%",
  "Less than 25%",
];

export function Step2Business({ form }: Step2BusinessProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-foreground mb-2">
          Tell Us About Your Business
        </h2>
        <p className="text-muted-foreground">
          This helps us understand your business better
        </p>
      </div>

      <div className="space-y-6">
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Business Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="ABC Company LLC"
                  className="h-12 text-base"
                  data-testid="input-businessname"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Business Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 text-base" data-testid="select-businesstype">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
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
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Industry</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 text-base" data-testid="select-industry">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
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
          name="ein"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                EIN (Employer Identification Number){" "}
                <span className="text-muted-foreground font-normal">Optional</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="12-3456789"
                  className="h-12 text-base"
                  data-testid="input-ein"
                  onChange={(e) => {
                    const formatted = formatEIN(e.target.value);
                    field.onChange(formatted);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timeInBusiness"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Time in Business</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 text-base" data-testid="select-timeinbusiness">
                    <SelectValue placeholder="How long have you been in business?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timeInBusinessOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
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
          name="ownership"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Ownership Percentage</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 text-base" data-testid="select-ownership">
                    <SelectValue placeholder="What percentage of the business do you own?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ownershipOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
