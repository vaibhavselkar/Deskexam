import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Star, Shield, Smartphone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '../components/auth/Navbar';
import { useAuth } from '../hooks/useAuth';
import { createTransaction } from '../lib/api';
import RazorpayPayment from '../components/payment/RazorpayPayment';

const UPI_ID = 'shikshasetu@upi';

// Generate SVG QR code placeholder (in production use qrcode.react library)
function QRCodeDisplay({ amount, plan }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-52 h-52 bg-white border-4 border-primary-900 rounded-2xl p-3 shadow-xl relative">
        {/* Mock QR pattern */}
        <div className="w-full h-full grid grid-cols-10 grid-rows-10 gap-0.5">
          {[...Array(100)].map((_, i) => {
            const isCorner = (i < 33 && (i % 10 < 3 || i % 10 > 6)) ||
              (i > 66 && i % 10 < 3) || (i < 10 && i % 10 > 6);
            const isCenter = i >= 40 && i <= 49 && i % 10 >= 3 && i % 10 <= 6;
            const random = (i * 7919 + 43) % 3 === 0;
            return (
              <div
                key={i}
                className={`rounded-sm ${isCorner || isCenter || random ? 'bg-primary-900' : 'bg-transparent'}`}
              ></div>
            );
          })}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white p-1 rounded-lg">
            <div className="w-10 h-10 bg-primary-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">SS</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500 mb-1">UPI ID</p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
          <code className="text-primary-900 font-bold text-sm">{UPI_ID}</code>
          <button
            onClick={() => navigator.clipboard.writeText(UPI_ID)}
            className="text-gray-400 hover:text-primary-900 transition-colors"
            title="Copy UPI ID"
          >
            📋
          </button>
        </div>
        <p className="text-lg font-bold text-primary-900 mt-3">₹{amount}</p>
        <p className="text-gray-400 text-xs">{plan} Plan</p>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [step, setStep] = useState(1); // 1=plan, 2=qr, 3=confirm, 4=success
  const [utrNumber, setUtrNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const plans = {
    monthly: { label: 'Monthly Pro', amount: 200, duration: '30 days', savings: null },
    yearly: { label: 'Yearly Pro', amount: 2000, duration: '365 days', savings: 'Save ₹400 vs monthly!' },
  };

  const plan = plans[selectedPlan];

  const handleSubmitPayment = async () => {
    if (!utrNumber.trim()) {
      setError('Please enter the Transaction ID / UTR Number');
      return;
    }
    if (utrNumber.trim().length < 8) {
      setError('UTR Number should be at least 8 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: txnError } = await createTransaction({
        user_id: user.id,
        plan_type: selectedPlan,
        amount: plan.amount,
        currency: 'INR',
        utr_number: utrNumber.trim(),
        payment_method: 'upi',
        status: 'pending',
      });

      if (txnError) throw txnError;

      // In production, webhook or admin would verify and activate
      // For demo, we'll simulate success
      await refreshProfile();
      setStep(4);
    } catch (err) {
      setError('Failed to submit. Please try again or contact support.');
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Back */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 text-sm mb-6 hover:text-primary-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Success state */}
          {step === 4 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-green-100 fade-in-up">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="font-serif text-3xl font-bold text-primary-900 mb-3">Payment Submitted! 🎉</h2>
              <p className="text-gray-500 mb-2">Your {plan.label} payment of <strong>₹{plan.amount}</strong> has been received.</p>
              <p className="text-gray-400 text-sm mb-8">
                Our team will verify your payment within <strong>2-4 hours</strong> and activate your subscription.
                You'll receive a confirmation email at <strong>{profile?.email}</strong>.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8 text-left">
                <h4 className="font-semibold text-primary-900 text-sm mb-2">Transaction Details</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between"><span>Plan</span><span className="font-medium">{plan.label}</span></div>
                  <div className="flex justify-between"><span>Amount</span><span className="font-medium">₹{plan.amount}</span></div>
                  <div className="flex justify-between"><span>UTR Number</span><span className="font-medium font-mono">{utrNumber}</span></div>
                  <div className="flex justify-between"><span>UPI ID</span><span className="font-medium">{UPI_ID}</span></div>
                </div>
              </div>
              <button onClick={() => navigate('/dashboard')} className="btn-primary px-8 py-3">
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: Plan Selection or QR */}
              <div>
                {step === 1 ? (
                  <div>
                    <h1 className="font-serif text-3xl font-bold text-primary-900 mb-2">Choose Your Plan</h1>
                    <p className="text-gray-500 mb-6">Unlock unlimited question paper creation</p>

                    <div className="space-y-3 mb-6">
                      {Object.entries(plans).map(([key, p]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedPlan(key)}
                          className={`w-full text-left border-2 rounded-2xl p-5 transition-all ${
                            selectedPlan === key
                              ? 'border-primary-900 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-bold text-primary-900">{p.label}</span>
                              {key === 'yearly' && (
                                <span className="credit-badge ml-2">BEST VALUE</span>
                              )}
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedPlan === key ? 'border-primary-900 bg-primary-900' : 'border-gray-300'
                            }`}>
                              {selectedPlan === key && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <div className="text-3xl font-serif font-bold text-primary-900">₹{p.amount}
                            <span className="text-sm text-gray-400 font-sans font-normal"> / {p.duration}</span>
                          </div>
                          {p.savings && <p className="text-green-600 text-xs font-semibold mt-1">🎉 {p.savings}</p>}
                        </button>
                      ))}
                    </div>

                    <ul className="space-y-2 mb-6">
                      {['Unlimited PDF downloads', 'All 11 templates', 'PDF import & conversion tools', 'Photo to LaTeX AI', 'Cloud paper library', 'Priority support'].map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-3">
                      <button onClick={() => setStep(2)} className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2">
                        Pay ₹{plan.amount} via UPI <ArrowLeft className="w-4 h-4 rotate-180" />
                      </button>
                      
                      <RazorpayPayment 
                        selectedPlan={selectedPlan}
                        onSuccess={() => {
                          refreshProfile();
                          navigate('/dashboard');
                        }}
                        onCancel={() => setStep(1)}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-primary-900 mb-2">Scan & Pay</h2>
                    <p className="text-gray-500 mb-6 text-sm">Use any UPI app — GPay, PhonePe, Paytm, BHIM</p>

                    <QRCodeDisplay amount={plan.amount} plan={plan.label} />

                    <div className="flex items-center gap-3 mt-6">
                      {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                        <div key={app} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2 text-center">
                          <div className="text-lg">{app === 'GPay' ? '🎰' : app === 'PhonePe' ? '📱' : app === 'Paytm' ? '💳' : '🇮🇳'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{app}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Enter UTR */}
              <div>
                {step >= 2 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-primary-900 mb-1">After Payment</h3>
                    <p className="text-gray-500 text-sm mb-6">Enter the Transaction ID / UTR Number from your UPI app to confirm payment</p>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transaction ID / UTR Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={utrNumber}
                        onChange={e => { setUtrNumber(e.target.value); setError(''); }}
                        placeholder="e.g. 412345678901"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-mono focus:outline-none focus:border-primary-900 transition-colors"
                      />
                      <p className="text-gray-400 text-xs mt-1">Find this in your UPI app → Transaction History → UTR/Reference Number</p>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    )}

                    <button
                      onClick={handleSubmitPayment}
                      disabled={submitting}
                      className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                    >
                      {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Confirm Payment ✓'}
                    </button>

                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-800 font-semibold text-xs mb-0.5">Secure Manual Verification</p>
                          <p className="text-amber-700 text-xs">Your payment will be verified by our team within 2-4 hours. Subscription activates automatically post-verification.</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-gray-400 text-xs">
                        Having issues?{' '}
                        <a href="mailto:support@shikshasetu.in" className="text-primary-900 underline">
                          support@shikshasetu.in
                        </a>
                      </p>
                    </div>
                  </div>
                )}

                {/* Trust Signals */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { icon: <Shield className="w-5 h-5 text-green-500" />, text: 'Secure UPI' },
                    { icon: <Star className="w-5 h-5 text-gold fill-current" />, text: '10K+ Teachers' },
                    { icon: <Smartphone className="w-5 h-5 text-blue-500" />, text: 'Any UPI App' },
                  ].map((t, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                      <div className="flex justify-center mb-1">{t.icon}</div>
                      <p className="text-xs text-gray-500">{t.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
