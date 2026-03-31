import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-audio-meter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-0.5 w-full select-none group">
      <!-- Header with vertical dots and values -->
      <div class="flex justify-between items-center text-[11px] font-medium px-0.5">
        <span class="text-[#e0e0e0] truncate pr-2 opacity-90 transition-opacity group-hover:opacity-100">{{ name }}</span>
        <span class="text-[#909090] font-mono text-[10px]">{{ volume === 0 ? '0.0' : volume.toFixed(1) }} dB</span>
      </div>
      
      <div class="flex items-start gap-1.5 mt-0.5">
        <!-- Vertical Dots Icon (OBS Style) -->
        <div class="flex flex-col gap-[2px] mt-1 opacity-40 hover:opacity-100 cursor-pointer">
           <div *ngFor="let i of [1,2,3]" class="w-[3px] h-[3px] bg-white rounded-full"></div>
        </div>

        <div class="flex-1 flex flex-col gap-1.5 pt-0.5">
          <!-- The Meter Bar with Grid Overlay -->
          <div class="relative h-[9px] bg-[#111] border border-[#000] overflow-hidden flex items-center shadow-inner">
            
            <!-- Standard OBS Gradient Background -->
            <div class="h-full w-full bg-gradient-to-r from-[#2ea043] via-[#d29e06] to-[#da3633] opacity-30"></div>

            <!-- Active Fill Level -->
            <div class="absolute inset-y-0 left-0 transition-all duration-75 ease-out z-10"
                 [style.width.%]="isMuted ? 0 : level">
              <div class="h-full w-full bg-gradient-to-r from-[#2ea043] via-[#d29e06] to-[#da3633]"></div>
            </div>
            
            <!-- Black Grid Overlay -->
            <div class="absolute inset-0 z-20 pointer-events-none" 
                 style="background-image: linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px); background-size: 4px 100%;">
            </div>

            <!-- Peak Indicator (White line) -->
            <div class="absolute h-full w-[1.5px] bg-white shadow-[0_0_2px_rgba(255,255,255,0.8)] transition-all duration-300 z-30"
                 [style.left.%]="isMuted ? 0 : peak"></div>
          </div>
          
          <!-- Precise scale labels (-60 to 0) -->
          <div class="relative h-2 flex justify-between text-[7px] text-[#444] font-bold px-0.5 select-none pointer-events-none -mt-0.5">
             <span *ngFor="let tick of ticks" class="relative">
                {{ tick }}
                <div class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-[1px] h-1 bg-[#222]"></div>
             </span>
          </div>

          <!-- Volume Slider (Blue Track + White Handle) -->
          <div class="flex items-center gap-2 mt-0.5">
            <button (click)="mute.emit()" class="transition-all active:scale-95">
               <!-- RED icon when muted for clear visual feedback -->
               <span class="text-[14px] leading-none select-none drop-shadow-sm" 
                     [class.text-rose-600]="isMuted" 
                     [class.text-[#909090]]="!isMuted">
                  {{ isMuted ? '🔇' : '🔈' }}
               </span>
            </button>
            <div class="flex-1 relative h-6 flex items-center group/slider">
               <input type="range" class="obs-slider-input w-full"
                      [value]="volumeLevel" 
                      (input)="onVolumeChange($event)">
               
               <div class="absolute inset-x-0 h-1 bg-[#111] rounded-full overflow-hidden pointer-events-none">
                  <div class="h-full bg-[#bf913b] transition-all" [style.width.%]="volumeLevel"></div>
               </div>
               
               <div class="absolute w-3.5 h-3.5 bg-white border border-black/20 rounded-full shadow-lg pointer-events-none transition-transform active:scale-125"
                    [style.left.%]="volumeLevel" style="transform: translate(-50%, -50%); top: 50%;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .obs-slider-input {
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      outline: none;
      z-index: 20;
      position: relative;
    }
    .obs-slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      cursor: pointer;
      background: transparent;
    }
  `]
})
export class AudioMeterComponent {
  @Input() name: string = 'Desktop Audio';
  @Input() level: number = 0;
  @Input() peak: number = 0;
  @Input() volume: number = 0;
  @Input() volumeLevel: number = 100;
  @Input() isMuted: boolean = false;

  @Output() mute = new EventEmitter<void>();
  @Output() volumeChange = new EventEmitter<number>();

  ticks = [-60, -55, -50, -45, -40, -35, -30, -25, -20, -15, -10, -5, 0];

  onVolumeChange(event: any) {
    const val = parseInt(event.target.value, 10);
    this.volumeChange.emit(val);
  }
}
