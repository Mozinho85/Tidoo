import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AppProvider } from './AppContext.tsx';
import { hasApiKeys, getApiKeys } from './apiKeyStore.ts';
import BottomNav from './components/BottomNav.tsx';
import ExplorePage from './pages/ExplorePage.tsx';
import ItineraryPage from './pages/ItineraryPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import OnboardingPage from './pages/OnboardingPage.tsx';

export default function App() {
  const [keysReady, setKeysReady] = useState(hasApiKeys());
  const [apiKey, setApiKey] = useState(getApiKeys()?.googleApiKey ?? '');

  useEffect(() => {
    const ready = hasApiKeys();
    setKeysReady(ready);
    if (ready) {
      setApiKey(getApiKeys()!.googleApiKey);
    }
  }, []);

  const handleKeysConfigured = () => {
    setKeysReady(true);
    setApiKey(getApiKeys()!.googleApiKey);
  };

  if (!keysReady) {
    return <OnboardingPage onComplete={handleKeysConfigured} />;
  }

  return (
    <APIProvider apiKey={apiKey}>
      <AppProvider>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Routes>
              <Route path="/" element={<ExplorePage />} />
              <Route path="/itinerary" element={<ItineraryPage />} />
              <Route path="/settings" element={<SettingsPage onKeysCleared={() => setKeysReady(false)} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
          <BottomNav />
        </Box>
      </AppProvider>
    </APIProvider>
  );
}
