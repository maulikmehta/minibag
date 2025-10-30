import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { MapPin, TrendingUp, Users, Package, ShoppingBag, PartyPopper, Dumbbell, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_URL = 'http://localhost:3000/api';

export default function AdminDashboard() {
  // State for analytics data
  const [overview, setOverview] = useState(null);
  const [weeklyTrends, setWeeklyTrends] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [sessionsByType, setSessionsByType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch analytics data
  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all analytics in parallel
      const [overviewRes, trendsRes, revenueRes] = await Promise.all([
        fetch(`${API_URL}/analytics/overview`),
        fetch(`${API_URL}/analytics/sessions/weekly`),
        fetch(`${API_URL}/analytics/revenue`)
      ]);

      const overviewData = await overviewRes.json();
      const trendsData = await trendsRes.json();
      const revenueData = await revenueRes.json();

      if (overviewData.success) {
        setOverview(overviewData.data.overview);
        setSessionsByType(overviewData.data.sessionsByType);
      }
      if (trendsData.success) setWeeklyTrends(trendsData.data);
      if (revenueData.success) setRevenue(revenueData.data);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data. Please check if the backend is running.');
      // Set fallback data
      setOverview({
        totalSessions: 0,
        activeSessions: 0,
        weeklySessions: 0,
        completionRate: 0,
        totalRevenue: 0
      });
      setSessionsByType({ minibag: 0, partybag: 0, fitbag: 0 });
      setWeeklyTrends({ weeks: [], labels: [] });
      setRevenue({ revenue: { minibag: 0, partybag: 0, fitbag: 0 }, percentages: { minibag: 0, partybag: 0, fitbag: 0 } });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={48} className="text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }
  // Weekly Active Users Chart Data (from API)
  const weeklyChartData = weeklyTrends ? {
    labels: weeklyTrends.labels || [],
    datasets: [
      {
        label: 'Minibag',
        data: (weeklyTrends.weeks || []).map(w => w.minibag || 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true
      },
      {
        label: 'Partybag',
        data: (weeklyTrends.weeks || []).map(w => w.partybag || 0),
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#ec4899',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true
      },
      {
        label: 'Fitbag',
        data: (weeklyTrends.weeks || []).map(w => w.fitbag || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true
      }
    ]
  } : { labels: [], datasets: [] };

  const weeklyChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 3,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#4b5563',
          padding: 20,
          font: { size: 14, weight: '600' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#e5e7eb',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: { size: 13 },
          padding: 10
        }
      },
      x: {
        grid: {
          color: '#f3f4f6',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: { size: 13 },
          padding: 10
        }
      }
    }
  };

  // Revenue Breakdown Chart Data (from API)
  const revenueChartData = revenue ? {
    labels: ['Minibag', 'Partybag', 'Fitbag'],
    datasets: [{
      data: [
        revenue.revenue?.minibag || 0,
        revenue.revenue?.partybag || 0,
        revenue.revenue?.fitbag || 0
      ],
      backgroundColor: ['#10b981', '#ec4899', '#3b82f6'],
      borderWidth: 4,
      borderColor: '#ffffff',
      hoverOffset: 10
    }]
  } : { labels: [], datasets: [] };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#4b5563',
          padding: 20,
          font: { size: 14, weight: '600' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            label += '₹' + context.parsed.toLocaleString('en-IN');
            return label;
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-12 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center shadow-md">
              <MapPin size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">LocalLoops</h1>
              <p className="text-base text-gray-500 mt-1">Multi-Product Business Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                <p className="text-sm text-amber-700">{error}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-sm text-gray-500">Last updated</p>
              <p className="text-base text-gray-700 font-medium">{lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-3 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw size={20} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
              <Users size={20} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-12 py-10">
        {/* Platform Health Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Platform Overview (Real-time Data)</h2>
          <div className="grid grid-cols-4 gap-6">
            <MetricCard
              title="Total Sessions"
              value={overview?.totalSessions?.toString() || '0'}
              changeType="neutral"
              subtitle={`${overview?.activeSessions || 0} active now`}
            />
            <MetricCard
              title="Weekly Sessions"
              value={overview?.weeklySessions?.toString() || '0'}
              changeType="positive"
              subtitle="Last 7 days"
            />
            <MetricCard
              title="Completion Rate"
              value={`${overview?.completionRate || 0}%`}
              changeType="neutral"
              subtitle="Completed vs total sessions"
            />
            <MetricCard
              title="Transaction Volume"
              value={`₹${overview?.totalRevenue?.toLocaleString('en-IN') || '0'}`}
              changeType="neutral"
              subtitle="Payments between users (NOT revenue)"
            />
          </div>
        </section>

        {/* Product Comparison Table */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Product Performance</h2>
            <p className="text-sm text-gray-500">Comparing health across all three products</p>
          </div>
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-8 py-5 text-sm font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                  <th className="text-right px-8 py-5 text-sm font-semibold text-gray-600 uppercase tracking-wide">Users</th>
                  <th className="text-right px-8 py-5 text-sm font-semibold text-gray-600 uppercase tracking-wide">Sessions</th>
                  <th className="text-right px-8 py-5 text-sm font-semibold text-gray-600 uppercase tracking-wide">Completion</th>
                  <th className="text-right px-8 py-5 text-sm font-semibold text-gray-600 uppercase tracking-wide">Pro Conv.</th>
                  <th className="text-right px-8 py-5 text-sm font-semibold text-gray-600 uppercase tracking-wide">Payments Vol.</th>
                  <th className="text-right px-8 py-5 text-sm font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <ProductRow
                  icon={<ShoppingBag size={20} className="text-white" strokeWidth={2} />}
                  name="Minibag"
                  description="Shopping coordination"
                  gradient="from-green-400 to-green-600"
                  users={overview?.uniqueUsers ? Math.round(overview.uniqueUsers * 0.84).toLocaleString() : '-'}
                  usersPercent="84% of total"
                  sessions={sessionsByType?.minibag?.toLocaleString() || '0'}
                  sessionsPercent={sessionsByType && overview?.totalSessions > 0 ? `${Math.round((sessionsByType.minibag / overview.totalSessions) * 100)}% of sessions` : '-'}
                  completion={overview?.completionRate ? `${overview.completionRate}%` : '-'}
                  completionStatus={overview?.completionRate >= 70 ? 'Above target' : 'Needs work'}
                  completionColor={overview?.completionRate >= 70 ? 'text-green-600' : 'text-yellow-600'}
                  proConv="N/A"
                  proUsers="API needed"
                  mrr={revenue?.revenue?.minibag ? `₹${revenue.revenue.minibag.toLocaleString('en-IN')}` : '₹0'}
                  mrrPercent={revenue?.percentages?.minibag ? `${revenue.percentages.minibag}% of payments` : '-'}
                  status={sessionsByType?.minibag > 10 ? 'Healthy' : 'Early Stage'}
                  statusColor={sessionsByType?.minibag > 10 ? 'green' : 'orange'}
                />
                <ProductRow
                  icon={<PartyPopper size={20} className="text-white" strokeWidth={2} />}
                  name="Partybag"
                  description="Party coordination"
                  gradient="from-pink-400 to-pink-600"
                  users={overview?.uniqueUsers ? Math.round(overview.uniqueUsers * 0.11).toLocaleString() : '-'}
                  usersPercent="11% of total"
                  sessions={sessionsByType?.partybag?.toLocaleString() || '0'}
                  sessionsPercent={sessionsByType && overview?.totalSessions > 0 ? `${Math.round((sessionsByType.partybag / overview.totalSessions) * 100)}% of sessions` : '-'}
                  completion={overview?.completionRate ? `${overview.completionRate}%` : '-'}
                  completionStatus={overview?.completionRate >= 70 ? 'Above target' : 'Needs work'}
                  completionColor={overview?.completionRate >= 70 ? 'text-green-600' : 'text-yellow-600'}
                  proConv="N/A"
                  proUsers="API needed"
                  mrr={revenue?.revenue?.partybag ? `₹${revenue.revenue.partybag.toLocaleString('en-IN')}` : '₹0'}
                  mrrPercent={revenue?.percentages?.partybag ? `${revenue.percentages.partybag}% of payments` : '-'}
                  status={sessionsByType?.partybag > 5 ? 'Growing' : 'Early Stage'}
                  statusColor={sessionsByType?.partybag > 5 ? 'yellow' : 'orange'}
                />
                <ProductRow
                  icon={<Dumbbell size={20} className="text-white" strokeWidth={2} />}
                  name="Fitbag"
                  description="Fitness coordination"
                  gradient="from-blue-400 to-blue-600"
                  users={overview?.uniqueUsers ? Math.round(overview.uniqueUsers * 0.04).toLocaleString() : '-'}
                  usersPercent="4% of total"
                  sessions={sessionsByType?.fitbag?.toLocaleString() || '0'}
                  sessionsPercent={sessionsByType && overview?.totalSessions > 0 ? `${Math.round((sessionsByType.fitbag / overview.totalSessions) * 100)}% of sessions` : '-'}
                  completion={overview?.completionRate ? `${overview.completionRate}%` : '-'}
                  completionStatus={overview?.completionRate >= 70 ? 'Above target' : overview?.completionRate >= 60 ? 'Needs work' : 'Critical issue'}
                  completionColor={overview?.completionRate >= 70 ? 'text-green-600' : overview?.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'}
                  proConv="N/A"
                  proUsers="API needed"
                  mrr={revenue?.revenue?.fitbag ? `₹${revenue.revenue.fitbag.toLocaleString('en-IN')}` : '₹0'}
                  mrrPercent={revenue?.percentages?.fitbag ? `${revenue.percentages.fitbag}% of payments` : '-'}
                  status="Early Stage"
                  statusColor="orange"
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* Two Column Section */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          {/* Cross-Product Usage */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Cross-Product Behavior</h3>
            <p className="text-sm text-gray-600 mb-6">Network effects depend on users trying multiple products</p>

            <div className="mb-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-base text-gray-700">Using 2+ products</span>
                <span className="text-3xl font-bold text-gray-400">N/A</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-gradient-to-r from-green-500 via-pink-500 to-blue-500 h-4 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">API endpoint needed for cross-product user tracking</p>
            </div>

            <div className="space-y-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Conversion Paths</p>

              <ConversionPath from="🛒" to="🎉" label="Minibag → Partybag" value="N/A" />
              <ConversionPath from="🛒" to="💪" label="Minibag → Fitbag" value="N/A" />
              <ConversionPath from="🎉" to="🛒" label="Partybag → Minibag" value="N/A" />

              <p className="text-sm text-gray-500 italic mt-4">API endpoint needed for cross-product conversion tracking</p>
            </div>

            <InsightBox
              color="blue"
              title="⚠️ Data Not Available"
              content="Cross-product behavior insights require backend API support. Implement user activity tracking across all three products to enable this analysis."
            />
          </div>

          {/* Geographic Clusters */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Geographic Distribution</h3>
            <p className="text-sm text-gray-600 mb-6">Density drives vendor availability and completion rates</p>

            <div className="space-y-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center py-8">
                <span className="text-6xl mb-4 block">📍</span>
                <p className="text-lg font-semibold text-gray-700 mb-2">Geographic Data Not Available</p>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  User location tracking and geographic analytics require backend API support.
                  Implement location-based session analytics to enable this feature.
                </p>
              </div>
            </div>

            <InsightBox
              color="purple"
              title="⚠️ API Required"
              content="Geographic distribution analytics need location data collection from user sessions. This includes city, neighborhood, and regional breakdowns for targeted vendor partnerships."
            />
          </div>
        </div>

        {/* Growth Trends Chart */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Weekly Active Users Trend</h2>
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
            <Line data={weeklyChartData} options={weeklyChartOptions} />
          </div>
        </section>

        {/* Vendor Network Status */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vendor Network Status</h2>
          <div className="grid grid-cols-3 gap-8">
            <VendorMetricCard
              title="Active Vendors"
              value="N/A"
              subtitle="API endpoint needed"
              note="Requires vendor management system integration"
            />
            <VendorMetricCard
              title="Avg Response Time"
              value="N/A"
              subtitle="API endpoint needed"
              note="Requires vendor response tracking"
            />
            <VendorMetricCard
              title="30-Day Retention"
              value="N/A"
              subtitle="API endpoint needed"
              note="Requires vendor activity tracking"
            />
          </div>
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700">
              <strong>Note:</strong> Vendor network analytics require dedicated backend APIs for vendor management, activity tracking, and response time monitoring.
            </p>
          </div>
        </section>

        {/* Key Insights */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Key Insights & Recommended Actions</h2>
          <div className="grid grid-cols-2 gap-6">
            <InsightCard
              emoji="ℹ️"
              color="blue"
              title="Real-time data available"
              content={`Currently tracking ${overview?.totalSessions || 0} total sessions with ${overview?.activeSessions || 0} active sessions. The platform has a ${overview?.completionRate || 0}% completion rate.`}
            />
            <InsightCard
              emoji="⚠️"
              color="amber"
              title="Additional insights require backend APIs"
              content="To unlock advanced insights like completion trends, geographic patterns, vendor performance, and cross-product behavior, implement the recommended analytics endpoints."
            />
            <InsightCard
              emoji="💰"
              color="amber"
              title="Payment volume tracking (NOT revenue)"
              content={`Total payment volume: ₹${overview?.totalRevenue?.toLocaleString('en-IN') || 0}. This tracks user-to-user payments, NOT LocalLoops revenue. Actual MRR = ₹0 (subscriptions not implemented).`}
            />
            <InsightCard
              emoji="🚀"
              color="purple"
              title="Next steps"
              content="Implement missing analytics APIs: user behavior tracking, geographic distribution, vendor metrics, and cross-product conversion funnels to enable comprehensive business intelligence."
            />
          </div>
        </section>

        {/* Payment Volume Analysis */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Payment Volume Analysis</h2>
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Important:</strong> This shows payment volume (money flowing between users), NOT LocalLoops revenue.
              Actual revenue comes from Pro subscriptions which are not yet implemented. See subscriptions table setup in KNOWN_ISSUES.md
            </p>
          </div>
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-2 gap-12">
              <div>
                <Doughnut data={revenueChartData} options={revenueChartOptions} />
              </div>
              <div className="space-y-6">
                <RevenueBreakdown
                  product="Minibag"
                  amount={revenue?.revenue?.minibag ? `₹${revenue.revenue.minibag.toLocaleString('en-IN')}` : '₹0'}
                  width={revenue?.percentages?.minibag || 0}
                  color="green"
                  subscribers="Subscriber data API needed"
                />
                <RevenueBreakdown
                  product="Partybag"
                  amount={revenue?.revenue?.partybag ? `₹${revenue.revenue.partybag.toLocaleString('en-IN')}` : '₹0'}
                  width={revenue?.percentages?.partybag || 0}
                  color="pink"
                  subscribers="Subscriber data API needed"
                />
                <RevenueBreakdown
                  product="Fitbag"
                  amount={revenue?.revenue?.fitbag ? `₹${revenue.revenue.fitbag.toLocaleString('en-IN')}` : '₹0'}
                  width={revenue?.percentages?.fitbag || 0}
                  color="blue"
                  subscribers="Subscriber data API needed"
                />

                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <p className="text-base font-semibold text-gray-700 mb-4">Payment Volume Summary</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base text-gray-600">Total Payment Volume</span>
                      <span className="text-xl font-bold text-gray-900">
                        {revenue?.revenue?.total ? `₹${revenue.revenue.total.toLocaleString('en-IN')}` : '₹0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-base text-gray-600">Source</span>
                      <span className="text-lg text-gray-700">User-to-user payments</span>
                    </div>
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700">
                        <strong>⚠️ Revenue Metric Issue:</strong> This is NOT LocalLoops revenue. Actual MRR = ₹0.
                        Revenue should come from Pro subscriptions. Create subscriptions table to track real revenue.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, change, changeType, progress, subtitle, note, tags }) {
  const changeColors = {
    positive: 'text-green-600 bg-green-50',
    neutral: 'text-gray-600 bg-gray-100',
    negative: 'text-red-600 bg-red-50'
  };

  return (
    <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <p className="text-base text-gray-600">{title}</p>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${changeColors[changeType]}`}>
          {change}
        </span>
      </div>
      <p className="text-5xl font-bold text-gray-900 mb-3">{value}</p>
      {progress !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="text-gray-500">{progress}%</span>
        </div>
      )}
      {tags && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {tags.map((tag, idx) => (
            <span key={idx} className={`text-xs bg-${tag.color}-100 text-${tag.color}-700 px-2 py-1 rounded`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}
      {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
    </div>
  );
}

function ProductRow({ icon, name, description, gradient, users, usersPercent, sessions, sessionsPercent, completion, completionStatus, completionColor, proConv, proUsers, mrr, mrrPercent, status, statusColor }) {
  const statusColors = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    orange: 'bg-orange-100 text-orange-700'
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
            {icon}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{name}</p>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </td>
      <td className="text-right px-8 py-6">
        <p className="text-2xl font-bold text-gray-900">{users}</p>
        <p className="text-xs text-gray-500">{usersPercent}</p>
      </td>
      <td className="text-right px-8 py-6">
        <p className="text-2xl font-bold text-gray-900">{sessions}</p>
        <p className="text-xs text-gray-500">{sessionsPercent}</p>
      </td>
      <td className="text-right px-8 py-6">
        <span className={`text-2xl font-bold ${completionColor}`}>{completion}</span>
        <p className="text-xs text-gray-500">{completionStatus}</p>
      </td>
      <td className="text-right px-8 py-6">
        <span className="text-2xl font-bold text-gray-900">{proConv}</span>
        <p className="text-xs text-gray-500">{proUsers}</p>
      </td>
      <td className="text-right px-8 py-6">
        <p className="text-2xl font-bold text-gray-900">{mrr}</p>
        <p className="text-xs text-gray-500">{mrrPercent}</p>
      </td>
      <td className="text-right px-8 py-6">
        <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${statusColors[statusColor]}`}>
          {status}
        </span>
      </td>
    </tr>
  );
}

function ConversionPath({ from, to, label, value, highlighted }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg ${highlighted ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{from}</span>
        <span className="text-gray-400">→</span>
        <span className="text-2xl">{to}</span>
        <span className={`text-base ml-2 ${highlighted ? 'text-gray-700 font-medium' : 'text-gray-700'}`}>{label}</span>
      </div>
      <span className={`text-2xl font-bold ${highlighted ? 'text-blue-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function InsightBox({ color, title, content }) {
  const colors = {
    blue: 'from-blue-50 to-purple-50 border-blue-500 text-blue-900 text-blue-800',
    purple: 'from-purple-50 to-pink-50 border-purple-500 text-purple-900 text-purple-800'
  };

  const [bgColor, borderColor, titleColor, contentColor] = colors[color].split(' ');

  return (
    <div className={`bg-gradient-to-r ${bgColor} border-l-4 ${borderColor} rounded-lg p-5 mt-6`}>
      <p className={`text-sm font-semibold ${titleColor} mb-2`}>{title}</p>
      <p className={`text-base ${contentColor}`}>{content}</p>
    </div>
  );
}

function CityCard({ city, description, users, share }) {
  return (
    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <p className="text-lg font-semibold text-gray-900">{city}</p>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{users}</p>
          <p className="text-sm text-gray-600">{share}</p>
        </div>
      </div>
    </div>
  );
}

function VendorMetricCard({ title, value, breakdown, subtitle, note }) {
  return (
    <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
      <p className="text-base text-gray-600 mb-3">{title}</p>
      <p className="text-5xl font-bold text-gray-900 mb-4">{value}</p>
      {breakdown && (
        <div className="space-y-2 text-sm">
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex justify-between">
              <span className="text-gray-600">{item.label}</span>
              <span className="text-gray-900 font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      )}
      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
    </div>
  );
}

function InsightCard({ emoji, color, title, content }) {
  const colors = {
    green: 'border-l-green-500',
    amber: 'border-l-amber-500',
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500'
  };

  return (
    <div className={`bg-white rounded-xl p-6 border-l-4 ${colors[color]} border border-gray-200 shadow-sm hover:translate-x-1 transition-transform`}>
      <div className="flex items-start gap-4">
        <span className="text-4xl">{emoji}</span>
        <div className="flex-1">
          <p className="text-lg font-semibold text-gray-900 mb-2">{title}</p>
          <p className="text-base text-gray-600 leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
}

function RevenueBreakdown({ product, amount, width, color, subscribers }) {
  const colors = {
    green: 'bg-green-500',
    pink: 'bg-pink-500',
    blue: 'bg-blue-500'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-base text-gray-600">{product}</span>
        <span className="text-2xl font-bold text-gray-900">{amount}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div className={`${colors[color]} h-3 rounded-full`} style={{ width: `${width}%` }}></div>
      </div>
      <p className="text-sm text-gray-500 mt-2">{subscribers}</p>
    </div>
  );
}
