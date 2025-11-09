# Design Guidelines: Today Capital Group MCA Loan Intake Form

## Design Approach
**System-Based with Fintech Inspiration**: Drawing from Stripe's clarity, Plaid's trustworthiness, and modern banking interfaces. Financial forms require professional credibility, clear hierarchy, and friction-free completion.

## Core Design Principles
1. **Progressive Trust Building**: Each step reinforces credibility
2. **Minimal Cognitive Load**: One focused task per screen
3. **Clear Progress Visibility**: Users always know where they are
4. **Professional Restraint**: Clean, authoritative, no unnecessary flourish

## Typography System
- **Headings**: Inter or DM Sans (professional, modern)
  - Step titles: 2xl to 3xl, semibold
  - Section headers: xl, medium
  - Field labels: sm, medium
- **Body/Inputs**: Same family, regular weight, base to lg size
- **Helper text**: sm, text-gray-600 equivalent

## Layout & Spacing
**Spacing Units**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Form container: max-w-2xl, centered
- Between form sections: space-y-8
- Between fields: space-y-6
- Input padding: p-3 to p-4
- Section padding: p-6 to p-8

## Component Structure

### Header
- Today Capital Group logo (left-aligned)
- Progress indicator (centered or below logo)
- Save status indicator (right-aligned: "All changes saved" with checkmark icon)

### Progress Indicator
- Multi-step progress bar or numbered steps (1/5, 2/5, etc.)
- Show: Step number, step title, completion status
- Visual: Line/dot connector showing current position

### Form Sections
**Step 1: Contact Information**
- Clean headline: "Let's Get Started"
- Subtext: "We'll use this to keep you updated on your application"
- Fields: Email, Full Name, Phone (formatted input)
- Large, clear input fields with adequate touch targets

**Step 2-4: Business & Loan Details**
- Group related fields logically
- Use field groups with subtle borders or background distinction
- Include helper text for complex fields
- Inline validation (green checkmark on valid, red text on error)

**Input Field Design**
- Large, comfortable touch targets (min 48px height)
- Rounded corners (rounded-lg)
- Clear focus states with border accent
- Floating labels or always-visible labels (never placeholder-only)

### Navigation
- "Continue" primary button (right-aligned or full-width on mobile)
- "Back" secondary button (left-aligned, text or ghost style)
- Button sizing: px-8, py-3 minimum
- Fixed or sticky footer on mobile for easy access

### Trust Elements
- Subtle security badge near sensitive fields ("🔒 Your information is secure")
- At bottom: "SSL Encrypted | FDIC Insured Partner Lenders"
- Privacy policy link in footer

### Success Screen
- Celebratory confirmation message
- Clear next steps explanation
- Application reference number
- Contact information if questions arise

## Interactions & States
- **Auto-save indicator**: Subtle pulse or fade-in notification
- **Field validation**: Immediate on blur, not while typing
- **Error states**: Red border + inline error text below field
- **Loading states**: Skeleton loaders or spinner for API calls
- **Disabled states**: Reduced opacity, cursor-not-allowed

## Responsive Behavior
- **Mobile**: Single column, full-width inputs, sticky navigation
- **Desktop**: Max-width contained, comfortable field widths (not too wide)
- Form fields: max-w-md to max-w-lg for readability

## Images
**No Hero Image** - This is a focused utility form. Optional subtle background pattern or gradient in the header area only. Focus remains on form completion, not marketing visuals.

## Visual Polish
- Subtle shadows on form container (shadow-sm to shadow-md)
- Soft borders (border-gray-200 equivalent)
- Generous whitespace between sections
- Consistent 8-12px border radius across components
- Professional color palette (blues/grays suggesting trust and stability)