import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import MapIcon from '@mui/icons-material/Map';
import SettingsIcon from '@mui/icons-material/Settings';

const navItems = [
  { label: 'Explore', icon: <ExploreIcon />, path: '/' },
  { label: 'Itinerary', icon: <MapIcon />, path: '/itinerary' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentIndex = navItems.findIndex((item) => item.path === location.pathname);

  return (
    <Paper
      elevation={8}
      sx={{ position: 'sticky', bottom: 0, zIndex: 1200, borderRadius: 0 }}
    >
      <BottomNavigation
        showLabels
        value={currentIndex === -1 ? 0 : currentIndex}
        onChange={(_, newVal) => navigate(navItems[newVal].path)}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
