import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Edit } from 'lucide-react';
import ChangeDisplayNameDialog from './ChangeDisplayNameDialog';
import type { InternalUserProfile } from '../../backend';

interface ProfileMenuProps {
  currentUser: InternalUserProfile;
}

export default function ProfileMenu({ currentUser }: ProfileMenuProps) {
  const [showChangeNameDialog, setShowChangeNameDialog] = useState(false);

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
            <Avatar className="h-10 w-10 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{currentUser.displayName}</p>
              <p className="text-xs text-muted-foreground">Your Profile</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowChangeNameDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Change Display Name
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangeDisplayNameDialog
        open={showChangeNameDialog}
        onOpenChange={setShowChangeNameDialog}
        currentName={currentUser.displayName}
      />
    </>
  );
}
