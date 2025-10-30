import React from 'react';
import { ShoppingBag, PartyPopper, Heart, MapPin, LayoutDashboard } from 'lucide-react';
import { Logo, ProductCard } from '@localloops/ui-components';
import { PLATFORM, getLiveProducts, getProductColorClasses } from '@localloops/ui-components/config';

export default function LocalLoopsLanding() {
  // Map icon names to actual icon components
  const iconMap = {
    ShoppingBag,
    PartyPopper,
    Heart,
    MapPin,
  };

  // Get only live products from shared config (hide partybag/fitbag for now)
  const products = getLiveProducts().map(product => ({
    ...product,
    icon: iconMap[product.icon],
    // Get Tailwind color classes
    ...getProductColorClasses(product.id),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <Logo
            icon={MapPin}
            name={PLATFORM.name}
            tagline={PLATFORM.tagline}
            size="lg"
            iconColor="bg-gray-900"
          />
          <a
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">Admin</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-20">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Digitally enable the ways
            <br />
            <span className="text-gray-600">people already help each other</span>
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            Simple tools for neighborhood coordination
          </p>
          <p className="text-base text-gray-500">
            Shopping lists • Cost splitting • Real-time sync
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              icon={product.icon}
              name={product.name}
              tagline={product.tagline}
              description={product.description}
              features={product.features}
              status={product.status}
              link={product.routes.landing}
              color={product.bg}
              hoverColor={product.hover}
            />
          ))}
        </div>

        {/* Mission Statement */}
        <div className="max-w-3xl mx-auto text-center bg-gray-900 rounded-3xl p-12 text-white">
          <MapPin size={48} className="mx-auto mb-6 opacity-80" strokeWidth={2} />
          <h3 className="text-3xl font-bold mb-4">Built for Indian neighborhoods</h3>
          <p className="text-lg text-gray-300 mb-6">
            We make simple tools that help neighbors coordinate daily activities —
            from vegetable shopping to party planning to group fitness.
          </p>
          <p className="text-base text-gray-400">
            No complex features. No overwhelming apps. Just simple coordination
            that works the way you already do things.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-gray-900" />
                <span className="font-bold text-gray-900">{PLATFORM.name}</span>
              </div>
              <p className="text-sm text-gray-600">
                {PLATFORM.description}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Products</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {products.map(product => (
                  <li key={product.id}>
                    {product.status === 'Live' ? (
                      <a href={product.routes.landing} className="hover:text-gray-900">
                        {product.name}
                      </a>
                    ) : (
                      <span className="text-gray-400">
                        {product.name} (Coming Soon)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">About</a></li>
                <li><a href="#" className="hover:text-gray-900">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gray-900">Terms of Service</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Help Center</a></li>
                <li><a href="/admin" className="hover:text-gray-900">Admin Dashboard</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-300 pt-8 text-center text-sm text-gray-600">
            <p>© 2025 {PLATFORM.name}. Built for Indian neighborhoods with ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
