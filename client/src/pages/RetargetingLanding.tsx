import { useEffect } from "react";
import { Link } from "wouter";
import { CheckCircle, Clock, Shield, FileText, ArrowRight, Phone, Mail, AlertCircle, TrendingUp, Banknote, Users, Lock } from "lucide-react";
import { trackPageView } from "@/lib/analytics";

export default function RetargetingLanding() {
  useEffect(() => {
    trackPageView('/complete-application', 'Retargeting Landing Page');
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: '#f5f5f7', color: '#1d1d1f', lineHeight: 1.6 }}>
      
      {/* Header */}
      <header style={{ backgroundColor: '#0a0f2c', padding: '20px 0', borderBottom: '1px solid #1a2650', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img 
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg" 
            alt="Today Capital Group" 
            style={{ height: '40px', width: 'auto' }}
            data-testid="img-logo"
          />
          <a href="tel:8183510225" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={16} />
            (818) 351-0225
          </a>
        </div>
      </header>

      {/* Hero Section - Personalized Message */}
      <section style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a2650 100%)', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'rgba(255, 193, 7, 0.15)', 
            color: '#ffc107', 
            padding: '10px 20px', 
            borderRadius: '50px', 
            fontSize: '14px', 
            fontWeight: 600,
            marginBottom: '30px'
          }} data-testid="badge-status">
            <AlertCircle size={18} />
            Your Application is Almost Complete
          </div>
          
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, color: '#FFFFFF', marginBottom: '24px', letterSpacing: '-1.5px', lineHeight: 1.15 }}>
            You're Just One Step Away<br />From <span style={{ fontStyle: 'italic', fontWeight: 300, color: '#7dd3fc' }}>Getting Funded</span>
          </h1>
          
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#e0e0e0', marginBottom: '40px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }} data-testid="text-hero-subtitle">
            You've already completed the hard part. Now complete your full application in just 5 minutes to unlock your personalized funding offers.
          </p>

          <Link href="/">
            <button 
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '12px',
                padding: '20px 48px', backgroundColor: '#22c55e', color: '#FFFFFF', 
                textDecoration: 'none', fontWeight: 600, borderRadius: '50px', fontSize: '18px', border: 'none',
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)', transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}
              data-testid="button-complete-application"
            >
              Complete My Application
              <ArrowRight size={20} />
            </button>
          </Link>

          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '16px' }}>
            <Lock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            Your information is secure and encrypted
          </p>
        </div>
      </section>

      {/* Progress Indicator */}
      <section style={{ backgroundColor: '#ffffff', padding: '60px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '28px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Your Progress</h2>
            <p style={{ fontSize: '16px', color: '#6e6e73' }}>You've already completed step 1. Just one more step to go!</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} data-testid="step-completed">
              <div style={{ 
                width: '50px', height: '50px', 
                backgroundColor: '#22c55e', 
                borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle size={28} color="#FFFFFF" />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1d1d1f', margin: 0 }}>Interest Form</p>
                <p style={{ fontSize: '14px', color: '#22c55e', margin: 0 }}>Completed</p>
              </div>
            </div>

            <div style={{ width: '60px', height: '3px', backgroundColor: '#e5e7eb', borderRadius: '2px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} data-testid="step-pending">
              <div style={{ 
                width: '50px', height: '50px', 
                background: 'linear-gradient(135deg, #5b4d8f 0%, #7a6ba8 100%)', 
                borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 2s infinite'
              }}>
                <FileText size={24} color="#FFFFFF" />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1d1d1f', margin: 0 }}>Full Application</p>
                <p style={{ fontSize: '14px', color: '#5b4d8f', margin: 0 }}>~5 minutes</p>
              </div>
            </div>

            <div style={{ width: '60px', height: '3px', backgroundColor: '#e5e7eb', borderRadius: '2px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.5 }} data-testid="step-funding">
              <div style={{ 
                width: '50px', height: '50px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Banknote size={24} color="#6e6e73" />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#6e6e73', margin: 0 }}>Get Funded</p>
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>24-48 hours</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Complete Your Application */}
      <section style={{ backgroundColor: '#f5f5f7', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>
              Why Complete Your Application?
            </h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '600px', margin: '0 auto' }}>
              Here's what happens when you finish your application today.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '36px 28px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="card-reason-offers">
              <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <TrendingUp size={32} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Get Multiple Offers</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                We'll match you with multiple lenders competing for your business, so you can choose the best terms.
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '36px 28px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="card-reason-speed">
              <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #5b4d8f 0%, #7a6ba8 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Clock size={32} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Fast Funding</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                Once approved, funds can be in your account within 24-48 hours. No more waiting weeks for bank loans.
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '36px 28px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="card-reason-credit">
              <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Shield size={32} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>No Credit Impact</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                Completing your application does NOT affect your credit score. We use a soft pull to match you with offers.
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '36px 28px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="card-reason-support">
              <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Users size={32} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '20px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Expert Guidance</h3>
              <p style={{ fontSize: '15px', color: '#6e6e73', lineHeight: 1.6 }}>
                A dedicated funding specialist will review your application and help you find the best option for your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Need */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>
              What You'll Need
            </h2>
            <p style={{ fontSize: '18px', color: '#6e6e73' }}>
              Have this information ready to complete your application quickly.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            {[
              { icon: '🏢', title: 'Business Info', desc: 'Legal name, EIN, address' },
              { icon: '👤', title: 'Owner Details', desc: 'SSN, date of birth' },
              { icon: '🏦', title: 'Bank Info', desc: 'Bank name (no statements needed yet)' },
              { icon: '💰', title: 'Funding Amount', desc: 'How much you need' },
            ].map((item, idx) => (
              <div 
                key={idx} 
                style={{ 
                  backgroundColor: '#f5f5f7', 
                  padding: '24px', 
                  borderRadius: '12px', 
                  textAlign: 'center' 
                }}
                data-testid={`card-need-${idx}`}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '16px', color: '#1d1d1f', marginBottom: '6px', fontWeight: 600 }}>{item.title}</h3>
                <p style={{ fontSize: '14px', color: '#6e6e73', margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/">
              <button 
                style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '12px',
                  padding: '18px 40px', backgroundColor: '#5b4d8f', color: '#FFFFFF', 
                  textDecoration: 'none', fontWeight: 600, borderRadius: '50px', fontSize: '16px', border: 'none',
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(91, 77, 143, 0.3)', transition: 'transform 0.3s ease'
                }}
                data-testid="button-ready"
              >
                I'm Ready - Let's Finish
                <ArrowRight size={18} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ backgroundColor: '#f5f5f7', padding: '80px 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>
              Common Questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { 
                q: 'How long does the full application take?', 
                a: 'Most applicants complete it in about 5 minutes. You\'ll need basic business and personal information.' 
              },
              { 
                q: 'Will this affect my credit score?', 
                a: 'No! We only do a soft credit pull which doesn\'t impact your score. A hard pull only happens if you accept an offer and proceed with a specific lender.' 
              },
              { 
                q: 'What if I don\'t qualify?', 
                a: 'We work with a wide network of lenders with varying requirements. Even if one says no, we\'ll try to match you with others. There\'s no obligation to accept any offer.' 
              },
              { 
                q: 'How soon can I get funded?', 
                a: 'Many of our clients receive funds within 24-48 hours of approval. Some options may take a bit longer depending on the funding type.' 
              },
              { 
                q: 'Is my information secure?', 
                a: 'Absolutely. We use bank-level 256-bit encryption to protect all your data. Your information is never shared without your explicit consent.' 
              },
            ].map((faq, idx) => (
              <div 
                key={idx} 
                style={{ 
                  backgroundColor: '#ffffff', 
                  padding: '28px', 
                  borderRadius: '12px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}
                data-testid={`faq-${idx}`}
              >
                <h3 style={{ fontSize: '17px', color: '#1d1d1f', marginBottom: '10px', fontWeight: 600 }}>{faq.q}</h3>
                <p style={{ fontSize: '15px', color: '#6e6e73', margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Trust */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} style={{ fontSize: '28px', color: '#ffc107' }}>★</span>
              ))}
            </div>
            <blockquote style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', color: '#1d1d1f', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '24px' }}>
              "I was hesitant at first, but the application was simple and I had multiple offers within hours. Got funded the next day and it saved my business during a slow season."
            </blockquote>
            <p style={{ fontSize: '16px', color: '#6e6e73' }}>
              — Marcus T., Restaurant Owner
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', marginTop: '50px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#1d1d1f', display: 'block' }}>1,000+</span>
              <span style={{ fontSize: '14px', color: '#6e6e73' }}>Businesses Funded</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#1d1d1f', display: 'block' }}>$500M+</span>
              <span style={{ fontSize: '14px', color: '#6e6e73' }}>Total Funding</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#1d1d1f', display: 'block' }}>4.9/5</span>
              <span style={{ fontSize: '14px', color: '#6e6e73' }}>Customer Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a2650 100%)', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: '#FFFFFF', marginBottom: '20px', fontWeight: 600 }}>
            Don't Let This Opportunity Slip Away
          </h2>
          <p style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '40px', lineHeight: 1.6 }}>
            You've already taken the first step. Complete your application now and see what funding options are available for your business.
          </p>
          
          <Link href="/">
            <button 
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '12px',
                padding: '20px 48px', backgroundColor: '#22c55e', color: '#FFFFFF', 
                textDecoration: 'none', fontWeight: 600, borderRadius: '50px', fontSize: '18px', border: 'none',
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)', marginBottom: '20px'
              }}
              data-testid="button-final-cta"
            >
              Complete My Application Now
              <ArrowRight size={20} />
            </button>
          </Link>

          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Takes about 5 minutes • No obligation • No credit impact
          </p>
        </div>
      </section>

      {/* Contact Bar */}
      <section style={{ backgroundColor: '#0a0f2c', padding: '30px 20px', borderTop: '1px solid #1a2650' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
          <p style={{ color: '#e0e0e0', fontSize: '15px', margin: 0 }}>Questions? We're here to help:</p>
          <a href="tel:8183510225" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            <Phone size={16} />
            (818) 351-0225
          </a>
          <a href="mailto:info@todaycapitalgroup.com" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            <Mail size={16} />
            info@todaycapitalgroup.com
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0a0f2c', padding: '30px 20px', textAlign: 'center', borderTop: '1px solid #1a2650' }}>
        <p style={{ color: '#FFFFFF', fontWeight: 600, marginBottom: '8px' }}>Today Capital Group</p>
        <p style={{ color: '#d2d2d7', fontSize: '14px' }}>
          © {new Date().getFullYear()} Today Capital Group. All rights reserved.
        </p>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
