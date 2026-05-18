import ChatApp from '@/components/chat-app';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#08080a] flex items-center justify-center p-0 sm:p-4 font-sans overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Side Context Info (Desktop fill) - Matching Immersive UI */}
      <div className="absolute left-16 top-1/2 -translate-y-1/2 hidden xl:block space-y-6 pointer-events-none">
        <div className="text-white opacity-20">
          <div className="text-4xl font-light tracking-tighter uppercase">Nexus</div>
          <div className="text-6xl font-black italic mt-[-10px] uppercase">GPT_v3</div>
        </div>
        <div className="h-[1px] w-32 bg-white/10"></div>
        <div className="text-white/30 text-[10px] font-mono leading-relaxed">
          LATENCY: 12ms<br/>
          ENCRYPTION: AES-256<br/>
          MODEL: FLASH-3
        </div>
      </div>

      <div className="absolute right-16 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none">
        <div className="flex flex-col gap-4 items-end">
          <div className="w-1 h-16 bg-gradient-to-b from-cyan-500 to-transparent"></div>
          <div className="text-white/20 text-[10px] uppercase font-bold tracking-widest vertical-rl rotate-180">Immersive Interface</div>
        </div>
      </div>

      {/* Container to maintain mobile aspect ratio on desktop */}
      <div className="w-full h-full sm:w-[380px] sm:h-[820px] sm:rounded-[44px] sm:border-[10px] sm:border-[#1d1d22] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] relative bg-[#111114]">
        <ChatApp />
      </div>
    </main>
  );
}
