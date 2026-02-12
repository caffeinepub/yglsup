import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { CallStatus } from '../../backend';

interface CallDiagnosticsProps {
  peerName: string;
  direction: 'outgoing' | 'incoming';
  status: CallStatus;
  hasCallId: boolean;
  signalingError: string | null;
}

export default function CallDiagnostics({
  peerName,
  direction,
  status,
  hasCallId,
  signalingError,
}: CallDiagnosticsProps) {
  const getStatusColor = (status: CallStatus) => {
    switch (status) {
      case CallStatus.initiated:
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case CallStatus.ringing:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case CallStatus.inProgress:
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case CallStatus.ended:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      case CallStatus.missed:
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: CallStatus) => {
    switch (status) {
      case CallStatus.initiated:
        return 'Initiated';
      case CallStatus.ringing:
        return 'Ringing';
      case CallStatus.inProgress:
        return 'In Progress';
      case CallStatus.ended:
        return 'Ended';
      case CallStatus.missed:
        return 'Missed';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card className="absolute top-16 right-4 w-80 bg-gray-800/95 backdrop-blur border-gray-700 text-white shadow-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Call Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Peer Name */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Peer:</span>
          <span className="font-medium">{peerName}</span>
        </div>

        {/* Direction */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Direction:</span>
          <div className="flex items-center gap-1.5">
            {direction === 'outgoing' ? (
              <>
                <PhoneOutgoing className="h-3.5 w-3.5 text-blue-400" />
                <span className="font-medium">Outgoing</span>
              </>
            ) : (
              <>
                <PhoneIncoming className="h-3.5 w-3.5 text-green-400" />
                <span className="font-medium">Incoming</span>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status:</span>
          <Badge variant="outline" className={getStatusColor(status)}>
            {getStatusLabel(status)}
          </Badge>
        </div>

        {/* Call ID Assigned */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Call ID:</span>
          <div className="flex items-center gap-1.5">
            {hasCallId ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                <span className="font-medium text-green-400">Assigned</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-yellow-400" />
                <span className="font-medium text-yellow-400">Pending</span>
              </>
            )}
          </div>
        </div>

        {/* Signaling Error */}
        {signalingError && (
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-red-400 font-medium mb-1">Signaling Error</div>
                <div className="text-xs text-gray-400 leading-relaxed">{signalingError}</div>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
          Diagnostics help identify connection issues during call setup.
        </div>
      </CardContent>
    </Card>
  );
}
