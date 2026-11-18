import React from 'react';

export default function ConstructionBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none select-none overflow-hidden -z-10 opacity-[0.18] md:opacity-[0.22]" 
      id="construction-bg-graphics-layer"
    >
      {/* 1. Tower Crane - Top Right Accent */}
      <div 
        className="absolute w-[220px] h-[220px] md:w-[350px] md:h-[350px] top-6 right-2 md:top-12 md:right-10 text-slate-800"
        style={{ transform: 'rotate(-5deg)' }}
        id="bg-graphic-crane"
      >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M 20,95 L 30,95 M 25,95 L 25,20" />
          <path d="M 25,20 L 35,30 M 25,40 L 35,30 M 25,40 L 35,50 M 25,60 L 35,50 M 25,60 L 35,70 M 25,80 L 35,70 M 25,80 L 35,90" />
          <path d="M 25,20 L 15,30 M 25,40 L 15,30 M 25,40 L 15,50 M 25,60 L 15,50 M 25,60 L 15,70 M 25,80 L 15,70 M 25,80 L 15,90" />
          <path d="M 5,20 L 92,20" />
          <rect x="5" y="15" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.1" />
          <path d="M 5,15 L 15,25 M 15,15 L 5,25" />
          <rect x="25" y="15" width="10" height="8" rx="1" fill="currentColor" fillOpacity="0.2" />
          <path d="M 75,20 L 75,55 M 72,55 M 75,55 C 75,58 73,60 71,60" />
          <path d="M 25,12 L 25,20 M 15,20 L 25,12 L 35,20" />
        </svg>
      </div>

      {/* 2. Excavator - Lower Left Accent */}
      <div 
        className="absolute w-[180px] h-[180px] md:w-[280px] md:h-[280px] bottom-10 left-2 md:bottom-20 md:left-10 text-slate-800"
        style={{ transform: 'rotate(2deg)' }}
        id="bg-graphic-excavator"
      >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <rect x="15" y="70" width="55" height="15" rx="7.5" fill="currentColor" fillOpacity="0.1" />
          <circle cx="23" cy="77.5" r="5" />
          <circle cx="37" cy="77.5" r="5" />
          <circle cx="51" cy="77.5" r="5" />
          <circle cx="62" cy="77.5" r="5" />
          <path d="M 15,77.5 L 70,77.5" />
          <path d="M 20,70 L 20,45 L 45,45 L 55,55 L 55,70 Z" fill="currentColor" fillOpacity="0.1" />
          <rect x="25" y="49" width="12" height="12" rx="1" />
          <path d="M 40,49 L 46,49 L 49,55 L 40,55 Z" />
          <rect x="12" y="55" width="8" height="15" rx="2" />
          <path d="M 50,60 L 70,38" strokeWidth="2.2" />
          <path d="M 70,38 L 85,55" strokeWidth="1.8" />
          <path d="M 85,55 L 78,63 C 76,65 72,63 71,60 L 75,54 Z" fill="currentColor" fillOpacity="0.2" strokeWidth="1.2" />
          <path d="M 45,67 L 62,48" strokeWidth="0.8" />
          <path d="M 64,43 L 78,50" strokeWidth="0.8" />
        </svg>
      </div>

      {/* 3. Kamaz/Dump Truck - Mid Right Ambient background */}
      <div 
        className="absolute w-[160px] h-[160px] md:w-[260px] md:h-[260px] top-[40%] right-4 md:right-16 text-slate-800"
        style={{ transform: 'rotate(-4deg)' }}
        id="bg-graphic-truck"
      >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M 10,75 L 85,75" strokeWidth="2" />
          <circle cx="25" cy="75" r="8" fill="currentColor" fillOpacity="0.15" strokeWidth="1.2" />
          <circle cx="25" cy="75" r="3" fill="currentColor" />
          <circle cx="58" cy="75" r="8" fill="currentColor" fillOpacity="0.15" strokeWidth="1.2" />
          <circle cx="58" cy="75" r="3" fill="currentColor" />
          <circle cx="73" cy="75" r="8" fill="currentColor" fillOpacity="0.15" strokeWidth="1.2" />
          <circle cx="73" cy="75" r="3" fill="currentColor" />
          <path d="M 12,70 L 12,42 L 28,42 L 34,54 L 34,70 Z" fill="currentColor" fillOpacity="0.1" />
          <path d="M 15,46 L 26,46 L 29,52 L 15,52 Z" />
          <rect x="40" y="68" width="12" height="6" rx="1" />
          <path d="M 37,67 L 85,67 L 90,44 L 37,44 Z" fill="currentColor" fillOpacity="0.18" />
          <path d="M 45,44 L 45,67 M 55,44 L 55,67 M 65,44 L 65,67 M 75,44 L 75,67 M 85,44 L 85,67" />
          <path d="M 13,42 L 13,34" />
        </svg>
      </div>

      {/* 4. Under Construction Building - Left Side Main Background Accent */}
      <div 
        className="absolute w-[180px] h-[240px] md:w-[280px] md:h-[350px] top-28 left-4 md:top-40 md:left-14 text-slate-800"
        style={{ transform: 'rotate(-1deg)' }}
        id="bg-graphic-building"
      >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M 20,95 L 20,20 L 70,20 L 70,95" />
          <path d="M 15,35 L 75,35 M 15,50 L 75,50 M 15,65 L 75,65 M 15,80 L 75,80 Q 20,95 70,95" />
          <path d="M 32,20 L 32,95 M 45,20 L 45,95 M 58,20 L 58,95" />
          <path d="M 75,25 L 85,25 M 75,40 L 85,40 M 75,55 L 85,55 M 75,70 L 85,70 M 75,85 L 85,85" />
          <path d="M 80,20 L 80,95" />
          <path d="M 75,20 L 85,35 M 85,35 L 75,50 M 75,50 L 85,65 M 85,65 L 75,80 M 75,80 L 85,95" />
          <rect x="23" y="38" width="6" height="8" rx="0.5" fill="currentColor" fillOpacity="0.05" />
          <rect x="35" y="38" width="6" height="8" rx="0.5" fill="currentColor" fillOpacity="0.05" />
          <rect x="23" y="53" width="6" height="8" rx="0.5" fill="currentColor" fillOpacity="0.05" />
          <rect x="35" y="53" width="6" height="8" rx="0.5" fill="currentColor" fillOpacity="0.05" />
          <rect x="48" y="53" width="6" height="8" rx="0.5" fill="currentColor" fillOpacity="0.05" />
          <rect x="23" y="68" width="6" height="8" rx="0.5" fill="currentColor" fillOpacity="0.05" />
          <rect x="35" y="68" width="6" height="8" rx="0.5" fill="currentColor" fillOpacity="0.05" />
          <rect x="48" y="68" width="6" height="8" rx="0.5" fill="currentColor" fillOpacity="0.05" />
          <rect x="61" y="68" width="6" height="8" rx="0.5" fill="currentColor" fillOpacity="0.05" />
          <path d="M 50,20 L 50,5 L 68,5 M 62,5 L 62,12" strokeWidth="0.8" />
        </svg>
      </div>

      {/* 5. Shovels - Bottom Centered Accent */}
      <div 
        className="absolute w-[100px] h-[100px] md:w-[150px] md:h-[150px] bottom-16 right-[30%] text-slate-800 hidden md:block"
        id="bg-graphic-shovels"
      >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <g transform="translate(10, 15) rotate(-15 50 50)">
            <path d="M 30,85 L 30,30" strokeWidth="2" />
            <path d="M 26,30 L 34,30 M 26,26 L 34,26 M 26,26 L 26,30 M 34,26 L 34,30 M 30,26 L 30,22" />
            <circle cx="30" cy="18" r="3" fill="currentColor" fillOpacity="0.1" />
            <path d="M 22,85 C 22,72 23,70 25,65 L 35,65 C 37,70 38,72 38,85 Z" fill="currentColor" fillOpacity="0.1" />
            <path d="M 25,65 L 35,65 M 30,65 L 30,85" />
          </g>
          <g transform="translate(45, 10) rotate(35 50 50)">
            <path d="M 30,85 L 30,35" strokeWidth="1.8" />
            <path d="M 25,35 H 35 M 25,31 H 35 L 30,31 Z" />
            <path d="M 21,70 L 39,70 L 39,80 L 30,92 L 21,80 Z" fill="currentColor" fillOpacity="0.15" />
          </g>
        </svg>
      </div>

      {/* 6. Soft Hard Hat - Bottom Right Accent */}
      <div 
        className="absolute w-[100px] h-[100px] md:w-[160px] md:h-[160px] bottom-4 right-4 md:bottom-8 md:right-24 text-slate-800"
        style={{ transform: 'rotate(5deg)' }}
        id="bg-graphic-hardhat"
      >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M 20,60 C 20,25 80,25 80,60 Z" fill="currentColor" fillOpacity="0.1" strokeWidth="1.4" />
          <path d="M 12,60 C 12,58 15,57 20,57 L 80,57 C 85,57 88,58 88,60 C 88,62 85,63 80,63 L 20,63 C 15,63 12,62 12,60 Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M 44,28 C 46,25 54,25 56,28 L 56,57 L 44,57 Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M 28,63 C 28,75 72,75 72,63" strokeDasharray="3 3" />
          <circle cx="50" cy="74" r="4" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Blueprint grid accent underneath everything to add genuine architectural vibe */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_top,#0000000a_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_100%)] opacity-30 pointer-events-none" />
    </div>
  );
}
