import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Dashboard,
  DirectionsCar,
  EventNote,
  LocalParking,
  Logout,
  Payments,
  Security,
} from '@mui/icons-material';
import { ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getRoleHomePath } from '../../lib/routes';
import { useAuth } from '../../providers/AuthProvider';
import { Role } from '../../types/auth';

const drawerWidth = 260;

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    label: 'Admin Dashboard',
    to: '/admin/dashboard',
    icon: <Dashboard />,
    roles: ['ADMIN'],
  },
  {
    label: 'Security Dashboard',
    to: '/security/dashboard',
    icon: <Security />,
    roles: ['SECURITY'],
  },
  {
    label: 'User Dashboard',
    to: '/user/dashboard',
    icon: <Dashboard />,
    roles: ['USER'],
  },
  {
    label: 'Parking Lots',
    to: '/parking-lots',
    icon: <LocalParking />,
    roles: ['ADMIN', 'SECURITY'],
  },
  {
    label: 'Vehicles',
    to: '/vehicles',
    icon: <DirectionsCar />,
    roles: ['ADMIN', 'USER'],
  },
  {
    label: 'Bookings',
    to: '/bookings',
    icon: <EventNote />,
    roles: ['ADMIN', 'SECURITY', 'USER'],
  },
  {
    label: 'Parking Events',
    to: '/parking-events',
    icon: <Payments />,
    roles: ['ADMIN', 'SECURITY', 'USER'],
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleGoHome = () => {
    if (user) {
      navigate(getRoleHomePath(user.role));
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">Smart Parking</Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.name} · {user?.role}
            </Typography>
          </Box>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<Logout />}
            variant="outlined"
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Toolbar
          component="button"
          onClick={handleGoHome}
          sx={{
            alignItems: 'flex-start',
            bgcolor: 'transparent',
            border: 0,
            cursor: 'pointer',
            flexDirection: 'column',
            font: 'inherit',
            py: 2,
            textAlign: 'left',
            width: '100%',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Typography variant="h6" component="span">
            Smart Parking
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            Management System
          </Typography>
        </Toolbar>
        <Divider />
        <List sx={{ px: 1 }}>
          {visibleNavItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              selected={location.pathname === item.to}
              to={item.to}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          px: 3,
          py: 3,
          mt: 9,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
