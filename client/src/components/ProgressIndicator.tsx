import { Check } from "lucide-react";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const steps = [
  { number: 1, title: "Contact Info" },
  { number: 2, title: "Business Details" },
  { number: 3, title: "Financial Info" },
  { number: 4, title: "Funding Request" },
  { number: 5, title: "Business Address" },
];

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${
                    step.number < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.number === currentStep
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }
                `}
                data-testid={`step-indicator-${step.number}`}
              >
                {step.number < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium text-center hidden sm:block
                  ${
                    step.number <= currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                `}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 -mt-6 hidden sm:block">
                <div
                  className={`
                    h-full transition-all
                    ${
                      step.number < currentStep
                        ? "bg-primary"
                        : "bg-muted"
                    }
                  `}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="sm:hidden text-center mt-4">
        <p className="text-sm font-medium text-foreground">
          Step {currentStep} of {totalSteps}: {steps[currentStep - 1]?.title}
        </p>
      </div>
    </div>
  );
}
