import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RouteIcon from '@mui/icons-material/Route';
import SaveIcon from '@mui/icons-material/Save';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import DirectionsTransitIcon from '@mui/icons-material/DirectionsTransit';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../AppContext.tsx';
import { computeRoute } from '../api.ts';
import type { ItineraryPlace, TravelMode, RouteLeg } from '../types.ts';

const TRAVEL_MODE_ICONS: Record<TravelMode, React.ReactNode> = {
  DRIVE: <DirectionsCarIcon fontSize="small" />,
  WALK: <DirectionsWalkIcon fontSize="small" />,
  BICYCLE: <DirectionsBikeIcon fontSize="small" />,
  TRANSIT: <DirectionsTransitIcon fontSize="small" />,
};

function formatDuration(durationStr: string): string {
  const seconds = parseInt(durationStr.replace('s', ''), 10);
  if (isNaN(seconds)) return durationStr;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

function formatDistance(meters: number): string {
  if (meters >= 1609) {
    return `${(meters / 1609.34).toFixed(1)} mi`;
  }
  return `${Math.round(meters)} m`;
}

// ─── Sortable Item ───────────────────────────────────────────────

function SortablePlace({
  item,
  index,
  leg,
  onRemove,
}: {
  item: ItineraryPlace;
  index: number;
  leg?: RouteLeg;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.place.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Card
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 1,
          py: 0.5,
          bgcolor: isDragging ? 'action.hover' : 'background.paper',
        }}
      >
        <IconButton size="small" {...attributes} {...listeners} sx={{ cursor: 'grab', mr: 1 }}>
          <DragIndicatorIcon fontSize="small" />
        </IconButton>

        <Chip
          label={index + 1}
          size="small"
          color="primary"
          sx={{ mr: 1.5, fontWeight: 700, minWidth: 28, height: 28 }}
        />

        <CardContent sx={{ flex: 1, py: 0.5, px: 0, '&:last-child': { pb: 0.5 } }}>
          <Typography variant="body1" fontWeight={600} noWrap>
            {item.place.displayName.text}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {item.place.formattedAddress}
          </Typography>
        </CardContent>

        <IconButton size="small" onClick={() => onRemove(item.place.id)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Card>

      {/* Leg info between stops */}
      {leg && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 0.5, gap: 1 }}>
          <ArrowDownwardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Chip
            label={`${formatDistance(leg.distanceMeters)} · ${formatDuration(leg.duration)}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 22 }}
          />
        </Box>
      )}
    </Box>
  );
}

// ─── Itinerary Page ──────────────────────────────────────────────

export default function ItineraryPage() {
  const {
    activeItinerary,
    removePlace,
    reorderPlaces,
    setTravelMode,
    clearItinerary,
    userLocation,
    saveCurrentItinerary,
    savedItineraries,
    loadItinerary,
    deleteSavedItinerary,
  } = useApp();

  const [optimizing, setOptimizing] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeLegs, setRouteLegs] = useState<RouteLeg[]>([]);
  const [totalDuration, setTotalDuration] = useState('');
  const [totalDistance, setTotalDistance] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState(activeItinerary.name);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = activeItinerary.places.findIndex((p) => p.place.id === active.id);
      const newIndex = activeItinerary.places.findIndex((p) => p.place.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newPlaces = [...activeItinerary.places];
      const [moved] = newPlaces.splice(oldIndex, 1);
      newPlaces.splice(newIndex, 0, moved);
      reorderPlaces(newPlaces);
      setRouteLegs([]); // clear route since order changed
    },
    [activeItinerary.places, reorderPlaces],
  );

  const handleOptimize = async () => {
    if (!userLocation) {
      setRouteError('Location required for route optimization');
      return;
    }
    if (activeItinerary.places.length < 2) {
      setRouteError('Add at least 2 places to optimize');
      return;
    }

    setOptimizing(true);
    setRouteError('');

    try {
      const places = activeItinerary.places;
      const origin = userLocation;
      const destination = {
        lat: places[places.length - 1].place.location.latitude,
        lng: places[places.length - 1].place.location.longitude,
      };
      const intermediates = places.slice(0, -1).map((p) => ({
        lat: p.place.location.latitude,
        lng: p.place.location.longitude,
      }));

      const result = await computeRoute(
        origin,
        destination,
        intermediates,
        activeItinerary.travelMode,
        true,
      );

      if (result.routes?.[0]) {
        const route = result.routes[0];

        // Reorder places based on optimized order
        if (route.optimizedIntermediateWaypointIndex) {
          const reordered: ItineraryPlace[] = [];
          const intermediatesOnly = places.slice(0, -1);
          for (const idx of route.optimizedIntermediateWaypointIndex) {
            reordered.push(intermediatesOnly[idx]);
          }
          // Add the destination (last place) back
          reordered.push(places[places.length - 1]);
          reorderPlaces(reordered);
        }

        setRouteLegs(route.legs ?? []);
        setTotalDuration(route.duration ? formatDuration(route.duration) : '');
        setTotalDistance(route.distanceMeters ? formatDistance(route.distanceMeters) : '');
      }
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : 'Route optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    await saveCurrentItinerary(saveName);
    setSaveDialogOpen(false);
  };

  const { places } = activeItinerary;

  return (
    <Box sx={{ p: 2, pb: 10, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Itinerary</Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Load saved">
            <IconButton size="small" onClick={() => setLoadDialogOpen(true)}>
              <FolderOpenIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save">
            <span>
              <IconButton
                size="small"
                onClick={() => setSaveDialogOpen(true)}
                disabled={places.length === 0}
              >
                <SaveIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Clear all">
            <span>
              <IconButton
                size="small"
                onClick={clearItinerary}
                disabled={places.length === 0}
                color="error"
              >
                <ClearAllIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* Travel mode selector */}
      <FormControl size="small" sx={{ mb: 2, minWidth: 140 }}>
        <InputLabel>Travel Mode</InputLabel>
        <Select
          value={activeItinerary.travelMode}
          label="Travel Mode"
          onChange={(e) => {
            setTravelMode(e.target.value as TravelMode);
            setRouteLegs([]);
          }}
          startAdornment={TRAVEL_MODE_ICONS[activeItinerary.travelMode]}
        >
          <MenuItem value="DRIVE">Driving</MenuItem>
          <MenuItem value="WALK">Walking</MenuItem>
          <MenuItem value="BICYCLE">Bicycling</MenuItem>
          <MenuItem value="TRANSIT">Transit</MenuItem>
        </Select>
      </FormControl>

      {/* Empty state */}
      {places.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <RouteIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No places yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Explore and add places to build your itinerary.
          </Typography>
        </Box>
      )}

      {/* Sortable place list */}
      {places.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={places.map((p) => p.place.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack spacing={0}>
              {places.map((item, idx) => (
                <SortablePlace
                  key={item.place.id}
                  item={item}
                  index={idx}
                  leg={routeLegs[idx]}
                  onRemove={removePlace}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      {/* Route summary */}
      {totalDuration && totalDistance && (
        <Card sx={{ mt: 2, bgcolor: 'primary.50' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
              <Chip
                icon={TRAVEL_MODE_ICONS[activeItinerary.travelMode] as React.ReactElement}
                label={totalDuration}
                color="primary"
              />
              <Typography variant="body2" color="text.secondary">
                {totalDistance} total
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {routeError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {routeError}
        </Alert>
      )}

      {/* Optimize button */}
      {places.length >= 2 && (
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={optimizing ? <CircularProgress size={20} color="inherit" /> : <RouteIcon />}
          onClick={handleOptimize}
          disabled={optimizing}
          sx={{ mt: 2 }}
        >
          {optimizing ? 'Optimizing...' : 'Optimize Route'}
        </Button>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Itinerary</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Itinerary Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Dialog */}
      <Dialog
        open={loadDialogOpen}
        onClose={() => setLoadDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Saved Itineraries</DialogTitle>
        <DialogContent>
          {savedItineraries.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No saved itineraries yet.
            </Typography>
          ) : (
            <List>
              {savedItineraries.map((it) => (
                <ListItem
                  key={it.id}
                  component="div"
                  onClick={() => {
                    loadItinerary(it);
                    setLoadDialogOpen(false);
                    setRouteLegs([]);
                  }}
                  sx={{ cursor: 'pointer', borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <ListItemText
                    primary={it.name}
                    secondary={`${it.places.length} places · ${new Date(it.updatedAt).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSavedItinerary(it.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
