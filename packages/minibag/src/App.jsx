import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationToast from './components/NotificationToast';
import ErrorBoundary from './components/ErrorBoundary';
import { SessionScreenSkeleton } from './components/skeletons';

// Loading component for lazy-loaded routes
// Uses skeleton loading instead of spinner for better UX
function LoadingFallback() {
  return <SessionScreenSkeleton />;
}

// Lazy load all routes to reduce main bundle size
// Each screen becomes a separate chunk, loaded only when accessed
const LandingPage = lazy(() => import('./LandingPage'));
const MinibagPrototype = lazy(() => import('../minibag-ui-prototype'));
const BillScreen = lazy(() => import('./screens/BillScreen'));

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
  const navigate = useNavigate();

  return (
    <MinibagPrototype
      joinSessionId={sessionId}
      onNavigateToHome={() => navigate('/app')}
    />
  );
}


function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <NotificationToast />
            <Routes>
              {/* Landing page as home - Get Started navigates to /app */}
              <Route path="/" element={<MinibagLandingWrapper />} />
              <Route path="/minibag" element={<MinibagLandingWrapper />} />
              <Route path="/app" element={<MinibagPrototype />} />
              <Route path="/join/:sessionId" element={<JoinSessionWrapper />} />
              <Route path="/bill/:token" element={<BillScreen />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
