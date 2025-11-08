import React, { useState } from 'react';
import { ShoppingBag, CheckCircle, Users, Share2, ArrowRight, Lock, Zap, ChevronDown, List, Heart } from 'lucide-react';
import { Logo } from '@localloops/ui-components';
import { getProduct, PLATFORM } from '@localloops/ui-components/config';
import MinibagIcon from './components/MinibagIcon.jsx';

export default function LandingPage({ onGetStarted }) {
  const minibag = getProduct('minibag');
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center gap-2">
          <MinibagIcon size={32} />
          <span className="text-xl font-semibold text-gray-900">{minibag.name}</span>
        </div>
      </header>

      {/* Hero Section - Above the Fold */}
      <main className="max-w-6xl mx-auto px-6">
        <div className="py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Track shopping,
                <br />
                <span className="text-green-600">split with neighbors</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8">
                Simple shopping lists for vegetables. Works alone or together. No app, no signup.
              </p>

              {/* CTA */}
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                Start Shopping
                <ArrowRight size={20} strokeWidth={2.5} />
              </button>

              {/* Trust Signals */}
              <div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle size={16} className="text-green-600" />
                  Free forever
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle size={16} className="text-green-600" />
                  No signup
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle size={16} className="text-green-600" />
                  Works offline
                </span>
              </div>
            </div>

            {/* Right: Visual - App Preview Mockup */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Phone Frame */}
                <div className="relative mx-auto w-80 h-[600px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-10"></div>

                  {/* Screen */}
                  <div className="relative w-full h-full bg-gradient-to-b from-green-50 to-white rounded-[2.5rem] overflow-hidden">
                    {/* App Content Preview */}
                    <div className="p-6 space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MinibagIcon size={24} />
                          <span className="font-bold text-gray-900">Minibag</span>
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Shopping List</h3>
                        <p className="text-sm text-gray-500">Today, 6:00 PM</p>
                      </div>

                      {/* List Items */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle size={20} className="text-green-600" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">Tomatoes</div>
                            <div className="text-xs text-gray-500">2 kg</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">₹80</div>
                        </div>

                        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle size={20} className="text-green-600" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">Onions</div>
                            <div className="text-xs text-gray-500">1 kg</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">₹40</div>
                        </div>

                        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle size={20} className="text-green-600" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">Potatoes</div>
                            <div className="text-xs text-gray-500">3 kg</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">₹90</div>
                        </div>
                      </div>

                      {/* Users */}
                      <div className="flex items-center gap-2 mt-6">
                        <Users size={16} className="text-gray-500" />
                        <span className="text-sm text-gray-600">3 neighbors joined</span>
                      </div>

                      {/* CTA Button */}
                      <button className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                        Start Shopping
                      </button>
                    </div>
                  </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute -right-4 top-20 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className="text-green-600" strokeWidth={2.5} />
                    <span className="font-semibold text-gray-900">No signup</span>
                  </div>
                </div>

                {/* Floating Badge 2 */}
                <div className="absolute -left-4 bottom-32 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-sm">
                    <Lock size={16} className="text-green-600" strokeWidth={2.5} />
                    <span className="font-semibold text-gray-900">Private</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works - Horizontal Compact */}
        <div className="py-16 border-t border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How it works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-100 flex items-center justify-center">
                <List size={28} className="text-green-600" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create list
              </h3>
              <p className="text-sm text-gray-600">
                Add vegetables and quantities in seconds
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-100 flex items-center justify-center">
                <ShoppingBag size={28} className="text-green-600" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Go shopping
              </h3>
              <p className="text-sm text-gray-600">
                Track payments as you buy (UPI or cash)
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-100 flex items-center justify-center">
                <Share2 size={28} className="text-green-600" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Share bill
              </h3>
              <p className="text-sm text-gray-600">
                Send summary via WhatsApp automatically
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid - 2x3 Compact */}
        <div className="py-16 bg-gray-50 -mx-6 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Built for Indian neighborhoods
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <Users size={24} className="text-green-600 mb-3" strokeWidth={2.5} />
                <h3 className="font-semibold text-gray-900 mb-2">Solo or group</h3>
                <p className="text-sm text-gray-600">Shop alone or invite neighbors. Up to 4 people.</p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <Zap size={24} className="text-green-600 mb-3" strokeWidth={2.5} />
                <h3 className="font-semibold text-gray-900 mb-2">No signup</h3>
                <p className="text-sm text-gray-600">Just enter your name. Start in 10 seconds.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <Lock size={24} className="text-green-600 mb-3" strokeWidth={2.5} />
                <h3 className="font-semibold text-gray-900 mb-2">Privacy first</h3>
                <p className="text-sm text-gray-600">No phone numbers shared. Ever.</p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <Share2 size={24} className="text-green-600 mb-3" strokeWidth={2.5} />
                <h3 className="font-semibold text-gray-900 mb-2">WhatsApp sharing</h3>
                <p className="text-sm text-gray-600">Share lists and bills via WhatsApp.</p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <CheckCircle size={24} className="text-green-600 mb-3" strokeWidth={2.5} />
                <h3 className="font-semibold text-gray-900 mb-2">Skip items</h3>
                <p className="text-sm text-gray-600">Mark poor quality items as skipped.</p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <Heart size={24} className="text-green-600 mb-3" strokeWidth={2.5} />
                <h3 className="font-semibold text-gray-900 mb-2">Free forever</h3>
                <p className="text-sm text-gray-600">No hidden costs. No premium tiers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ - Collapsible Accordion */}
        <div className="py-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Common questions
          </h2>

          <div className="max-w-3xl mx-auto space-y-3">
            {/* FAQ Item 1 */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(0)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">Do I need to create an account?</span>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform ${openFaq === 0 ? 'rotate-180' : ''}`}
                />
              </button>
              {openFaq === 0 && (
                <div className="px-6 pb-4 text-gray-600">
                  No! Just enter your first name. No password, email, or phone number needed.
                </div>
              )}
            </div>

            {/* FAQ Item 2 */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">Will my phone number be shared?</span>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform ${openFaq === 1 ? 'rotate-180' : ''}`}
                />
              </button>
              {openFaq === 1 && (
                <div className="px-6 pb-4 text-gray-600">
                  <strong>Never.</strong> We don't collect phone numbers. Others only see your first name and a 3-letter nickname.
                </div>
              )}
            </div>

            {/* FAQ Item 3 */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">Do I pay through the app?</span>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform ${openFaq === 2 ? 'rotate-180' : ''}`}
                />
              </button>
              {openFaq === 2 && (
                <div className="px-6 pb-4 text-gray-600">
                  No. You pay the vendor directly (cash or UPI). Minibag just helps you track what you bought.
                </div>
              )}
            </div>

            {/* FAQ Item 4 */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">Can I change my list after adding items?</span>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform ${openFaq === 3 ? 'rotate-180' : ''}`}
                />
              </button>
              {openFaq === 3 && (
                <div className="px-6 pb-4 text-gray-600">
                  Yes! Add, remove, or change quantities anytime before shopping.
                </div>
              )}
            </div>
          </div>

          {/* Privacy Note - Compact */}
          <div className="max-w-3xl mx-auto mt-8 bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-start gap-3">
              <Lock size={20} className="text-green-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Your privacy matters</h3>
                <p className="text-sm text-gray-700">
                  No phone numbers • Only first names • Data deleted in 30 days • No payment info stored
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="py-16 text-center border-t border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to simplify your shopping?
          </h2>
          <p className="text-lg text-gray-600 mb-8">Start in 10 seconds. No signup required.</p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Try it now – it's free
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </main>

      {/* Footer - Compact */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-900">{minibag.name}</span>
              {' · '}
              {minibag.description}
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="/localloops-landing.html" className="hover:text-gray-900 transition-colors">← {PLATFORM.name}</a>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            © 2025 {PLATFORM.name}
          </div>
        </div>
      </footer>
    </div>
  );
}
