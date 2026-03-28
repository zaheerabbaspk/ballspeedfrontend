import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { SettingsService } from './settings.service';
import * as mediasoupClient from 'mediasoup-client';

@Injectable({
  providedIn: 'root'
})
export class MediasoupService {
  private socket: Socket;
  private device: mediasoupClient.Device | null = null;
  private sendTransport: mediasoupClient.types.Transport | null = null;
  public onSignal = new Subject<any>();

  constructor(private settings: SettingsService) {
    const backendUrl = this.settings.gatewayUrl();
    this.socket = io(backendUrl, { 
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 20
    });

    this.socket.on('connect', () => console.log('[Mediasoup-v1.2] Socket connected:', this.socket.id));
    this.socket.on('disconnect', () => console.warn('[Mediasoup-v1.2] Socket DISCONNECTED'));
    this.socket.on('rtmp-progress', (data) => console.log('[RTMP] Frame:', data.frame));
    this.socket.on('rtmp-error', (err) => console.error('[RTMP] Fatal:', err));
  }

  async init() {
    if (this.device) return;

    return new Promise<void>((resolve, reject) => {
      this.socket.emit('getRouterRtpCapabilities', async (rtpCapabilities: any) => {
        try {
          this.device = new mediasoupClient.Device();
          await this.device.load({ routerRtpCapabilities: rtpCapabilities });
          console.log('[Mediasoup-v1.2] Device loaded');
          resolve();
        } catch (err) {
          console.error('[Mediasoup] Device load error:', err);
          reject(err);
        }
      });
    });
  }

  async produce(track: MediaStreamTrack, rtmpUrl?: string) {
    if (!this.device) await this.init();

    // HARD GUARD: Recreate transport if closed or failed
    if (!this.sendTransport || this.sendTransport.closed || this.sendTransport.connectionState === 'failed') {
      console.log('[Mediasoup-v1.2] Transport stale/closed. Recreating...');
      if (this.sendTransport) this.sendTransport.close();
      await this.createSendTransport();
    }

    console.log(`[Mediasoup-v1.2] Producing ${track.kind}. Transport State:`, this.sendTransport?.connectionState);
    
    try {
      const producer = await this.sendTransport!.produce({ 
        track,
        appData: { rtmpUrl } 
      });

      producer.on('transportclose', () => console.warn(`[Mediasoup] Producer ${producer.id} transport closed`));
      producer.on('trackended', () => console.warn(`[Mediasoup] Producer ${producer.id} track ended`));

      return producer;
    } catch (err) {
      console.error('[Mediasoup] Produce mapping error:', err);
      // If we hit InvalidStateError, force close and retry once
      if ((err as any).name === 'InvalidStateError') {
          this.sendTransport?.close();
          throw new Error('Transport was in invalid state. Please try again.');
      }
      throw err;
    }
  }

  private async createSendTransport() {
    return new Promise<void>((resolve, reject) => {
      this.socket.emit('createWebRtcTransport', {}, async (params: any) => {
        if (params.error) return reject(new Error(params.error));

        this.sendTransport = this.device!.createSendTransport(params);

        this.sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
          this.socket.emit('connectWebRtcTransport', { 
            transportId: this.sendTransport!.id, 
            dtlsParameters 
          }, (response: any) => {
            if (response?.error) errback(new Error(response.error));
            else callback();
          });
        });

        this.sendTransport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
          this.socket.emit('produce', {
            transportId: this.sendTransport!.id,
            kind,
            rtpParameters,
            rtmpUrl: (appData as any).rtmpUrl
          }, (response: any) => {
            if (response.error) errback(new Error(response.error));
            else callback({ id: response.id });
          });
        });

        this.sendTransport.on('connectionstatechange', (state) => {
          console.log('[Mediasoup-v1.2] Transport Connection State:', state);
          if (state === 'failed') {
            console.error('[Mediasoup] Transport FAILED. Will recreate on next produce.');
          }
        });

        resolve();
      });
    });
  }

  joinRoom(roomId: string) {
    this.socket.emit('join-room', roomId);
  }

  sendSignal(roomId: string, toPeerId: string | null, type: string, data: any) {
    this.socket.emit('signal', { roomId, toPeerId, type, data });
  }

  stop() {
    if (this.sendTransport) {
        this.sendTransport.close();
        this.sendTransport = null;
    }
    // We don't disconnect socket here as it's shared for signaling
  }
}

