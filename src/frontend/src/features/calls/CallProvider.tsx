import { createContext, useContext, useState, ReactNode } from 'react';
import type { Principal } from '@icp-sdk/core/principal';
import type { CallKind } from '../../backend';

interface CallSession {
  callId: string;
  kind: CallKind;
  peerId: Principal;
  peerName: string;
}

interface CallContextValue {
  activeCall: CallSession | null;
  isMinimized: boolean;
  isMuted: boolean;
  startCall: (peerId: Principal, peerName: string, kind: CallKind, callId: string) => void;
  endCall: () => void;
  minimizeCall: () => void;
  restoreCall: () => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
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

  const startCall = (peerId: Principal, peerName: string, kind: CallKind, callId: string) => {
    setActiveCall({ callId, kind, peerId, peerName });
    setIsMinimized(false);
    setIsMuted(false);
  };

  const endCall = () => {
    setActiveCall(null);
    setIsMinimized(false);
    setIsMuted(false);
  };

  const minimizeCall = () => {
    setIsMinimized(true);
  };

  const restoreCall = () => {
    setIsMinimized(false);
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const setMutedValue = (muted: boolean) => {
    setIsMuted(muted);
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        isMinimized,
        isMuted,
        startCall,
        endCall,
        minimizeCall,
        restoreCall,
        toggleMute,
        setMuted: setMutedValue,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
