import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import LocalLoopsLanding from './LocalLoopsLanding';
import LandingPage from './LandingPage';
import MinibagPrototype from '../minibag-ui-prototype';
import AdminDashboard from './AdminDashboard';

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
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
