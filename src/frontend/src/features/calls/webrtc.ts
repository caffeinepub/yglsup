// WebRTC utility functions for peer-to-peer connections

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function createPeerConnection(): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  });

  // Log ICE connection state changes
  pc.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState);
  };

  return pc;
}

export async function createOffer(pc: RTCPeerConnection): Promise<string> {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await pc.setLocalDescription(offer);
  
  // Wait for ICE gathering to complete
  await waitForIceGathering(pc);
  
  return pc.localDescription!.sdp;
}

export async function createAnswer(pc: RTCPeerConnection, offerSdp: string): Promise<string> {
  await pc.setRemoteDescription({
    type: 'offer',
    sdp: offerSdp,
  });

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  
  // Wait for ICE gathering to complete
  await waitForIceGathering(pc);
  
  return pc.localDescription!.sdp;
}

export async function setRemoteAnswer(pc: RTCPeerConnection, answerSdp: string): Promise<void> {
  await pc.setRemoteDescription({
    type: 'answer',
    sdp: answerSdp,
  });
}

export async function setRemoteOffer(pc: RTCPeerConnection, offerSdp: string): Promise<void> {
  await pc.setRemoteDescription({
    type: 'offer',
    sdp: offerSdp,
  });
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };

    pc.addEventListener('icegatheringstatechange', checkState);

    // Timeout after 3 seconds
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', checkState);
      resolve();
    }, 3000);
  });
}

export function addLocalStream(pc: RTCPeerConnection, stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
  });
}

export function setupRemoteStream(
  pc: RTCPeerConnection,
  onRemoteStream: (stream: MediaStream) => void
): void {
  const remoteStream = new MediaStream();
  
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
    onRemoteStream(remoteStream);
  };
}
