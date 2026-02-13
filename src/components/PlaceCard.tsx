import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  IconButton,
  Chip,
  Stack,
  Box,
  Rating,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { Place } from '../types.ts';
import { getPlacePhotoUrl } from '../api.ts';
import { useApp } from '../AppContext.tsx';

interface Props {
  place: Place;
  onClick?: () => void;
  compact?: boolean;
}

export default function PlaceCard({ place, onClick, compact }: Props) {
  const { addPlace, removePlace, isPlaceInItinerary } = useApp();
  const inItinerary = isPlaceInItinerary(place.id);

  const photoUrl = place.photos?.[0]
    ? getPlacePhotoUrl(place.photos[0].name, compact ? 200 : 400)
    : null;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inItinerary) {
      removePlace(place.id);
    } else {
      addPlace(place);
    }
  };

  return (
    <Card
      sx={{
        display: 'flex',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': onClick
          ? { transform: 'translateY(-2px)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }
          : {},
        ...(compact ? { height: 100 } : {}),
      }}
      onClick={onClick}
    >
      {photoUrl && (
        <CardMedia
          component="img"
          sx={{ width: compact ? 100 : 140, objectFit: 'cover', flexShrink: 0 }}
          image={photoUrl}
          alt={place.displayName.text}
        />
      )}

      <CardContent sx={{ flex: 1, py: compact ? 1 : 2, px: 2, '&:last-child': { pb: compact ? 1 : 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant={compact ? 'body1' : 'subtitle1'}
              fontWeight={600}
              noWrap
            >
              {place.displayName.text}
            </Typography>

            {!compact && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {place.formattedAddress}
              </Typography>
            )}
          </Box>

          <IconButton
            size="small"
            onClick={handleToggle}
            color={inItinerary ? 'error' : 'primary'}
            sx={{ ml: 1, flexShrink: 0 }}
          >
            {inItinerary ? <RemoveCircleIcon /> : <AddCircleIcon />}
          </IconButton>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
          {place.rating && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Rating value={place.rating} precision={0.1} size="small" readOnly />
              <Typography variant="caption" color="text.secondary">
                {place.rating} ({place.userRatingCount ?? 0})
              </Typography>
            </Stack>
          )}
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
          {place.primaryTypeDisplayName && (
            <Chip
              label={place.primaryTypeDisplayName.text}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          )}
          {place.regularOpeningHours?.openNow !== undefined && (
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
              label={place.regularOpeningHours.openNow ? 'Open' : 'Closed'}
              size="small"
              color={place.regularOpeningHours.openNow ? 'success' : 'default'}
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
