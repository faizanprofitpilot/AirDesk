'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { createBrowserClient } from '@/lib/clients/supabase';
import { PLAN_LIMITS } from '@/lib/constants/plans';

function LandingPageContent() {
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});
  
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createBrowserClient();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
      });
      return () => subscription.unsubscribe();
    }
  }, [supabase]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    Object.keys(sectionsRef.current).forEach((key) => {
      const element = sectionsRef.current[key];
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible((prev) => ({ ...prev, [key]: true }));
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">

      {/* Main Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="AirDesk" className="h-20 lg:h-24 w-auto" />
            </Link>
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium text-[#475569] hover:text-[#1E40AF] transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-[#475569] hover:text-[#1E40AF] transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm font-medium text-[#475569] hover:text-[#1E40AF] transition-colors">Pricing</a>
            </nav>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] transition-colors"
                >
                  Start Free Trial
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Split Layout */}
      <section 
        className="relative bg-gradient-to-br from-[#F1F5F9] via-white to-[#F1F5F9] py-12 lg:py-16 overflow-hidden"
        ref={(el) => { sectionsRef.current['hero'] = el; }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className={`transition-all duration-1000 ${isVisible['hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight" style={{ color: '#1F2937' }}>
                Never Miss a{' '}
                <span className="text-[#1E40AF]">Service Call</span>{' '}
                Again
              </h1>
              <p className="text-xl text-[#475569] mb-8 leading-relaxed">
                AI phone receptionist answers every call 24/7. Captures lead details instantly. 
                Emails you dispatch-ready tickets in minutes.
              </p>
              

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="px-8 py-4 rounded-lg text-base font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] transition-all shadow-lg hover:shadow-xl"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => window.location.href = '/login?trial=starter'}
                    className="px-8 py-4 rounded-lg text-base font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] transition-all shadow-lg hover:shadow-xl"
                  >
                    Start Free Trial
                  </button>
                )}
                <a
                  href="tel:+16403561874"
                  className="px-8 py-4 rounded-lg text-base font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call Demo Line
                </a>
              </div>
              <p className="text-sm text-[#475569] mt-4">No credit card required • Set up in 10 minutes</p>
            </div>

            {/* Right: Visual */}
            <div className={`relative transition-all duration-1000 delay-300 ${isVisible['hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1E40AF]/20 to-[#F97316]/20 rounded-3xl blur-3xl"></div>
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-[#E2E8F0]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-[#E2E8F0]">
                      <div className="w-12 h-12 rounded-full bg-[#1E40AF]/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#1E40AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-[#1F2937]">AI Receptionist</div>
                        <div className="text-sm text-[#475569]">Online • 24/7 Available</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-[#F1F5F9] rounded-lg p-4">
                        <p className="text-sm text-[#475569]">"Hi, I need help with my AC..."</p>
                      </div>
                      <div className="bg-[#1E40AF] text-white rounded-lg p-4 ml-8">
                        <p className="text-sm">"I can help! What's the issue you're experiencing?"</p>
                      </div>
                      <div className="bg-[#F1F5F9] rounded-lg p-4">
                        <p className="text-sm text-[#475569]">"It's not cooling and it's really hot..."</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-[#E2E8F0]">
                      <div className="flex items-center gap-2 text-sm text-[#059669]">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Ticket Generated • Email Sent</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-white border-y border-[#E2E8F0] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: '24/7 Availability', value: 'Always On' },
              { label: 'Response Time', value: '< 2 Minutes' },
              { label: 'Lead Capture Rate', value: '99.9%' },
              { label: 'Customer Satisfaction', value: '4.9/5' }
            ].map((stat, i) => (
              <div key={i} className="border-r border-[#E2E8F0] last:border-r-0">
                <div className="text-2xl font-bold text-[#1E40AF] mb-1">{stat.value}</div>
                <div className="text-sm text-[#475569]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section 
        id="features"
        className="py-20 bg-white"
        ref={(el) => { sectionsRef.current['features'] = el; }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible['features'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#1F2937' }}>
              Stop Losing Service Calls
            </h2>
            <p className="text-xl text-[#475569] max-w-3xl mx-auto">
              Every missed call is lost revenue. AirDesk ensures every customer gets through, 
              even when your team is busy or after hours.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            {/* Problems */}
            <div className={`space-y-6 transition-all duration-1000 delay-200 ${isVisible['features'] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h3 className="text-2xl font-bold text-[#1F2937]">The Problem</h3>
              {[
                { 
                  icon: (
                    <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ), 
                  title: 'Missed Calls', 
                  desc: 'Busy lines, after-hours calls, and voicemails mean lost leads' 
                },
                { 
                  icon: (
                    <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ), 
                  title: 'Slow Response', 
                  desc: 'Customers wait hours or days for callbacks, they call competitors instead' 
                },
                { 
                  icon: (
                    <svg className="w-8 h-8 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ), 
                  title: 'Incomplete Info', 
                  desc: 'Voicemails missing critical details like address, urgency, or issue type' 
                },
                { 
                  icon: (
                    <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ), 
                  title: 'Lost Revenue', 
                  desc: 'Every missed call costs you $200-500 in potential service revenue' 
                }
              ].map((problem, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0">{problem.icon}</div>
                  <div>
                    <h4 className="font-semibold text-[#1F2937] mb-1">{problem.title}</h4>
                    <p className="text-[#475569]">{problem.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Solutions */}
            <div className={`space-y-6 transition-all duration-1000 delay-400 ${isVisible['features'] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <h3 className="text-2xl font-bold text-[#1E40AF]">The Solution</h3>
              {[
                { 
                  icon: (
                    <svg className="w-8 h-8 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ), 
                  title: 'Never Miss a Call', 
                  desc: 'AI answers every call instantly, 24/7, even during peak hours' 
                },
                { 
                  icon: (
                    <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ), 
                  title: 'Instant Response', 
                  desc: 'Customers get immediate help, no waiting, no frustration' 
                },
                { 
                  icon: (
                    <svg className="w-8 h-8 text-[#1E40AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  ), 
                  title: 'Complete Capture', 
                  desc: 'Every detail captured: name, phone, address, issue, urgency, scheduling' 
                },
                { 
                  icon: (
                    <svg className="w-8 h-8 text-[#0D9488]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ), 
                  title: 'Ready to Dispatch', 
                  desc: 'Email tickets arrive in minutes. Visual dispatch board helps you track and manage service requests through your workflow' 
                }
              ].map((solution, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0">{solution.icon}</div>
                  <div>
                    <h4 className="font-semibold text-[#1F2937] mb-1">{solution.title}</h4>
                    <p className="text-[#475569]">{solution.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: '24/7 Availability',
                desc: 'Never miss a call, even at 2 AM or during peak season'
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: 'Smart Qualification',
                desc: 'Captures issue type, urgency, address, and scheduling preference automatically'
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Instant Tickets',
                desc: 'Dispatch-ready email tickets with priority levels. Visual board tracks tickets from ready to dispatched to completed'
              }
            ].map((feature, i) => (
              <div
                key={i}
                className={`bg-[#F1F5F9] rounded-xl p-8 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${
                  isVisible['features'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${600 + i * 100}ms` }}
              >
                <div className="text-[#1E40AF] mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-[#1F2937] mb-2">{feature.title}</h3>
                <p className="text-[#475569]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Process Steps */}
      <section 
        id="how-it-works"
        className="py-20 bg-[#F1F5F9]"
        ref={(el) => { sectionsRef.current['how-it-works'] = el; }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible['how-it-works'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#1F2937' }}>How It Works</h2>
            <p className="text-xl text-[#475569] max-w-2xl mx-auto">
              Simple setup. Instant results. Start capturing leads in minutes.
            </p>
          </div>

          <div className="relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1E40AF] via-[#F97316] to-[#0D9488]"></div>

            <div className="grid md:grid-cols-4 gap-8 relative">
              {[
                { num: '1', title: 'Call Comes In', desc: 'Customer dials your number 24/7', color: '#1E40AF' },
                { num: '2', title: 'AI Answers', desc: 'AI receptionist greets and qualifies', color: '#F97316' },
                { num: '3', title: 'Details Captured', desc: 'Issue, address, urgency, scheduling', color: '#0D9488' },
                { num: '4', title: 'Ticket Emailed', desc: 'Dispatch-ready ticket in your inbox', color: '#059669' }
              ].map((step, i) => (
                <div
                  key={i}
                  className={`text-center transition-all duration-700 ${
                    isVisible['how-it-works'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 shadow-lg relative z-10"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-lg font-semibold text-[#1F2937] mb-2">{step.title}</h3>
                  <p className="text-[#475569]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`text-center mt-12 transition-all duration-1000 delay-700 ${isVisible['how-it-works'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-block px-8 py-4 rounded-lg text-lg font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] transition-all shadow-lg hover:shadow-xl"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-block px-8 py-4 rounded-lg text-lg font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] transition-all shadow-lg hover:shadow-xl"
              >
                Get Started Now
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section 
        id="pricing"
        className="py-20 bg-white"
        ref={(el) => { sectionsRef.current['pricing'] = el; }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible['pricing'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#1F2937' }}>Pricing Built for HVAC Companies</h2>
            <p className="text-xl text-[#475569] max-w-2xl mx-auto">
              Pay only for what you use. Every plan includes 24/7 AI receptionist, HVAC lead qualification, and dispatch-ready email tickets.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: PLAN_LIMITS.starter.name,
                price: `$${PLAN_LIMITS.starter.price}`,
                period: '/month',
                minutes: `${PLAN_LIMITS.starter.minutesPerMonth} minutes`,
                approxCalls: `~${PLAN_LIMITS.starter.approxCalls} service calls`,
                desc: 'Perfect for solo HVAC technicians or small teams',
                features: [
                  '24/7 AI phone receptionist',
                  'HVAC issue qualification (AC, heating, etc.)',
                  'Urgency detection (no heat/cool alerts)',
                  'Dispatch-ready email tickets',
                  'Call recordings & transcripts'
                ],
                cta: 'Start Free Trial',
                planKey: 'starter',
                isTrial: true,
                featured: false
              },
              {
                name: PLAN_LIMITS.professional.name,
                price: `$${PLAN_LIMITS.professional.price}`,
                period: '/month',
                minutes: `${PLAN_LIMITS.professional.minutesPerMonth} minutes`,
                approxCalls: `~${PLAN_LIMITS.professional.approxCalls} service calls`,
                desc: 'Best for growing HVAC companies (2-5 trucks)',
                features: [
                  '24/7 AI phone receptionist',
                  'HVAC issue qualification & urgency detection',
                  'Service address capture',
                  'Scheduling preference collection',
                  'Priority ticket routing',
                  'Call recordings & transcripts',
                  'Priority support'
                ],
                cta: 'Get Started',
                planKey: 'professional',
                isTrial: false,
                featured: true
              },
              {
                name: PLAN_LIMITS.turbo.name,
                price: `$${PLAN_LIMITS.turbo.price}`,
                period: '/month',
                minutes: `${PLAN_LIMITS.turbo.minutesPerMonth} minutes`,
                approxCalls: `~${PLAN_LIMITS.turbo.approxCalls} service calls`,
                desc: 'For established HVAC companies (5+ trucks)',
                features: [
                  '24/7 AI phone receptionist',
                  'Full HVAC lead qualification',
                  'Multi-location support',
                  'Custom service call fee quoting',
                  'Advanced analytics & reporting',
                  'Dedicated account manager',
                  'API access for integrations'
                ],
                cta: 'Get Started',
                planKey: 'turbo',
                isTrial: false,
                featured: false
              }
            ].map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-2 relative ${
                  plan.featured ? 'border-[#F97316] scale-105' : 'border-[#E2E8F0]'
                } ${
                  isVisible['pricing'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#1E40AF] to-[#F97316] text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-[#1F2937] mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-5xl font-extrabold text-[#1F2937]">{plan.price}</span>
                    <span className="text-lg text-[#475569]">{plan.period}</span>
                  </div>
                  <p className="text-sm text-[#475569] mb-6">{plan.desc}</p>
                  <div className="mb-6 pb-6 border-b border-[#E2E8F0]">
                    <div className="text-sm font-semibold text-[#1F2937] mb-1">{plan.minutes}</div>
                    <div className="text-xs text-[#475569]">Approx. {plan.approxCalls} per month</div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start">
                        <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-[#059669]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-[#475569]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isAuthenticated ? (
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/stripe/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ plan: plan.planKey || plan.name.toLowerCase(), trial: plan.isTrial || false }),
                          });
                          const data = await response.json();
                          if (data.url) window.location.href = data.url;
                          else alert('Failed to create checkout session.');
                        } catch (error) {
                          alert('Failed to create checkout session.');
                        }
                      }}
                      className={`w-full px-6 py-3 rounded-lg text-center font-semibold transition-all ${
                        plan.featured ? 'bg-[#1E40AF] text-white hover:bg-[#1E3A8A]' : 'border-2 border-[#1E40AF] text-[#1E40AF] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  ) : (
                    plan.isTrial ? (
                      <button
                        onClick={() => window.location.href = '/login?trial=starter'}
                        className={`w-full px-6 py-3 rounded-lg text-center font-semibold transition-all ${
                          plan.featured ? 'bg-[#1E40AF] text-white hover:bg-[#1E3A8A]' : 'border-2 border-[#1E40AF] text-[#1E40AF] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {plan.cta}
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className={`block w-full px-6 py-3 rounded-lg text-center font-semibold transition-all ${
                          plan.featured ? 'bg-[#1E40AF] text-white hover:bg-[#1E3A8A]' : 'border-2 border-[#1E40AF] text-[#1E40AF] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section 
        className="py-20 relative overflow-hidden bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A]"
        ref={(el) => { sectionsRef.current['cta'] = el; }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-[#F97316] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#0D9488] rounded-full blur-3xl"></div>
        </div>
        <div className={`max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10 transition-all duration-1000 ${
          isVisible['cta'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Never Miss a Call?</h2>
          <p className="text-xl mb-4 text-white/90">
            Start answering HVAC calls 24/7 with AirDesk. Set up takes less than 10 minutes.
          </p>
          <p className="text-base mb-8 text-white/80">
            No credit card required • Free trial • Cancel anytime
          </p>
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-block px-8 py-4 rounded-lg text-lg font-semibold bg-white text-[#1E40AF] hover:bg-[#F1F5F9] transition-all shadow-lg hover:shadow-xl"
            >
              Go to Dashboard
            </Link>
          ) : (
            <button
              onClick={() => window.location.href = '/login?trial=starter'}
              className="inline-block px-8 py-4 rounded-lg text-lg font-semibold bg-white text-[#1E40AF] hover:bg-[#F1F5F9] transition-all shadow-lg hover:shadow-xl"
            >
              Start Your Free Trial
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1F2937] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src="/logo.png" alt="AirDesk" className="h-8 w-auto mb-4" />
              <p className="text-sm text-white/70">Never miss an HVAC call again.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-white/70">
                {isAuthenticated ? (
                  <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                ) : (
                  <>
                    <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                    <li><Link href="/login" className="hover:text-white transition-colors">Get Started</Link></li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><a href="tel:+16403561874" className="hover:text-white transition-colors">(640) 356-1874</a></li>
                <li className="text-white/70">24/7 Support Available</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-sm text-white/70">
            © 2024 AirDesk. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 animate-pulse" style={{ color: '#1E40AF' }}>Loading...</div>
        </div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
