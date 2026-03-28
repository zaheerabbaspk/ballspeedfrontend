import { Injectable } from '@angular/core';
import { SignalingService } from './signaling.service';
import { Subject } from 'rxjs';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class StreamingService {
  private currentRoomId: string | null = null;
  private localStream: MediaStream | null = null;

  constructor(
    private signaling: SignalingService
  ) {}

  async init(roomId: string, customPeerId?: string) {
    this.currentRoomId = roomId;
    console.log('[StreamingService] Initializing for room:', roomId, 'as:', customPeerId || 'RANDOM');
    
    // Join Signaling Room
    this.signaling.joinRoom(roomId, customPeerId).catch(err => {
      console.warn('[StreamingService] room join failed:', err);
    });
  }

  /**
   * Called by the CAMERA to start getting local media
   */
  async startProducing(targetPeerId: string = 'CONTROLLER', deviceId?: string) {
    try {
      // Request native permissions first if on mobile
      await this.requestNativePermissions();

      console.log('[StreamingService] Requesting local camera/mic...', deviceId ? `(Device: ${deviceId})` : '');
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          frameRate: { ideal: 30 },
          facingMode: deviceId ? undefined : { ideal: 'environment' }
        }, 
        audio: true 
      });

      console.log('[StreamingService] Local stream acquired for RTMP push');
      return this.localStream;
    } catch (err) {
      console.error('[StreamingService] Error in startProducing:', err);
      throw err;
    }
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
