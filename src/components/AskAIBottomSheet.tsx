import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Clock,
  FileText,
  Languages,
  HelpCircle,
  FileSearch,
  BookOpen,
  ArrowDown,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenshotItem } from "../types";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  isStreaming?: boolean;
  timestamp: string;
}

interface AskAIBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: ScreenshotItem | null;
}

const PRESET_PROMPTS = [
  {
    label: "What is this?",
    icon: HelpCircle,
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300",
  },
  {
    label: "When did I save it?",
    icon: Clock,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300",
  },
  {
    label: "Summarize",
    icon: FileText,
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300",
  },
  {
    label: "Extract important information",
    icon: FileSearch,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300",
  },
  {
    label: "Translate",
    icon: Languages,
    color: "from-indigo-500/20 to-violet-500/20 border-indigo-500/40 text-indigo-300",
  },
  {
    label: "Explain",
    icon: BookOpen,
    color: "from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-300",
  },
];

export const AskAIBottomSheet: React.FC<AskAIBottomSheetProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome greeting when opened
  useEffect(() => {
    if (isOpen && item && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hi! I'm Gemini 3.6 Flash. Ask me anything about **"${item.title}"** or pick a prompt below!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [isOpen, item]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (!isOpen || !item) return null;

  const handleSendQuestion = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isStreaming) return;

    const userMsgId = `user_${Date.now()}`;
    const aiMsgId = `ai_${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add user message & empty streaming AI placeholder
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: q, timestamp: nowTime },
      { id: aiMsgId, sender: "ai", text: "", isStreaming: true, timestamp: nowTime },
    ]);

    setInputQuery("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/ask-ai-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          item,
          base64Data: item.imageUrl,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId
                      ? { ...msg, text: accumulatedText }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      // Finalize streaming
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (err: any) {
      console.error("Failed streaming response:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                text: "Sorry, I ran into an error while analyzing this screenshot. Please try again.",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md">
        {/* Backdrop overlay click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Bottom Sheet Container */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="relative z-10 w-full max-w-4xl mx-auto h-[82vh] max-h-[750px] bg-[#07090D] border-t border-white/[0.08] rounded-t-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-slate-100"
        >
          {/* Handlebar Top bar */}
          <div className="pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 rounded-full bg-slate-700/80 mb-2" />
          </div>

          {/* Sheet Header */}
          <div className="px-6 pb-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0D1117]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] shadow-lg shadow-[#3B82F6]/25">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                    Ask AI Assistant
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30">
                    Gemini 3.6 Flash
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
                  Analyzing: <span className="text-[#3B82F6] font-medium">{item.title}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[#18202B] hover:bg-white/10 text-slate-300 border border-white/[0.08] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Prompts */}
          <div className="px-6 py-3 bg-[#0D1117]/60 border-b border-white/[0.08] overflow-x-auto no-scrollbar flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#3B82F6]" /> Prompts:
            </span>
            {PRESET_PROMPTS.map((prompt, idx) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendQuestion(prompt.label)}
                  disabled={isStreaming}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 bg-[#121821] hover:bg-[#18202B] border-white/[0.08] hover:border-white/15 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>{prompt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#07090D]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="w-8 h-8 rounded-2xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-lg ${
                    msg.sender === "user"
                      ? "bg-[#3B82F6] text-white rounded-br-xs"
                      : "bg-[#121821] border border-white/[0.08] text-slate-100 rounded-bl-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">
                    {msg.text || (msg.isStreaming && (
                      <span className="inline-flex items-center gap-1.5 text-blue-300 font-medium italic">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Thinking...
                      </span>
                    ))}
                    {msg.isStreaming && msg.text && (
                      <span className="inline-block w-1.5 h-3.5 bg-[#3B82F6] ml-1 animate-pulse" />
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400/80 border-t border-white/5 pt-1.5">
                    <span>{msg.timestamp}</span>
                    {msg.sender === "ai" && msg.text && !msg.isStreaming && (
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[#3B82F6] hover:text-blue-300"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {msg.sender === "user" && (
                  <div className="w-8 h-8 rounded-2xl bg-[#18202B] border border-white/[0.08] flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Query Input Box */}
          <div className="p-4 border-t border-white/[0.08] bg-[#0D1117]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion(inputQuery);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ask Gemini anything about this screenshot..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  disabled={isStreaming}
                  className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[#121821] border border-white/[0.08] text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] transition-all disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={!inputQuery.trim() || isStreaming}
                className="px-5 py-3 rounded-2xl bg-[#3B82F6] hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-[#3B82F6]/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Ask AI</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
