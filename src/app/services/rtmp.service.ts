import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class RtmpService {
  private socket: Socket;
  private recorder: MediaRecorder | null = null;
  private isStreaming = false;
  private isStarting = false;
  private currentSessionId: string | null = null;

  constructor(private settings: SettingsService) {
    const backendUrl = this.settings.gatewayUrl();
    this.socket = io(backendUrl, {
      transports: ['websocket'],
      reconnection: true
    });

    this.socket.on('rtmp-progress', (data) => console.log('[RTMP] Frame:', data.frame));
    this.socket.on('rtmp-error', (err) => {
      console.error('[RTMP] Fatal:', err);
      // Do not auto-reconnect infinite loops on fatal errors, just stop.
      this.stop();
    });
  }

  /**
   * Start RTMP streaming via Binary WebSocket v3.0
   */
  async start(stream: MediaStream, rtmpUrl: string): Promise<void> {
    if (this.isStreaming || this.isStarting) return;

    this.isStarting = true;
    this.currentSessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const sessionId = this.currentSessionId; // Local copy for closure

    console.log('[RTMP-v3.0] Initializing ingest for:', rtmpUrl.split('?')[0]);

    try {
      // 1. Notify backend to start FFmpeg with unique session ID
      this.socket.emit('start-rtmp', { rtmpUrl, sessionId });

      // 2. Start MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      this.recorder = new MediaRecorder(stream, options);

      this.recorder.ondataavailable = (event) => {
        // Strictly only send chunks if the active session hasn't changed!
        if (event.data.size > 0 && this.isStreaming && this.currentSessionId === sessionId) {
          this.socket.emit('video-chunk', { sessionId, chunk: event.data });
        }
      };

      this.recorder.start(40); // 200ms chunks for hyper-smooth, continuous low-latency delivery
      this.isStreaming = true;
      console.log('[RTMP-v3.0] Streaming started seamlessly', sessionId);
    } catch (err) {
      console.error('[RTMP-v3.0] Failed to start:', err);
      this.stop();
      throw err;
    } finally {
      this.isStarting = false;
    }
  }

  stop() {
    console.log('[RTMP-v3.0] Stopping active session:', this.currentSessionId);

    // Invalidate session immediately to prevent old floating chunks from being emitted by ondataavailable
    this.currentSessionId = null;

    if (this.recorder) {
      try {
        if (this.recorder.state !== 'inactive') {
          this.recorder.stop();
        }
      } catch (e) { }
      this.recorder.ondataavailable = null; // Unbind events
      this.recorder = null;
    }

    this.socket.emit('stop-rtmp');
    this.isStreaming = false;
    this.isStarting = false;
  }

  getIsStreaming(): boolean {
    return this.isStreaming;
  }
}
