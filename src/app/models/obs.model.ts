export interface ObsScene {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ObsSource {
  id: string;
  name: string;
  type: 'camera' | 'media' | 'browser' | 'window';
  isVisible: boolean;
  isLocked: boolean;
  isActive?: boolean;
}

export interface AudioSource {
  id: string;
  name: string;
  level: number; // 0-100
  peak: number;  // 0-100
  volume: number; // 0-100
  isMuted: boolean;
}

export interface TransitionEffect {
  id: string;
  name: string;
  duration: number; // ms
}
export interface MediaOverlay {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  x: number;
  y: number;
  width: number;
  height: number;
  isVisible: boolean;
  scale?: number;
  element?: HTMLImageElement | HTMLVideoElement;
}
