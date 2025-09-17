import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface Organization {
  id: string;
  name: string;
  is_personal: boolean;
  role: 'owner' | 'admin' | 'viewer';
  owner_email?: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  switchOrganization: (orgId: string) => Promise<void>;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  console.log('OrgProvider loaded 🔧');
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false); // TODO: this is confusing naming
  const { user } = useAuth();

  // TODO: maybe cache this data better

  useEffect(() => {
    console.log('OrgProvider useEffect triggered, user:', user?.id);
    
    const loadOrganizations = async () => {
    if (!user) {
      console.log('No user available for loading organizations');
      return;
    }
    
    // TODO: add retry logic here maybe
    
    if (isLoading) {
      console.log('Already loading organizations, skipping duplicate call');
      return;
    }
    
    console.log('Loading organizations for user:', user.id);
    
    try {
      setIsLoading(true);
      setLoading(true);
      
      // Get user's own accounts (they are owners)
      const { data: ownAccounts, error: ownAccountsError } = await supabase
        .from('accounts')
        .select('id, name, is_personal')
        .eq('user_id', user.id);

      console.log('Own accounts query result:', { ownAccounts, ownAccountsError });

      if (ownAccountsError) throw ownAccountsError;

      // Get accounts where user is a team member with their roles and owner info
      const { data: teamMemberships, error: teamMembershipsError } = await supabase
        .from('team_members')
        .select(`
          role, 
          status,
          accounts!inner(
            id,
            name,
            is_personal,
            user_id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      console.log('Team memberships query result:', { teamMemberships, teamMembershipsError });

      if (teamMembershipsError) throw teamMembershipsError;

      // Get owner emails for accounts where user is a team member
      const ownerEmails: Record<string, string> = {};
      if (teamMemberships && teamMemberships.length > 0) {
        const ownerIds = [...new Set(teamMemberships.map(m => m.accounts.user_id))];
        
        // Get emails using the user-lookup function
        const emailPromises = ownerIds.map(async (ownerId) => {
          try {
            const { data: userLookup } = await supabase.functions.invoke('user-lookup', {
              body: { user_id: ownerId }
            });
            return { id: ownerId, email: userLookup?.email || 'Unknown' };
          } catch (lookupError) {
            console.warn('Could not fetch email for user:', ownerId);
            return { id: ownerId, email: 'Unknown' };
          }
        });
        
        const emailResults = await Promise.all(emailPromises);
        emailResults.forEach(({ id, email }) => {
          ownerEmails[id] = email;
        });
      }

      const orgs: Organization[] = [
        // User's own accounts (they are owners)
        ...(ownAccounts || []).map(account => ({
          id: account.id,
          name: account.name,
          is_personal: account.is_personal || false,
          role: 'owner' as const
        })),
        // Accounts where user is a team member
        ...(teamMemberships || []).map(membership => ({
          id: membership.accounts.id,
          name: membership.accounts.name,
          is_personal: membership.accounts.is_personal || false,
          role: membership.role as 'admin' | 'viewer',
          owner_email: ownerEmails[membership.accounts.user_id]
        }))
      ];

      // Remove duplicates (in case user is both owner and team member)
      const uniqueOrgs = orgs.filter((org, index, self) => 
        index === self.findIndex(o => o.id === org.id)
      ).sort((a, b) => {
        // Sort by: personal first, then by name
        if (a.is_personal && !b.is_personal) return -1;
        if (!a.is_personal && b.is_personal) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log('Final organizations list:', uniqueOrgs);
      setOrganizations(uniqueOrgs);

      // Set current organization
      if (uniqueOrgs.length > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_used_account_id')
          .eq('user_id', user.id)
          .single();

        let targetOrg = uniqueOrgs.find(org => org.id === profile?.last_used_account_id);
        if (!targetOrg) {
          // Default to personal account, then first available
          targetOrg = uniqueOrgs.find(org => org.is_personal) || uniqueOrgs[0];
        }

        setCurrentOrganization(targetOrg || null);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
    };

    if (user) {
      loadOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
    }

    return () => {
      console.log('OrganizationProvider useEffect cleanup');
    };
  }, [user]);

  const switchOrganization = async (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org || !user) return;

    setCurrentOrganization(org);

    // Update last used organization in profile
    try {
      await supabase
        .from('profiles')
        .update({ last_used_account_id: orgId })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating last used organization:', error);
    }
  };

  const value = {
    organizations,
    currentOrganization,
    switchOrganization,
    loading
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}