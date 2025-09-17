import { useMemo } from 'react';
import { useOrganization } from '@/components/OrganizationProvider';

export interface Permissions {
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canViewSettings: boolean;
  canManageTeam: boolean;
  canSchedule: boolean;
}

export function usePermissions(): Permissions {
  const { currentOrganization } = useOrganization();

  return useMemo(() => {
    if (!currentOrganization) {
      return {
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canViewSettings: false,
        canManageTeam: false,
        canSchedule: false,
      };
    }

    // Owner has all permissions
    if (currentOrganization.role === 'owner') {
      return {
        canEdit: true,
        canCreate: true,
        canDelete: true,
        canViewSettings: true,
        canManageTeam: true,
        canSchedule: true,
      };
    }

    // Admin has most permissions but cannot manage team or view settings
    if (currentOrganization.role === 'admin') {
      return {
        canEdit: true,
        canCreate: true,
        canDelete: true,
        canViewSettings: false,
        canManageTeam: true, // Admins can manage team
        canSchedule: true,
      };
    }

    // Viewer has limited permissions
    return {
      canEdit: false,
      canCreate: false,
      canDelete: false,
      canViewSettings: false,
      canManageTeam: false,
      canSchedule: false, // Viewers can only view calendar, not schedule
    };
  }, [currentOrganization]);
}