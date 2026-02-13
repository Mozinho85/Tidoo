import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  CircularProgress,
  Link,
} from '@mui/material';
import KeyIcon from '@mui/icons-material/VpnKey';
import { saveApiKeys } from '../apiKeyStore.ts';

interface Props {
  onComplete: () => void;
}

export default function OnboardingPage({ onComplete }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('Please enter your API key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate key with a lightweight Places API call
      const res = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': trimmed,
            'X-Goog-FieldMask': 'places.id',
          },
          body: JSON.stringify({
            textQuery: 'test',
            maxResultCount: 1,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Invalid API key or Places API not enabled');
      }

      saveApiKeys({ googleApiKey: trimmed });
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to validate API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #ff9800 100%)',
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center">
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyIcon sx={{ fontSize: 36, color: 'white' }} />
            </Box>

            <Typography variant="h4" textAlign="center">
              Welcome to Tidoo
            </Typography>

            <Typography variant="body1" color="text.secondary" textAlign="center">
              Discover activities and build smart itineraries. To get started, enter your Google API key.
              Your key stays on your device — it&apos;s never sent to any server except Google.
            </Typography>

            <Alert severity="info" sx={{ width: '100%' }}>
              You need a Google Cloud API key with <strong>Places API (New)</strong>,{' '}
              <strong>Routes API</strong>, and <strong>Maps JavaScript API</strong> enabled.
              {' '}
              <Link
                href="https://console.cloud.google.com/apis/library"
                target="_blank"
                rel="noopener"
              >
                Enable them here
              </Link>
            </Alert>

            <TextField
              fullWidth
              label="Google API Key"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              autoComplete="off"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />

            {error && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : undefined}
            >
              {loading ? 'Validating...' : 'Get Started'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
