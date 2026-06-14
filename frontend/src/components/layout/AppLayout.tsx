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
  useMediaQuery,
  useTheme,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const activeDrawerWidth = isMobile
    ? 0
    : isSidebarOpen
      ? drawerWidth
      : collapsedDrawerWidth;
  const shouldShowExpandedDrawer = isMobile || isSidebarOpen;

  const visibleNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileDrawerOpen((current) => !current);
      return;
    }

    setIsSidebarOpen((current) => !current);
  };

  const closeMobileDrawer = () => {
    if (isMobile) {
      setIsMobileDrawerOpen(false);
    }
  };

  const drawerContent = (
    <>
      <Toolbar
        sx={{
          alignItems: 'flex-start',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          py: 2,
          textAlign: 'left',
          width: '100%',
        }}
      >
        {shouldShowExpandedDrawer ? (
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
            disableHoverListener={shouldShowExpandedDrawer}
            key={item.to}
            placement="right"
            title={item.label}
          >
            <ListItemButton
              component={NavLink}
              onClick={closeMobileDrawer}
              selected={location.pathname === item.to}
              to={item.to}
              sx={{
                borderRadius: 1,
                justifyContent: shouldShowExpandedDrawer ? 'flex-start' : 'center',
                mb: 0.5,
                minHeight: 48,
                px: shouldShowExpandedDrawer ? 2 : 1.5,
              }}
            >
              <ListItemIcon
                sx={{
                  justifyContent: 'center',
                  minWidth: shouldShowExpandedDrawer ? 56 : 0,
                }}
              >
                {item.icon}
              </ListItemIcon>
              {shouldShowExpandedDrawer ? <ListItemText primary={item.label} /> : null}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </>
  );

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
          zIndex: (theme) => theme.zIndex.drawer + 2,
          transition: (theme) =>
            theme.transitions.create(['margin-left', 'width'], {
              duration: theme.transitions.duration.shortest,
            }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 64, sm: 72 } }}>
          <Box alignItems="center" display="flex" gap={1.5}>
            <Tooltip
              title={
                isMobile
                  ? 'Open navigation'
                  : isSidebarOpen
                    ? 'Collapse sidebar'
                    : 'Expand sidebar'
              }
            >
              <IconButton
                aria-label={
                  isMobile
                    ? 'Open navigation'
                    : isSidebarOpen
                      ? 'Collapse sidebar'
                      : 'Expand sidebar'
                }
                color="inherit"
                onClick={toggleSidebar}
              >
                {!isMobile && isSidebarOpen ? <MenuOpen /> : <Menu />}
              </IconButton>
            </Tooltip>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ lineHeight: 1.15 }} variant="h6">
                Smart Parking
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name} · {user?.role}
              </Typography>
            </Box>
          </Box>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={isMobile ? undefined : <Logout />}
            variant="outlined"
            sx={{ minWidth: isMobile ? 44 : undefined, px: isMobile ? 1.25 : undefined }}
          >
            {isMobile ? <Logout /> : 'Logout'}
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        onClose={closeMobileDrawer}
        open={isMobileDrawerOpen}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          zIndex: (theme) => theme.zIndex.drawer + 1,
          '& .MuiDrawer-paper': {
            borderRight: '1px solid',
            borderColor: 'divider',
            height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' },
            top: { xs: 56, sm: 64 },
            width: drawerWidth,
          },
          '& .MuiBackdrop-root': {
            top: { xs: 56, sm: 64 },
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        anchor="left"
        open
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
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
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          px: { xs: 2, sm: 3, lg: 4 },
          py: { xs: 2, sm: 3 },
          mt: { xs: 8, sm: 9 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
