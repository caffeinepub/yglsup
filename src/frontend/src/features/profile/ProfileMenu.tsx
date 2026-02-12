import { useState } from 'react';
import { LogOut, User, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ChangeDisplayNameDialog from './ChangeDisplayNameDialog';
import { AppInfoHelpDialog } from './AppInfoHelpDialog';
import type { Principal } from '@icp-sdk/core/principal';

interface ProfileMenuProps {
  currentUser: {
    principal: Principal;
    displayName: string;
  };
  initDiagnostics?: {
    lastInitError?: string;
  };
}

export default function ProfileMenu({ currentUser, initDiagnostics }: ProfileMenuProps) {
  const [showChangeNameDialog, setShowChangeNameDialog] = useState(false);
  const [showAppInfoDialog, setShowAppInfoDialog] = useState(false);

  const initials = currentUser.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-emerald-600 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {currentUser.displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {currentUser.principal.toString().slice(0, 20)}...
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowChangeNameDialog(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>Change Display Name</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowAppInfoDialog(true)}>
            <Info className="mr-2 h-4 w-4" />
            <span>App Info & Help</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              // Clear all local data and reload
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangeDisplayNameDialog
        open={showChangeNameDialog}
        onOpenChange={setShowChangeNameDialog}
        currentName={currentUser.displayName}
      />

      <AppInfoHelpDialog
        open={showAppInfoDialog}
        onOpenChange={setShowAppInfoDialog}
        initDiagnostics={initDiagnostics}
      />
    </>
  );
}
