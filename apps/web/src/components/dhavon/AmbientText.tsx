'use client';

import React from 'react';

export const AmbientText: React.FC = () => {
  return (
    <>
      {/* Left Ambient Stack: IDEAS INTO REALITY */}
      <div className="hidden xl:flex flex-col absolute left-8 lg:left-14 top-[34%] z-10 pointer-events-none select-none text-[11px] lg:text-xs font-normal tracking-[0.3em] text-white/20 uppercase space-y-1">
        <span>IDEAS</span>
        <span>INTO</span>
        <span>REALITY</span>
      </div>

      {/* Right Ambient Stack: A MORE FOCUSED YOU */}
      <div className="hidden xl:flex flex-col absolute right-8 lg:right-14 top-[34%] z-10 pointer-events-none select-none text-[11px] lg:text-xs font-normal tracking-[0.3em] text-white/20 uppercase space-y-1">
        <span>A MORE</span>
        <span>FOCUSED</span>
        <span>YOU</span>
      </div>
    </>
  );
};
