import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-obs-dock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full bg-[#1c1d22] border border-[#2d2e34] shadow-md rounded-sm group overflow-hidden select-none">
      <!-- Header Area (OBS Studio Pixel Perfect) -->
      <!-- Header Area (OBS Studio Pixel Perfect) -->
      <div class="bg-[#0a0a0a] border-b border-[#bf913b]/40 px-2.5 py-0.5 flex items-center justify-between h-7">
        <span class="text-[11px] font-bold text-[#bf913b] uppercase tracking-widest truncate pr-4">{{ title }}</span>
        
        <!-- Docking Icon (Two Overlapping Rectangles) -->
        <div class="flex items-center gap-1.5 opacity-20 group-hover:opacity-100 transition-opacity">
           <div class="relative w-3.5 h-3.5 flex items-center justify-center hover:bg-[#404144] rounded-sm cursor-pointer border border-transparent active:scale-95">
              <div class="absolute w-2 h-2.5 border-[1.5px] border-white/80 rounded-[0.5px] -top-0.5 -right-0.5"></div>
              <div class="absolute w-2 h-2.5 border-[1.5px] border-[#bf913b] rounded-[0.5px] top-0.5 left-0.5 bg-[#0a0a0a]"></div>
           </div>
           <div class="w-3 h-3 flex items-center justify-center hover:bg-[#da3633] rounded-sm cursor-pointer transition-colors">
             <div class="w-2 h-2 border-[1.5px] border-white/80 rounded-[0.5px]"></div>
           </div>
        </div>
      </div>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-auto bg-[#1c1d22] custom-scrollbar">
        <ng-content></ng-content>
      </div>
      
      <!-- Dock Footer (OBS Detailed Icons) -->
      <div *ngIf="showFooter" class="bg-[#1c1d22] border-t border-[#2d2e34] p-1 flex items-center gap-1">
        <button (click)="action.emit('ADD')" class="obs-dock-btn text-[14px]">+</button>
        <button (click)="action.emit('REMOVE')" class="obs-dock-btn text-[14px]">
           <span class="w-2.5 h-[1.5px] bg-[#909090] group-hover/btn:bg-white text-[14px]">−</span>
        </button>
        <button (click)="action.emit('FILES')" class="obs-dock-btn text-[12px] opacity-80 hover:opacity-100">📁</button>
        <button (click)="action.emit('PROPERTIES')" class="obs-dock-btn text-[10px]">⚙️</button>
        <div class="flex-1"></div>
        <button (click)="action.emit('UP')" class="obs-dock-btn text-[10px]">▲</button>
        <button (click)="action.emit('DOWN')" class="obs-dock-btn text-[10px]">▼</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; min-width: 0; }
    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
    
    .obs-dock-btn {
       width: 20px;
       height: 20px;
       display: flex;
       align-items: center;
       justify-content: center;
       background: transparent;
       border-radius: 2px;
       color: #909090;
       cursor: pointer;
       transition: all 0.1s;
       font-weight: bold;
       
       &:hover {
          background: #404144;
          color: white;
       }
       &:active {
          background: #2b53b1;
          color: white;
       }
    }
  `]
})
export class ObsDockComponent {
  @Input() title: string = 'Dock';
  @Input() showFooter: boolean = true;
  @Output() action = new EventEmitter<string>();
}
