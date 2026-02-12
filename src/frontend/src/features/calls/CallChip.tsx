import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Mic, MicOff, Video } from 'lucide-react';
import { useCall } from './CallProvider';
import { useUpdateCallStatus } from '../../hooks/useQueries';
import { CallStatus } from '../../backend';
import { toast } from 'sonner';

export default function CallChip() {
  const { activeCall, isMinimized, isMuted, restoreCall, endCall, toggleMute } = useCall();
  const updateCallStatusMutation = useUpdateCallStatus();

  if (!activeCall || !isMinimized) return null;

  const isVideoCall = activeCall.kind === 'video';
  const hasCallId = activeCall.callId && activeCall.callId !== '';

  const peerInitials = activeCall.peerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
  };

  const handleEndCall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeCall && hasCallId) {
      try {
        await updateCallStatusMutation.mutateAsync({
          callId: activeCall.callId,
          status: CallStatus.ended,
        });
      } catch (error: any) {
        console.error('Failed to update call status:', error);
        toast.error('Failed to end call on server');
      }
    }
    endCall();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 animate-in slide-in-from-bottom-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden min-w-[260px]">
        <div
          className="p-3 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={restoreCall}
        >
          <div className="flex items-center gap-2.5 mb-2.5">
            <Avatar className="h-9 w-9 border-2 border-emerald-500/50">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold text-sm">
                {peerInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{activeCall.peerName}</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                {isVideoCall ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                <span>{isVideoCall ? 'Video call' : 'Voice call'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 pb-3">
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 h-8 text-xs ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
            onClick={handleToggleMute}
          >
            {isMuted ? <MicOff className="h-3.5 w-3.5 mr-1" /> : <Mic className="h-3.5 w-3.5 mr-1" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>

          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white"
            onClick={handleEndCall}
          >
            <Phone className="h-3.5 w-3.5 mr-1 rotate-135" />
            End
          </Button>
        </div>
      </div>
    </div>
  );
}
