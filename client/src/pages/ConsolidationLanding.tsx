import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * /consolidate — landing page for the MCA-consolidation email campaigns.
 * Visual language mirrors the campaign emails exactly (navy #0a0f1a / card
 * #0f1729 / teal #2dd4bf, serif italic accents) so the click feels like a
 * continuation, not a hand-off. Every CTA routes into the existing intake
 * quiz with the visitor's UTM query string preserved, so attribution flows
 * through to CLC -> Salesforce untouched.
 */

const NAVY = "#0a0f1a";
const CARD = "#0f1729";
const TEAL = "#2dd4bf";
const RED = "#f87171";
const BODY = "#d4d8e0";
const MUTED = "#a3aab8";
const FAINT = "#6b7384";

const serif = { fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif" };
const sans = { fontFamily: "'DM Sans', Inter, Arial, Helvetica, sans-serif" };

export default function ConsolidationLanding() {
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "One payment. No more daily debits. | Today Capital Group";
    // Load the campaign fonts once; harmless if already present
    if (!document.getElementById("consolidate-fonts")) {
      const link = document.createElement("link");
      link.id = "consolidate-fonts";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const goToQuiz = () => {
    navigate(`/intake/quiz${window.location.search}`);
  };

  const Cta = ({ label, sub }: { label: string; sub?: boolean }) => (
    <button
      onClick={goToQuiz}
      data-testid="button-consolidate-cta"
      className="inline-block rounded-lg font-bold tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.99]"
      style={{
        ...sans,
        backgroundColor: TEAL,
        color: NAVY,
        padding: sub ? "16px 32px" : "18px 40px",
        fontSize: sub ? 16 : 17,
        border: "none",
        cursor: "pointer",
        boxShadow: "0 8px 30px rgba(45,212,191,0.25)",
      }}
    >
      {label} &rarr;
    </button>
  );

  return (
    <div style={{ ...sans, backgroundColor: NAVY, minHeight: "100vh", color: BODY }}>
      <div className="mx-auto w-full max-w-[720px] px-5 sm:px-8">
        {/* Brand bar */}
        <header className="flex items-center justify-between pt-8 pb-2">
          <span
            className="uppercase font-semibold"
            style={{ color: TEAL, fontSize: 14, letterSpacing: "1.5px" }}
          >
            Today Capital Group
          </span>
          <a
            href="tel:8183510225"
            className="hidden sm:inline"
            style={{ color: MUTED, fontSize: 14 }}
          >
            (818) 351-0225
          </a>
        </header>

        {/* Hero */}
        <section className="pt-10 sm:pt-14 text-left">
          <h1
            className="text-[40px] sm:text-[56px]"
            style={{ ...serif, color: "#ffffff", lineHeight: 1.08, fontWeight: 400, letterSpacing: "-0.01em", margin: 0 }}
          >
            One payment.
            <br />
            No more <span style={{ fontStyle: "italic", color: TEAL }}>daily debits.</span>
          </h1>
          <p className="mt-6 max-w-[560px]" style={{ fontSize: 18, lineHeight: 1.65 }}>
            We pay off your existing MCA balances and roll them into{" "}
            <strong style={{ color: "#ffffff" }}>one monthly payment</strong> — at a lower rate,
            on a longer term. Your daily debits stop.
          </p>
          <div className="mt-8">
            <Cta label="Get My Payoff Number" />
          </div>
          <p className="mt-4" style={{ color: FAINT, fontSize: 13 }}>
            2-minute form &middot; No hard credit pull &middot; Same-day response
          </p>
        </section>

        {/* Before / After */}
        <section className="mt-12">
          <div
            className="rounded-[10px] p-6"
            style={{ backgroundColor: CARD, border: `1px solid rgba(45,212,191,0.25)` }}
          >
            <p
              className="uppercase font-semibold"
              style={{ color: FAINT, fontSize: 11, letterSpacing: "1px", margin: 0 }}
            >
              Illustrative scenario
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div>
                <p
                  className="uppercase font-semibold"
                  style={{ color: RED, fontSize: 12, letterSpacing: "0.5px", margin: 0 }}
                >
                  Today
                </p>
                <p style={{ fontSize: 16, lineHeight: 1.55, margin: "6px 0 0 0" }}>
                  ~$150K across 3 MCA positions
                  <br />
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>
                    ~$1,400 debited every day
                  </span>
                </p>
              </div>
              <div className="hidden sm:block text-center" style={{ ...serif, fontSize: 32, color: TEAL }}>
                &rarr;
              </div>
              <div className="sm:hidden" style={{ ...serif, fontSize: 26, color: TEAL }}>
                &darr;
              </div>
              <div>
                <p
                  className="uppercase font-semibold"
                  style={{ color: TEAL, fontSize: 12, letterSpacing: "0.5px", margin: 0 }}
                >
                  After
                </p>
                <p style={{ fontSize: 16, lineHeight: 1.55, margin: "6px 0 0 0" }}>
                  One payment, once a month
                  <br />
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>Lower rate, longer term</span>
                </p>
              </div>
            </div>
            <p style={{ color: FAINT, fontSize: 12, lineHeight: 1.5, margin: "16px 0 0 0" }}>
              Example only. Your actual payoff and payment depend on your positions and underwriting.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-14">
          <h2 style={{ ...serif, color: "#ffffff", fontSize: 30, fontWeight: 400, margin: 0 }}>
            How it <span style={{ fontStyle: "italic", color: TEAL }}>works</span>
          </h2>
          <div className="mt-6 space-y-6">
            {[
              {
                n: "1.",
                t: "Tell us about your business",
                d: "Quick 2-minute form. Your revenue, how long you've been in business, and what you owe on your MCA.",
              },
              {
                n: "2.",
                t: "We pay off your MCA",
                d: "Your existing positions get paid off as part of the funding. No daily debits. No more chasing your bank balance.",
              },
              {
                n: "3.",
                t: "You make one monthly payment",
                d: "At an SBA rate, on a longer term. Most business owners save six figures over the life of the deal.",
              },
            ].map((s) => (
              <div key={s.n} className="flex gap-4">
                <div
                  style={{ ...serif, fontStyle: "italic", fontSize: 34, color: TEAL, lineHeight: 1, minWidth: 44 }}
                >
                  {s.n}
                </div>
                <div>
                  <p style={{ color: "#ffffff", fontWeight: 600, fontSize: 17, margin: 0 }}>{s.t}</p>
                  <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6, margin: "4px 0 0 0" }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className="mt-14">
          <div
            className="rounded-[4px] p-6"
            style={{ backgroundColor: CARD, borderLeft: `3px solid ${TEAL}` }}
          >
            <p style={{ ...serif, fontStyle: "italic", color: "#ffffff", fontSize: 20, lineHeight: 1.55, margin: 0 }}>
              &ldquo;A family restaurant came to us with $180K across 4 positions &mdash; the daily
              debits were clearing before payroll every week. We paid them all off. Now it&rsquo;s one
              payment they can actually plan around.&rdquo;
            </p>
          </div>
        </section>

        {/* Qualify */}
        <section className="mt-10">
          <div className="rounded-[10px] p-6" style={{ backgroundColor: CARD }}>
            <p
              className="uppercase font-semibold"
              style={{ color: TEAL, fontSize: 12, letterSpacing: "1px", margin: 0 }}
            >
              To qualify
            </p>
            <p style={{ color: "#ffffff", fontSize: 17, lineHeight: 1.5, margin: "6px 0 0 0" }}>
              2+ years in business and $40K+ in monthly revenue.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-14 text-center pb-4">
          <h2 style={{ ...serif, color: "#ffffff", fontSize: 32, fontWeight: 400, margin: 0 }}>
            Ready to stop the <span style={{ fontStyle: "italic", color: TEAL }}>daily debits?</span>
          </h2>
          <div className="mt-7">
            <Cta label="Start My 2-Minute Form" sub />
          </div>
          <p className="mt-5" style={{ color: MUTED, fontSize: 15 }}>
            Prefer to talk it through?{" "}
            <a href="tel:8183510225" style={{ color: TEAL, fontWeight: 600 }}>
              Call (818) 351-0225
            </a>
          </p>
          <p className="mt-2" style={{ color: FAINT, fontSize: 13 }}>
            No hard credit pull. No obligation. Same-day response.
          </p>
        </section>

        {/* Footer */}
        <footer
          className="mt-12 pb-10 pt-6 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p style={{ color: FAINT, fontSize: 11, lineHeight: 1.6, margin: 0 }}>
            Today Capital Group is a business funding brokerage and does not make final lending
            decisions. The funding structure referenced is offered through SBA-backed lending
            programs and convertible note structures. Rates and terms subject to underwriting.
          </p>
          <p style={{ color: FAINT, fontSize: 11, margin: "10px 0 0 0" }}>
            Today Capital Group &middot; Woodland Hills, CA
          </p>
        </footer>
      </div>
    </div>
  );
}
