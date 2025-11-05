import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import ErrorScreen from './ErrorScreen';

/**
 * Bill Screen - Displays MiniBag branded bill receipt
 * Accessible via time-limited token URL
 * Supports download as JPG for record keeping
 */
const BillScreen = () => {
  const { token } = useParams();
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
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
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Download button - Fixed at top */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleDownloadJPG}
            disabled={downloading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2.5 px-6 rounded-lg font-medium transition-colors flex items-center gap-2"
            aria-label="Download bill as JPG"
          >
            {downloading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Bill
              </>
            )}
          </button>
        </div>

        {/* Bill Content - This will be captured */}
        <div
          ref={billRef}
          className="bg-white"
        >
          {/* Header - Minimal */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">MiniBag</h1>
            {isParticipantBill && billData.participant && (
              <p className="text-gray-600">
                {billData.participant.nickname}'s Bill
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {formatDate(billData.session.created_at)}
            </p>
          </div>

          {/* Items List - Minimal style matching Bill Summary */}
          <div className="mb-8">
            <h2 className="text-base font-medium text-gray-700 mb-4">Your shopping summary</h2>
            <div className="space-y-1">
              {billData.items.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between py-3 ${item.skipped ? 'opacity-50' : ''}`}
                >
                  <div className="flex-1">
                    <p className="font-normal text-gray-900 mb-1">
                      {item.item_name}
                      {item.skipped && <span className="ml-2 text-xs text-gray-500">(Skipped)</span>}
                    </p>
                    {isParticipantBill && item.quantity && (
                      <p className="text-sm text-gray-600">
                        {item.quantity}{item.unit} × {formatCurrency(item.price_per_unit)}/{item.unit}
                      </p>
                    )}
                    {!isParticipantBill && item.vendor_name && (
                      <p className="text-xs text-gray-500">
                        Vendor: {item.vendor_name}
                      </p>
                    )}
                    {item.skip_reason && (
                      <p className="text-xs text-gray-500 italic">
                        {item.skip_reason}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className={`font-semibold text-base ${item.skipped ? 'text-gray-400' : 'text-gray-900'}`}>
                      {item.skipped ? '—' : formatCurrency(item.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total - Colored card style */}
          <div className="bg-green-50 border border-green-100 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-base font-medium text-gray-700">Total Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(billData.total_amount)}
              </p>
            </div>
            {!isParticipantBill && billData.total_items_paid > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                <span>{billData.total_items_paid} items</span>
                {billData.total_items_skipped > 0 && (
                  <span> ({billData.total_items_skipped} skipped)</span>
                )}
              </div>
            )}
          </div>

          {/* Footer - Minimal */}
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              Thank you for shopping with MiniBag
            </p>
          </div>
        </div>

        {/* Expiry Notice */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>
            This bill link expires on {formatDate(billData.expires_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillScreen;
