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
    trackCloseConvertLead: (source?: string) => void;
    trackQualifiedIntakeConversion: (params: QualifiedIntakeConversionParams) => void;
    enhanced_conversion_data?: {
      email: string;
      phone_number: string;
      first_name: string;
      last_name: string;
    };
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
  industry?: string;
  useOfFunds?: string;
  source?: string;
}

interface QualifiedIntakeConversionParams {
  email: string;
  fullName: string;
  phone: string;
  monthlyRevenue?: string;
  requestedAmount?: string;
  industry?: string;
  creditScore?: string;
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

export const trackCloseConvertLead = (source?: string) => {
  if (typeof window !== 'undefined' && window.trackCloseConvertLead) {
    window.trackCloseConvertLead(source);
  }
};

// Google Ads Enhanced Conversion - only for qualified intake leads (revenue >= $10k/month)
export const trackQualifiedIntakeConversion = (params: QualifiedIntakeConversionParams) => {
  if (typeof window !== 'undefined' && window.trackQualifiedIntakeConversion) {
    window.trackQualifiedIntakeConversion(params);
  }
};

// Track event with beacon transport for reliable delivery before navigation
// Uses navigator.sendBeacon for best delivery reliability
export const trackEventBeforeNavigation = (
  eventName: string, 
  eventParams: Record<string, unknown>,
  navigateTo: string
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    // Use gtag with beacon transport for reliable delivery
    window.gtag('event', eventName, {
      ...eventParams,
      transport_type: 'beacon',
      event_callback: () => {
        window.location.href = navigateTo;
      }
    });
    // Fallback: navigate after 300ms if callback doesn't fire
    setTimeout(() => {
      window.location.href = navigateTo;
    }, 300);
  } else {
    // No analytics, just navigate
    window.location.href = navigateTo;
  }
};

export {};
