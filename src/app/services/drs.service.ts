import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BallPosition {
  frame: number;
  x: number;  // 0-100 normalized
  y: number;  // 0-100 normalized
  detected: boolean;
  confidence: number;
}

export interface DrsDecision {
  pitching: string;         // 'IN LINE' | "OUTSIDE OFF" | "OUTSIDE LEG" | "UMPIRE'S CALL"
  impact: string;           // same options
  wickets: string;          // 'HITTING' | 'MISSING' | "UMPIRE'S CALL"
  wicket_zone: string;      // 'OFF_STUMP' | 'MIDDLE_STUMP' | 'LEG_STUMP' | 'MISSING'
  decision: string;         // 'OUT' | 'NOT OUT' | 'LOW_CONFIDENCE'
  confidence: number;
  is_bouncer: boolean;
  impact_height: string;    // 'BELOW_KNEE' | 'KNEE_ROLL' | 'ABOVE_KNEE' | 'UNKNOWN'
  release_frame?: number;
  bounce_frame?: number;
  impact_frame?: number;
  bounce_height_px: number;
  bounce_height_pct: number;
  projected_path: BallPosition[];
  hit_point: BallPosition | null;
  bounce_point: BallPosition | null;
  impact_point: BallPosition | null;
  pitch_center_x: number;
  frames_detected: number;
  frames_total: number;
  detection_ratio: number;
  stumpLeftX: number;
  stumpRightX: number;
  impactX: number;
}

export interface DrsResult {
  success: boolean;
  data: {
    impact_frame: number;
    bounce_frame: number;
    impact_result: 'IN_LINE' | 'OUTSIDE_LINE';
    impact_confidence: number;
    impactX: number;
    stumpLeftX: number;
    stumpRightX: number;
    ball_path: BallPosition[];
    slow_motion_url: string;
    impact_photo: string;
    decision_raw: DrsDecision;
    slow_motion_fps: number;
  };
}

@Injectable({ providedIn: 'root' })
export class DrsService {
  private readonly baseUrl = environment.aiBackendUrl || 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  analyzeReview(file: File): Observable<DrsResult> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<DrsResult>(`${this.baseUrl}/analyze-review`, form);
  }
}
