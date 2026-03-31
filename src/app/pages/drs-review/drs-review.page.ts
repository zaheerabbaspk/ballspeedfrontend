import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { DrsService, DrsResult, BallPosition } from '../../services/drs.service';
import { environment } from '../../../environments/environment';
import { trigger, transition, style, animate } from '@angular/animations';

export type ReviewState = 'idle' | 'uploading' | 'analyzing' | 'firstPlayback' | 'secondPlaybackSlowMotion' | 'frozenAtImpact' | 'drsGraphVisible' | 'finalDecisionVisible' | 'error';

@Component({
  selector: 'app-drs-review',
  templateUrl: './drs-review.page.html',
  styleUrls: ['./drs-review.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: 0 }),
        animate('400ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ])
    ]),
    trigger('badgePop', [
      transition(':enter', [
        style({ transform: 'scale(0.8)', opacity: 0 }),
        animate('300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ transform: 'scale(1)', opacity: 1 })),
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-in', style({ opacity: 1 })),
      ])
    ])
  ]
})
export class DrsReviewPage implements OnInit, OnDestroy {
  @ViewChild('pitchSvg') pitchSvgRef!: ElementRef<SVGElement>;
  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;

  reviewState: ReviewState = 'idle';
  selectedFile: File | null = null;
  result: DrsResult | null = null;
  errorMsg = '';
  isDragging = false;
  processingStep = 0;
  private playbackCount = 0;

  // SVG pitch animation data
  trajectoryPoints: { x: number; y: number }[] = [];
  projectedPoints:  { x: number; y: number }[] = [];
  bouncePos:  { x: number; y: number } | null = null;
  impactPos:  { x: number; y: number } | null = null;
  stumpHitX: number | null = null;
  stumpHitY: number | null = null;

  // Animated ball position
  animBallX = 100;
  animBallY = 30;
  animating = false;
  
  // Dynamic Pitch SVG Points
  pitchPolyPoints = '80,10 120,10 135,500 65,500';
  pitchSideLine1 = '80,10 65,500';
  pitchSideLine2 = '120,10 135,500';
  stumpRectsTop: {x: number, y: number, w: number, h: number}[] = [
    {x: 88, y: 10, w: 3, h: 15}, {x: 98, y: 10, w: 3, h: 15}, {x: 108, y: 10, w: 3, h: 15}
  ];
  stumpRectsBot: {x: number, y: number, w: number, h: number}[] = [
    {x: 85, y: 460, w: 4, h: 20}, {x: 98, y: 460, w: 4, h: 20}, {x: 111, y: 460, w: 4, h: 20}
  ];
  
  readonly apiBase = environment.aiBackendUrl;

  normalVideoUrl: string | null = null;
  currentVideoUrl: string | null = null;
  slowMotionUrl: string | null = null;
  
  apiFinished = false;
  waitingForApi = false;

  private stepTimer?: ReturnType<typeof setInterval>;
  private animTimer?: ReturnType<typeof setTimeout>;

  constructor(private drs: DrsService) {}

  ngOnInit() {}

  ngOnDestroy() {
    if (this.stepTimer) clearInterval(this.stepTimer);
    if (this.animTimer) clearTimeout(this.animTimer);
  }

  // ---- SVG coordinate helpers ----
  private toSvgX(nx: number): number {
    return 50 + (nx / 100) * 100;
  }
  private toSvgY(ny: number): number {
    return 10 + (ny / 100) * 480;
  }

  get trajectoryPointsStr(): string {
    return this.trajectoryPoints.map(p => `${p.x},${p.y}`).join(' ');
  }
  get projectedPointsStr(): string {
    return this.projectedPoints.map(p => `${p.x},${p.y}`).join(' ');
  }

  // ---- File handling ----
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      this.normalVideoUrl = URL.createObjectURL(this.selectedFile);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('video/')) {
      this.selectedFile = file;
      this.normalVideoUrl = URL.createObjectURL(this.selectedFile);
    }
  }

  // ---- Analysis ----
  analyze() {
    if (!this.selectedFile || this.reviewState !== 'idle') return;
    
    console.log('=== STARTING ANALYSIS (WAITING FOR API) ===');
    this.playbackCount = 0;
    this.reviewState = 'analyzing';
    this.processingStep = 0;

    // AI Analysis
    this.stepTimer = setInterval(() => {
      this.processingStep = Math.min(this.processingStep + 1, 3);
    }, 1500);

    this.drs.analyzeReview(this.selectedFile).subscribe({
      next: (res) => {
        console.log('API response received - initiating playback sequence');
        if (this.stepTimer) clearInterval(this.stepTimer);
        this.result = res;
        this.buildPitchData(res);
        this.apiFinished = true;
        
        // Start the sequence now that we have data
        this.startPlaybackSequence();
      },
      error: (err) => {
        if (this.stepTimer) clearInterval(this.stepTimer);
        this.errorMsg = err?.error?.detail || err?.message || 'Analysis failed.';
        this.reviewState = 'error';
      }
    });
  }

  private startPlaybackSequence() {
    console.log('Pass 1: Normal playback starting (with tracking)');
    this.reviewState = 'firstPlayback';
    this.currentVideoUrl = this.normalVideoUrl;
    this.playbackCount = 1;

    setTimeout(() => {
      const video = this.videoPlayerRef?.nativeElement;
      if (video) {
        video.playbackRate = 1.0;
        video.currentTime = 0;
        video.play().catch(e => console.warn('Pass 1 play failed:', e));
        
        video.onended = () => {
          console.log('Pass 1 ended -> starting Pass 2');
          video.onended = null;
          this.startSecondPlayback();
        };

        // Start animation for Pass 1
        const path = this.result!.data.ball_path || [];
        const fps = 30.0; // Assume normal speed is 30fps for animation sync
        let currentIdx = 0;
        this.animating = true;

        const animatePass1 = () => {
          if (currentIdx >= path.length || this.reviewState !== 'firstPlayback') return;
          const pt = path[currentIdx];
          if (pt.detected || pt.x > 0) {
            this.animBallX = this.toSvgX(pt.x);
            this.animBallY = this.toSvgY(pt.y);
          }
          currentIdx++;
          this.animTimer = setTimeout(animatePass1, 1000 / fps);
        };
        animatePass1();
      }
    }, 100);
  }

  // handleFirstPlaybackEnd removed in favor of startPlaybackSequence chain

  private buildPitchData(res: DrsResult) {
    const path = res.data.ball_path || [];

    this.trajectoryPoints = path
      .filter(p => p.detected)
      .map(p => ({ x: this.toSvgX(p.x), y: this.toSvgY(p.y) }));

    const decisionRaw = res.data.decision_raw;
    const proj = decisionRaw.projected_path || [];
    this.projectedPoints = proj.map((p: any) => ({ x: this.toSvgX(p.x), y: this.toSvgY(p.y) }));

    const bp = decisionRaw.bounce_point;
    this.bouncePos = bp ? { x: this.toSvgX(bp.x), y: this.toSvgY(bp.y) } : null;

    const ip = decisionRaw.impact_point;
    this.impactPos = ip ? { x: this.toSvgX(ip.x), y: this.toSvgY(ip.y) } : null;

    // --- Dynamic Pitch Lane Centering ---
    const lX = decisionRaw.stumpLeftX !== undefined ? decisionRaw.stumpLeftX : 48;
    const rX = decisionRaw.stumpRightX !== undefined ? decisionRaw.stumpRightX : 52;
    const cX = this.toSvgX((lX + rX) / 2);
    
    // The pitch lane should be exactly the width of the stumps and perfectly vertical
    const stumpW = 20;

    this.pitchPolyPoints = `${cX - stumpW/2},10 ${cX + stumpW/2},10 ${cX + stumpW/2},500 ${cX - stumpW/2},500`;
    this.pitchSideLine1 = `${cX - stumpW/2},10 ${cX - stumpW/2},500`;
    this.pitchSideLine2 = `${cX + stumpW/2},10 ${cX + stumpW/2},500`;

    this.stumpRectsTop = [
      {x: cX - stumpW/2,     y: 10, w: 3, h: 15},
      {x: cX - 1.5,          y: 10, w: 3, h: 15},
      {x: cX + stumpW/2 - 3, y: 10, w: 3, h: 15}
    ];

    this.stumpRectsBot = [
      {x: cX - stumpW/2,     y: 460, w: 4, h: 20},
      {x: cX - 2,            y: 460, w: 4, h: 20},
      {x: cX + stumpW/2 - 4, y: 460, w: 4, h: 20}
    ];
    // ------------------------------------

    const hit = decisionRaw.hit_point;
    if (hit && (decisionRaw.wickets === 'HITTING' || decisionRaw.wickets === "UMPIRE'S CALL")) {
      const relX = (hit.x - decisionRaw.pitch_center_x + 10) / 20;
      this.stumpHitX = cX - 20 + relX * 40;
      this.stumpHitY = 20 + (hit.y / 100) * 60;
    } else {
      this.stumpHitX = null;
      this.stumpHitY = null;
    }
  }

  // --- Cinematic Flow: Phase 2 ---
  private startSecondPlayback() {
    if (!this.result || this.playbackCount >= 2) return;
    
    console.log('Pass 2: Slow motion playback starting');
    this.playbackCount = 2;
    this.reviewState = 'secondPlaybackSlowMotion';
    this.animating = false;
    this.currentVideoUrl = this.apiBase + this.result.data.slow_motion_url;
    
    setTimeout(() => {
      const video = this.videoPlayerRef?.nativeElement;
      if (video) {
        video.currentTime = 0;
        video.onended = null; // Ensure slow motion pass doesn't trigger anything on end
        video.play().catch(e => console.warn('Slow motion play failed:', e));
      }

      const impactFrame = this.result!.data.impact_frame;
      const slowFps = this.result!.data.slow_motion_fps || 10.0;
      const path = this.result!.data.ball_path || [];
      
      // User requested freeze at 0.8s. If path doesn't specify, we'll force it.
      // 0.8s in slow motion = 800ms
      const freezeTimeMs = 800;
      const startTime = Date.now();

      this.animating = true;
      let currentIdx = 0;

      const step = () => {
        const elapsed = Date.now() - startTime;
        
        if (currentIdx >= path.length || this.reviewState !== 'secondPlaybackSlowMotion') {
          return;
        }

        const pt = path[currentIdx];

        // Trigger freeze at 0.8s OR when reaching impact frame, whichever is better for the UX
        if (elapsed >= freezeTimeMs || (impactFrame && pt.frame >= impactFrame)) {
          console.log(`impact freeze at ${elapsed}ms (frame ${pt.frame})`);
          this.runImpactBreak(video);
          return;
        }

        if (pt.detected || pt.x > 0) {
          this.animBallX = this.toSvgX(pt.x);
          this.animBallY = this.toSvgY(pt.y);
          this.animating = true;
        }
        
        currentIdx++;
        this.animTimer = setTimeout(step, 1000 / slowFps);
      };

      step();
    }, 100);
  }

  private runImpactBreak(video?: HTMLVideoElement) {
    if (video) video.pause();
    
    console.log('video paused at impact');
    this.reviewState = 'frozenAtImpact';
    this.animating = false;
    
    // Wait slightly on the freeze before showing the graph
    setTimeout(() => {
      console.log('DRS graph shown');
      this.reviewState = 'drsGraphVisible';
      
      // Wait for the graph to sink in before hitting them with the final decision
      setTimeout(() => {
        console.log('impact decision shown');
        this.reviewState = 'finalDecisionVisible';
      }, 1000);
      
    }, 1000);
  }

  formatImpactHeight(h: string): string {
    const map: Record<string, string> = {
      'BELOW_KNEE': 'Below Knee Roll',
      'KNEE_ROLL':  'Knee Roll',
      'ABOVE_KNEE': 'Above Knee Roll',
      'UNKNOWN':    '—',
    };
    return map[h] ?? h;
  }

  reset() {
    if (this.normalVideoUrl) URL.revokeObjectURL(this.normalVideoUrl);
    this.normalVideoUrl = null;
    this.currentVideoUrl = null;
    this.reviewState = 'idle';
    this.result = null;
    this.selectedFile = null;
    this.trajectoryPoints = [];
    this.projectedPoints = [];
    this.bouncePos = null;
    this.impactPos = null;
    this.stumpHitX = null;
    this.stumpHitY = null;
    this.animating = false;
    this.errorMsg = '';
    this.slowMotionUrl = null;
    this.apiFinished = false;
    this.waitingForApi = false;
  }
}

