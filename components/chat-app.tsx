'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Plus, 
  History, 
  Search, 
  Camera, 
  Image as ImageIcon, 
  Paperclip, 
  Sparkles, 
  Lightbulb, 
  Mic, 
  AudioLines, 
  X, 
  ChevronLeft, 
  MoreHorizontal,
  SendHorizontal,
  CircleUser,
  Settings,
  Brain,
  AppWindow,
  Briefcase,
  Mail,
  Sun,
  Palette,
  Check,
  User,
  PanelLeft,
  Trash2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// --- Types ---
type Screen = 'chat' | 'sidebar' | 'profile' | 'temporary-info' | 'brain' | 'agent';
type Message = { id: string; role: 'user' | 'assistant'; content: string };
type Conversation = { id: string; title: string; updated_at: string };

// --- Main App Component ---
export default function ChatApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [apiKeys, setApiKeys] = useState<{gemini: string, groq: string, deepseek: string}>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexum_api_keys');
      return saved ? JSON.parse(saved) : { gemini: '', groq: '', deepseek: '' };
    }
    return { gemini: '', groq: '', deepseek: '' };
  });
  const [activeProvider, setActiveProvider] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexum_provider') || 'Gemini';
    }
    return 'Gemini';
  });
  const [obsidianPath, setObsidianPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexum_obsidian_path') || 'Notes/AI_Generated';
    }
    return 'Notes/AI_Generated';
  });
  const [obsidianConnected, setObsidianConnected] = useState(true);
  const [agents, setAgents] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexum_agents');
      return saved ? JSON.parse(saved) : [
        { name: 'Google Cloud Tools', status: 'Ativo' },
        { name: 'GitHub Integration', status: 'Ativo' },
        { name: 'Notion Sync', status: 'Desconectado' }
      ];
    }
    return [
      { name: 'Google Cloud Tools', status: 'Ativo' },
      { name: 'GitHub Integration', status: 'Ativo' },
      { name: 'Notion Sync', status: 'Desconectado' }
    ];
  });
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persistence logic (saving only)
  useEffect(() => {
    if (apiKeys.gemini || apiKeys.groq || apiKeys.deepseek) {
      localStorage.setItem('nexum_api_keys', JSON.stringify(apiKeys));
    }
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('nexum_provider', activeProvider);
  }, [activeProvider]);

  useEffect(() => {
    localStorage.setItem('nexum_obsidian_path', obsidianPath);
  }, [obsidianPath]);

  useEffect(() => {
    localStorage.setItem('nexum_agents', JSON.stringify(agents));
  }, [agents]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Load conversations history
  useEffect(() => {
    const init = async () => {
      await fetchConversations();
    };
    init();
  }, []);

  const handleConversationSelect = (id: string) => {
    setConversationId(id);
    fetchMessages(id);
    setCurrentScreen('chat');
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setCurrentScreen('chat');
  };

  const deleteConversation = async (id: string) => {
    if (!confirm('Deseja excluir esta conversa?')) return;
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (conversationId === id) handleNewChat();
      fetchConversations();
    } catch (e) { console.error(e); }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          conversationId: isTemporaryChat ? null : conversationId,
          provider: activeProvider,
          apiKeys: apiKeys
        }),
      });

      const data = await response.json();
      if (data.role) {
        setMessages((prev) => [...prev, { id: Date.now().toString(), ...data }]);
        if (!isTemporaryChat && data.conversationId) {
          setConversationId(data.conversationId);
          fetchConversations(); // refresh list
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setLoading(false);
    }
  };

  const saveToObsidian = async (message: Message) => {
    try {
      const title = message.content.substring(0, 20).replace(/[^\w\s]/gi, '') || 'Resumo AI';
      const res = await fetch('/api/obsidian/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: message.content,
          tags: ['AI', 'Generated'],
          path: obsidianPath
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      }
    } catch (e) {
      alert('Erro ao salvar no Obsidian');
    }
  };

  const [showTemporaryModal, setShowTemporaryModal] = useState(false);

  const toggleTemporaryChat = () => {
    if (!isTemporaryChat) {
      setShowTemporaryModal(true);
    } else {
      setIsTemporaryChat(false);
    }
  };

  const confirmTemporaryChat = () => {
    setIsTemporaryChat(true);
    setShowTemporaryModal(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#111114] text-white font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        {currentScreen === 'chat' && (
          <motion.div 
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative"
          >
            {/* Top Bar - Glassmorphism */}
            <header className="flex justify-between items-center px-4 py-3 backdrop-blur-md bg-white/5 border-b border-white/5">
              <button 
                onClick={() => setCurrentScreen('sidebar')}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                {loading ? <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent animate-spin rounded-full" /> : <Menu className="w-6 h-6 text-cyan-400/80" />}
              </button>
              
              <button 
                onClick={handleNewChat}
                className="flex items-center gap-1.5 bg-gradient-to-br from-[#1e1e24] to-[#121217] px-4 py-1.5 rounded-xl border border-white/10 hover:border-white/20 transition-all shadow-inner"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/70">Novo Chat</span>
              </button>
              
              <button 
                onClick={toggleTemporaryChat}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  isTemporaryChat ? "text-purple-400 bg-purple-400/10" : "hover:bg-white/10"
                )}
              >
                <History className={cn("w-6 h-6 text-white/50", isTemporaryChat && "hidden")} />
                <div className={cn("w-6 h-6 border-2 border-dashed border-purple-400 rounded-full", !isTemporaryChat && "hidden")} />
              </button>
            </header>

            {/* Chat Content */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth no-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-8 space-y-8">
                  {isTemporaryChat ? (
                    <div className="space-y-6 animate-pulse">
                      <div className="w-16 h-16 rounded-3xl bg-purple-500/10 flex items-center justify-center mx-auto border border-purple-500/20">
                         <History className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="text-[13px] uppercase tracking-widest font-semibold text-purple-400/80 leading-relaxed">
                        Modo Seguro Ativo
                      </p>
                      <p className="text-[14px] text-white/40 max-w-[240px] mx-auto font-light leading-relaxed">
                        Esta sessão é isolada. Nenhum histórico será salvo ou usado para treinamento.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8 w-full max-w-xs">
                      <div className="text-left space-y-1">
                        <p className="text-cyan-400 text-[10px] uppercase tracking-[4px] font-bold">Inteligência</p>
                        <h2 className="text-3xl font-light text-white leading-tight">Como posso ajudar hoje?</h2>
                      </div>
                      
                      <div className="space-y-3">
                        {[
                          { icon: ImageIcon, label: 'Motor Visual', sub: 'Gerar imagens de alta resolução', prompt: 'Crie uma imagem de uma cidade futurista neon' },
                          { icon: PenLine, label: 'Suíte Criativa', sub: 'Compor & transformar textos', prompt: 'Escreva um poema sobre inteligência artificial' },
                          { icon: Search, label: 'Dados em Tempo Real', sub: 'Pesquisar notícias globais', prompt: 'Quais são as últimas notícias sobre IA?' },
                        ].map((item, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => { setInputValue(item.prompt); }}
                            className="flex items-center gap-4 bg-white/5 p-4 rounded-[24px] border border-white/5 group hover:bg-white/10 transition-all cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                               <item.icon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                               <p className="text-white text-sm font-medium">{item.label}</p>
                               <p className="text-white/30 text-[10px] uppercase font-bold">{item.sub}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 w-full pb-32">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                        msg.role === 'user' ? "items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[90%] rounded-[24px] px-5 py-4 text-[15px] leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg shadow-cyan-900/20" 
                          : "bg-white/5 border border-white/10 text-[#ececf1] prose prose-invert font-light"
                      )}>
                        {msg.content}
                        {msg.role === 'assistant' && (
                          <div className="mt-4 pt-3 border-t border-white/10 flex justify-end gap-3">
                             <button 
                              onClick={() => saveToObsidian(msg)}
                              className="text-[10px] uppercase font-black tracking-widest text-[#10a37f] hover:text-[#10a37f]/80 flex items-center gap-1"
                            >
                               <FileText className="w-3 h-3" />
                               Obsidian
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions & Input */}
            <div className="p-6 bg-gradient-to-t from-[#111114] via-[#111114] to-transparent">
              <div className="w-full space-y-4">
                <div className="relative flex items-center gap-3">
                  <button 
                    onClick={() => !isTemporaryChat && setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                    className={cn(
                      "p-3 rounded-2xl transition-all border border-white/10 shadow-xl shrink-0",
                      isAttachmentMenuOpen ? "bg-white text-black rotate-45" : "bg-white/5 text-white/70 hover:bg-white/10"
                    )}
                  >
                    {isTemporaryChat ? <History className="w-5 h-5 text-purple-400" /> : <Plus className="w-5 h-5" />}
                  </button>
                  
                  {/* Laser Border Container */}
                  <div className="flex-1 relative group">
                    {/* Laser Border effect lines */}
                    <div className="absolute -inset-[1px] rounded-[28px] overflow-hidden pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity z-0">
                        <div className="absolute top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-laser-horizontal"></div>
                        <div className="absolute right-0 w-[2px] h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-laser-vertical"></div>
                        <div className="absolute bottom-0 h-[2px] w-full bg-gradient-to-l from-transparent via-cyan-400 to-transparent animate-laser-horizontal-rev"></div>
                        <div className="absolute left-0 w-[2px] h-full bg-gradient-to-t from-transparent via-cyan-400 to-transparent animate-laser-vertical-rev"></div>
                    </div>

                    <div className="flex-1 bg-white/5 backdrop-blur-xl rounded-[28px] flex items-center px-5 py-2 border border-white/10 focus-within:border-cyan-500/20 transition-all shadow-2xl min-h-[56px] relative z-10">
                      <input 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Mensagem..."
                        className="flex-1 bg-transparent py-3 outline-none text-white placeholder-white/20 text-[16px] font-light min-w-0"
                      />
                      <div className="flex gap-2 items-center shrink-0 ml-3">
                        {!inputValue.trim() ? (
                          <>
                            <button className="p-2 hover:text-cyan-400 transition-colors text-white/30 hidden sm:block">
                              <Mic className="w-5 h-5" />
                            </button>
                            <button className="p-2 hover:text-cyan-400 transition-colors text-white/30">
                              <AudioLines className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={handleSendMessage}
                            className="bg-cyan-500 text-black p-2.5 rounded-full hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center justify-center"
                          >
                            <SendHorizontal className="w-5 h-5 rotate-[-90deg]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attachment Menu Popup - Immersive UI */}
            <AnimatePresence>
              {isAttachmentMenuOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsAttachmentMenuOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                    className="absolute bottom-28 left-6 right-6 bg-[#1a1a1f] rounded-[32px] overflow-hidden z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 p-2"
                  >
                    <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: Camera, label: 'Câmera', action: () => alert('Recurso de Câmera (Simulado)') },
                      { icon: ImageIcon, label: 'Fotos', action: () => document.getElementById('file-input')?.click() },
                      { icon: Paperclip, label: 'Arquivos', action: () => document.getElementById('file-input')?.click() },
                      { icon: Sparkles, label: 'Render', action: () => setInputValue('/render ') },
                      { icon: Lightbulb, label: 'Ideias', action: () => setInputValue('Dê-me algumas ideias criativas para... ') },
                      { icon: Search, label: 'Pesquisa', action: () => setInputValue('Pesquise sobre... ') },
                    ].map((item, idx) => (
                      <button 
                        key={idx}
                        onClick={() => { item.action(); if(idx !== 3 && idx !== 4 && idx !== 5) setIsAttachmentMenuOpen(false); }}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-white/5 transition-all text-white/70 hover:text-cyan-400 group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-cyan-500/50">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-widest">{item.label}</span>
                      </button>
                    ))}
                    </div>
                    <input 
                      id="file-input" 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setInputValue(`Arquivo anexado: ${file.name}`);
                          setIsAttachmentMenuOpen(false);
                        }
                      }}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {currentScreen === 'sidebar' && (
          <Sidebar 
            key="sidebar" 
            onClose={() => setCurrentScreen('chat')} 
            onProfileClick={() => setCurrentScreen('profile')} 
            onBrainClick={() => setCurrentScreen('brain')}
            onAgentClick={() => setCurrentScreen('agent')}
            conversations={conversations}
            onConversationSelect={handleConversationSelect}
            onDeleteConversation={deleteConversation}
            currentId={conversationId}
            onNewChat={handleNewChat}
          />
        )}
        
        {currentScreen === 'profile' && (
          <ProfileScreen 
            key="profile" 
            onClose={() => setCurrentScreen('chat')} 
            activeProvider={activeProvider}
            setActiveProvider={setActiveProvider}
            apiKeys={apiKeys}
            setApiKeys={setApiKeys}
          />
        )}

        {currentScreen === 'brain' && (
          <BrainScreen 
            key="brain" 
            onClose={() => setCurrentScreen('chat')} 
            path={obsidianPath}
            setPath={setObsidianPath}
            connected={obsidianConnected}
            setConnected={setObsidianConnected}
          />
        )}

        {currentScreen === 'agent' && (
          <AgentScreen 
            key="agent" 
            onClose={() => setCurrentScreen('chat')} 
            agents={agents}
            setAgents={setAgents}
          />
        )}

        {showTemporaryModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="absolute inset-0 z-[100] bg-[#08080a] flex flex-col pt-16 overflow-hidden"
          >
             {/* Decorative blob inside modal */}
             <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none"></div>

             <div className="flex-1 px-10 space-y-12 relative z-10">
               <div>
                 <p className="text-purple-400 text-[10px] uppercase tracking-[4px] font-bold mb-2">Protocolo de segurança</p>
                 <h2 className="text-4xl font-light leading-tight">Chat temporário</h2>
               </div>
               
               <div className="space-y-10">
                 {[
                   { 
                     icon: History, 
                     title: 'Não fica no histórico', 
                     desc: 'Chats temporários não aparecerão no seu histórico. Por motivos de segurança, poderemos manter uma cópia por até 30 dias.' 
                   },
                   { 
                     icon: PanelLeft, 
                     title: 'Sem memória', 
                     desc: 'O sistema não usará nem criará memórias em chats temporários. Instruções personalizadas ainda serão seguidas.' 
                   },
                   { 
                     icon: User, 
                     title: 'Sem treinamento', 
                     desc: 'Seus dados em chats temporários não serão usados para treinar nossos modelos de IA.' 
                   }
                 ].map((feature, idx) => (
                   <div key={idx} className="flex gap-6 group">
                     <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl border border-white/5 group-hover:border-purple-500/30 transition-colors shrink-0">
                       <feature.icon className="w-5 h-5 text-purple-400/80" />
                     </div>
                     <div className="space-y-1 border-b border-white/5 pb-6 flex-1">
                       <h4 className="text-[17px] font-semibold text-white/90">{feature.title}</h4>
                       <p className="text-[14px] text-white/40 leading-relaxed font-light">
                        {feature.desc}
                       </p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>

             <div className="p-10 relative z-10">
               <button 
                onClick={confirmTemporaryChat}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-[0_10px_30px_rgba(147,51,234,0.3)] hover:opacity-90 transition-all"
               >
                 Acessar Modo Seguro
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Android Navigation Bar Simulation - Removed as requested */}
      {/* Home Indicator */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/5 rounded-full z-10"></div>
    </div>
  );
}

// --- Sidebar Component ---
function Sidebar({ 
  onClose, 
  onProfileClick, 
  onBrainClick,
  onAgentClick,
  conversations, 
  onConversationSelect, 
  onDeleteConversation,
  currentId,
  onNewChat 
}: { 
  onClose: () => void, 
  onProfileClick: () => void,
  onBrainClick: () => void,
  onAgentClick: () => void,
  conversations: Conversation[],
  onConversationSelect: (id: string) => void,
  onDeleteConversation: (id: string) => void,
  currentId: string | null,
  onNewChat: () => void
}) {
  return (
    <motion.div 
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-[#0d0d0f] flex flex-col"
    >
      <header className="flex justify-between items-center px-6 py-6 border-b border-white/5 backdrop-blur-md bg-white/5">
        <span className="text-[20px] font-light tracking-tighter uppercase text-cyan-400">Nexum</span>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => { onNewChat(); onClose(); }}
            className="p-2 hover:bg-white/10 rounded-xl"
          >
            <Plus className="w-6 h-6 text-cyan-400" />
          </button>
          <button onClick={onProfileClick} className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[12px] font-bold shadow-lg shadow-cyan-900/20">
            AH
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 no-scrollbar">
        <div className="space-y-6">
          <div 
            onClick={onBrainClick}
            className="flex items-center gap-4 group cursor-pointer hover:text-cyan-400 transition-colors"
          >
            <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/5 group-hover:border-cyan-500/50">
               <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-[15px] font-medium uppercase tracking-widest text-white/80">Cérebro</span>
          </div>

          <div 
            onClick={onAgentClick}
            className="flex items-center gap-4 group cursor-pointer hover:text-cyan-400 transition-colors"
          >
            <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/5 group-hover:border-cyan-500/50">
               <User className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-[15px] font-medium uppercase tracking-widest text-white/80">Agente</span>
          </div>

          <h3 className="text-[10px] font-black text-cyan-400/60 uppercase tracking-[4px] mt-8">Recentes</h3>
          <div className="space-y-4">
            {conversations.length === 0 && (
              <p className="text-white/20 text-sm italic">Nenhum chat salvo</p>
            )}
            {conversations.map((chat) => (
              <div 
                key={chat.id} 
                className={cn(
                  "flex items-center justify-between group border-l-2 pl-4 py-2 transition-all cursor-pointer",
                  currentId === chat.id ? "border-cyan-500 bg-white/5" : "border-transparent text-white/60 hover:text-white"
                )}
              >
                <span 
                  className="text-[15px] flex-1 truncate pr-4"
                  onClick={() => onConversationSelect(chat.id)}
                >
                  {chat.title}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteConversation(chat.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 border-t border-white/5 bg-white/5 backdrop-blur-xl">
        <button 
          onClick={onClose}
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-bold text-md shadow-2xl hover:bg-white/90 transition-all uppercase tracking-widest"
        >
          <PanelLeft className="w-5 h-5" />
          Retornar
        </button>
      </div>
    </motion.div>
  );
}

// --- Profile Screen component ---
function ProfileScreen({ 
  onClose,
  activeProvider,
  setActiveProvider,
  apiKeys,
  setApiKeys
}: { 
  onClose: () => void,
  activeProvider: string,
  setActiveProvider: (p: string) => void,
  apiKeys: any,
  setApiKeys: (keys: any) => void
}) {
  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-[60] bg-[#08080a] flex flex-col overflow-y-auto no-scrollbar"
    >
      <header className="flex items-center px-6 py-8 gap-6 relative z-10">
        <button onClick={onClose} className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center flex-1 pr-16">
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl font-light shadow-[0_20px_50px_rgba(6,182,212,0.2)] border border-white/20">
              AH
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-[#1e1e24] rounded-xl border border-white/10 shadow-lg">
              <svg className="w-4 h-4 fill-cyan-400" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-light tracking-tight text-white">Arthur Henrique</h2>
          <p className="text-[10px] uppercase font-black text-cyan-400 tracking-[3px] mt-1 opacity-60">Usuário Verificado</p>
        </div>
      </header>

      <main className="px-6 py-8 space-y-10">
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/30 px-2 uppercase tracking-[3px]">Provedor de IA</h3>
          <div className="bg-white/5 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm p-4 space-y-3">
             {['Gemini', 'Groq', 'Deepseek'].map((provider) => (
               <div 
                key={provider} 
                onClick={() => setActiveProvider(provider)}
                className={cn(
                  "flex items-center justify-between px-5 py-4 rounded-2xl border transition-all cursor-pointer",
                  activeProvider === provider ? "bg-cyan-500/10 border-cyan-500/50" : "bg-white/5 border-transparent hover:bg-white/10"
                )}
               >
                 <div className="flex items-center gap-4">
                   <div className={cn(
                     "w-2 h-2 rounded-full",
                     activeProvider === provider ? "bg-cyan-400 animate-pulse" : "bg-white/20"
                   )}></div>
                   <span className="text-[15px] font-medium">{provider}</span>
                 </div>
                 {activeProvider === provider && <Check className="w-5 h-5 text-cyan-400" />}
               </div>
             ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/30 px-2 uppercase tracking-[3px]">API Keys (Local Safe)</h3>
          <div className="bg-white/5 border border-white/5 rounded-[32px] p-6 space-y-5 backdrop-blur-sm">
             <div className="space-y-2">
               <label className="text-[11px] uppercase font-bold text-white/40 ml-1">Gemini Key</label>
               <input 
                type="password" 
                value={apiKeys.gemini}
                onChange={(e) => setApiKeys({...apiKeys, gemini: e.target.value})}
                placeholder="Ex: AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all"
               />
             </div>
             <div className="space-y-2">
               <label className="text-[11px] uppercase font-bold text-white/40 ml-1">Groq Key</label>
               <input 
                type="password" 
                value={apiKeys.groq}
                onChange={(e) => setApiKeys({...apiKeys, groq: e.target.value})}
                placeholder="Ex: gsk_..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all"
               />
             </div>
             <div className="space-y-2">
               <label className="text-[11px] uppercase font-bold text-white/40 ml-1">Deepseek Key</label>
               <input 
                type="password" 
                value={apiKeys.deepseek}
                onChange={(e) => setApiKeys({...apiKeys, deepseek: e.target.value})}
                placeholder="Ex: sk-..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all"
               />
             </div>
          </div>
        </section>

        <section className="space-y-4 pb-20">
           <div className="flex gap-4">
             <div className="flex-1 bg-white/5 border border-white/5 rounded-[28px] p-6 hover:bg-white/10 transition-all cursor-pointer group">
                <Sun className="w-6 h-6 text-cyan-400 mb-3" />
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Aparência</p>
                <p className="text-sm font-medium">Dark Mode</p>
             </div>
             <div className="flex-1 bg-white/5 border border-white/5 rounded-[28px] p-6 hover:bg-white/10 transition-all cursor-pointer group">
                <Palette className="w-6 h-6 text-purple-400 mb-3" />
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Accent</p>
                <p className="text-sm font-medium">Cyan Glow</p>
             </div>
           </div>
        </section>
      </main>

      <footer className="mt-auto p-10 flex items-center justify-center backdrop-blur-xl bg-white/5 border-t border-white/5">
        <div 
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 cursor-pointer hover:bg-red-500/20 transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[12px] uppercase font-black tracking-[2px]">Reset Session</span>
        </div>
      </footer>
    </motion.div>
  );
}

// --- Brain Screen component ---
function BrainScreen({ 
  onClose,
  path,
  setPath,
  connected,
  setConnected
}: { 
  onClose: () => void,
  path: string,
  setPath: (p: string) => void,
  connected: boolean,
  setConnected: (c: boolean) => void
}) {
  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-[60] bg-[#08080a] flex flex-col overflow-y-auto no-scrollbar"
    >
      <header className="flex items-center px-6 py-8 gap-6 relative z-10">
        <button onClick={onClose} className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center flex-1 pr-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-4 shadow-[0_0_30px_rgba(147,51,234,0.15)]">
            <Brain className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-2xl font-light tracking-tight text-white uppercase tracking-[4px]">Cérebro</h2>
          <p className="text-[10px] uppercase font-black text-purple-400 tracking-[3px] mt-1 opacity-60">Integração Obsidian</p>
        </div>
      </header>

      <main className="px-6 py-8 space-y-10">
        <div className="bg-white/5 border border-white/5 rounded-[32px] p-8 space-y-8 backdrop-blur-sm">
           <div className="space-y-4">
             <p className="text-[11px] uppercase font-bold text-white/40">Status do Vault</p>
             <div 
              onClick={() => setConnected(!connected)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer",
                connected ? "bg-[#10a37f]/10 border-[#10a37f]/20" : "bg-red-500/10 border-red-500/20"
              )}
             >
               <div className={cn("w-2 h-2 rounded-full", connected ? "bg-[#10a37f] animate-pulse" : "bg-red-500")}></div>
               <span className={cn("text-sm font-medium", connected ? "text-[#10a37f]" : "text-red-400")}>
                {connected ? 'Conectado ao Obsidian Local' : 'Desconectado'}
               </span>
             </div>
           </div>

           <div className="space-y-4">
             <p className="text-[11px] uppercase font-bold text-white/40">Pasta de Exportação</p>
             <input 
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-purple-500/50 outline-none transition-all"
             />
           </div>

           <div className="space-y-4 pt-4 border-t border-white/5">
             <p className="text-[11px] uppercase font-bold text-white/40">Sincronização</p>
             <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Indexar novas notas automaticamente</span>
                <div className="w-12 h-6 bg-cyan-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
             </div>
           </div>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/30 px-2 uppercase tracking-[3px]">Ações do Cérebro</h3>
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => alert('Sincronização iniciada...')}
              className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:bg-white/10 transition-all cursor-pointer text-center group"
            >
               <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-all">
                  <Search className="w-5 h-5 text-cyan-400" />
               </div>
               <span className="text-[10px] uppercase font-bold tracking-widest">Reindexar</span>
            </div>
            <div 
              onClick={() => alert('Cache limpo.')}
              className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:bg-white/10 transition-all cursor-pointer text-center group"
            >
               <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                  <FileText className="w-5 h-5 text-purple-400" />
               </div>
               <span className="text-[10px] uppercase font-bold tracking-widest">Limpar Cache</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto p-10">
        <button 
          onClick={() => { alert('Configurações salvas com sucesso!'); onClose(); }}
          className="w-full py-4 bg-white text-black rounded-2xl font-bold uppercase tracking-widest shadow-2xl"
        >
          Confirmar Configurações
        </button>
      </footer>
    </motion.div>
  );
}

// --- Agent Screen component ---
function AgentScreen({ 
  onClose,
  agents,
  setAgents
}: { 
  onClose: () => void,
  agents: any[],
  setAgents: (a: any[]) => void
}) {
  const toggleAgent = (idx: number) => {
    const newAgents = [...agents];
    newAgents[idx].status = newAgents[idx].status === 'Ativo' ? 'Desconectado' : 'Ativo';
    setAgents(newAgents);
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-[60] bg-[#08080a] flex flex-col overflow-y-auto no-scrollbar"
    >
      <header className="flex items-center px-6 py-8 gap-6 relative z-10">
        <button onClick={onClose} className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center flex-1 pr-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <User className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-light tracking-tight text-white uppercase tracking-[4px]">Agente</h2>
          <p className="text-[10px] uppercase font-black text-cyan-400 tracking-[3px] mt-1 opacity-60">Conexões de APIs</p>
        </div>
      </header>

      <main className="px-6 py-8 space-y-10">
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/30 px-2 uppercase tracking-[3px]">Status do Agente</h3>
          <div className="bg-white/5 border border-white/5 rounded-[32px] p-6 backdrop-blur-sm space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Capacidade de Execução</span>
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-[10px] font-bold uppercase">Online</span>
             </div>
             <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-4/5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
             </div>
             <p className="text-[10px] text-white/30 uppercase font-bold text-center">Otimização de Memória: 82%</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/30 px-2 uppercase tracking-[3px]">Integrações Ativas</h3>
          <div className="space-y-3">
             {agents.map((integration, idx) => (
               <div 
                key={idx} 
                onClick={() => toggleAgent(idx)}
                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer"
               >
                  <span className="text-sm font-medium">{integration.name}</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase",
                    integration.status === 'Ativo' ? "text-cyan-400" : "text-white/20"
                  )}>{integration.status}</span>
               </div>
             ))}
          </div>
        </section>

        <button 
          onClick={() => {
            const name = prompt('Nome da integração:');
            if (name) setAgents([...agents, { name, status: 'Ativo' }]);
          }}
          className="w-full py-4 border border-dashed border-white/20 rounded-2xl text-white/40 text-[10px] uppercase font-black tracking-widest hover:border-cyan-500/40 hover:text-cyan-400 transition-all"
        >
          Adicionar Nova API
        </button>
      </main>

      <footer className="mt-auto p-10">
        <button 
          onClick={() => { alert('Agentes sincronizados!'); onClose(); }}
          className="w-full py-4 bg-cyan-500 text-black rounded-2xl font-bold uppercase tracking-widest shadow-2xl hover:bg-cyan-400 transition-all"
        >
          Salvar Agente
        </button>
      </footer>
    </motion.div>
  );
}

function PenLine(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
