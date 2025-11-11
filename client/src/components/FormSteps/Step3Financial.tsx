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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { type Step3Data } from "@shared/schema";
import { formatCurrency } from "@/lib/formatters";

interface Step3FinancialProps {
  form: UseFormReturn<Step3Data>;
}

const creditScoreRanges = [
  "750+",
  "700-749",
  "650-699",
  "600-649",
  "550-599",
  "Below 550",
];

export function Step3Financial({ form }: Step3FinancialProps) {
  const hasOutstandingLoans = form.watch("hasOutstandingLoans");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-foreground mb-2">
          Financial Information
        </h2>
        <p className="text-muted-foreground">
          Help us understand your business's financial health
        </p>
      </div>

      <div className="space-y-6">
        <FormField
          control={form.control}
          name="monthlyRevenue"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                Current Monthly Revenue
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    {...field}
                    type="text"
                    placeholder="25,000"
                    className="h-12 text-base pl-8"
                    data-testid="input-monthlyrevenue"
                    onChange={(e) => {
                      const formatted = formatCurrency(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Your most recent month's revenue
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="averageMonthlyRevenue"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                Average Monthly Revenue
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    {...field}
                    type="text"
                    placeholder="30,000"
                    className="h-12 text-base pl-8"
                    data-testid="input-averagemonthlyrevenue"
                    onChange={(e) => {
                      const formatted = formatCurrency(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Average over the last 3-6 months
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="creditScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Personal Credit Score</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 text-base" data-testid="select-creditscore">
                    <SelectValue placeholder="Select your credit score range" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {creditScoreRanges.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
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
          name="hasOutstandingLoans"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-sm font-medium">
                Do you have any outstanding business loans or cash advances?
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(value === "true")}
                  value={field.value?.toString()}
                  className="flex gap-4"
                  data-testid="radio-outstandingloans"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="loans-yes" />
                    <Label htmlFor="loans-yes" className="font-normal cursor-pointer">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="loans-no" />
                    <Label htmlFor="loans-no" className="font-normal cursor-pointer">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasOutstandingLoans && (
          <FormField
            control={form.control}
            name="outstandingLoansAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Total Outstanding Balance
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      {...field}
                      type="text"
                      placeholder="10,000"
                      className="h-12 text-base pl-8"
                      data-testid="input-outstandingloansamount"
                      onChange={(e) => {
                        const formatted = formatCurrency(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}
