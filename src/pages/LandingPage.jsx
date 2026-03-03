import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Zap, Download, Shield, Star, ChevronRight, FileText, Camera, Layers } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: <FileText className="w-6 h-6" />, title: 'LaTeX Question Editor', desc: 'Write complex formulas with live preview. Physics, Chemistry, Calculus — all beautifully rendered.' },
    { icon: <Layers className="w-6 h-6" />, title: '11 Professional Templates', desc: 'CBSE, JEE, NEET, Olympiad and more. One-click template switch with instant preview.' },
    { icon: <Camera className="w-6 h-6" />, title: 'Photo → LaTeX', desc: 'Snap a handwritten question. AI converts it to editable LaTeX text instantly.' },
    { icon: <Download className="w-6 h-6" />, title: 'PDF Import & Edit', desc: 'Import any PDF question paper, convert to our editor format — PDF to PPT, PDF to LaTeX.' },
    { icon: <Zap className="w-6 h-6" />, title: 'Instant PDF Export', desc: 'Pixel-perfect PDF generation in seconds. Looks exactly like a printed exam paper.' },
    { icon: <Shield className="w-6 h-6" />, title: 'Cloud Library', desc: 'All your papers saved securely. Re-edit, re-download anytime from any device.' },
  ];

  const testimonials = [
    { name: 'Rajesh Kumar', role: 'Physics Teacher, Delhi', text: 'ShikshaSetu has transformed how I create test papers. LaTeX rendering is flawless!', stars: 5 },
    { name: 'Priya Sharma', role: 'Coaching Director, Kota', text: 'Our institute saves 3 hours per paper. The JEE mock template is perfect.', stars: 5 },
    { name: 'Anand Verma', role: 'Math Tutor, Pune', text: 'Photo to LaTeX feature is magical. I just click a photo and edit — done!', stars: 5 },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-900 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-gold" />
            </div>
            <span className="font-serif text-xl font-bold text-primary-900">ShikshaSetu</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-primary-900">Features</a>
            <a href="#templates" className="hover:text-primary-900">Templates</a>
            <a href="#pricing" className="hover:text-primary-900">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth')} className="text-primary-900 font-semibold text-sm">Login</button>
            <button onClick={() => navigate('/auth')} className="btn-primary text-sm py-2">
              Start Free →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6 bg-gradient-to-br from-primary-900 via-blue-800 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gold rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-blue-400 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-gold text-sm font-medium mb-6">
            <Star className="w-4 h-4 fill-current" /> Trusted by 10,000+ teachers across India
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Create Professional<br />
            <span className="text-gold">Question Papers</span> in Minutes
          </h1>
          <p className="text-blue-200 text-xl mb-10 max-w-2xl mx-auto">
            LaTeX-powered paper creator for Physics, Chemistry & Math teachers. 
            CBSE, JEE, NEET formats. Photo-to-LaTeX AI. PDF import and edit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/auth')} className="btn-gold text-lg px-8 py-3">
              Start Free — 3 Papers on Us 🎓
            </button>
            <button className="border border-white/30 text-white rounded-8px px-8 py-3 font-semibold hover:bg-white/10 transition-all rounded-lg">
              Watch Demo →
            </button>
          </div>
          <p className="text-blue-300 text-sm mt-4">No credit card required • 3 free PDF downloads</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-primary-900 border-y border-blue-800">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[['10,000+','Teachers'], ['50,000+','Papers Created'], ['11','Templates'], ['₹200/mo','Unlimited Plan']].map(([num, label]) => (
            <div key={label}>
              <div className="font-serif text-3xl font-bold text-gold">{num}</div>
              <div className="text-blue-300 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-primary-900 mb-4">Everything You Need</h2>
            <p className="text-gray-600 text-lg">Powerful tools designed specifically for Indian educators</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all template-card">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-primary-900 mb-4">{f.icon}</div>
                <h3 className="font-semibold text-primary-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF Tools Highlight */}
      <section className="py-20 px-6 bg-primary-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-white mb-4">🔄 PDF Power Tools</h2>
            <p className="text-blue-200">Import, transform, and edit existing papers</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'PDF → PPT', desc: 'Convert question papers to editable slides', icon: '📊' },
              { title: 'PDF → Editor', desc: 'Import any PDF into our question editor', icon: '✏️' },
              { title: 'PDF → LaTeX', desc: 'Extract mathematical content as LaTeX code', icon: '∑' },
              { title: 'Photo → LaTeX', desc: 'Snap handwritten questions, get LaTeX', icon: '📷' },
            ].map((t, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all template-card">
                <div className="text-4xl mb-3">{t.icon}</div>
                <h3 className="font-bold text-white text-lg mb-2">{t.title}</h3>
                <p className="text-blue-200 text-sm">{t.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => navigate('/auth')} className="btn-gold px-8 py-3">
              Try PDF Tools Free
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-primary-900 mb-4">Simple, Honest Pricing</h2>
            <p className="text-gray-600">Start free. Upgrade only when you need more.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="border-2 border-gray-200 rounded-2xl p-8">
              <h3 className="font-bold text-xl text-gray-800 mb-2">Free Starter</h3>
              <div className="text-4xl font-serif font-bold text-primary-900 mb-1">₹0</div>
              <p className="text-gray-500 text-sm mb-6">3 free PDF downloads</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-8">
                {['3 paper downloads', 'All question types', 'LaTeX rendering', 'Basic templates'].map(i => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span>{i}</li>
                ))}
              </ul>
              <button onClick={() => navigate('/auth')} className="w-full border-2 border-primary-900 text-primary-900 rounded-xl py-2.5 font-semibold hover:bg-primary-900 hover:text-white transition-all">
                Start Free
              </button>
            </div>
            {/* Monthly */}
            <div className="border-2 border-primary-900 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-900 text-white text-xs font-bold px-4 py-1 rounded-full">POPULAR</div>
              <h3 className="font-bold text-xl text-gray-800 mb-2">Monthly Pro</h3>
              <div className="text-4xl font-serif font-bold text-primary-900 mb-1">₹200</div>
              <p className="text-gray-500 text-sm mb-6">per month, unlimited</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-8">
                {['Unlimited downloads', 'All 11 templates', 'PDF import tools', 'Photo → LaTeX AI', 'Cloud library', 'Priority support'].map(i => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span>{i}</li>
                ))}
              </ul>
              <button onClick={() => navigate('/payment')} className="btn-primary w-full py-2.5">
                Get Monthly Plan
              </button>
            </div>
            {/* Yearly */}
            <div className="border-2 border-gold rounded-2xl p-8 bg-amber-50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-900 text-xs font-bold px-4 py-1 rounded-full">BEST VALUE</div>
              <h3 className="font-bold text-xl text-gray-800 mb-2">Yearly Pro</h3>
              <div className="text-4xl font-serif font-bold text-primary-900 mb-1">₹2000</div>
              <p className="text-gray-500 text-sm mb-6">per year — save ₹400!</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-8">
                {['Everything in Monthly', '2 months free', 'Early access features', 'Institute branding', 'Bulk paper tools', 'Dedicated support'].map(i => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span>{i}</li>
                ))}
              </ul>
              <button onClick={() => navigate('/payment')} className="btn-gold w-full py-2.5">
                Get Yearly Plan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-4xl font-bold text-primary-900 text-center mb-12">Loved by Teachers</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-3">{[...Array(t.stars)].map((_, j) => <Star key={j} className="w-4 h-4 text-gold fill-current" />)}</div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-primary-900 text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-primary-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-4xl font-bold text-white mb-4">Ready to Save Hours Every Week?</h2>
          <p className="text-blue-200 text-lg mb-8">Join thousands of teachers creating beautiful question papers</p>
          <button onClick={() => navigate('/auth')} className="btn-gold text-lg px-10 py-4">
            Create Your First Paper Free 🚀
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold" />
            <span className="font-serif font-bold text-white">ShikshaSetu</span>
          </div>
          <p className="text-sm">© 2024 ShikshaSetu. Made with ❤️ for Indian Teachers.</p>
          <div className="flex gap-4 text-sm">
            <a href="mailto:support@shikshasetu.in" className="hover:text-white">support@shikshasetu.in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
