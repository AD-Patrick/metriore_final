import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Shield, Eye, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/components/OrganizationProvider";

interface TeamMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'viewer';
  status: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  invited_at: string;
  invited_by: string | null;
  joined_at: string | null;
}

export const TeamManager = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(true);
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  // TODO: maybe add bulk invite feature later
  console.log('TeamManager component loaded 👥');

  useEffect(() => {
    if (currentOrganization) {
      loadTeamMembers();
    }
  }, [currentOrganization]);

  // TODO: this function name is inconsistent with other components
  const loadTeamMembers = async () => {
    if (!currentOrganization) {
      console.log('No current organization available');
      return;
    }
    
    console.log('Loading team members for org:', currentOrganization.id, '👥');
    
    try {
      // Get team members first
      const { data: teamMembersData, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('account_id', currentOrganization.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get the account owner
      const { data: accountData } = await supabase
        .from('accounts')
        .select('user_id')
        .eq('id', currentOrganization.id)
        .single();

      const ownerUserId = accountData?.user_id;
      
      // Create a combined list including the owner
      let allMembers: any[] = [...(teamMembersData || [])];
      
      // Add owner if not already in team members
      if (ownerUserId && !allMembers.find(m => m.user_id === ownerUserId)) {
        allMembers.unshift({
          id: `owner-${ownerUserId}`,
          user_id: ownerUserId,
          account_id: currentOrganization.id,
          role: 'owner',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          invited_at: new Date().toISOString(),
          invited_by: null,
          joined_at: new Date().toISOString(),
        });
      }

      if (allMembers.length === 0) {
        setTeamMembers([]);
        return;
      }

      // Get profiles and emails for each member
      const membersWithProfiles = await Promise.all(
        allMembers.map(async (member) => {
          // Get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', member.user_id)
            .maybeSingle();

          // Try to get email from user lookup function
          let email = 'Unknown';
          try {
            const { data: userLookup } = await supabase.functions.invoke('user-lookup', {
              body: { user_id: member.user_id }
            });
            email = userLookup?.email || 'Unknown';
          } catch (lookupError) {
            console.warn('Could not fetch email for user:', member.user_id);
          }

          return {
            ...member,
            email,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null
          };
        })
      );

      console.log('Team members loaded:', membersWithProfiles);
      setTeamMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // TODO: add email validation here
  const handleInviteMember = async () => {
    // TODO: experimental feature - maybe add invite templates?
    // const inviteTemplates = ['default', 'custom', 'welcome'];
    if (!currentOrganization || !inviteEmail.trim()) return;

    try {
      // Use edge function to look up user by email
      const { data: lookupResult, error: lookupError } = await supabase.functions.invoke('user-lookup', {
        body: { email: inviteEmail.trim() }
      });

      if (lookupError) {
        console.error('Lookup error:', lookupError);
        toast({
          title: "Error",
          description: "Failed to look up user. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!lookupResult.exists) {
        toast({
          title: "User not found",
          description: "Please ask this person to create an account first, then try inviting them again.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already a team member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('account_id', currentOrganization.id)
        .eq('user_id', lookupResult.user_id)
        .maybeSingle();

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "This user is already a member of this organization.",
          variant: "destructive",
        });
        return;
      }

      // Add the user as a team member
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          account_id: currentOrganization.id,
          user_id: lookupResult.user_id,
          role: inviteRole,
          status: 'active',
          invited_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: `${inviteEmail} has been added to the team.`,
      });

      setInviteEmail("");
      await loadTeamMembers();
      
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite team member",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member removed",
      });

      await loadTeamMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' || role === 'owner' ? 'default' : 'secondary';
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' || role === 'owner' ? Shield : Eye;
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'viewer': return 'View Only';
      case 'owner': return 'Owner';
      default: return 'View Only';
    }
  };

  if (loading || !currentOrganization) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading team...</p>
        </div>
      </div>
    );
  }

  // Only owners and admins can manage team
  const canManageTeam = ['owner', 'admin'].includes(currentOrganization.role);

  return (
    <div className="space-y-6">
      {/* Invite New Member - Only show if user can manage team */}
      {canManageTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Invite Team Member</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(value: 'admin' | 'viewer') => setInviteRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">View Only</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleInviteMember} disabled={!inviteEmail.trim()}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Only users with existing accounts can be invited. Admin users have full access, while view-only users can see all data but cannot make changes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Team Members ({teamMembers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {canManageTeam ? "No team members yet. Invite someone to get started!" : "No team members to display."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const RoleIcon = getRoleIcon(member.role);
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                        <RoleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.full_name || member.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(member.invited_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {getRoleDisplayName(member.role)}
                      </Badge>
                      {member.role !== 'owner' && canManageTeam && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};