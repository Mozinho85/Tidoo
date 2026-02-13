import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { getApiKeys, saveApiKeys, clearApiKeys } from '../apiKeyStore.ts';
import { useApp } from '../AppContext.tsx';
import type { TravelMode } from '../types.ts';

interface Props {
  onKeysCleared: () => void;
}

export default function SettingsPage({ onKeysCleared }: Props) {
  const { activeItinerary, setTravelMode } = useApp();
  const [apiKey, setApiKey] = useState(getApiKeys()?.googleApiKey ?? '');
  const [saved, setSaved] = useState(false);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      saveApiKeys({ googleApiKey: apiKey.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClearKeys = () => {
    if (confirm('Remove your API key? You will need to re-enter it to use the app.')) {
      clearApiKeys();
      onKeysCleared();
    }
  };

  return (
    <Box sx={{ p: 2, pb: 10, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Settings
      </Typography>

      {/* API Key Management */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Google API Key
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your key is stored only on this device in localStorage.
          </Typography>

          <Stack spacing={2}>
            <TextField
              fullWidth
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              size="small"
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveKey}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleClearKeys}
              >
                Remove Key
              </Button>
            </Stack>
            {saved && <Alert severity="success">API key saved!</Alert>}
          </Stack>
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      {/* Default Travel Mode */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Travel Preferences
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Default Travel Mode</InputLabel>
            <Select
              value={activeItinerary.travelMode}
              label="Default Travel Mode"
              onChange={(e) => setTravelMode(e.target.value as TravelMode)}
            >
              <MenuItem value="DRIVE">Driving</MenuItem>
              <MenuItem value="WALK">Walking</MenuItem>
              <MenuItem value="BICYCLE">Bicycling</MenuItem>
              <MenuItem value="TRANSIT">Transit</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            About Tidoo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tidoo helps you discover activities and build efficient itineraries.
            Powered by Google Places &amp; Routes APIs. Your data stays on your device.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Version 1.0.0
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
