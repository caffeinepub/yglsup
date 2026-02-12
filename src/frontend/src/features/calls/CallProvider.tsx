import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Principal } from '@icp-sdk/core/principal';
import { CallStatus } from '../../backend';

type CallKind = 'voice' | 'video';

type CallDirection = 'outgoing' | 'incoming';

interface CallSession {
  callId: string;
  kind: CallKind;
  peerId: Principal;
  peerName: string;
  direction: CallDirection;
  status: CallStatus;
}

interface CallContextValue {
  activeCall: CallSession | null;
  isMinimized: boolean;
  isMuted: boolean;
  peerConnection: RTCPeerConnection | null;
  startCall: (peerId: Principal, peerName: string, kind: CallKind, callId: string) => void;
  receiveCall: (peerId: Principal, peerName: string, kind: CallKind, callId: string) => void;
  endCall: () => void;
  minimizeCall: () => void;
  restoreCall: () => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  updateCallStatus: (status: CallStatus) => void;
  updateCallId: (callId: string) => void;
  setPeerConnection: (pc: RTCPeerConnection | null) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
}

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [peerConnection, setPeerConnectionState] = useState<RTCPeerConnection | null>(null);

  const startCall = (peerId: Principal, peerName: string, kind: CallKind, callId: string) => {
    // End any existing call first to ensure clean state
    if (activeCall) {
      cleanupCall();
    }
    // Start new outgoing call (callId may be empty initially)
    setActiveCall({ 
      callId, 
      kind, 
      peerId, 
      peerName, 
      direction: 'outgoing',
      status: CallStatus.initiated,
    });
    setIsMinimized(false);
    setIsMuted(false);
  };

  const receiveCall = (peerId: Principal, peerName: string, kind: CallKind, callId: string) => {
    // End any existing call first
    if (activeCall) {
      cleanupCall();
    }
    // Start new incoming call
    setActiveCall({ 
      callId, 
      kind, 
      peerId, 
      peerName, 
      direction: 'incoming',
      status: CallStatus.ringing,
    });
    setIsMinimized(false);
    setIsMuted(false);
  };

  const cleanupCall = () => {
    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
      setPeerConnectionState(null);
    }
  };

  const endCall = () => {
    cleanupCall();
    setActiveCall(null);
    setIsMinimized(false);
    setIsMuted(false);
  };

  const minimizeCall = () => {
    if (activeCall) {
      setIsMinimized(true);
    }
  };

  const restoreCall = () => {
    if (activeCall) {
      setIsMinimized(false);
    }
  };

  const toggleMute = () => {
    if (activeCall) {
      setIsMuted((prev) => !prev);
    }
  };

  const setMutedValue = (muted: boolean) => {
    if (activeCall) {
      setIsMuted(muted);
    }
  };

  const updateCallStatus = (status: CallStatus) => {
    if (activeCall) {
      setActiveCall({ ...activeCall, status });
    }
  };

  const updateCallId = (callId: string) => {
    if (activeCall) {
      setActiveCall({ ...activeCall, callId });
    }
  };

  const setPeerConnection = (pc: RTCPeerConnection | null) => {
    setPeerConnectionState(pc);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        isMinimized,
        isMuted,
        peerConnection,
        startCall,
        receiveCall,
        endCall,
        minimizeCall,
        restoreCall,
        toggleMute,
        setMuted: setMutedValue,
        updateCallStatus,
        updateCallId,
        setPeerConnection,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
