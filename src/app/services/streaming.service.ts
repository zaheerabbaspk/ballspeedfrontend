import { Injectable } from '@angular/core';
import { SignalingService } from './signaling.service';
import { Subject } from 'rxjs';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class StreamingService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  public remoteStream$ = new Subject<{ peerId: string, stream: MediaStream }>();
  public connectionState$ = new Subject<{ peerId: string, state: string }>();
  private currentRoomId: string | null = null;
  private localStream: MediaStream | null = null;
  private candidateQueue: Map<string, RTCIceCandidateInit[]> = new Map();

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  constructor(
    private signaling: SignalingService
  ) {}

  private async sendSignal(toPeerId: string, type: string, data: any) {
    this.signaling.sendSignal(toPeerId, type, data);
  }

  async init(roomId: string, customPeerId?: string) {
    this.currentRoomId = roomId;
    console.log('[StreamingService] Initializing for room:', roomId, 'as:', customPeerId || 'RANDOM');
    
    // Join Signaling Room
    this.signaling.joinRoom(roomId, customPeerId).catch(err => {
      console.warn('[StreamingService] room join failed:', err);
    });

    const handleSignal = async (msg: any) => {
      const { from_peer_id, fromPeerId, type, data } = msg;
      const peerId = from_peer_id || fromPeerId;
      if (!peerId) return;

      console.log('[StreamingService] Received signal:', type, 'from:', peerId);

      switch (type) {
        case 'offer':
          await this.handleOffer(peerId, data);
          break;
        case 'answer':
          await this.handleAnswer(peerId, data);
          break;
        case 'candidate':
          await this.handleCandidate(peerId, data);
          break;
      }
    };

    // Make sure we don't subscribe multiple times
    this.signaling.message$.subscribe(handleSignal);
  }

    /**
   * Called by the CAMERA to start getting local media and send offer
   */
  async startProducing(targetPeerId: string = 'CONTROLLER', deviceId?: string) {
    try {
      // Request native permissions first if on mobile
      await this.requestNativePermissions();

      console.log('[StreamingService] Requesting local camera/mic...', deviceId ? `(Device: ${deviceId})` : '');
      
      // Let the browser handle natural orientation and rotation metadata natively!
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          deviceId: deviceId ? { exact: deviceId } : undefined,
          frameRate: { ideal: 30 },
          facingMode: deviceId ? undefined : { ideal: 'environment' }
        }, 
        audio: true 
      });

      console.log('[StreamingService] Creating offer to:', targetPeerId);
      const pc = this.createPeer(targetPeerId);
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await this.sendSignal(targetPeerId, 'offer', offer);

      console.log('[StreamingService] Local stream acquired and offer sent');
      return this.localStream;
    } catch (err) {
      console.error('[StreamingService] Error in startProducing:', err);
      throw err;
    }
  }

  stopProducing() {
    console.log('[StreamingService] Stopping local stream and destroying peers');
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
  }

  private async handleOffer(from: string, offer: RTCSessionDescriptionInit) {
    console.log('[StreamingService] Handling offer from:', from);
    const pc = this.createPeer(from);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Process queued candidates
    const queue = this.candidateQueue.get(from) || [];
    for (const cand of queue) {
      await pc.addIceCandidate(new RTCIceCandidate(cand));
    }
    this.candidateQueue.delete(from);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    await this.sendSignal(from, 'answer', answer);
  }

  private async handleAnswer(from: string, answer: RTCSessionDescriptionInit) {
    console.log('[StreamingService] Handling answer from:', from);
    const pc = this.peerConnections.get(from);
    if (pc && pc.signalingState === 'have-local-offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } else {
      console.warn(`[StreamingService] Ignored answer from ${from} because state is ${pc?.signalingState}`);
    }
  }

  private async handleCandidate(from: string, candidate: RTCIceCandidateInit) {
    console.log('[StreamingService] Handling ICE candidate from:', from);
    const pc = this.peerConnections.get(from);
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      console.log('[StreamingService] Queuing candidate for:', from);
      const queue = this.candidateQueue.get(from) || [];
      queue.push(candidate);
      this.candidateQueue.set(from, queue);
    }
  }

  private createPeer(peerId: string): RTCPeerConnection {
    // Cleanup existing connection for this peer
    const oldPc = this.peerConnections.get(peerId);
    if (oldPc) {
      console.log('[StreamingService] Closing old connection for:', peerId);
      oldPc.close();
    }

    console.log('[StreamingService] Creating RTCPeerConnection for:', peerId);
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, 'candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      console.log('[StreamingService] Got remote track from:', peerId);
      if (event.streams && event.streams[0]) {
        this.remoteStream$.next({ peerId, stream: event.streams[0] });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[StreamingService] ${peerId} state: ${pc.connectionState}`);
      this.connectionState$.next({ peerId, state: pc.connectionState });
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.peerConnections.delete(peerId);
      }
    };

    return pc;
  }

  getPeerId() { return this.signaling.getPeerId(); }

  private async requestNativePermissions() {
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Camera.requestPermissions();
        console.log('[StreamingService] Native Permissions:', permissions);
        if (permissions.camera !== 'granted') {
          throw new Error('Camera permission not granted on device.');
        }
      } catch (err) {
        console.error('[StreamingService] Native Permission Error:', err);
        throw err;
      }
    }
  }
}
