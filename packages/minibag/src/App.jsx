import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import LocalLoopsLanding from './LocalLoopsLanding';
import LandingPage from './LandingPage';
import MinibagPrototype from '../minibag-ui-prototype';

// Lazy load admin dashboard to reduce main bundle size (saves ~180 KB)
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
    <BrowserRouter>
      <Routes>
        {/* Direct to app for field testing */}
        <Route path="/" element={<MinibagPrototype />} />
        <Route path="/home" element={<LocalLoopsLanding />} />
        <Route path="/minibag" element={<MinibagLandingWrapper />} />
        <Route path="/app" element={<MinibagPrototype />} />
        <Route path="/join/:sessionId" element={<JoinSessionWrapper />} />
        <Route path="/bill/:sessionId/:participantId" element={<BillViewWrapper />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading admin...</div>}>
              <AdminDashboard />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
