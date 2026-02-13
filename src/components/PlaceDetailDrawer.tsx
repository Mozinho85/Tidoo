import { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Rating,
  Chip,
  Divider,
  Link,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';
import DirectionsIcon from '@mui/icons-material/Directions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { Place } from '../types.ts';
import { getPlaceDetails, getPlacePhotoUrl } from '../api.ts';
import { cachePlace } from '../db.ts';
import { useApp } from '../AppContext.tsx';

interface Props {
  place: Place | null;
  onClose: () => void;
}

export default function PlaceDetailDrawer({ place, onClose }: Props) {
  const { addPlace, removePlace, isPlaceInItinerary } = useApp();
  const [details, setDetails] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!place) {
      setDetails(null);
      return;
    }

    setDetails(place);
    setLoading(true);
    setError('');

    getPlaceDetails(place.id)
      .then((full) => {
        setDetails(full);
        cachePlace(full);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load details'))
      .finally(() => setLoading(false));
  }, [place]);

  if (!place) return null;

  const p = details ?? place;
  const inItinerary = isPlaceInItinerary(p.id);

  const photos = p.photos?.slice(0, 5) ?? [];

  return (
    <Drawer
      anchor="bottom"
      open={!!place}
      onClose={onClose}
      PaperProps={{
        sx: {
          maxHeight: '85vh',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
      }}
    >
      {/* Drag handle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'grey.300' }} />
      </Box>

      <Box sx={{ p: 2, pb: 4, overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5">{p.displayName.text}</Typography>
            <Typography variant="body2" color="text.secondary">
              {p.formattedAddress}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Photos */}
        {photos.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 2, overflowX: 'auto', pb: 1 }}>
            {photos.map((photo, idx) => (
              <Box
                key={idx}
                component="img"
                src={getPlacePhotoUrl(photo.name, 300)}
                alt={`${p.displayName.text} photo ${idx + 1}`}
                sx={{
                  height: 180,
                  minWidth: 240,
                  borderRadius: 2,
                  objectFit: 'cover',
                }}
              />
            ))}
          </Stack>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        {/* Rating & type */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          {p.rating && (
            <>
              <Rating value={p.rating} precision={0.1} size="small" readOnly />
              <Typography variant="body2">
                {p.rating} ({p.userRatingCount ?? 0} reviews)
              </Typography>
            </>
          )}
          {p.primaryTypeDisplayName && (
            <Chip label={p.primaryTypeDisplayName.text} size="small" variant="outlined" />
          )}
          {p.priceLevel && (
            <Chip label={p.priceLevel.replace('PRICE_LEVEL_', '')} size="small" />
          )}
        </Stack>

        {/* Opening hours */}
        {p.regularOpeningHours && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AccessTimeIcon fontSize="small" color="action" />
              <Chip
                label={p.regularOpeningHours.openNow ? 'Open Now' : 'Closed'}
                size="small"
                color={p.regularOpeningHours.openNow ? 'success' : 'default'}
              />
            </Stack>
            {p.regularOpeningHours.weekdayDescriptions && (
              <Box sx={{ mt: 1, pl: 4 }}>
                {p.regularOpeningHours.weekdayDescriptions.map((desc, i) => (
                  <Typography key={i} variant="caption" display="block" color="text.secondary">
                    {desc}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Editorial summary */}
        {p.editorialSummary && (
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            {p.editorialSummary.text}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Actions */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {p.nationalPhoneNumber && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PhoneIcon />}
              href={`tel:${p.nationalPhoneNumber}`}
            >
              {p.nationalPhoneNumber}
            </Button>
          )}
          {p.websiteUri && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<LanguageIcon />}
              component={Link}
              href={p.websiteUri}
              target="_blank"
              rel="noopener"
            >
              Website
            </Button>
          )}
          {p.googleMapsUri && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DirectionsIcon />}
              component={Link}
              href={p.googleMapsUri}
              target="_blank"
              rel="noopener"
            >
              Google Maps
            </Button>
          )}
        </Stack>

        {/* Reviews */}
        {p.reviews && p.reviews.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Reviews
            </Typography>
            <Stack spacing={1.5}>
              {p.reviews.slice(0, 3).map((review, i) => (
                <Box key={i} sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {review.authorAttribution.displayName}
                    </Typography>
                    <Rating value={review.rating} size="small" readOnly />
                    <Typography variant="caption" color="text.secondary">
                      {review.relativePublishTimeDescription}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {review.text.text}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Add/Remove from itinerary */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          color={inItinerary ? 'error' : 'primary'}
          startIcon={inItinerary ? <RemoveCircleIcon /> : <AddCircleIcon />}
          onClick={() => {
            if (inItinerary) removePlace(p.id);
            else addPlace(p);
          }}
          sx={{ mt: 3 }}
        >
          {inItinerary ? 'Remove from Itinerary' : 'Add to Itinerary'}
        </Button>
      </Box>
    </Drawer>
  );
}
