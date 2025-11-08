import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import ErrorScreen from './ErrorScreen';
import AppHeader from '../components/layout/AppHeader';

/**
 * Bill Screen - POS-style receipt display
 * Accessible via time-limited token URL
 * Supports download as JPG for record keeping
 * Note: Only item names are translated, all UI remains in English
 */
const BillScreen = () => {
  const { token } = useParams();
  const { i18n } = useTranslation();
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const billRef = useRef(null);

  useEffect(() => {
    if (token) {
      fetchBillData();
    }
  }, [token]);

  const fetchBillData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/bill/${token}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError({
            message: data.message || 'This bill link has expired',
            status: 403
          });
        } else if (response.status === 404) {
          setError({
            message: data.message || 'Invalid bill link',
            status: 404
          });
        } else {
          setError({
            message: 'Failed to load bill',
            status: response.status
          });
        }
        return;
      }

      setBillData(data);
    } catch (err) {
      console.error('Error fetching bill:', err);
      setError({
        message: 'Connection error. Please check your internet connection.',
        status: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJPG = async () => {
    if (!billRef.current || downloading) return;

    try {
      setDownloading(true);

      // Capture the bill element as canvas
      const canvas = await html2canvas(billRef.current, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      // Convert to JPG and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = `minibag-bill-${new Date().toISOString().split('T')[0]}.jpg`;

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setDownloading(false);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Error downloading bill:', err);
      setDownloading(false);
      alert('Failed to download bill. Please try again.');
    }
  };

  const handleCloseReceipt = () => {
    window.close();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get translated item name based on current language
  const getItemName = (item) => {
    const lang = i18n.language?.split('-')[0] || 'en';
    if (lang === 'gu' && item.item_name_gu) return item.item_name_gu;
    if (lang === 'hi' && item.item_name_hi) return item.item_name_hi;
    return item.item_name; // fallback to English
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorScreen
        error={error}
        message={error.message}
        onRetry={error.status !== 403 && error.status !== 404 ? fetchBillData : null}
      />
    );
  }

  // No data state
  if (!billData) {
    return (
      <ErrorScreen
        message="Bill data not available"
      />
    );
  }

  const isParticipantBill = billData.bill_type === 'participant';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed AppHeader */}
      <AppHeader
        title="MiniBag Receipt"
        i18n={i18n}
        onLanguageChange={(lang) => i18n.changeLanguage(lang)}
        showEndSessionMenu={true}
        endSessionMenuOpen={menuOpen}
        onEndSessionMenuToggle={setMenuOpen}
        onEndSession={handleCloseReceipt}
        menuLabel="Close Receipt"
        rightContent={
          <button
            onClick={handleDownloadJPG}
            disabled={downloading}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            title="Save Receipt"
          >
            {downloading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Download size={18} className="text-gray-600" />
            )}
          </button>
        }
      />

      {/* Content with padding for fixed header */}
      <div className="pt-16 py-8 px-4">
        <div className="max-w-md mx-auto">
          {/* Receipt - Clean centered layout */}
          <div
            ref={billRef}
            className="bg-white max-w-[350px] mx-auto"
            style={{ padding: '32px 24px' }}
          >
            {/* Header with Logo */}
            <div className="text-center mb-6">
              <img
                src="/minibag-logo.png"
                alt="MiniBag"
                className="h-12 mx-auto mb-3"
              />
              {billData.session?.title && (
                <p className="text-sm text-gray-700 font-medium">
                  {billData.session.title}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                Session ID: {billData.session.session_id}
              </p>
            </div>

            {/* Dotted separator */}
            <div className="border-b border-dotted border-gray-400 mb-4"></div>

            {/* Receipt Info */}
            <div className="text-xs text-gray-600 mb-4 space-y-1">
              {isParticipantBill && billData.participant && (
                <p>For: {billData.participant.nickname}</p>
              )}
              <p>Date: {formatDate(billData.session.created_at)}</p>
              <p>Receipt: {formatDate(new Date().toISOString())}</p>
              {billData.session.completed_at && (
                <p>Shopping completed: {formatDate(billData.session.completed_at)}</p>
              )}
            </div>

            {/* Dotted separator */}
            <div className="border-b border-dotted border-gray-400 mb-4"></div>

            {/* Items List with Serial Numbers */}
            <div className="mb-4">
              {billData.items.map((item, index) => (
                <div
                  key={index}
                  className={`mb-3 ${item.skipped ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 flex items-start gap-2">
                      <span className="text-xs text-gray-500 font-medium min-w-[20px]">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          {getItemName(item)}
                          {item.skipped && <span className="ml-1 text-xs text-gray-500">(Skipped)</span>}
                        </p>
                        {isParticipantBill && item.quantity && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            {item.quantity}{item.unit} × {formatCurrency(item.price_per_unit)}/{item.unit}
                          </p>
                        )}
                        {item.skip_reason && (
                          <p className="text-xs text-gray-500 italic mt-0.5">
                            {item.skip_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`text-sm font-medium ${item.skipped ? 'text-gray-400' : 'text-gray-900'}`}>
                        {item.skipped ? '—' : formatCurrency(item.total)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dotted separator */}
            <div className="border-b border-dotted border-gray-400 mb-4"></div>

            {/* Subtotal (if items were skipped) */}
            {!isParticipantBill && billData.total_items_skipped > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Sub Total</span>
                <span className="text-gray-900">{formatCurrency(billData.total_amount)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-base font-bold text-gray-900">TOTAL</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(billData.total_amount)}</span>
            </div>

            {/* Dotted separator */}
            <div className="border-b border-dotted border-gray-400 mb-4"></div>

            {/* Footer Info - Metadata */}
            <div className="text-xs text-gray-600 mb-4">
              <p>
                {billData.participant_count !== undefined && (
                  <>Total participants: {billData.participant_count}</>
                )}
                {billData.participant_count !== undefined && (isParticipantBill || billData.total_items_paid > 0) && ' • '}
                {isParticipantBill ? (
                  <>Items in this order: {billData.items.length}</>
                ) : (
                  <>
                    {billData.total_items_paid > 0 && (
                      <>
                        Items purchased: {billData.total_items_paid}
                        {billData.total_items_skipped > 0 && ` (${billData.total_items_skipped} skipped)`}
                      </>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* Dotted separator */}
            <div className="border-b border-dotted border-gray-400 mb-4"></div>

            {/* Thank You Message */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-800 mb-2">
                Thank You For Supporting<br />Local Neighborhoods!
              </p>
              {billData.host?.real_name && (
                <p className="text-xs text-gray-600">
                  From: {billData.host.real_name}
                </p>
              )}
            </div>
          </div>

          {/* Expiry Notice */}
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>This bill link expires on {formatDate(billData.expires_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillScreen;
