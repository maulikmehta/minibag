import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationToast from './components/NotificationToast';

// Loading component for lazy-loaded routes
function LoadingFallback({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Lazy load all routes to reduce main bundle size
// Each screen becomes a separate chunk, loaded only when accessed
const LocalLoopsLanding = lazy(() => import('./LocalLoopsLanding'));
const LandingPage = lazy(() => import('./LandingPage'));
const MinibagPrototype = lazy(() => import('../minibag-ui-prototype'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));

// Wrapper component to navigate to app on button click
function MinibagLandingWrapper() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/app');
  };

  return <LandingPage onGetStarted={handleGetStarted} />;
}

// Wrapper component to handle join session flow
function JoinSessionWrapper() {
  const { sessionId } = useParams();
  return <MinibagPrototype joinSessionId={sessionId} />;
}

// Wrapper component to view participant bill
function BillViewWrapper() {
  const { sessionId, participantId } = useParams();
  return <MinibagPrototype billSessionId={sessionId} billParticipantId={participantId} />;
}

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <NotificationToast />
          <Routes>
            {/* Landing page as home - Get Started navigates to /app */}
            <Route path="/" element={<MinibagLandingWrapper />} />
            <Route path="/home" element={<LocalLoopsLanding />} />
            <Route path="/minibag" element={<MinibagLandingWrapper />} />
            <Route path="/app" element={<MinibagPrototype />} />
            <Route path="/join/:sessionId" element={<JoinSessionWrapper />} />
            <Route path="/bill/:sessionId/:participantId" element={<BillViewWrapper />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
