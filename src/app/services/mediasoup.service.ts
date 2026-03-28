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
    this.socket = io(backendUrl, { transports: ['websocket'] });

    this.socket.on('connect', () => console.log('[Mediasoup] Connected to signaling'));
    this.socket.on('rtmp-progress', (data) => console.log('[RTMP] Progress:', data.frame));
    this.socket.on('rtmp-error', (err) => console.error('[RTMP] Server Error:', err));
  }

  async init() {
    if (this.device) return;

    return new Promise<void>((resolve, reject) => {
      this.socket.emit('getRouterRtpCapabilities', async (rtpCapabilities: any) => {
        try {
          this.device = new mediasoupClient.Device();
          await this.device.load({ routerRtpCapabilities: rtpCapabilities });
          console.log('[Mediasoup] Local device loaded');
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

    if (!this.sendTransport) {
      await this.createSendTransport();
    }

    console.log('[Mediasoup] Producing track:', track.kind);
    const producer = await this.sendTransport!.produce({ 
      track,
      appData: { rtmpUrl } 
    });

    return producer;
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

        resolve();
      });
    });
  }

  stop() {
    if (this.sendTransport) this.sendTransport.close();
    this.socket.disconnect();
  }
}

