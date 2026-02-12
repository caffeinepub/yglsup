import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Mic, MicOff, Video } from 'lucide-react';
import { useCall } from './CallProvider';

export default function CallChip() {
  const { activeCall, isMinimized, isMuted, restoreCall, endCall, toggleMute } = useCall();

  if (!activeCall || !isMinimized) return null;

  const isVideoCall = activeCall.kind === 'video';

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

  const handleEndCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    endCall();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden min-w-[280px]">
        <div
          className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={restoreCall}
        >
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10 border-2 border-emerald-500/50">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold">
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

        <div className="flex items-center gap-2 px-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
            onClick={handleToggleMute}
          >
            {isMuted ? <MicOff className="h-4 w-4 mr-1.5" /> : <Mic className="h-4 w-4 mr-1.5" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>

          <Button
            size="sm"
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            onClick={handleEndCall}
          >
            <Phone className="h-4 w-4 mr-1.5 rotate-135" />
            End
          </Button>
        </div>
      </div>
    </div>
  );
}
