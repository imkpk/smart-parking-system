import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Dashboard,
  DirectionsCar,
  EventNote,
  LocalParking,
  Logout,
  Menu,
  MenuOpen,
  Payments,
  Security,
} from '@mui/icons-material';
import { ReactNode, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getRoleHomePath } from '../../lib/routes';
import { useAuth } from '../../providers/AuthProvider';
import { Role } from '../../types/auth';

const drawerWidth = 260;
const collapsedDrawerWidth = 76;

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
    roles: ['ADMIN'],
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const activeDrawerWidth = isSidebarOpen ? drawerWidth : collapsedDrawerWidth;

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

  const toggleSidebar = () => {
    setIsSidebarOpen((current) => !current);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: `calc(100% - ${activeDrawerWidth}px)`,
          ml: `${activeDrawerWidth}px`,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          transition: (theme) =>
            theme.transitions.create(['margin-left', 'width'], {
              duration: theme.transitions.duration.shortest,
            }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box alignItems="center" display="flex" gap={1.5}>
            <Tooltip title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
              <IconButton
                aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                color="inherit"
                onClick={toggleSidebar}
              >
                {isSidebarOpen ? <MenuOpen /> : <Menu />}
              </IconButton>
            </Tooltip>
            <Box>
              <Typography variant="h6">Smart Parking</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.name} · {user?.role}
              </Typography>
            </Box>
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
          width: activeDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            overflowX: 'hidden',
            width: activeDrawerWidth,
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: (theme) =>
              theme.transitions.create('width', {
                duration: theme.transitions.duration.shortest,
              }),
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
          {isSidebarOpen ? (
            <>
              <Typography variant="h6" component="span">
                Smart Parking
              </Typography>
              <Typography variant="body2" color="text.secondary" component="span">
                Management System
              </Typography>
            </>
          ) : (
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: 'primary.main',
                borderRadius: 1,
                color: 'primary.contrastText',
                display: 'flex',
                height: 40,
                justifyContent: 'center',
                width: 40,
              }}
            >
              <LocalParking />
            </Box>
          )}
        </Toolbar>
        <Divider />
        <List sx={{ px: 1 }}>
          {visibleNavItems.map((item) => (
            <Tooltip
              disableHoverListener={isSidebarOpen}
              key={item.to}
              placement="right"
              title={item.label}
            >
              <ListItemButton
                component={NavLink}
                selected={location.pathname === item.to}
                to={item.to}
                sx={{
                  borderRadius: 1,
                  justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                  mb: 0.5,
                  minHeight: 48,
                  px: isSidebarOpen ? 2 : 1.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    justifyContent: 'center',
                    minWidth: isSidebarOpen ? 56 : 0,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {isSidebarOpen ? <ListItemText primary={item.label} /> : null}
              </ListItemButton>
            </Tooltip>
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
