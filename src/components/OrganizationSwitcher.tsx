import { Building2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/components/OrganizationProvider";
import { useSidebar } from "@/components/ui/sidebar";

export function OrganizationSwitcher() {
  const { organizations, currentOrganization, switchOrganization, loading } = useOrganization();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  if (loading || !currentOrganization) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-between border-sidebar-border hover:bg-sidebar-accent/60 ${
            collapsed ? 'w-10 h-10 p-0' : 'w-full h-10'
          }`}
        >
          <div className="flex items-center space-x-2 min-w-0">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="text-sm truncate">
                  {currentOrganization.role === 'owner' 
                    ? currentOrganization.name 
                    : currentOrganization.owner_email || currentOrganization.name}
                </span>
                <Badge 
                  variant={currentOrganization.role === 'owner' ? 'default' : 'secondary'} 
                  className="text-xs px-1 py-0"
                >
                  {currentOrganization.role === 'owner' ? 'Owner' : currentOrganization.role === 'admin' ? 'Admin' : 'Viewer'}
                </Badge>
              </>
            )}
          </div>
          {!collapsed && <ChevronDown className="h-4 w-4 ml-auto flex-shrink-0" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 bg-background border shadow-lg z-50" 
        align="start"
        sideOffset={4}
      >
        <Command className="bg-background">
          <CommandList className="bg-background">
            <CommandEmpty className="py-6 text-center text-muted-foreground">
              No organizations found.
            </CommandEmpty>
            <CommandGroup heading="Organizations" className="bg-background">
              {organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  onSelect={() => switchOrganization(org.id)}
                  className="cursor-pointer bg-background hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {org.role === 'owner' 
                            ? org.name 
                            : org.owner_email || org.name}
                        </span>
                        {org.role !== 'owner' && org.owner_email && !org.name.toLowerCase().includes('personal') && (
                          <span className="text-xs text-muted-foreground">
                            {org.name}
                          </span>
                        )}
                         <div className="flex items-center space-x-1 mt-1">
                           <Badge 
                             variant={org.role === 'owner' ? 'default' : 'secondary'} 
                             className="text-xs px-1 py-0"
                           >
                             {org.role === 'owner' ? 'Owner' : org.role === 'admin' ? 'Admin' : 'Viewer'}
                           </Badge>
                        </div>
                      </div>
                    </div>
                    {currentOrganization.id === org.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}