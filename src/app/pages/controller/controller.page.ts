import { Component, OnInit, signal, ViewChildren, QueryList, ElementRef, ViewChild, computed, AfterViewInit, HostListener, Input, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ObsDockComponent } from '../../components/obs/obs-dock.component';
import { AudioMeterComponent } from '../../components/obs/audio-meter.component';
import { ObsScene, ObsSource, MediaOverlay } from '../../models/obs.model';
import { HttpClient } from '@angular/common/http';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton,
  IonIcon, IonBadge, IonGrid, ModalController, ToastController, IonButtons, IonRow, IonCol, IonInput, IonLabel, IonItem, IonList, IonModal, IonRange
} from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { StreamingService } from '../../services/streaming.service';
import { RtmpService } from '../../services/rtmp.service';
import { SettingsService } from '../../services/settings.service';
import { SettingsPage } from '../settings/settings.page';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  videocam, tv, shareSocial, settings, radio, timeOutline, add,
  optionsOutline, linkOutline, gridOutline, cameraOutline, browsersOutline, settingsOutline,
  radioOutline, layersOutline, closeOutline, saveOutline, globeOutline,
  lockClosedOutline, lockOpenOutline, videocamOutline, contractOutline, trashOutline, syncOutline,
  volumeMuteOutline, volumeHighOutline, playBackOutline, eyeOutline, eyeOffOutline
} from 'ionicons/icons';

interface ConnectedCamera {
  id: string;
  stream: MediaStream;
  rotation: number;
}

export type ReviewState =
  | 'idle'
  | 'analyzing'
  | 'playing_delivery'
  | 'impact_locked'
  | 'pitch_graph_reveal'
  | 'ball_projection_animation'
  | 'decision_reveal'
  | 'error';


@Component({
  selector: 'app-shortcuts-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-title class="font-black tracking-widest uppercase text-xs md:text-sm text-emerald-500">Studio Commands</ion-title>
        <ion-button slot="end" fill="clear" color="light" (click)="dismiss()">Close</ion-button>
      </ion-toolbar>
    </ion-header>
    <ion-content color="dark" class="ion-padding">
      <div class="flex flex-col gap-3 font-mono text-xs md:text-sm mt-2">
        
        <!-- Record Config & Start Button -->
        <div class="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-white/5">
          <div class="flex items-center gap-2">
            <span class="text-white/80 font-bold">Len:</span>
            <input type="number" [value]="duration" (input)="updateDuration($event)" 
                   class="w-10 bg-slate-900 text-emerald-400 font-bold border-none text-center outline-none rounded-md px-1 py-1 shadow-inner">
            <span class="text-white/50 lowercase">s</span>
          </div>
          <button (click)="dismiss('TOGGLE_RECORD')" 
                  class="px-3 py-1.5 rounded-lg font-bold border shadow-inner transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                  [class.bg-rose-600]="isRecording" [class.border-rose-500]="isRecording" [class.text-white]="isRecording"
                  [class.bg-slate-900]="!isRecording" [class.text-rose-400]="!isRecording" [class.border-rose-500/20]="!isRecording">
            <ion-icon name="radio" [class.animate-pulse]="isRecording"></ion-icon>
            {{ isRecording ? 'Recording...' : 'Start Record' }}
          </button>
        </div>

        <div class="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-white/5 active:scale-95 transition-transform" (click)="dismiss('PLAY_REPLAY')">
          <span class="text-white/80 font-bold">▶ Play Replay</span>
          <span class="bg-slate-900 px-3 py-1.5 rounded-lg text-emerald-400 font-bold border border-emerald-500/20 shadow-inner">Key: 1</span>
        </div>
        <div class="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-white/5 active:scale-95 transition-transform" (click)="dismiss('IMPORT_GALLERY')">
          <span class="text-white/80 font-bold">📂 Import Gallery Video</span>
          <span class="bg-slate-900 px-3 py-1.5 rounded-lg text-blue-400 font-bold border border-blue-500/20 shadow-inner">Review</span>
        </div>
        <div class="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-white/5 active:scale-95 transition-transform" (click)="dismiss('MUTE')">
          <span class="text-white/80 font-bold">🔇 Toggle Audio</span>
          <span class="bg-slate-900 px-3 py-1.5 rounded-lg text-rose-400 font-bold border border-rose-500/20 shadow-inner">Key: M</span>
        </div>
        <div class="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-white/5 active:scale-95 transition-transform" (click)="dismiss('CUT')">
          <span class="text-white/80 font-bold">🔴 Cut to Live</span>
          <span class="bg-slate-900 px-3 py-1.5 rounded-lg text-blue-400 font-bold border border-blue-500/20 shadow-inner">Key: Enter</span>
        </div>
      </div>
    </ion-content>
  `
})
export class ShortcutsModalComponent {
  @Input() duration: number = 10;
  @Input() isRecording: boolean = false;

  constructor(private modalCtrl: ModalController) { }

  updateDuration(event: any) {
    const val = parseInt(event.target.value, 10);
    if (!isNaN(val) && val > 0 && val <= 30) {
      this.duration = val;
    }
  }

  dismiss(action?: string) {
    this.modalCtrl.dismiss({ action, duration: this.duration });
  }
}

@Component({
  selector: 'app-controller',
  templateUrl: './controller.page.html',
  styleUrls: ['./controller.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonBadge,
    IonGrid,
    IonRow,
    IonCol,
    IonInput,
    IonLabel,
    IonItem,
    IonList,
    IonModal,
    IonRange,
    ObsDockComponent,
    AudioMeterComponent
  ]
})
export class ControllerPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mainVideo') mainVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayContainer') overlayContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('composingCanvas') composingCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rtmpCanvas') rtmpCanvas!: ElementRef<HTMLCanvasElement>;
  cameras = signal<ConnectedCamera[]>([]); // { id, stream, rotation }
  activeCameraId = signal<string | null>(null);
  activeStream = signal<MediaStream | null>(null);

  // Replay and Audio State
  isMuted = signal<boolean>(false);
  isReplaying = signal<boolean>(false);
  isRecordingReplay = signal<boolean>(false);
  replayDuration = signal<number>(7);
  isFlashTransitioning = signal<boolean>(false);
  isStingerVisible = signal<boolean>(false);
  isReviewMode = signal<boolean>(false);
  reviewState = signal<ReviewState>('idle');
  reviewStep = signal<number>(0); // 0: Pitch, 1: Impact, 2: Wickets
  reviewPoints = signal<{ x: number, y: number, type: string }[]>([]);
  reviewResults = signal<any>(null);

  // AI Tracking Data (Real Detection Pipeline)
  isAIProcessing = signal<boolean>(false);
  aiBallPath = signal<any[]>([]);
  aiSmoothedPath = signal<any[]>([]);
  aiProjectedPath = signal<any[]>([]);
  capturedFrame = signal<string | null>(null);
  drsBallPos = signal<{ x: number, y: number } | null>(null);
  isDRSAnimating = signal<boolean>(false);
  bouncePoint = signal<{ x: number, y: number } | null>(null);
  impactPoint = signal<{ x: number, y: number } | null>(null);
  aiConfidence = signal<number>(0);
  debugStats = signal<any>(null);
  debugFrames = signal<any>(null);
  showDebug = signal<boolean>(false);
  capturedImpactPhoto = signal<string | null>(null);
  capturedBouncePhoto = signal<string | null>(null);
  drsPlayCycle = signal<number>(0);
  freezeTriggered = signal<boolean>(false);

  // Studio Mode & Manual Controls
  isStudioMode = signal<boolean>(false);
  isPreviewPaused = signal<boolean>(false);
  pitchOffset = signal<{ x: number, y: number }>({ x: 0, y: 0 });
  isFullscreen = signal<boolean>(false);

  // Computed SVG Paths (Fixes Angular Template Parser Errors)
  manualPathD = computed(() => {
    const pts = this.reviewPoints();
    if (pts.length < 2) return '';
    const x0 = pts[0].x * 12.8;
    const y0 = pts[0].y * 7.2;
    const x1 = pts[1].x * 12.8;
    const y1 = pts[1].y * 7.2;
    const x2 = (pts[2]?.x || pts[1].x) * 12.8;
    const y2 = (pts[2]?.y || pts[1].y) * 7.2;
    return `M ${x0} ${y0} Q ${x1} ${y1} ${x2} ${y2}`;
  });

  // Computed: Mathematically smoothed tracked trajectory to eliminate raw YOLO multi-detection spiderweb effects
  aiBallTrailD = computed(() => {
    const pts = this.aiSmoothedPath();
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x * 12.8} ${pts[0].y * 7.2}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x * 12.8} ${pts[i].y * 7.2}`;
    }
    return d;
  });

  // Computed: Projected ball path SVG path (HawkEye Tube)
  aiProjectedPathD = computed(() => {
    const pts = this.aiProjectedPath();
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x * 12.8} ${pts[0].y * 7.2}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x * 12.8} ${pts[i].y * 7.2}`;
    }
    return d;
  });

  // Computed: Dynamic 2D Pitch Lane (Perfectly straight vertical band like target screenshot)
  drsPitchPoints = computed(() => {
    const res = this.reviewResults();
    // Default to center if stump coordinates are somehow missing
    const lX = res?.stumpLeftX !== undefined ? res.stumpLeftX : 48;
    const rX = res?.stumpRightX !== undefined ? res.stumpRightX : 52;
    const cX = (lX + rX) / 2;

    // Exact stump width
    const sW = Math.max(2, rX - lX);
    const topY = 150; // Base of stumps
    const botY = 720; // Bottom of screen

    // Perfect vertical rectangle like CWC19 broadcast
    // Top and bottom width exactly match stump width
    const rectW = sW;

    // Manual Offset Application
    const off = this.pitchOffset();

    // Convert to 1280x720 SVG space
    const x1 = (cX - rectW / 2 + off.x) * 12.8, y1 = topY + off.y;
    const x2 = (cX + rectW / 2 + off.x) * 12.8, y2 = topY + off.y;
    const x3 = (cX + rectW / 2 + off.x) * 12.8, y3 = botY + off.y;
    const x4 = (cX - rectW / 2 + off.x) * 12.8, y4 = botY + off.y;

    return `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;
  });

  @ViewChild('replayVideo') replayVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mediaVideoElement') mediaVideoElement?: ElementRef<HTMLVideoElement>;
  activeRotationStyle = computed(() => {
    if (this.activeCameraId() === 'MEDIA') return '';
    const cam = this.cameras().find(c => c.id === this.activeCameraId());
    const rot = cam?.rotation || 0;
    const scale = (rot === 90 || rot === 270) ? 1.777 : 1;
    return `rotate(${rot}deg) scale(${scale})`;
  });

  previewRotationStyle = computed(() => {
    if (this.previewCameraId() === 'MEDIA') return '';
    const cam = this.cameras().find(c => c.id === this.previewCameraId());
    const rot = cam?.rotation || 0;
    const scale = (rot === 90 || rot === 270) ? 1.777 : 1;
    return `rotate(${rot}deg) scale(${scale})`;
  });

  previewCameraId = signal<string | null>(null);
  previewStream = computed(() => {
    const id = this.previewCameraId();
    if (!id) return null;
    if (id === 'MEDIA') return null;
    return this.cameras().find(c => c.id === id)?.stream || null;
  });

  @ViewChild('mediaPicker') mediaPicker!: ElementRef<HTMLInputElement>;
  mediaType = signal<'video' | 'image' | 'none'>('none');

  signalingStatus = signal<string>('initializing');
  peerConnectionStates = signal<Record<string, string>>({});

  volumeLevel = signal<number>(100);
  mediaOverlays = signal<MediaOverlay[]>([]);
  @ViewChild('mediaFileInput') mediaFileInput!: ElementRef<HTMLInputElement>;

  audioMeterLevel = signal<number>(0);
  finalOutputLevel = computed(() => this.isMuted() ? 0 : (this.audioMeterLevel() * (this.volumeLevel() / 100)));
  currentTime = signal<string>('00:00:00');
  private audioCtx: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private compFrameId: number | null = null;

  // Replay Buffers
  private replayRecorder: MediaRecorder | null = null;
  private replayChunks: Blob[] = [];
  private maxReplayChunks = 300; // Longer buffer for safety

  isRtmpStreaming = signal<boolean>(false);

  currentRoomId = signal<string>('');
  shareUrl = signal<string>('');

  isOverlayLocked = signal<boolean>(true);
  showGrid = signal<boolean>(false);
  selectedOverlayId = signal<string | null>(null);
  private startPointerPos = { x: 0, y: 0 };
  private startOverlayPos = { x: 0, y: 0, scale: 1, width: 1920, height: 1080 };
  private currentMode: 'NONE' | 'DRAGGING' | 'RESIZING' | 'PINCHING' = 'NONE';
  private currentTarget: 'OVERLAY' | 'SCOREBOARD' | 'MEDIA' = 'OVERLAY';

  private activePointers = new Map<number, PointerEvent>();
  private initialPinchDist = 0;
  private initialOverlayScale = 1;
  sanitizedOverlayUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.studioSettings.overlayUrl())
  );

  sanitizedMediaUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.studioSettings.mediaUrl())
  );

  overlayFitScale = signal<number>(1);

  // OBS Mock Data
  obsScenes = signal<ObsScene[]>([
    { id: '1', name: 'Scene', isActive: true },
    { id: '2', name: 'Review Pass', isActive: false },
    { id: '3', name: 'Stinger Out', isActive: false }
  ]);

  // Local media overlays (logos, videos)
  localMediaSources = signal<ObsSource[]>([]);

  obsSources = computed<ObsSource[]>(() => {
    const cams = this.cameras().map(c => ({
      id: c.id,
      name: `Camera ${c.id.substring(0, 4)}`,
      type: 'camera' as const,
      isVisible: true,
      isLocked: true,
      isActive: this.previewCameraId() === c.id
    }));

    return [...cams, ...this.localMediaSources()];
  });

  selectScene(id: string) {
    this.obsScenes.update(scenes =>
      scenes.map(s => ({ ...s, isActive: s.id === id }))
    );
  }

  handleSceneAction(action: string) {
    console.log('[OBS] Scene Action:', action);
    if (action === 'ADD') {
      const newId = (this.obsScenes().length + 1).toString();
      this.obsScenes.update(prev => [...prev, { id: newId, name: `New Scene ${newId}`, isActive: false }]);
    }
  }

  handleSourceAction(action: string) {
    console.log('[OBS] Source Action:', action);
    if (action === 'FILES') {
      this.triggerMediaFileSelect();
    } else if (action === 'ADD') {
      // Future: Add Browser Source etc.
    }
  }


  // Calculate how much to scale a 1920px canvas to fit the current video container
  updateOverlayScale(containerWidth: number) {
    const scale = containerWidth / 1920;
    this.overlayFitScale.set(scale);
  }

  sanitizedScoreboardUrl = computed(() => {
    const id = this.studioSettings.scoreboardId();
    const op = this.studioSettings.scoreboardOperator() || '11';
    if (!id) return null;
    // Dynamic CricketSasa ticker selection
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://cricketsasa.com/cricket/display_ticker_${op}.php?match_id=${id}&year=2026&op=${op}`);
  });

  constructor(
    private streamingService: StreamingService,
    private rtmpService: RtmpService,
    private route: ActivatedRoute,
    public studioSettings: SettingsService,
    private modalCtrl: ModalController,
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private toastCtrl: ToastController
  ) {
    addIcons({ shareSocial, radio, timeOutline, videocamOutline, add, gridOutline, contractOutline, videocam, optionsOutline, linkOutline, cameraOutline, browsersOutline, settingsOutline, tv, settings, radioOutline, layersOutline, closeOutline, saveOutline, globeOutline, lockClosedOutline, lockOpenOutline, trashOutline, syncOutline, volumeMuteOutline, volumeHighOutline, playBackOutline, eyeOutline, eyeOffOutline });
  }

  async openSettings() {
    const modal = await this.modalCtrl.create({
      component: SettingsPage,
      cssClass: 'settings-modal'
    });
    return await modal.present();
  }

  async ngOnInit() {
    const roomId = this.route.snapshot.paramMap.get('id');
    if (!roomId) return;

    this.currentRoomId.set(roomId);
    this.shareUrl.set(`${window.location.origin}/#/room/${roomId}/camera`);
    await this.streamingService.init(roomId, 'CONTROLLER');

    this.streamingService.remoteStream$.subscribe(({ peerId, stream }: { peerId: string, stream: MediaStream }) => {
      console.log('Received remote stream from camera:', peerId);
      const newCam: ConnectedCamera = { id: peerId, stream, rotation: 0 };
      this.cameras.update(prev => {
        const exists = prev.find(c => c.id === peerId);
        if (exists) {
          exists.stream = stream;
          return [...prev];
        }
        return [...prev, newCam];
      });

      if (!this.activeCameraId()) {
        this.switchCamera(peerId);
      }
    });

    setInterval(() => {
      const now = new Date();
      this.currentTime.set(now.toLocaleTimeString([], { hour12: false }));
    }, 1000);

    this.streamingService['signaling'].status$.subscribe(status => {
      this.signalingStatus.set(status);
    });

    this.streamingService.connectionState$.subscribe(({ peerId, state }) => {
      this.peerConnectionStates.update(prev => ({ ...prev, [peerId]: state }));
    });

    setTimeout(() => this.calculateFitScale(), 500);
  }

  ngAfterViewInit() {
    this.calculateFitScale();
    setTimeout(() => this.centerOverlay('SCOREBOARD'), 1000);
    // Start compositing permanently so the user can see their work
    this.startCompositing();
  }

  ngOnDestroy() {
    if (this.compFrameId) clearInterval(this.compFrameId as any);
  }

  @HostListener('window:resize')
  onResize() {
    this.calculateFitScale();
  }

  private calculateFitScale() {
    if (this.overlayContainer) {
      const containerWidth = this.overlayContainer.nativeElement.clientWidth;
      const containerHeight = this.overlayContainer.nativeElement.clientHeight;
      // Fixed: Stage is based on a 1920x1080 unified coordinate system.
      const canvasWidth = 1920;
      const canvasHeight = 1080;

      if (containerWidth > 0 && containerHeight > 0) {
        const scaleX = containerWidth / canvasWidth;
        const scaleY = containerHeight / canvasHeight;
        this.overlayFitScale.set(Math.min(scaleX, scaleY));
      }
    }
  }

  toggleOverlayLock() {
    this.isOverlayLocked.update(v => !v);
  }

  onOverlayPointerDown(event: PointerEvent, mode: 'DRAGGING' | 'RESIZING', target: 'OVERLAY' | 'SCOREBOARD' | 'MEDIA' = 'OVERLAY') {
    if (this.isOverlayLocked()) return;
    event.stopPropagation();

    this.activePointers.set(event.pointerId, event);
    this.currentTarget = target;

    if (this.activePointers.size === 1) {
      this.currentMode = mode;
      this.startPointerPos = { x: event.clientX, y: event.clientY };

      if (target === 'OVERLAY') {
        this.startOverlayPos = {
          x: this.studioSettings.overlayLeft(),
          y: this.studioSettings.overlayTop(),
          scale: this.studioSettings.overlayScale(),
          width: this.studioSettings.overlayWidth(),
          height: this.studioSettings.overlayHeight()
        };
      } else if (target === 'SCOREBOARD') {
        this.startOverlayPos = {
          x: this.studioSettings.scoreboardLeft(),
          y: this.studioSettings.scoreboardTop(),
          scale: this.studioSettings.scoreboardScale(),
          width: this.studioSettings.scoreboardWidth(),
          height: this.studioSettings.scoreboardHeight()
        };
      } else if (target === 'MEDIA') {
        this.startOverlayPos = {
          x: this.studioSettings.mediaLeft(),
          y: this.studioSettings.mediaTop(),
          scale: this.studioSettings.mediaScale(),
          width: this.studioSettings.mediaWidth(),
          height: this.studioSettings.mediaHeight()
        };
      }
    } else if (this.activePointers.size === 2) {
      this.currentMode = 'PINCHING';
      const pointers = Array.from(this.activePointers.values());
      this.initialPinchDist = this.getDistance(pointers[0], pointers[1]);
      if (target === 'OVERLAY') this.initialOverlayScale = this.studioSettings.overlayScale();
      else if (target === 'SCOREBOARD') this.initialOverlayScale = this.studioSettings.scoreboardScale();
      else if (target === 'MEDIA') this.initialOverlayScale = this.studioSettings.mediaScale();
    }

    const moveHandler = (e: PointerEvent) => this.onOverlayPointerMove(e);
    const stopHandler = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);
      if (this.activePointers.size === 0) {
        this.currentMode = 'NONE';
        this.studioSettings.save();
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', stopHandler);
        window.removeEventListener('pointercancel', stopHandler);
      }
    };

    window.addEventListener('pointermove', moveHandler, { passive: false });
    window.addEventListener('pointerup', stopHandler);
    window.addEventListener('pointercancel', stopHandler);
  }

  private onOverlayPointerMove(event: PointerEvent) {
    if (this.currentMode === 'NONE') return;
    event.preventDefault();
    this.activePointers.set(event.pointerId, event);

    if (this.currentMode === 'PINCHING' && this.activePointers.size === 2) {
      const pointers = Array.from(this.activePointers.values());
      const currentDist = this.getDistance(pointers[0], pointers[1]);
      if (this.initialPinchDist > 0) {
        const factor = currentDist / this.initialPinchDist;
        const newScale = Math.max(0.1, this.initialOverlayScale * factor);
        if (this.currentTarget === 'OVERLAY') {
          this.studioSettings.overlayScale.set(newScale);
        } else if (this.currentTarget === 'SCOREBOARD') {
          this.studioSettings.scoreboardScale.set(newScale);
        } else if (this.currentTarget === 'MEDIA') {
          this.studioSettings.mediaScale.set(newScale);
        }
      }
      return;
    }

    const dx = (event.clientX - this.startPointerPos.x) / this.overlayFitScale();
    const dy = (event.clientY - this.startPointerPos.y) / this.overlayFitScale();

    if (this.currentMode === 'DRAGGING') {
      if (this.currentTarget === 'OVERLAY') {
        this.studioSettings.overlayLeft.set(this.startOverlayPos.x + dx);
        this.studioSettings.overlayTop.set(this.startOverlayPos.y + dy);
      } else if (this.currentTarget === 'SCOREBOARD') {
        this.studioSettings.scoreboardLeft.set(this.startOverlayPos.x + dx);
        this.studioSettings.scoreboardTop.set(this.startOverlayPos.y + dy);
      } else if (this.currentTarget === 'MEDIA') {
        this.studioSettings.mediaLeft.set(this.startOverlayPos.x + dx);
        this.studioSettings.mediaTop.set(this.startOverlayPos.y + dy);
      }
    } else if (this.currentMode === 'RESIZING') {
      const currentScale = this.startOverlayPos.scale;
      const normalizedDx = dx / currentScale;
      const normalizedDy = dy / currentScale;

      const newWidth = Math.max(100, this.startOverlayPos.width + normalizedDx);
      const newHeight = Math.max(20, this.startOverlayPos.height + normalizedDy);

      if (this.currentTarget === 'OVERLAY') {
        this.studioSettings.overlayWidth.set(Math.round(newWidth));
        this.studioSettings.overlayHeight.set(Math.round(newHeight));
      } else if (this.currentTarget === 'SCOREBOARD') {
        this.studioSettings.scoreboardWidth.set(Math.round(newWidth));
        this.studioSettings.scoreboardHeight.set(Math.round(newHeight));
      } else if (this.currentTarget === 'MEDIA') {
        this.studioSettings.mediaWidth.set(Math.round(newWidth));
        this.studioSettings.mediaHeight.set(Math.round(newHeight));
      }
    }
  }

  private getDistance(p1: PointerEvent, p2: PointerEvent): number {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  centerOverlay(target: 'OVERLAY' | 'SCOREBOARD' | 'MEDIA') {
    if (target === 'OVERLAY') {
      this.studioSettings.overlayLeft.set((1920 - this.studioSettings.overlayWidth()) / 2);
      this.studioSettings.overlayTop.set((1080 - this.studioSettings.overlayHeight()) / 2);
    } else if (target === 'SCOREBOARD') {
      this.studioSettings.scoreboardLeft.set((1920 - this.studioSettings.scoreboardWidth()) / 2);
      this.studioSettings.scoreboardTop.set((1080 - this.studioSettings.scoreboardHeight()) / 2);
    } else if (target === 'MEDIA') {
      this.studioSettings.mediaLeft.set((1920 - this.studioSettings.mediaWidth()) / 2);
      this.studioSettings.mediaTop.set((1080 - this.studioSettings.mediaHeight()) / 2);
    }
    this.studioSettings.save();
  }

  toggleOverlayVisibility(event?: Event) {
    if (event) event.stopPropagation();
    this.studioSettings.showOverlay.update(v => !v);
    this.studioSettings.save();
  }

  switchCamera(id: string) {
    this.previewCameraId.set(id);
    if (!this.isStudioMode()) {
      this.takeLive(id);
    }
  }

  switchMedia() {
    this.previewCameraId.set('MEDIA');
    if (!this.isStudioMode()) {
      this.activeCameraId.set('MEDIA');
      this.activeStream.set(null);
    }
  }

  removeMedia() {
    this.studioSettings.mediaUrl.set('');
    this.mediaType.set('none');
    if (this.activeCameraId() === 'MEDIA') {
      const firstCam = this.cameras()[0];
      if (firstCam) this.switchCamera(firstCam.id);
      else this.activeCameraId.set(null);
    }
    this.studioSettings.save();
  }

  rotateCamera(cameraId: string, event: Event) {
    event.stopPropagation();
    this.cameras.update(cams =>
      cams.map(c =>
        c.id === cameraId
          ? { ...c, rotation: ((c.rotation || 0) + 90) % 360 }
          : c
      )
    );
  }

  takeLive(targetId?: string) {
    const id = targetId || this.previewCameraId();
    if (!id) return;

    if (id === 'MEDIA') {
      this.activeCameraId.set('MEDIA');
      this.activeStream.set(null);
    } else {
      const cam = this.cameras().find(c => c.id === id);
      if (cam) {
        this.activeCameraId.set(id);
        this.activeStream.set(cam.stream);
      }
    }
    console.log('[Studio Mode] Taken Live:', id);
  }

  toggleReplayRecording() {
    if (this.isRecordingReplay()) {
      if (this.replayRecorder) {
        this.replayRecorder.stop();
      }
      this.replayRecorder = null;
      this.isRecordingReplay.set(false);
    } else {
      const stream = this.activeStream();
      if (!stream) return;
      this.replayChunks = [];
      try {
        // High quality 5Mbps for crisp sports replays
        this.replayRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 5000000
        });
        this.replayRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.replayChunks.push(e.data);
          }
        };
        this.replayRecorder.onstop = () => {
          if (this.replayChunks.length > 0) {
            console.log('[DRS] Auto-triggering AI Analysis...');
            this.analyzeVideoAI();
          }
        };
        this.replayRecorder.start(200);
        this.isRecordingReplay.set(true);

        // AUTO-STOP AND ANALYZE: Stop after duration set in UI
        setTimeout(() => {
          if (this.isRecordingReplay()) {
            this.toggleReplayRecording();
          }
        }, this.replayDuration() * 1000);
      } catch (err) {
        console.warn("Replay buffer error:", err);
        this.isRecordingReplay.set(false);
      }
    }
  }

  updateReplayDuration(event: any) {
    const val = parseInt(event.target.value, 10);
    if (!isNaN(val) && val > 0 && val <= 30) {
      this.replayDuration.set(val);
    }
  }

  triggerReplay(seconds: number) {
    if (this.isReplaying()) {
      this.runStingerTransition(() => this.stopReplay());
      return;
    }

    // 1. Show Stinger Pre-roll
    this.runStingerTransition(() => {
      // 2. If we are recording, STOP it first to get the full final blob
      if (this.isRecordingReplay()) {
        if (this.replayRecorder) {
          this.replayRecorder.onstop = () => {
            this.executeReplayPlay(seconds);
          };
          this.replayRecorder.stop();
          this.isRecordingReplay.set(false);
        } else {
          this.executeReplayPlay(seconds);
        }
      } else {
        this.executeReplayPlay(seconds);
      }
    });
  }

  private runStingerTransition(midAction: () => void) {
    this.isStingerVisible.set(true);
    // Mid-point of animation (wipe fully covers)
    setTimeout(() => {
      midAction();
      // Keep visible for a bit more
      setTimeout(() => {
        this.isStingerVisible.set(false);
      }, 500);
    }, 500);
  }

  private executeReplayPlay(seconds: number) {
    if (this.replayChunks.length === 0) return;

    // Flash Transition Effect
    this.isFlashTransitioning.set(true);
    setTimeout(() => this.isFlashTransitioning.set(false), 300);

    const blob = new Blob(this.replayChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    if (this.replayVideo) {
      this.isReplaying.set(true);
      const vid = this.replayVideo.nativeElement;
      vid.src = url;
      vid.load();
      vid.play().catch(err => {
        console.error("Replay playback failed:", err);
        this.isReplaying.set(false);
      });
      vid.onended = () => {
        this.stopReplay();
        URL.revokeObjectURL(url);
        // --- AUTO-CYCLE: Start new recording session for the next ball ---
        setTimeout(() => this.toggleReplayRecording(), 500);
      };
    }
  }

  private stopReplay() {
    this.isReplaying.set(false);
    this.isReviewMode.set(false);
    if (this.replayVideo) this.replayVideo.nativeElement.pause();
  }

  enterReviewMode() {
    if (this.isReviewMode()) {
      this.resetReview();
      this.isReviewMode.set(false);
      return;
    }

    // Trigger Stinger first
    this.runStingerTransition(() => {
      // If we have chunks, use them for review
      if (this.replayChunks.length > 0) {
        this.executeReplayPlay(10); // Start 10s replay
        this.isReviewMode.set(true);
        this.reviewStep.set(0);
        this.reviewPoints.set([]);
        this.reviewResults.set(null);

        // Slow down for better plotting
        setTimeout(() => {
          if (this.replayVideo) this.replayVideo.nativeElement.playbackRate = 0.25;
        }, 600);
      }
    });
  }

  addReviewPoint(event: MouseEvent) {
    if (!this.isReviewMode() || this.reviewStep() > 2) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const types = ['PITCH', 'IMPACT', 'WICKETS'];
    const newPoints = [...this.reviewPoints(), { x, y, type: types[this.reviewStep()] }];
    this.reviewPoints.set(newPoints);

    if (this.reviewStep() === 2) {
      this.calculateReviewResults();
    }

    this.reviewStep.set(this.reviewStep() + 1);
  }

  calculateReviewResults() {
    // Basic logic mapping Y/X to cricket zones (Simulated for VIP feel)
    const points = this.reviewPoints();
    const pitch = points[0];
    const impact = points[1];

    this.reviewResults.set({
      pitching: pitch.x > 45 && pitch.x < 55 ? 'IN LINE' : (pitch.x < 45 ? 'OUTSIDE OFF' : 'OUTSIDE LEG'),
      impact: impact.x > 45 && impact.x < 55 ? 'IN LINE' : 'UMPIRE\'S CALL',
      wickets: 'HITTING',
      decision: 'OUT'
    });
  }

  resetReview() {
    this.reviewPoints.set([]);
    this.reviewState.set('idle');
    this.reviewStep.set(0);
    this.reviewResults.set(null);
    this.capturedFrame.set(null);
    this.drsBallPos.set(null);
    this.isDRSAnimating.set(false);
    this.bouncePoint.set(null);
    this.impactPoint.set(null);
    this.aiBallPath.set([]);
    this.aiProjectedPath.set([]);
    this.aiConfidence.set(0);
    this.debugStats.set(null);
    this.debugFrames.set(null);
    if (this.replayVideo) {
      this.replayVideo.nativeElement.playbackRate = 1.0;
      this.replayVideo.nativeElement.play().catch(() => { });
    }
    // Restart auto-recording if not replaying live
    if (!this.isRecordingReplay()) {
      this.toggleReplayRecording();
    }
  }

  simulateReview() {
    this.resetReview();
    this.isReviewMode.set(true);
    // Generate 3 random but plausible Hawkeye points
    const p1 = { x: 50 + (Math.random() * 10 - 5), y: 80, type: 'PITCH' };
    const p2 = { x: 50 + (Math.random() * 6 - 3), y: 50, type: 'IMPACT' };
    const p3 = { x: 50 + (Math.random() * 4 - 2), y: 30, type: 'WICKETS' };

    this.reviewPoints.set([p1, p2, p3]);
    this.reviewStep.set(3);
    this.calculateReviewResults();
  }

  triggerGalleryImport() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.replayChunks = [file]; // Crucial: allow AI analysis for uploaded file
      const url = URL.createObjectURL(file);
      this.runStingerTransition(() => {
        this.isReplaying.set(true);
        this.isReviewMode.set(true);
        this.reviewStep.set(0);
        this.reviewPoints.set([]);
        this.reviewResults.set(null);

        if (this.replayVideo) {
          this.replayVideo.nativeElement.src = url;
          this.replayVideo.nativeElement.load();
          // Do NOT play yet, wait for analyzeVideoAI to finish and start the sequence
        }

        // AUTO-TRIGGER ANALYSIS
        this.analyzeVideoAI();
      });
    }
  }

  async analyzeVideoAI() {
    if (!this.replayChunks || this.replayChunks.length === 0) return;

    this.isAIProcessing.set(true);
    this.reviewState.set('analyzing');
    this.resetReview();

    // Explicitly set these again because resetReview() wipes them, but we want to show 'analyzing'
    this.isReviewMode.set(true);
    this.reviewState.set('analyzing');
    this.isAIProcessing.set(true);

    console.log('[DRS] analyze started');

    const blob = new Blob(this.replayChunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('file', blob, 'ball.webm');

    this.http.post<any>(`${environment.aiBackendUrl}/analyze-review`, formData).subscribe({
      next: (d) => {
        this.isAIProcessing.set(false);
        if (!d || !d.data) {
          this.reviewState.set('error');
          return;
        }
        const res = d.data;

        console.log('[DRS] response received');
        console.log('[DRS] response mapped:', res);

        // Store REAL detected data (Parsing new Flat JSON array)
        this.aiBallPath.set(res.ball_path || []);
        this.aiSmoothedPath.set(res.smoothed_tracked_path || []);
        this.aiProjectedPath.set(res.projected_path || []);

        // Map old nested struct strictly to Flat struct
        this.reviewResults.set({
          decision: res.impact_result === 'IN_LINE' && res.wickets === 'HITTING' ? 'OUT' : 'NOT OUT',
          pitching: res.pitching || 'IN LINE',
          impact: res.impact_result ? res.impact_result.replace('_', ' ') : 'IN LINE',
          wickets: res.wickets || 'HITTING',
          impact_frame: res.impact_frame,
          bounce_frame: res.bounce_frame,
          stumpLeftX: res.stumpLeftX !== undefined ? res.stumpLeftX : res.decision_raw?.stumpLeftX,
          stumpRightX: res.stumpRightX !== undefined ? res.stumpRightX : res.decision_raw?.stumpRightX,
          impact_point: res.impact_point !== undefined ? res.impact_point : res.decision_raw?.impact_point
        });

        this.aiConfidence.set(res.impact_confidence || 0);

        // Store debug stats
        this.debugStats.set(res.stats || null);

        // Store photos (Base64 from server)
        if (res.impact_photo) this.capturedImpactPhoto.set(res.impact_photo);
        if (res.bounce_photo) this.capturedBouncePhoto.set(res.bounce_photo);

        // Check for detections
        const detectedCount = (res.ball_path || []).filter((p: any) => p.detected).length;
        console.log('[DRS] Detected frames:', detectedCount);

        // TRIGGER THE CINEMATIC REVEAL if we have enough detections
        if (res.bounce_frame !== null && res.bounce_frame !== undefined) {
          this.executeCinematicDRS(res);
        } else if (detectedCount >= 3) {
          this.executeCinematicDRS(res);
        } else {
          // No detection — show results manually
          this.isReviewMode.set(true);
          this.reviewState.set('decision_reveal');
          this.capturedFrame.set(res.impact_photo || null);
          this.reviewStep.set(3);
        }
      },
      error: async (err) => {
        this.isAIProcessing.set(false);
        this.reviewState.set('error');
        console.error('[DRS] AI Analysis failed:', err);
        const toast = await this.toastCtrl.create({
          message: 'AI Analysis Failed. Check backend!',
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        toast.present();
      }
    });
  }

  private executeCinematicDRS(data: any) {
    this.isReviewMode.set(true);
    this.reviewStep.set(0);
    this.drsBallPos.set(null);
    this.drsPlayCycle.set(1);
    this.freezeTriggered.set(false);
    this.reviewState.set('playing_delivery');

    console.log('[DRS Controller] Initiate synchronized 2-pass sequence');

    if (this.replayVideo) {
      const vid = this.replayVideo.nativeElement;
      vid.playbackRate = 1.0;
      vid.currentTime = 0;

      const onEndedCycle = () => {
        const currentCycle = this.drsPlayCycle();
        if (currentCycle === 1) {
          console.log('[Replay] Pass 1 (Normal) ended -> Pass 2 (Slow-Mo) starting');
          this.drsPlayCycle.set(2);
          this.reviewState.set('pitch_graph_reveal'); // Show graph immediately for Pass 2
          vid.playbackRate = 0.3;
          vid.currentTime = (data.release_frame || 0) / 30;

          // Ball position sync for the slow-mo pass
          const syncLoop = setInterval(() => {
            const currentFrame = Math.floor(vid.currentTime * 30);
            const ballPath = this.aiBallPath();
            const pt = ballPath.find((p: any) => p.frame === currentFrame);
            if (pt) {
              this.drsBallPos.set({ x: pt.x, y: pt.y });
            }
            if (this.freezeTriggered()) clearInterval(syncLoop);
          }, 16);

          // Freeze at 0.8s mark for Pass 2
          const onTimeUpdate = () => {
            if (this.drsPlayCycle() === 2 && vid.currentTime >= 0.8 && !this.freezeTriggered()) {
              vid.pause();
              vid.currentTime = 0.8;
              this.freezeTriggered.set(true);
              vid.removeEventListener('timeupdate', onTimeUpdate);
              vid.removeEventListener('ended', onEndedCycle);
              clearInterval(syncLoop);
              console.log('[Replay] Freeze triggered @ 0.8s');
              this.runImpactBreak(data);
            }
          };
          vid.addEventListener('timeupdate', onTimeUpdate);
          vid.play();
        }
      };

      vid.addEventListener('ended', onEndedCycle);
      vid.play();
    }

    this.capturedFrame.set(null);
  }

  private runImpactBreak(data: any) {
    const projPath = this.aiProjectedPath();
    console.log('[Replay] pitch graph revealed');
    this.reviewState.set('pitch_graph_reveal');
    this.reviewStep.set(2);

    if (this.capturedImpactPhoto()) {
      this.capturedFrame.set(this.capturedImpactPhoto());
    }

    setTimeout(() => {
      this.capturedFrame.set(null);
      this.reviewStep.set(1);
      this.reviewState.set('ball_projection_animation');
      this.animateProjectedPath(projPath);
    }, 800);
  }

  private animateProjectedPath(projPath: any[]) {
    if (projPath.length === 0) {
      this.finishDecisionCardsSequence();
      return;
    }

    let j = 0;
    const projInterval = setInterval(() => {
      if (j >= projPath.length) {
        clearInterval(projInterval);
        this.finishDecisionCardsSequence();
        return;
      }
      this.drsBallPos.set({ x: projPath[j].x, y: projPath[j].y });
      j++;
    }, 35); // Projection momentum
  }

  private finishDecisionCardsSequence() {
    this.isDRSAnimating.set(false);
    this.reviewState.set('decision_reveal');
    console.log('[DRS] state = decision_reveal');

    // Sequentially reveal the Decision Stack: Pitching -> Impact -> Wickets -> Final
    setTimeout(() => {
      this.reviewStep.set(1); // Pitching Card

      setTimeout(() => {
        this.reviewStep.set(2); // Impact Card

        setTimeout(() => {
          this.reviewStep.set(3); // Wickets Card + Final Decision Badge
        }, 800);
      }, 800);
    }, 400); // Wait a beat after ball hitting wickets
  }

  yCoordinateShadowOffset(y: number): number {
    // Basic perspective shadow: as the ball moves further back (y decreases),
    // the shadow offset slightly diminishes to maintain 3D feel.
    // 0 is top (stumps), 100 is bottom (bowler)
    return Math.max(5, (y / 100) * 15);
  }

  toggleDebug() {
    this.showDebug.update(v => !v);
  }

  async openModeModal() {
    const modal = await this.modalCtrl.create({
      component: ShortcutsModalComponent,
      componentProps: {
        duration: this.replayDuration(),
        isRecording: this.isRecordingReplay()
      },
      cssClass: 'small-modal',
      breakpoints: [0, 0.4, 0.6, 1],
      initialBreakpoint: 0.6,
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    // Save duration if manipulated
    if (data?.duration) {
      this.replayDuration.set(data.duration);
    }

    if (data?.action === 'TOGGLE_RECORD') this.toggleReplayRecording();
    else if (data?.action === 'PLAY_REPLAY') this.triggerReplay(this.replayDuration());
    else if (data?.action === 'IMPORT_GALLERY') this.triggerGalleryImport();
    else if (data?.action === 'MUTE') this.toggleMute();
    else if (data?.action === 'CUT') this.takeLive();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    switch (event.key.toLowerCase()) {
      case '1':
        this.triggerReplay(this.replayDuration());
        break;
      case 'c':
      case 'enter':
        this.takeLive();
        break;
      case 'm':
        this.toggleMute();
        break;
      case 'b':
        this.enterReviewMode();
        break;
    }
  }

  toggleMute() {
    this.isMuted.update(v => !v);
    if (this.rtmpGainNode && this.rtmpAudioCtx) {
      this.rtmpGainNode.gain.setTargetAtTime(
        this.isMuted() ? 0 : 1,
        this.rtmpAudioCtx.currentTime,
        0.1
      );
    }
  }

  // --- STUDIO MODE & MANUAL CONTROLS ---
  toggleStudioMode() {
    this.isStudioMode.update(v => !v);
  }

  togglePreviewPause() {
    const vid = this.replayVideo?.nativeElement;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      this.isPreviewPaused.set(false);
    } else {
      vid.pause();
      this.isPreviewPaused.set(true);
    }
  }

  stepPreview(frames: number) {
    const vid = this.replayVideo?.nativeElement;
    if (!vid) return;
    vid.pause();
    this.isPreviewPaused.set(true);
    vid.currentTime += (frames / 30); // Assuming 30fps
  }

  togglePitchGrid(event?: Event) {
    if (event) event.stopPropagation();
    this.studioSettings.showManualGrid.update((v: boolean) => !v);
    this.studioSettings.save();
  }

  adjustPitchOffset(dx: number, dy: number) {
    this.pitchOffset.update(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
  }

  resetPitchOffset() {
    this.pitchOffset.set({ x: 0, y: 0 });
  }

  setVolume(event: any) {
    const val = parseInt(event.target.value, 10);
    if (!isNaN(val)) {
      this.volumeLevel.set(val);
      if (this.rtmpGainNode && !this.isMuted()) {
        this.rtmpGainNode.gain.value = val / 100;
      }
    }
  }

  private setupAudioAnalysis(stream: MediaStream) {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const source = this.audioCtx.createMediaStreamSource(stream);
    this.analyzer = this.audioCtx.createAnalyser();
    this.analyzer.fftSize = 256;
    source.connect(this.analyzer);

    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);

    const updateVolume = () => {
      if (!this.analyzer) return;
      this.analyzer.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      this.audioMeterLevel.set(Math.min(100, (average / 128) * 100));
      this.animationFrameId = requestAnimationFrame(updateVolume);
    };

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    updateVolume();
  }

  async startRtmp() {
    alert('Direct P2P Streaming is active. Use OBS on this device to capture the Program View for RTMP streaming.');
  }

  async copyInviteLink() {
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      alert('Invite link copied! Open this on your mobile device.');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  triggerMediaFileSelect() {
    this.mediaFileInput.nativeElement.click();
  }

  onMediaFileSelected(event: any) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';

    const id = 'media-' + Date.now();
    const newOverlay: MediaOverlay = {
      id,
      name: file.name,
      url,
      type,
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
      isVisible: true,
      scale: type === 'image' ? 0.2 : 1.0 // Default logo size vs full video
    };

    if (type === 'image') {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        newOverlay.element = img;
        newOverlay.width = img.width;
        newOverlay.height = img.height;
        this.mediaOverlays.update(prev => [...prev, newOverlay]);
      };
    } else {
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.oncanplay = () => {
        video.play().catch(e => console.warn('Autoplay prevented:', e));
        
        this.mediaOverlays.update(prev => prev.map(o => {
          if (o.id === id) {
            return {
              ...o,
              element: video,
              width: video.videoWidth || 1280,
              height: video.videoHeight || 720
            };
          }
          return o;
        }));
      };
      
      this.mediaOverlays.update(prev => [...prev.filter(o => o.id !== id), newOverlay]);
    }

    // Add to localMediaSources for UI visibility
    const newSource: ObsSource = {
      id,
      name: file.name,
      type: 'media',
      isVisible: true,
      isLocked: false,
      isActive: false
    };
    this.localMediaSources.update(prev => [...prev, newSource]);

    // Reset input
    event.target.value = '';
  }

  toggleSourceVisibility(sourceId: string, event: Event) {
    event.stopPropagation();
    this.localMediaSources.update(sources => sources.map(s =>
      s.id === sourceId ? { ...s, isVisible: !s.isVisible } : s
    ));
    this.mediaOverlays.update(overlays => overlays.map(o =>
      o.id === sourceId ? { ...o, isVisible: !o.isVisible } : o
    ));
  }

  toggleSourceLock(sourceId: string, event: Event) {
    event.stopPropagation();
    this.localMediaSources.update(sources => sources.map(s =>
      s.id === sourceId ? { ...s, isLocked: !s.isLocked } : s
    ));
  }

  removeSource(sourceId: string, event?: Event) {
    if (event) event.stopPropagation();

    // If we're previewing this source, reset preview to the first camera
    if (this.previewCameraId() === sourceId) {
      const firstCam = this.cameras()[0];
      this.previewCameraId.set(firstCam ? firstCam.id : null);
    }

    this.localMediaSources.update(sources => sources.filter(s => s.id !== sourceId));
    this.mediaOverlays.update(overlays => {
      const overlay = overlays.find(o => o.id === sourceId);
      if (overlay) URL.revokeObjectURL(overlay.url);
      return overlays.filter(o => o.id !== sourceId);
    });
  }


  async testSignaling() {
    console.log('[Test] Sending dummy signal to self...');
    const peerId = this.streamingService.getPeerId();
    await this.streamingService['signaling'].sendSignal(peerId, 'test-ping', { time: Date.now() });
  }

  async retrySignaling() {
    const roomId = this.route.snapshot.paramMap.get('id');
    if (roomId) {
      await this.streamingService.init(roomId, 'CONTROLLER');
    }
  }

  // --- Media Overlay Transform Logic ---

  toggleGrid() {
    this.showGrid.update(v => !v);
  }

  selectOverlay(id: string | null, event?: Event) {
    if (event) event.stopPropagation();
    this.selectedOverlayId.set(id);
  }

  onMediaPointerDown(id: string, event: PointerEvent, type: 'OVERLAY' | 'MEDIA' = 'MEDIA', mode: 'DRAGGING' | 'RESIZING' = 'DRAGGING') {
    if (this.isOverlayLocked() && type === 'OVERLAY') return;
    
    event.stopPropagation();
    event.preventDefault();
    
    this.selectedOverlayId.set(id);
    this.currentTarget = type;
    this.currentMode = mode;
    
    this.startPointerPos = { x: event.clientX, y: event.clientY };
    
    const overlay = this.mediaOverlays().find(o => o.id === id);
    if (overlay) {
      this.startOverlayPos = { 
        x: overlay.x, 
        y: overlay.y, 
        scale: overlay.scale || 1.0,
        width: overlay.width,
        height: overlay.height
      };
    }
    
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onMediaPointerMove(event: PointerEvent) {
    if (this.currentMode === 'NONE' || !this.selectedOverlayId()) return;

    const dx = event.clientX - this.startPointerPos.x;
    const dy = event.clientY - this.startPointerPos.y;

    // Scale dx based on the monitor's display scale vs internal 1280x720 canvas
    const monitorScale = 1280 / (event.currentTarget as HTMLElement).clientWidth;
    
    this.mediaOverlays.update(overlays => overlays.map(o => {
      if (o.id === this.selectedOverlayId()) {
        if (this.currentMode === 'DRAGGING') {
          return {
            ...o,
            x: this.startOverlayPos.x + (dx * monitorScale),
            y: this.startOverlayPos.y + (dy * monitorScale)
          };
        } else if (this.currentMode === 'RESIZING') {
          // Calculate new scale based on x-axis movement (proportional resize)
          // Original width * startScale is the screen width
          const currentWidthPx = o.type === 'image' ? o.width : 1280;
          const initialScaledWidth = currentWidthPx * this.startOverlayPos.scale;
          const newWidth = Math.max(20, initialScaledWidth + (dx * monitorScale));
          const newScale = newWidth / currentWidthPx;
          return {
            ...o,
            scale: newScale
          };
        }
      }
      return o;
    }));
  }

  onMediaPointerUp(event: PointerEvent) {
    this.currentMode = 'NONE';
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }

  updateMediaOverlayScale(id: string, scale: number) {
    this.mediaOverlays.update(overlays => overlays.map(o => 
      o.id === id ? { ...o, scale } : o
    ));
  }

  // --- RTMP & Compositing ---

  private rtmpAudioCtx: AudioContext | null = null;
  private rtmpGainNode: GainNode | null = null;

  async toggleRtmp() {
    if (this.isRtmpStreaming()) {
      this.stopRtmp();
    } else {
      await this.startRtmpPush();
    }
  }

  private async startRtmpPush() {
    const url = this.studioSettings.rtmpUrl();
    const key = this.studioSettings.rtmpKey();
    if (!url || !key) {
      alert('Please set RTMP URL and Stream Key in Settings.');
      return;
    }

    try {
      this.isRtmpStreaming.set(true);

      // 1. Kickstart compositing loop
      this.startCompositing();

      // 2. Wait for first canvas frame
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = this.composingCanvas.nativeElement;
      const stream = canvas.captureStream(30); // 30fps for professional smoothness

      // Use rtmpCanvas for rtmp push if needed, or maintain consistency
      const streamCanvas = this.rtmpCanvas?.nativeElement || canvas;
      const pushStream = streamCanvas.captureStream(30);

      // 3. Guarantee Audio Track (Facebook REQUIRES Audio)
      this.rtmpAudioCtx = new AudioContext();
      const dest = this.rtmpAudioCtx.createMediaStreamDestination();
      let hasRealAudio = false;

      const activeStream = this.activeStream();
      if (activeStream) {
        const audioTracks = activeStream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].readyState === 'live') {
          const source = this.rtmpAudioCtx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
          this.rtmpGainNode = this.rtmpAudioCtx.createGain();
          this.rtmpGainNode.gain.value = this.isMuted() ? 0 : 1;
          source.connect(this.rtmpGainNode);
          this.rtmpGainNode.connect(dest);
          hasRealAudio = true;
          console.log('[Controller] Added REAL live audio track to mix');
        }
      }

      if (!hasRealAudio) {
        // Create a silent oscillator to keep FFmpeg and Facebook happy
        const osc = this.rtmpAudioCtx.createOscillator();
        const gain = this.rtmpAudioCtx.createGain();
        gain.gain.value = 0; // Mute
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        console.log('[Controller] Added SILENT audio track to mix');
      }

      // Add the mixed audio track to the canvas video stream
      dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));

      // 4. Verify video track
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState === 'ended') {
        throw new Error('Canvas video track failed to start');
      }

      // 5. Start RTMP via WebSocket + MediaRecorder (NEW simple pipeline)
      const rtmpFullUrl = `${url}${key}`;
      await this.rtmpService.start(stream, rtmpFullUrl);

      console.log('RTMP Push started (WebSocket pipeline)');
    } catch (err) {
      console.error('Failed to start RTMP:', err);
      alert('RTMP Error: ' + (err as any).message);
      this.stopRtmp();
    }
    console.log('[DRS Controller] Take Live Action Triggered');
    // Maybe add a flash effect or state change
  }

  toggleFullscreen(element: HTMLElement) {
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen();
      this.isFullscreen.set(false);
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  onFullscreenChange() {
    this.isFullscreen.set(!!document.fullscreenElement);
  }

  private stopRtmp() {
    this.isRtmpStreaming.set(false);
    if (this.compFrameId) {
      clearInterval(this.compFrameId as any);
      this.compFrameId = null;
    }

    // Safely close and dispose the audio context
    if (this.rtmpAudioCtx) {
      if (this.rtmpAudioCtx.state !== 'closed') {
        this.rtmpAudioCtx.close().catch(e => console.warn('AudioContext close error:', e));
      }
      this.rtmpAudioCtx = null;
    }

    this.rtmpService.stop();
    console.log('RTMP Push stopped');
  }

  private startCompositing() {
    const canvas = this.composingCanvas.nativeElement;
    canvas.width = 1280; // Force 720p
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.compFrameId) {
      clearInterval(this.compFrameId as any);
    }

    const render = () => {
      if (!this.composingCanvas) return;
      const canvas = this.composingCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sourceVideo = this.isReplaying() ? this.replayVideo?.nativeElement :
        (this.activeCameraId() === 'MEDIA' ? this.mediaVideoElement?.nativeElement : this.mainVideo?.nativeElement);

      // 1. Draw Base Layer (Black first, then camera/video)
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 1280, 720);

      if (sourceVideo) {
        // 2. Draw Active Camera or Replay/Media
        const id = this.activeCameraId();
        const cam = this.cameras().find(c => c.id === id);
        const rotation = (this.isReplaying() || this.activeCameraId() !== 'MEDIA') ? (cam?.rotation || 0) : 0;

        ctx.save();
        if (rotation === 90 || rotation === 270) {
          ctx.translate(640, 360);
          ctx.rotate(rotation * Math.PI / 180);
          ctx.scale(1.777, 1.777); // 16:9 expansion
          ctx.drawImage(sourceVideo, -640, -360, 1280, 720);
        } else if (rotation === 180) {
          ctx.translate(640, 360);
          ctx.rotate(Math.PI);
          ctx.drawImage(sourceVideo, -640, -360, 1280, 720);
        } else {
          try {
            ctx.drawImage(sourceVideo, 0, 0, 1280, 720);
          } catch (e) { /* ignore */ }
        }
        ctx.restore();
      }

      // 3. Draw Media Overlays (Independent of sourceVideo)
      this.mediaOverlays().forEach(overlay => {
        if (!overlay.isVisible || !overlay.element) return;

        ctx.save();
        const scale = overlay.scale || 1.0;
        const w = (overlay.type === 'image' ? overlay.width : 1280) * scale;
        const h = (overlay.type === 'image' ? overlay.height : 720) * scale;

        // Use dynamic position
        const x = overlay.x;
        const y = overlay.y;

        try {
          ctx.drawImage(overlay.element, x, y, w, h);
        } catch (e) { /* ignore */ }
        ctx.restore();
      });

      // 4. Add Replay Badge
      if (this.isReplaying()) {
        ctx.fillStyle = '#E11D48';
        ctx.fillRect(40, 40, 180, 50);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px Arial';
        ctx.fillText('REPLAY', 70, 75);
      }
    };

    // Use setInterval instead of requestAnimationFrame to prevent background tab CPU sleeping
    // This strictly pumps 30 frames per second ensuring FFmpeg/Facebook never starves!
    this.compFrameId = setInterval(render, 1000 / 30) as any;
  }
}
