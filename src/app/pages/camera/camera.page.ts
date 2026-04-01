import { Component, OnInit, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonBadge } from '@ionic/angular/standalone';
import { StreamingService } from '../../services/streaming.service';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { videocam, radioButtonOn, closeOutline, refreshOutline, warningOutline, removeOutline, addOutline } from 'ionicons/icons';

@Component({
  selector: 'app-camera',
  templateUrl: './camera.page.html',
  styleUrls: ['./camera.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonBadge, CommonModule]
})
export class CameraPage implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  isStreaming = false;
  status = 'Disconnected';
  signalingStatus = signal<string>('initializing');
  rtcStatus = signal<string>('new');
  isFullscreen = signal<boolean>(false);
  errorName = signal<string | null>(null);
  devices = signal<MediaDeviceInfo[]>([]);
  selectedDeviceId = signal<string | null>(null);
  isNotReadable = signal<boolean>(false);
  
  zoomSupported = signal<boolean>(false);
  zoomMin = signal<number>(1);
  zoomMax = signal<number>(5);
  zoomStep = signal<number>(0.1);
  zoomValue = signal<number>(1);
  private videoTrack: MediaStreamTrack | null = null;

  private roomId: string | null = null;

  constructor(
    private streamingService: StreamingService,
    private route: ActivatedRoute
  ) {
    addIcons({ videocam, 'radio-button-on': radioButtonOn, closeOutline, refreshOutline, warningOutline, removeOutline, addOutline });
  }

  async ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id');
    this.status = `Ready (Room: ${this.roomId})`;

    this.streamingService['signaling'].status$.subscribe(s => this.signalingStatus.set(s));
    this.streamingService.connectionState$.subscribe(s => this.rtcStatus.set(s.state));

    // Initially populate devices

    await this.logDevices();
  }

  async startStreaming() {
    try {
      if (!window.isSecureContext) {
        this.status = 'Error: Camera access REQUIRES a secure connection (HTTPS). Please open the https:// link.';
        return;
      }
      this.status = 'Connecting...';
      if (!this.roomId) throw new Error('No Room ID found');

      await this.logDevices();

      console.log('[CameraPage] Starting stream...');
      this.status = 'Requesting Camera...';
      this.isNotReadable.set(false);
      try {
        await this.streamingService.init(this.roomId);
        const stream = await this.streamingService.startProducing('CONTROLLER', this.selectedDeviceId() || undefined);
        if (this.localVideo) {
          this.localVideo.nativeElement.srcObject = stream;
        }
        this.setupZoomSupport(stream);
      } catch (err: any) {
        console.error('[CameraPage] Service stream failed:', err);
        if (err.name === 'NotAllowedError') {
          console.log('[CameraPage] Video+Audio failed, trying Video-only fallback...');
          this.status = 'Retrying Video only...';
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: 'environment' } } 
          });
          if (this.localVideo) {
            this.localVideo.nativeElement.srcObject = stream;
          }
          this.setupZoomSupport(stream);
        } else if (err.name === 'NotReadableError') {
          console.warn('[CameraPage] Device in use (NotReadableError)');
          this.isNotReadable.set(true);
        }
        throw err;
      }
      
      this.isStreaming = true;
      this.status = 'Streaming Live';
      this.isFullscreen.set(true);
    } catch (error: any) {
      console.error('Streaming error summary:', error);
      this.errorName.set(error.name);
      if (error.name === 'NotAllowedError') {
        this.status = 'Permission Denied! Tap the [LOCK] icon next to the URL, select "Site Settings", and then click "Allow" for Camera/Mic.';
      } else if (error.name === 'NotFoundError') {
        this.status = 'Error: No camera/microphone found on this device.';
      } else if (error.name === 'NotReadableError') {
        this.status = 'Error: Camera is IN USE by another app (OBS, Zoom, etc.). Please close other apps and RETRY.';
      } else {
        this.status = 'Error: ' + (error.message || error);
      }
    }
  }

  async tryBasicCamera() {
    try {
      this.status = 'Trying Basic Mode...';
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (this.localVideo) {
        this.localVideo.nativeElement.srcObject = stream;
      }
      this.setupZoomSupport(stream);
      this.isStreaming = true;
      this.status = 'Basic Stream (No HD)';
      this.errorName.set(null);
    } catch (err: any) {
      console.error('Basic mode failed:', err);
      this.status = 'Even Basic Mode failed: ' + err.name;
    }
  }

  setupZoomSupport(stream: MediaStream) {
    const track = stream.getVideoTracks()[0];
    if (track) {
      this.videoTrack = track;
      const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {} as MediaTrackCapabilities;
      if (capabilities && 'zoom' in capabilities && (capabilities as any).zoom) {
        this.zoomSupported.set(true);
        const zoomCaps = (capabilities as any).zoom;
        this.zoomMin.set(zoomCaps.min || 1);
        this.zoomMax.set(zoomCaps.max || 5);
        this.zoomStep.set(zoomCaps.step || 0.1);
        const settings = typeof track.getSettings === 'function' ? track.getSettings() : {} as MediaTrackSettings;
        this.zoomValue.set((settings as any).zoom || zoomCaps.min || 1);
      } else {
        this.zoomSupported.set(false);
      }
    }
  }

  onZoomChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.zoomValue.set(value);
    if (this.videoTrack) {
      this.videoTrack.applyConstraints({
         advanced: [{ zoom: value }]
      } as any).catch(err => console.error('Error applying zoom:', err));
    }
  }

  private async logDevices() {
    try {
      // Chrome/Safari often hide labels until first permission is granted
      // We'll try to get labels if possible
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      this.devices.set(videoDevices);
      
      if (videoDevices.length > 0 && !this.selectedDeviceId()) {
        this.selectedDeviceId.set(videoDevices[0].deviceId);
      }
      
      console.log('[CameraPage] Available devices:', videoDevices.map(d => `${d.label} (${d.deviceId})`));
    } catch (e) {
      console.error('[CameraPage] Enumerate devices failed:', e);
    }
  }

  onDeviceChange(event: any) {
    this.selectedDeviceId.set(event.target.value);
    // If already streaming, restart with new device
    if (this.isStreaming) {
      this.startStreaming();
    }
  }

  stopStreaming() {
    this.isStreaming = false;
    this.status = 'Ready';
    this.errorName.set(null);
    
    // Release the camera hardware
    if (this.localVideo && this.localVideo.nativeElement.srcObject) {
      const stream = this.localVideo.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      this.localVideo.nativeElement.srcObject = null;
    }

    // Completely terminate WebRTC peer connections
    if (typeof this.streamingService['stopProducing'] === 'function') {
      (this.streamingService as any).stopProducing();
    }
  }
}
