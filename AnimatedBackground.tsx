import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-300 to-transparent"></div>

      {/* Truck 1 - Moving across the screen */}
      <motion.div
        className="absolute bottom-4 left-0 w-32 h-16"
        animate={{
          x: ['-20vw', '120vw'],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'linear'
        }}
      >
        <div className="relative w-full h-full">
          {/* Cab */}
          <div className="absolute right-0 bottom-2 w-8 h-8 bg-slate-700 rounded-r-md">
            <div className="absolute top-1 right-1 w-4 h-4 bg-blue-200 rounded-sm"></div>
          </div>
          {/* Body */}
          <div className="absolute left-0 bottom-2 w-24 h-12 bg-amber-600 rounded-l-md border-t-4 border-amber-700"></div>
          {/* Wheels */}
          <div className="absolute left-4 bottom-0 w-5 h-5 bg-slate-900 rounded-full border-2 border-slate-400"></div>
          <div className="absolute left-12 bottom-0 w-5 h-5 bg-slate-900 rounded-full border-2 border-slate-400"></div>
          <div className="absolute right-2 bottom-0 w-5 h-5 bg-slate-900 rounded-full border-2 border-slate-400"></div>
        </div>
      </motion.div>

      {/* Building Under Construction (Left) */}
      <div className="absolute bottom-12 left-[15%] w-48 h-[50vh] border-x-4 border-amber-600/80 flex flex-col-reverse justify-start">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="w-full h-12 border-b-4 border-amber-600/80 relative bg-amber-500/20"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{
              duration: 2,
              delay: i * (30 / 12),
              repeat: Infinity,
              repeatType: 'loop',
              repeatDelay: 30 - (i * (30 / 12) + 2) // Reset and start over
            }}
          >
            {/* Scaffolding details */}
            <div className="absolute inset-0 flex">
              <div className="w-1/3 h-full border-r-2 border-amber-500/60"></div>
              <div className="w-1/3 h-full border-r-2 border-amber-500/60"></div>
            </div>
            <div className="absolute inset-0 flex flex-col">
              <div className="h-1/2 w-full border-b-2 border-amber-500/60"></div>
            </div>
            {/* Diagonal scaffolding */}
            <div className="absolute inset-0 w-full h-full border-l-2 border-amber-500/60 rotate-45 transform origin-bottom-left scale-150 opacity-60"></div>
          </motion.div>
        ))}
      </div>

      {/* Crane 1 (Left Building) */}
      <motion.div className="absolute bottom-[35vh] left-[5%] w-24 h-64 border-l-4 border-r-4 border-amber-500/80 opacity-90 flex flex-col justify-between items-center z-10" style={{ left: 'calc(15% - 20px)' }}>
        {/* Crane Tower */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-full h-10 border-b-4 border-amber-500/80 relative">
            <div className="absolute inset-0 w-[140%] border-t-2 border-amber-500/80 rotate-45 origin-top-left"></div>
          </div>
        ))}
      </motion.div>
      
      {/* Crane Boom and Hook */}
      <motion.div 
        className="absolute bottom-[calc(35vh+15rem)] left-[10%] origin-left"
        style={{ left: 'calc(15% - 10px)' }}
        animate={{
          rotate: [0, 45, 0, -20, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Crane Boom */}
        <div className="w-[40vw] h-6 border-y-4 border-amber-500/70 relative bg-amber-500/10">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute top-0 h-full w-4 border-r-2 border-amber-500/50" style={{ left: `${i * 5}%` }}>
              <div className="w-[140%] h-px border-b border-amber-500/50 rotate-45 transform origin-top-left absolute top-0"></div>
            </div>
          ))}
        </div>
        {/* Cabin */}
        <div className="absolute -bottom-8 left-0 w-12 h-10 bg-slate-700 rounded-sm">
           <div className="absolute top-1 right-1 w-6 h-6 bg-blue-200/50"></div>
        </div>
        
        {/* Hook and Line */}
        <motion.div 
          className="absolute top-full w-0.5 bg-slate-600/80"
          animate={{
            left: ['10%', '80%', '10%'],
            height: ['40vh', '10vh', '40vh']
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Hook */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-12 border-4 border-t-0 border-slate-700 rounded-b-xl border-l-0"></div>
          {/* Load */}
          <motion.div 
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-12 bg-slate-300/80 border-2 border-slate-400"
            animate={{
              opacity: [1, 1, 0, 0, 1]
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              times: [0, 0.4, 0.5, 0.9, 1]
            }}
          ></motion.div>
        </motion.div>
      </motion.div>

      {/* Building Under Construction (Right) */}
      <div className="absolute bottom-12 right-[20%] w-64 h-[40vh] border-x-4 border-amber-600/80 flex flex-col-reverse justify-start">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="w-full h-12 border-b-4 border-amber-600/80 relative bg-amber-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 2,
              delay: i * (30 / 8),
              repeat: Infinity,
              repeatType: 'loop',
              repeatDelay: 30 - (i * (30 / 8) + 2)
            }}
          >
            <div className="absolute inset-0 flex justify-around items-center">
               <div className="w-6 h-8 bg-amber-500/40"></div>
               <div className="w-6 h-8 bg-amber-500/40"></div>
               <div className="w-6 h-8 bg-amber-500/40"></div>
               <div className="w-6 h-8 bg-amber-500/40"></div>
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
};

export default AnimatedBackground;
