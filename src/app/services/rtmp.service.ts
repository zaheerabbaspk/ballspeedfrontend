import { Injectable } from '@angular/core';
import { MediasoupService } from './mediasoup.service';

@Injectable({
  providedIn: 'root'
})
export class RtmpService {
  private isStreaming = false;
  private isStarting = false;

  constructor(private mediasoup: MediasoupService) {
    console.log('[RTMP-WebRTC] Service v1.2 READY');
  }

  /**
   * Start RTMP streaming via WebRTC (Mediasoup)
   */
  async start(stream: MediaStream, rtmpUrl: string): Promise<void> {
    if (this.isStreaming) throw new Error('Already streaming');
    if (this.isStarting) {
      console.warn('[RTMP-WebRTC] Start already in progress. Ignoring.');
      return;
    }

    this.isStarting = true;
    console.log('[RTMP-WebRTC] Starting ingest for:', rtmpUrl.split('?')[0]);

    try {
      // 1. Produce all tracks (Video + Audio)
      const tracks = stream.getTracks();
      if (tracks.length === 0) throw new Error('No tracks found for streaming');

      for (const track of tracks) {
        await this.mediasoup.produce(track, rtmpUrl);
      }
      
      this.isStreaming = true;
      console.log(`[RTMP-WebRTC] ${tracks.length} WebRTC Producers active`);
    } catch (err) {
      console.error('[RTMP-WebRTC] Failed to start:', err);
      this.stop(); // Cleanup on failure
      throw err;
    } finally {
      this.isStarting = false;
    }
  }

  stop() {
    console.log('[RTMP-WebRTC] Stopping...');
    this.mediasoup.stop();
    this.isStreaming = false;
    this.isStarting = false;
  }

  getIsStreaming(): boolean {
    return this.isStreaming;
  }
}
