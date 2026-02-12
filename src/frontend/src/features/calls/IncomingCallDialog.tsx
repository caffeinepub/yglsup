import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { CallKind } from '../../backend';

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  callKind: CallKind;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallDialog({
  open,
  callerName,
  callKind,
  onAccept,
  onDecline,
}: IncomingCallDialogProps) {
  const callerInitials = callerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isVideo = callKind === CallKind.video;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <Avatar className="h-24 w-24 border-4 border-emerald-500/30">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-3xl font-bold">
                {callerInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <AlertDialogTitle className="text-2xl mb-2">{callerName}</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Incoming {isVideo ? 'video' : 'voice'} call...
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-4 sm:gap-4">
          <Button
            onClick={onDecline}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white h-14"
            size="lg"
          >
            <PhoneOff className="mr-2 h-5 w-5" />
            Decline
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-14"
            size="lg"
          >
            {isVideo ? <Video className="mr-2 h-5 w-5" /> : <Phone className="mr-2 h-5 w-5" />}
            Accept
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
