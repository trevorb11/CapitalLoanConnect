import { useEffect, useRef } from "react";
import { ArrowRight, Check } from "lucide-react";

export default function ConsolSBA() {
  const revealRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    document.title = "MCA Consolidation at SBA-Level Rates | Today Capital Group";
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-6");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  const qualItems = [
    {
      title: "2+ years in business",
      body: "Time in business is the first thing we verify. Newer operators have other options that fit better.",
    },
    {
      title: "$40K+ monthly revenue",
      body: "This is the underwriting floor. Higher revenue expands available structures and rate ranges.",
    },
    {
      title: "One or more MCA positions",
      body: "The structure is built around consolidating active positions. If you don't have MCA debt, this isn't the right product.",
    },
    {
      title: "Most industries qualify",
      body: "Trucking, construction, restaurants, healthcare, retail, and most service businesses. Credit matters but isn't a binary cutoff.",
    },
  ];

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #192F56 40%, #19112D 100%)" }}
      data-testid="consol-sba-page"
    >
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(45,212,191,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* Glow behind hero */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(45,212,191,0.09) 0%, transparent 70%)" }}
      />

      {/* ── Nav ────────────────────────────────────────── */}
      <nav
        className="relative z-10 border-b border-white/10"
        data-testid="consol-sba-nav"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-5 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-[0.18em] text-teal-400 uppercase">
            Today Capital Group
          </span>
          <a
            href="tel:+18183510225"
            className="text-sm text-white/60 hover:text-teal-400 transition-colors font-mono flex items-center gap-2"
            data-testid="consol-sba-nav-phone"
          >
            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
            (818) 351-0225
          </a>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 pt-24 pb-20">
        {/* Eyebrow badge */}
        <div
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-teal-400/30 bg-teal-400/10 mb-8 animate-[fadeUp_0.8s_0.1s_both]"
          data-testid="consol-sba-eyebrow"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.6)] animate-pulse" />
          <span className="text-xs font-semibold tracking-widest text-teal-400 uppercase">SBA-Level Funding Program</span>
        </div>

        <h1
          className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-light leading-[1.03] tracking-tight text-white mb-8 max-w-5xl animate-[fadeUp_0.8s_0.2s_both]"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          data-testid="consol-sba-headline"
        >
          SBA-level rates for businesses
          <br />
          carrying <em className="italic text-teal-400 not-italic" style={{ fontStyle: "italic" }}>MCA debt.</em>
        </h1>

        <p
          className="text-lg sm:text-xl text-white/60 max-w-xl mb-12 leading-relaxed animate-[fadeUp_0.8s_0.3s_both]"
          data-testid="consol-sba-subhead"
        >
          Same rate range. Same term lengths. Your existing MCA positions paid off as part of the funding. Available now, even after the June 2025 SBA rule change.
        </p>

        <div className="flex flex-wrap gap-4 animate-[fadeUp_0.8s_0.4s_both]" data-testid="consol-sba-ctas">
          <a
            href="https://bit.ly/4aLcV3i"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-lg bg-teal-400 text-[#0d1f3c] font-bold text-base hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(45,212,191,0.35)] transition-all duration-200"
            data-testid="consol-sba-cta-primary"
          >
            See If I Qualify
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="https://bit.ly/3ZnW1kS"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-lg border border-white/20 text-white font-semibold text-base hover:border-teal-400/50 hover:text-teal-400 transition-all duration-200"
            data-testid="consol-sba-cta-secondary"
          >
            Send Bank Statements
          </a>
        </div>

        {/* Stats bar */}
        <div
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 border-t border-b border-white/10 animate-[fadeUp_0.8s_0.5s_both]"
          data-testid="consol-sba-stats"
        >
          {[
            {
              label: "Avg MCA Effective Cost",
              value: "40–80%",
              detail: "Annualized on daily debits",
              accent: true,
            },
            {
              label: "SBA Target Range",
              value: "Prime + 2–3%",
              detail: "What we structure to match",
              accent: false,
            },
            {
              label: "Typical Savings",
              value: "6 figures",
              detail: "On a $150K balance",
              accent: false,
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`py-8 px-6 ${i < 2 ? "sm:border-r border-white/10" : ""}`}
            >
              <div className="text-xs font-medium tracking-[0.15em] text-white/35 uppercase mb-3">
                {stat.label}
              </div>
              <div
                className="text-4xl sm:text-5xl text-white mb-2 leading-none"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                <span className={stat.accent ? "text-teal-400" : ""}>{stat.value}</span>
              </div>
              <div className="text-sm text-white/45">{stat.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem / Solution ──────────────────────────── */}
      <section
        ref={addToRefs}
        className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 py-24 opacity-0 translate-y-6 transition-all duration-700"
        data-testid="consol-sba-section-situation"
      >
        <div className="text-xs font-mono tracking-[0.2em] text-teal-400 uppercase mb-6">
          — The Situation
        </div>
        <h2
          className="text-4xl sm:text-5xl font-light leading-tight text-white mb-6 max-w-2xl"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          What you've been told{" "}
          <em className="italic text-teal-400">isn't</em> the whole story.
        </h2>
        <p className="text-lg text-white/55 max-w-2xl mb-12 leading-relaxed">
          The SBA tightened its 7(a) program rules in June 2025. Direct MCA refinance under 7(a) is no longer an option. That part is true. But it's not where the conversation should end.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Problem card */}
          <div
            className="rounded-2xl border border-white/10 p-10"
            style={{ background: "linear-gradient(180deg, rgba(30,10,24,0.9) 0%, rgba(15,23,41,0.9) 100%)" }}
            data-testid="consol-sba-card-problem"
          >
            <div className="text-xs font-mono tracking-[0.18em] text-red-400 uppercase mb-5">
              What most brokers tell you
            </div>
            <h3
              className="text-2xl sm:text-3xl font-light text-white mb-5 leading-snug"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              "You can't get SBA funding with active MCA debt."
            </h3>
            <p className="text-white/50 text-base leading-relaxed mb-4">
              It's a clean answer. It sounds authoritative. And it's been true enough, often enough, that most business owners take it at face value and stop asking.
            </p>
            <p className="text-white/50 text-base leading-relaxed">
              It's also incomplete — and the incomplete part is where the money is.
            </p>
          </div>

          {/* Solution card */}
          <div
            className="rounded-2xl border border-teal-400/25 p-10"
            style={{ background: "linear-gradient(180deg, rgba(45,212,191,0.06) 0%, rgba(15,23,41,0.9) 100%)" }}
            data-testid="consol-sba-card-solution"
          >
            <div className="text-xs font-mono tracking-[0.18em] text-teal-400 uppercase mb-5">
              What's actually possible
            </div>
            <h3
              className="text-2xl sm:text-3xl font-light text-white mb-5 leading-snug"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              SBA-level rates and terms, MCA paid off in the funding.
            </h3>
            <p className="text-white/50 text-base leading-relaxed mb-4">
              The rule change closed one specific path. It didn't close the underlying need. Businesses on MCA debt are still accessing SBA-comparable rates in 2026 — through a different structure.
            </p>
            <p className="text-white/50 text-base leading-relaxed">
              The rate and term hit the same number. The MCA gets paid off as part of the close.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────── */}
      <section
        ref={addToRefs}
        className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 py-24 opacity-0 translate-y-6 transition-all duration-700"
        data-testid="consol-sba-section-how"
      >
        <div className="text-xs font-mono tracking-[0.2em] text-teal-400 uppercase mb-6">
          — How It Works
        </div>
        <h2
          className="text-4xl sm:text-5xl font-light leading-tight text-white mb-16"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          Three steps.{" "}
          <em className="italic text-teal-400">One outcome.</em>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              num: "i.",
              title: "Submit statements",
              body: "Three months of business bank statements. No hard credit pull. We review the numbers and confirm fit within one business day.",
            },
            {
              num: "ii.",
              title: "Structure the funding",
              body: "We build the deal at SBA-comparable rates and term lengths. Your existing MCA positions are paid off as part of the closing.",
            },
            {
              num: "iii.",
              title: "Close and breathe",
              body: "One monthly payment in the SBA target rate range. No more daily debits. Operating cash flow restored.",
            },
          ].map((step, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-8 hover:border-teal-400/30 hover:-translate-y-1 transition-all duration-300"
              data-testid={`consol-sba-step-${i + 1}`}
            >
              <div
                className="text-5xl text-teal-400 italic mb-5 leading-none"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {step.num}
              </div>
              <h4
                className="text-xl text-white font-light mb-3 leading-snug"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {step.title}
              </h4>
              <p className="text-sm text-white/50 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full Transparency ────────────────────────────── */}
      <section
        ref={addToRefs}
        className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 py-24 opacity-0 translate-y-6 transition-all duration-700"
        data-testid="consol-sba-section-transparency"
      >
        <div className="text-xs font-mono tracking-[0.2em] text-teal-400 uppercase mb-6">
          — Full Transparency
        </div>
        <h2
          className="text-4xl sm:text-5xl font-light leading-tight text-white mb-6"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          What we actually structure.
        </h2>
        <p className="text-lg text-white/55 max-w-2xl mb-10 leading-relaxed">
          Most landing pages would stop at "SBA-level" and let you fill in the blanks. We won't.
        </p>

        <div
          className="rounded-2xl border-l-4 border-teal-400 bg-white/[0.04] border border-white/10 px-10 py-10"
          data-testid="consol-sba-truth-block"
        >
          <h3
            className="text-2xl sm:text-3xl font-light text-white mb-5 leading-snug"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            It's a convertible note — not a 7(a).
          </h3>
          <p className="text-base text-white/55 leading-relaxed mb-5">
            The financial instrument behind the deal is a convertible note structured at rates and term lengths comparable to what an SBA 7(a) would deliver. It's not pretending to be a 7(a). It uses different underwriting and a different regulatory framework.
          </p>
          <p className="text-base text-white/55 leading-relaxed mb-5">
            What it does deliver: the same rate range the SBA targets, the same term lengths, and a structure that allows your existing MCA positions to be paid off as part of the funding — which the post-June 2025 7(a) rules no longer allow directly.
          </p>
          <p className="text-base text-white/55 leading-relaxed">
            For most businesses carrying meaningful MCA debt, the result on rate and cash flow is functionally identical to where an SBA 7(a) would have landed before the rule change. The paperwork looks different. The destination is the same.
          </p>
        </div>
      </section>

      {/* ── Who This Is For ──────────────────────────────── */}
      <section
        ref={addToRefs}
        className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 py-24 opacity-0 translate-y-6 transition-all duration-700"
        data-testid="consol-sba-section-qualification"
      >
        <div className="text-xs font-mono tracking-[0.2em] text-teal-400 uppercase mb-6">
          — Who This Is For
        </div>
        <h2
          className="text-4xl sm:text-5xl font-light leading-tight text-white mb-6"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          Straight talk on{" "}
          <em className="italic text-teal-400">fit.</em>
        </h2>
        <p className="text-lg text-white/55 max-w-2xl mb-10 leading-relaxed">
          This isn't for everyone. Here's the honest qualification picture so you can save time on a call if it isn't a fit.
        </p>

        <div
          className="rounded-2xl bg-white/[0.04] border border-white/10 px-8 py-10 sm:px-14 sm:py-14"
          data-testid="consol-sba-qual-grid"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
            {qualItems.map((item, i) => (
              <div
                key={i}
                className="flex gap-4 items-start py-5 border-b border-white/10 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
                data-testid={`consol-sba-qual-item-${i}`}
              >
                <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-teal-400/15 border border-teal-400/60 flex items-center justify-center">
                  <Check className="w-3 h-3 text-teal-400 stroke-[2.5]" />
                </div>
                <div>
                  <h5 className="text-base font-semibold text-white mb-1">{item.title}</h5>
                  <p className="text-sm text-white/50 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section
        ref={addToRefs}
        className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 py-16 opacity-0 translate-y-6 transition-all duration-700"
        data-testid="consol-sba-section-cta"
      >
        <div
          className="relative rounded-3xl border border-teal-400/25 overflow-hidden text-center px-8 py-20 sm:px-16"
          style={{ background: "linear-gradient(135deg, rgba(25,47,86,0.8) 0%, rgba(25,17,45,0.9) 100%)" }}
        >
          {/* Top glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top, rgba(45,212,191,0.18) 0%, transparent 70%)" }}
          />
          <h2
            className="relative text-4xl sm:text-5xl font-light text-white mb-6 mx-auto"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            data-testid="consol-sba-final-headline"
          >
            Find out in{" "}
            <em className="italic text-teal-400">10 minutes.</em>
          </h2>
          <p className="relative text-lg text-white/55 max-w-xl mx-auto mb-10 leading-relaxed">
            Book a call or submit your last three months of bank statements. We'll review the numbers and tell you straight whether this is the right fit — or whether another structure would serve you better.
          </p>
          <div className="relative flex flex-wrap justify-center gap-4">
            <a
              href="https://bit.ly/4aLcV3i"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-lg bg-teal-400 text-[#0d1f3c] font-bold text-base hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(45,212,191,0.35)] transition-all duration-200"
              data-testid="consol-sba-final-cta-primary"
            >
              Book My Qualification Call
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="tel:+18183510225"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-lg border border-white/20 text-white font-semibold text-base hover:border-teal-400/50 hover:text-teal-400 transition-all duration-200"
              data-testid="consol-sba-final-cta-phone"
            >
              Call (818) 351-0225
            </a>
          </div>
          <p className="relative mt-8 text-xs text-white/30 tracking-wide">
            No hard credit pull · No obligation · Same-day response
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer
        className="relative z-10 border-t border-white/10 mt-16 mb-0"
        data-testid="consol-sba-footer"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10 flex flex-wrap gap-6 items-center justify-between">
          <p className="text-xs text-white/30 leading-relaxed max-w-2xl">
            Today Capital Group is a business funding brokerage and does not make final lending decisions. Rates and terms subject to underwriting. The financial instrument referenced is a convertible note structured at SBA-comparable rates and term lengths; it is not an SBA 7(a) loan and is not guaranteed or insured by the U.S. Small Business Administration.
          </p>
          <span className="text-xs font-semibold tracking-[0.18em] text-teal-400 uppercase whitespace-nowrap">
            Today Capital Group · Woodland Hills, CA
          </span>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
