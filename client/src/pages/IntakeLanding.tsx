import { Link } from "wouter";
import { CheckCircle, Clock, DollarSign, Users, ShieldCheck, Zap, Building2, CreditCard, Landmark, Truck } from "lucide-react";

export default function IntakeLanding() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: '#f5f5f7', color: '#1d1d1f', lineHeight: 1.6 }}>
      
      {/* Header */}
      <header style={{ backgroundColor: '#0a0f2c', padding: '20px 0', borderBottom: '1px solid #1a2650', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <img 
            src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg" 
            alt="Today Capital Group" 
            style={{ height: '40px', width: 'auto' }}
            data-testid="img-logo"
          />
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a2650 100%)', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <img 
              src="https://cdn.prod.website-files.com/6864b4e14db4a4b6864c7968/686c11dae8ddeadf0fc2ffa7_Group%2017.svg" 
              alt="Today Capital Group" 
              style={{ height: '80px', width: 'auto' }}
            />
          </div>
          
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600, color: '#FFFFFF', marginBottom: '20px', letterSpacing: '-2px', lineHeight: 1.1 }}>
            Funding that moves as fast<br />as your <span style={{ fontStyle: 'italic', fontWeight: 300 }}>business</span>
          </h1>
          
          <p style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: '#e0e0e0', marginBottom: '40px', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }} data-testid="text-hero-subtitle">
            We work with a network of national and local lenders so you can compare options, move quickly, and keep cash flow on your terms.
          </p>

          <Link href="/intake/quiz">
            <button 
              style={{ 
                display: 'inline-block', padding: '18px 40px', backgroundColor: '#FFFFFF', color: '#0a0f2c', 
                textDecoration: 'none', fontWeight: 600, borderRadius: '50px', fontSize: '16px', border: 'none',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,255,255,0.2)', transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}
              data-testid="button-get-started"
            >
              Get Your Free Quote
            </button>
          </Link>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', marginTop: '50px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }} data-testid="text-stat-clients">1,000+</span>
              <span style={{ fontSize: '14px', color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '1px' }}>Satisfied Clients</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }} data-testid="text-stat-speed">24-48hrs</span>
              <span style={{ fontSize: '14px', color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '1px' }}>Funding Speed</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }} data-testid="text-stat-funded">$500M+</span>
              <span style={{ fontSize: '14px', color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '1px' }}>Funded to Date</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{ backgroundColor: '#f5f5f7', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>Why Choose Today Capital Group?</h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto' }}>
              We're dedicated to helping businesses like yours access the capital you need to grow.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '40px 32px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="card-benefit-approval">
              <div style={{ marginBottom: '20px' }}>
                <Zap size={48} color="#5b4d8f" />
              </div>
              <h3 style={{ fontSize: '22px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Quick Approval</h3>
              <p style={{ fontSize: '16px', color: '#6e6e73', lineHeight: 1.6 }}>
                Get approved in as little as 24 hours with our streamlined application process.
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '40px 32px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="card-benefit-terms">
              <div style={{ marginBottom: '20px' }}>
                <ShieldCheck size={48} color="#5b4d8f" />
              </div>
              <h3 style={{ fontSize: '22px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Flexible Terms</h3>
              <p style={{ fontSize: '16px', color: '#6e6e73', lineHeight: 1.6 }}>
                Customized repayment options that fit your business cash flow and revenue cycle.
              </p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '40px 32px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} data-testid="card-benefit-support">
              <div style={{ marginBottom: '20px' }}>
                <Users size={48} color="#5b4d8f" />
              </div>
              <h3 style={{ fontSize: '22px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Dedicated Support</h3>
              <p style={{ fontSize: '16px', color: '#6e6e73', lineHeight: 1.6 }}>
                Work with a dedicated funding specialist who understands your business needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Funding Options Section */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>Funding Options</h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto' }}>
              Compare our financing solutions and find the perfect fit for your business needs.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
            {/* MCA Card */}
            <div style={{ backgroundColor: '#f5f5f7', borderRadius: '16px', overflow: 'hidden', borderLeft: '4px solid #5b4d8f', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }} data-testid="card-option-mca">
              <div style={{ padding: '40px 36px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <DollarSign size={32} color="#5b4d8f" />
                </div>
                <span style={{ display: 'inline-block', backgroundColor: 'rgba(91, 77, 143, 0.1)', color: '#5b4d8f', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Most Popular</span>
                <h3 style={{ fontSize: '28px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Merchant Cash Advance</h3>
                <p style={{ fontSize: '16px', color: '#5b4d8f', marginBottom: '20px', fontWeight: 500 }}>Fast funding based on future sales</p>
                <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '24px', lineHeight: 1.7 }}>
                  Get capital quickly based on your business's credit card sales or bank deposits. Repay automatically as a percentage of daily sales.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '28px' }}>
                  {['Funding in 24-48 hours', 'No fixed monthly payments', 'Credit score flexible', '$5K - $2M available'].map((item, idx) => (
                    <li key={idx} style={{ fontSize: '15px', color: '#1d1d1f', padding: '8px 0', paddingLeft: '28px', position: 'relative' }}>
                      <CheckCircle size={18} color="#5b4d8f" style={{ position: 'absolute', left: 0, top: '10px' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Business Line of Credit */}
            <div style={{ backgroundColor: '#f5f5f7', borderRadius: '16px', overflow: 'hidden', borderLeft: '4px solid #5b4d8f', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }} data-testid="card-option-loc">
              <div style={{ padding: '40px 36px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <CreditCard size={32} color="#5b4d8f" />
                </div>
                <span style={{ display: 'inline-block', backgroundColor: 'rgba(91, 77, 143, 0.1)', color: '#5b4d8f', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Flexible Access</span>
                <h3 style={{ fontSize: '28px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Business Line of Credit</h3>
                <p style={{ fontSize: '16px', color: '#5b4d8f', marginBottom: '20px', fontWeight: 500 }}>Draw funds when you need them</p>
                <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '24px', lineHeight: 1.7 }}>
                  Access a revolving credit line and only pay interest on what you use. Perfect for managing cash flow and unexpected expenses.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '28px' }}>
                  {['Revolving credit access', 'Only pay for what you use', 'Rebuild as you repay', 'Quick approval process'].map((item, idx) => (
                    <li key={idx} style={{ fontSize: '15px', color: '#1d1d1f', padding: '8px 0', paddingLeft: '28px', position: 'relative' }}>
                      <CheckCircle size={18} color="#5b4d8f" style={{ position: 'absolute', left: 0, top: '10px' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* SBA Loans */}
            <div style={{ backgroundColor: '#f5f5f7', borderRadius: '16px', overflow: 'hidden', borderLeft: '4px solid #5b4d8f', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }} data-testid="card-option-sba">
              <div style={{ padding: '40px 36px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Landmark size={32} color="#5b4d8f" />
                </div>
                <span style={{ display: 'inline-block', backgroundColor: 'rgba(91, 77, 143, 0.1)', color: '#5b4d8f', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Best Rates</span>
                <h3 style={{ fontSize: '28px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>SBA Loans</h3>
                <p style={{ fontSize: '16px', color: '#5b4d8f', marginBottom: '20px', fontWeight: 500 }}>Government-backed financing</p>
                <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '24px', lineHeight: 1.7 }}>
                  Low interest rates and longer repayment terms backed by the Small Business Administration. Ideal for established businesses.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '28px' }}>
                  {['Lowest interest rates', 'Terms up to 25 years', 'Up to $5M available', 'Fixed monthly payments'].map((item, idx) => (
                    <li key={idx} style={{ fontSize: '15px', color: '#1d1d1f', padding: '8px 0', paddingLeft: '28px', position: 'relative' }}>
                      <CheckCircle size={18} color="#5b4d8f" style={{ position: 'absolute', left: 0, top: '10px' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Equipment Financing */}
            <div style={{ backgroundColor: '#f5f5f7', borderRadius: '16px', overflow: 'hidden', borderLeft: '4px solid #5b4d8f', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }} data-testid="card-option-equipment">
              <div style={{ padding: '40px 36px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Truck size={32} color="#5b4d8f" />
                </div>
                <span style={{ display: 'inline-block', backgroundColor: 'rgba(91, 77, 143, 0.1)', color: '#5b4d8f', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Asset-Based</span>
                <h3 style={{ fontSize: '28px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>Equipment Financing</h3>
                <p style={{ fontSize: '16px', color: '#5b4d8f', marginBottom: '20px', fontWeight: 500 }}>Fund your business assets</p>
                <p style={{ fontSize: '15px', color: '#6e6e73', marginBottom: '24px', lineHeight: 1.7 }}>
                  Finance new or used equipment with the equipment itself as collateral. Preserve your working capital while growing your business.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '28px' }}>
                  {['Equipment serves as collateral', 'Preserve working capital', 'Tax advantages available', 'New or used equipment'].map((item, idx) => (
                    <li key={idx} style={{ fontSize: '15px', color: '#1d1d1f', padding: '8px 0', paddingLeft: '28px', position: 'relative' }}>
                      <CheckCircle size={18} color="#5b4d8f" style={{ position: 'absolute', left: 0, top: '10px' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section style={{ backgroundColor: '#f5f5f7', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>Compare Your Options</h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto' }}>
              See how our funding options stack up against each other.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }} data-testid="table-comparison">
              <thead>
                <tr>
                  <th style={{ backgroundColor: '#0a0f2c', color: '#FFFFFF', padding: '20px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Feature</th>
                  <th style={{ backgroundColor: '#0a0f2c', color: '#FFFFFF', padding: '20px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MCA</th>
                  <th style={{ backgroundColor: '#0a0f2c', color: '#FFFFFF', padding: '20px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Line of Credit</th>
                  <th style={{ backgroundColor: '#0a0f2c', color: '#FFFFFF', padding: '20px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SBA Loan</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Funding Speed', mca: '24-48 hours', loc: '1-3 days', sba: '2-4 weeks' },
                  { feature: 'Amount Range', mca: '$5K - $2M', loc: '$10K - $500K', sba: '$50K - $5M' },
                  { feature: 'Credit Requirements', mca: '500+', loc: '600+', sba: '680+' },
                  { feature: 'Time in Business', mca: '3+ months', loc: '6+ months', sba: '2+ years' },
                  { feature: 'Repayment', mca: 'Daily/Weekly', loc: 'Monthly', sba: 'Monthly' },
                  { feature: 'Collateral Required', mca: 'No', loc: 'Sometimes', sba: 'Yes' },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e5e5' }}>
                    <td style={{ padding: '20px 16px', fontSize: '15px', fontWeight: 600, color: '#5b4d8f' }}>{row.feature}</td>
                    <td style={{ padding: '20px 16px', fontSize: '15px', color: '#1d1d1f' }}>{row.mca}</td>
                    <td style={{ padding: '20px 16px', fontSize: '15px', color: '#1d1d1f' }}>{row.loc}</td>
                    <td style={{ padding: '20px 16px', fontSize: '15px', color: '#1d1d1f' }}>{row.sba}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#1d1d1f', marginBottom: '16px', fontWeight: 600 }}>How It Works</h2>
            <p style={{ fontSize: '18px', color: '#6e6e73', maxWidth: '700px', margin: '0 auto' }}>
              Get funded in four simple steps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { step: 1, title: 'Apply Online', desc: 'Fill out our simple form in just a few minutes.' },
              { step: 2, title: 'Quick Review', desc: 'Our team reviews your application within hours.' },
              { step: 3, title: 'Get Approved', desc: 'Receive multiple funding offers to compare.' },
              { step: 4, title: 'Get Funded', desc: 'Choose your best option and get funded fast.' },
            ].map((item) => (
              <div key={item.step} style={{ textAlign: 'center', position: 'relative' }} data-testid={`step-${item.step}`}>
                <div style={{ 
                  width: '60px', height: '60px', 
                  background: 'linear-gradient(135deg, #5b4d8f 0%, #7a6ba8 100%)', 
                  color: '#FFFFFF', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '24px', fontWeight: 700, 
                  margin: '0 auto 20px' 
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '18px', color: '#1d1d1f', marginBottom: '12px', fontWeight: 600 }}>{item.title}</h3>
                <p style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ background: 'linear-gradient(135deg, #0a0f2c 0%, #1a2650 100%)', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#FFFFFF', marginBottom: '20px', fontWeight: 600 }}>Ready to Grow Your Business?</h2>
          <p style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '40px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            Take the first step toward securing the funding your business needs. Our simple application takes just minutes.
          </p>
          <Link href="/intake/quiz">
            <button 
              style={{ 
                display: 'inline-block', padding: '18px 40px', backgroundColor: '#FFFFFF', color: '#0a0f2c', 
                textDecoration: 'none', fontWeight: 600, borderRadius: '50px', fontSize: '16px', border: 'none',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,255,255,0.2)', transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}
              data-testid="button-cta-apply"
            >
              Start Your Application
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0a0f2c', padding: '40px 20px', textAlign: 'center', borderTop: '1px solid #1a2650' }}>
        <p style={{ color: '#FFFFFF', fontWeight: 600, marginBottom: '12px' }}>Today Capital Group</p>
        <p style={{ color: '#d2d2d7', fontSize: '14px', marginBottom: '8px' }}>
          Empowering businesses with fast, flexible funding solutions.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '14px' }}>
          © {new Date().getFullYear()} Today Capital Group. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
