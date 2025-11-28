declare global {
  interface Window {
    gtag: (command: string, ...args: unknown[]) => void;
    trackEvent: (eventName: string, eventParams?: Record<string, unknown>) => void;
    trackApplicationSubmitted: (params: ApplicationSubmittedParams) => void;
    trackIntakeFormSubmitted: (params: IntakeFormSubmittedParams) => void;
    trackFormStepCompleted: (formType: string, stepNumber: number, stepName: string) => void;
    trackPageView: (pagePath: string, pageTitle: string) => void;
    trackBankConnected: (institutionName: string) => void;
    trackBankStatementUploaded: (fileCount: number) => void;
    trackFormAbandonment: (formType: string, lastStep: number) => void;
  }
}

interface ApplicationSubmittedParams {
  applicationType?: string;
  agentCode?: string;
  businessName?: string;
  requestedAmount?: string;
}

interface IntakeFormSubmittedParams {
  requestedAmount?: string;
  creditScore?: string;
  timeInBusiness?: string;
  monthlyRevenue?: string;
}

export const trackEvent = (eventName: string, eventParams?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.trackEvent) {
    window.trackEvent(eventName, eventParams);
  }
};

export const trackApplicationSubmitted = (params: ApplicationSubmittedParams = {}) => {
  if (typeof window !== 'undefined' && window.trackApplicationSubmitted) {
    window.trackApplicationSubmitted(params);
  }
};

export const trackIntakeFormSubmitted = (params: IntakeFormSubmittedParams = {}) => {
  if (typeof window !== 'undefined' && window.trackIntakeFormSubmitted) {
    window.trackIntakeFormSubmitted(params);
  }
};

export const trackFormStepCompleted = (formType: string, stepNumber: number, stepName: string) => {
  if (typeof window !== 'undefined' && window.trackFormStepCompleted) {
    window.trackFormStepCompleted(formType, stepNumber, stepName);
  }
};

export const trackPageView = (pagePath: string, pageTitle: string) => {
  if (typeof window !== 'undefined' && window.trackPageView) {
    window.trackPageView(pagePath, pageTitle);
  }
};

export const trackBankConnected = (institutionName: string) => {
  if (typeof window !== 'undefined' && window.trackBankConnected) {
    window.trackBankConnected(institutionName);
  }
};

export const trackBankStatementUploaded = (fileCount: number) => {
  if (typeof window !== 'undefined' && window.trackBankStatementUploaded) {
    window.trackBankStatementUploaded(fileCount);
  }
};

export const trackFormAbandonment = (formType: string, lastStep: number) => {
  if (typeof window !== 'undefined' && window.trackFormAbandonment) {
    window.trackFormAbandonment(formType, lastStep);
  }
};

export {};
