import React from 'react';
import { ShoppingBag, CheckCircle, Users, Share2, ArrowRight } from 'lucide-react';
import { Logo } from '@localloops/ui-components';
import { getProduct, PLATFORM } from '@localloops/ui-components/config';

export default function LandingPage({ onGetStarted }) {
  const minibag = getProduct('minibag');

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-6">
        <Logo
          icon={ShoppingBag}
          name={minibag.name}
          variant="compact"
          iconColor="bg-green-600"
        />
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-12 pb-20 md:pt-20 md:pb-32">
        <div className="text-center max-w-3xl mx-auto">
          {/* Tagline */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Track your shopping,
            <br />
            <span className="text-green-600">split with neighbors</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-4">
            Simple shopping lists that work alone or together.
          </p>

          <p className="text-base text-gray-500 mb-10">
            No app download. No signup required. Start in 10 seconds.
          </p>

          {/* CTA Button */}
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <ShoppingBag size={24} strokeWidth={2.5} />
            Start Shopping
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>

          {/* Trust Signals */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" strokeWidth={2.5} />
              <span>Free forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" strokeWidth={2.5} />
              <span>No signup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" strokeWidth={2.5} />
              <span>Works offline</span>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="mt-24 md:mt-32">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
            How it works
          </h2>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-100 flex items-center justify-center">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                1. Create your list
              </h3>
              <p className="text-gray-600">
                Add vegetables, staples, or dairy from our catalog. Set quantities in kg.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-100 flex items-center justify-center">
                <span className="text-4xl">🛍️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                2. Go shopping
              </h3>
              <p className="text-gray-600">
                Track your payments as you buy. Support for UPI and cash.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-100 flex items-center justify-center">
                <span className="text-4xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                3. Settle up
              </h3>
              <p className="text-gray-600">
                Share bills via WhatsApp. Automatic price-per-kg calculation.
              </p>
            </div>
          </div>
        </div>

        {/* Group Shopping Feature */}
        <div className="mt-24 md:mt-32 bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-200">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-600 flex items-center justify-center">
              <Users size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Bonus: Shop with neighbors
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Share your session link. Neighbors can add their items.
              Everyone shops together, splits costs automatically.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Share2 size={16} className="text-green-600" strokeWidth={2.5} />
                <span>One link to share</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" strokeWidth={2.5} />
                <span>Up to 4 people</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-20 text-center">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Try it now – it's free
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{minibag.name}</span>
              {' · '}
              {minibag.description}
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">About</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="/" className="hover:text-gray-900 transition-colors">← {PLATFORM.name}</a>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            Part of <a href="/" className="text-gray-700 hover:text-gray-900 font-medium">{PLATFORM.name}</a> ecosystem · © 2025
          </div>
        </div>
      </footer>
    </div>
  );
}
