import { Palette } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getCurrentBranding, updateOrganizationBranding } from '../../api/organizationsApi';
import { AppLogo } from '../../components/common/AppLogo';
import { AppSnackbar } from '../../components/common/AppSnackbar';
import { PageHeader } from '../../components/common/PageHeader';
import { useAppSnackbar } from '../../hooks/useAppSnackbar';
import { getApiErrorMessage } from '../../lib/apiError';
import { getRoleHomePath } from '../../lib/routes';
import { validateBrandingForm } from '../../lib/validateBranding';
import { useAuth } from '../../providers/AuthProvider';
import { useTenantBranding } from '../../providers/TenantBrandingProvider';
import { UpdateTenantBrandingPayload } from '../../types/branding';

const emptyForm: UpdateTenantBrandingPayload = {
  logoUrl: '',
  primaryColor: '',
  secondaryColor: '',
  accentColor: '',
  loginTitle: '',
  supportEmail: '',
};

function toFormValues(
  branding: Awaited<ReturnType<typeof getCurrentBranding>>,
): UpdateTenantBrandingPayload {
  return {
    logoUrl: branding.logoUrl ?? '',
    primaryColor: branding.primaryColor ?? '',
    secondaryColor: branding.secondaryColor ?? '',
    accentColor: branding.accentColor ?? '',
    loginTitle: branding.loginTitle ?? '',
    supportEmail: branding.supportEmail ?? '',
  };
}

export function BrandingSettingsPage() {
  const { user, organizationId } = useAuth();
  const { refreshBranding } = useTenantBranding();
  const queryClient = useQueryClient();
  const { closeSnackbar, showError, showSuccess, snackbar } = useAppSnackbar();
  const [form, setForm] = useState<UpdateTenantBrandingPayload>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof UpdateTenantBrandingPayload, string>>
  >({});

  const brandingQuery = useQuery({
    queryKey: ['branding', 'settings', organizationId],
    queryFn: getCurrentBranding,
    enabled: organizationId != null,
  });

  useEffect(() => {
    if (brandingQuery.data) {
      setForm(toFormValues(brandingQuery.data));
    }
  }, [brandingQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateOrganizationBranding,
    onSuccess: async (data) => {
      queryClient.setQueryData(['branding', 'current', organizationId], data);
      queryClient.setQueryData(['branding', 'settings', organizationId], data);
      setForm(toFormValues(data));
      await refreshBranding();
      showSuccess('Branding settings saved.');
    },
    onError: (error) => {
      showError(getApiErrorMessage(error, 'Unable to save branding settings.'));
    },
  });

  const previewBranding = useMemo(
    () => ({
      name: brandingQuery.data?.name ?? 'Organization',
      logoUrl: form.logoUrl || null,
      loginTitle: form.loginTitle || null,
    }),
    [brandingQuery.data?.name, form.loginTitle, form.logoUrl],
  );

  if (organizationId == null) {
    return (
      <Box>
        <PageHeader title="Branding Settings" />
        <Alert severity="warning" sx={{ mb: 2 }}>
          Organization context is required to manage branding settings.
        </Alert>
        {user ? (
          <Button component={RouterLink} to={getRoleHomePath(user.role)} variant="contained">
            Go to dashboard
          </Button>
        ) : null}
      </Box>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateBrandingForm(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload: UpdateTenantBrandingPayload = {
      logoUrl: form.logoUrl?.trim() || null,
      primaryColor: form.primaryColor?.trim() || null,
      secondaryColor: form.secondaryColor?.trim() || null,
      accentColor: form.accentColor?.trim() || null,
      loginTitle: form.loginTitle?.trim() || null,
      supportEmail: form.supportEmail?.trim() || null,
    };

    saveMutation.mutate(payload);
  };

  const updateField = (field: keyof UpdateTenantBrandingPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  if (brandingQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (brandingQuery.isError) {
    return (
      <Box>
        <PageHeader title="Branding Settings" />
        <Alert severity="error">Unable to load branding settings.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        description="Customize logo, colors, and login text for your organization."
        title="Branding Settings"
      />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.4fr) minmax(280px, 0.8fr)' },
        }}
      >
        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack component="form" noValidate onSubmit={handleSubmit} spacing={2.5}>
            <TextField
              error={Boolean(fieldErrors.logoUrl)}
              fullWidth
              helperText={fieldErrors.logoUrl ?? 'Use a public HTTPS image URL'}
              label="Logo URL"
              onChange={(event) => updateField('logoUrl', event.target.value)}
              value={form.logoUrl ?? ''}
            />
            <TextField
              error={Boolean(fieldErrors.primaryColor)}
              fullWidth
              helperText={fieldErrors.primaryColor ?? 'Example: #1565C0'}
              label="Primary color"
              onChange={(event) => updateField('primaryColor', event.target.value)}
              value={form.primaryColor ?? ''}
            />
            <TextField
              error={Boolean(fieldErrors.secondaryColor)}
              fullWidth
              helperText={fieldErrors.secondaryColor ?? 'Example: #F9A825'}
              label="Secondary color"
              onChange={(event) => updateField('secondaryColor', event.target.value)}
              value={form.secondaryColor ?? ''}
            />
            <TextField
              error={Boolean(fieldErrors.accentColor)}
              fullWidth
              helperText={fieldErrors.accentColor ?? 'Example: #0288D1'}
              label="Accent color"
              onChange={(event) => updateField('accentColor', event.target.value)}
              value={form.accentColor ?? ''}
            />
            <TextField
              error={Boolean(fieldErrors.loginTitle)}
              fullWidth
              helperText={fieldErrors.loginTitle ?? 'Shown on the branded login page'}
              label="Login title"
              onChange={(event) => updateField('loginTitle', event.target.value)}
              value={form.loginTitle ?? ''}
            />
            <TextField
              error={Boolean(fieldErrors.supportEmail)}
              fullWidth
              helperText={fieldErrors.supportEmail ?? 'Optional footer contact on login'}
              label="Support email"
              onChange={(event) => updateField('supportEmail', event.target.value)}
              type="email"
              value={form.supportEmail ?? ''}
            />
            <Box>
              <Button
                disabled={saveMutation.isPending}
                startIcon={<Palette />}
                type="submit"
                variant="contained"
              >
                Save branding
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            <Typography variant="h6">Preview</Typography>
            <AppLogo
              logoUrl={previewBranding.logoUrl}
              name={previewBranding.name}
            />
            <Typography color="text.secondary" variant="body2">
              Login title: {previewBranding.loginTitle || 'Sign in'}
            </Typography>
            {form.primaryColor ? (
              <Stack direction="row" spacing={1}>
                <Box
                  sx={{
                    bgcolor: form.primaryColor,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    height: 28,
                    width: 28,
                  }}
                />
                <Typography variant="body2">{form.primaryColor}</Typography>
              </Stack>
            ) : null}
          </Stack>
        </Paper>
      </Box>

      <AppSnackbar onClose={closeSnackbar} snackbar={snackbar} />
    </Box>
  );
}