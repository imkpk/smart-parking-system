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
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Analytics,
  CalendarMonth,
  Dashboard,
  DirectionsCar,
  LocalParking,
  Logout,
  Menu,
  MenuOpen,
  Security,
  SensorOccupied,
  SvgIconComponent,
} from '@mui/icons-material';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppLogo } from '../common/AppLogo';
import { ThemeModeToggle } from '../common/ThemeModeToggle';
import { formatRole } from '../../lib/formatRole';
import { useAuth } from '../../providers/AuthProvider';
import { Role } from '../../types/auth';

const drawerWidth = 260;
const collapsedDrawerWidth = 80;

interface NavItem {
  label: string;
  to: string;
  icon: SvgIconComponent;
  matchPrefix?: boolean;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    label: 'Admin Dashboard',
    to: '/admin/dashboard',
    icon: Analytics,
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN'],
  },
  {
    label: 'Security Dashboard',
    to: '/security/dashboard',
    icon: Security,
    roles: ['SECURITY'],
  },
  {
    label: 'User Dashboard',
    to: '/user/dashboard',
    icon: Dashboard,
    roles: ['USER'],
  },
  {
    label: 'Parking Lots',
    to: '/parking-lots',
    icon: LocalParking,
    matchPrefix: true,
    roles: ['TENANT_ADMIN', 'ADMIN'],
  },
  {
    label: 'Vehicles',
    to: '/vehicles',
    icon: DirectionsCar,
    roles: ['TENANT_ADMIN', 'ADMIN', 'USER'],
  },
  {
    label: 'Bookings',
    to: '/bookings',
    icon: CalendarMonth,
    roles: ['TENANT_ADMIN', 'ADMIN', 'SECURITY', 'USER'],
  },
  {
    label: 'Parking Events',
    to: '/parking-events',
    icon: SensorOccupied,
    roles: ['TENANT_ADMIN', 'ADMIN', 'SECURITY', 'USER'],
  },
  {
    label: 'Payments',
    to: '/payments',
    icon: AccountBalanceWallet,
    roles: ['TENANT_ADMIN', 'ADMIN', 'SECURITY', 'USER'],
  },
];

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.matchPrefix) {
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  }

  return pathname === item.to;
}

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
        disableGutters
        sx={{
          minHeight: { xs: 64, sm: 72 },
          px: shouldShowExpandedDrawer ? 1.5 : 1,
          py: 1.5,
          width: '100%',
        }}
      >
        {shouldShowExpandedDrawer ? (
          <Stack
            alignItems="center"
            direction="row"
            spacing={0.5}
            sx={{ minWidth: 0, width: '100%' }}
          >
            <Box minWidth={0} sx={{ flex: 1, overflow: 'hidden' }}>
              <AppLogo showText />
            </Box>
            {!isMobile ? (
              <Tooltip title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
                <IconButton
                  aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                  onClick={toggleSidebar}
                  size="small"
                  sx={{ flexShrink: 0 }}
                >
                  {isSidebarOpen ? <MenuOpen /> : <Menu />}
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={0.75} sx={{ width: '100%' }}>
            <AppLogo showText={false} />
            {!isMobile ? (
              <Tooltip title="Expand sidebar">
                <IconButton
                  aria-label="Expand sidebar"
                  onClick={toggleSidebar}
                  size="small"
                >
                  <Menu />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ px: 1 }}>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavItemActive(location.pathname, item);

          return (
            <Tooltip
              disableHoverListener={shouldShowExpandedDrawer}
              key={item.to}
              placement="right"
              title={item.label}
            >
              <ListItemButton
                component={NavLink}
                onClick={closeMobileDrawer}
                selected={isActive}
                to={item.to}
                sx={{
                  borderRadius: 1,
                  justifyContent: shouldShowExpandedDrawer ? 'flex-start' : 'center',
                  mb: 0.5,
                  minHeight: 48,
                  overflow: 'hidden',
                  px: shouldShowExpandedDrawer ? 1.5 : 0.75,
                  '& .MuiListItemIcon-root': {
                    color: isActive ? 'primary.main' : 'text.secondary',
                    justifyContent: 'center',
                    minWidth: shouldShowExpandedDrawer ? 36 : 0,
                    mr: shouldShowExpandedDrawer ? 1 : 0,
                  },
                  '& .MuiListItemText-root': {
                    m: 0,
                    overflow: 'hidden',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                    '& .MuiListItemText-primary': {
                      color: 'primary.main',
                      fontWeight: 600,
                    },
                  },
                }}
              >
                <ListItemIcon>
                  <Icon fontSize="small" />
                </ListItemIcon>
                {shouldShowExpandedDrawer ? <ListItemText primary={item.label} /> : null}
              </ListItemButton>
            </Tooltip>
          );
        })}
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
            {isMobile ? (
            <Tooltip title="Open navigation">
              <IconButton
                aria-label="Open navigation"
                color="inherit"
                onClick={toggleSidebar}
              >
                <Menu />
              </IconButton>
            </Tooltip>
            ) : null}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                noWrap
                sx={{ fontWeight: 600, lineHeight: 1.25 }}
                variant="subtitle2"
              >
                {user?.name}
              </Typography>
              <Typography color="text.secondary" noWrap variant="caption">
                {formatRole(user?.role)}
              </Typography>
            </Box>
          </Box>
          <Stack alignItems="center" direction="row" spacing={1}>
            <ThemeModeToggle />
            <Button
              color="inherit"
              onClick={handleLogout}
              size={isMobile ? 'small' : 'medium'}
              startIcon={isMobile ? undefined : <Logout />}
              variant="outlined"
            >
              {isMobile ? <Logout /> : 'Logout'}
            </Button>
          </Stack>
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
