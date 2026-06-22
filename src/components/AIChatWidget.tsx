import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { Product } from "../types";

interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      parts: [
        { text: "Greetings! I am **VendiCart AI Shopping Assistant**. Ask me about our top hybrid headphones, luxury watches, running shoes, or organic matcha. I can help you search, compare, and recommend accessories!" }
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    
    // Append to local message list
    const newHistory = [
      ...messages,
      { role: "user" as const, parts: [{ text: userText }] }
    ];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("vendicart_token");
      const res = await fetch("/api/ai/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          message: userText,
          history: messages // Pass existing context history for real conversational memory
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [
          ...prev,
          { role: "model", parts: [{ text: data.reply }] }
        ]);
      } else {
        throw new Error(data.error || "Failed context fetch");
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: "model", parts: [{ text: "Apologies, my server uplink is experiencing transient lag. I can highly recommend our Soniq ANC Hybrid headphones or Ceremonial Matcha green tea. Feel free to try sending again!" }] }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-chat-widget-root" className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Pin */}
      {!isOpen && (
        <button
          id="ai-widget-toggle-btn"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-neutral-900 border border-neutral-700/50 hover:bg-neutral-800 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6 animate-pulse group-hover:scale-115 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-sm font-medium pr-1 font-display tracking-wide">VendiCart Assistant</span>
        </button>
      )}

      {/* Chat Window Frame */}
      {isOpen && (
        <div 
          id="ai-chat-main-container"
          className="w-96 md:w-[420px] h-[550px] bg-white border border-neutral-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300"
        >
          {/* Header */}
          <div className="bg-neutral-900 text-white p-4 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-400">
                <Sparkles className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h4 className="font-semibold text-sm tracking-wide font-display">VendiCart AI Co-Pilot</h4>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  Online • catalog hydrated
                </div>
              </div>
            </div>
            <button 
              id="ai-widget-close-btn"
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick recommendations chips */}
          <div className="px-4 py-2 bg-neutral-50/80 border-b border-neutral-200 flex gap-2 overflow-x-auto text-[11px] scrollbar-none">
            <button 
              onClick={() => setInput("Show me high rating headphones")}
              className="bg-white border border-neutral-200 hover:border-neutral-800 hover:bg-neutral-50 px-2.5 py-1 rounded-full text-neutral-600 transition-all font-medium whitespace-nowrap cursor-pointer"
            >
              🎧 Premium Headphones
            </button>
            <button 
              onClick={() => setInput("Do you have minimalist watches under ₹8000?")}
              className="bg-white border border-neutral-200 hover:border-neutral-800 hover:bg-neutral-50 px-2.5 py-1 rounded-full text-neutral-600 transition-all font-medium whitespace-nowrap cursor-pointer"
            >
              ⌚ Watches under ₹8000
            </button>
            <button 
              onClick={() => setInput("Organic Matcha")}
              className="bg-white border border-neutral-200 hover:border-neutral-800 hover:bg-neutral-50 px-2.5 py-1 rounded-full text-neutral-600 transition-all font-medium whitespace-nowrap cursor-pointer"
            >
              🍵 Organic Matcha
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  m.role === "user" ? "bg-neutral-800 text-white" : "bg-emerald-500 text-white"
                }`}>
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`text-[13px] leading-relaxed p-3 rounded-2xl shadow-sm ${
                  m.role === "user" 
                    ? "bg-neutral-900 text-white rounded-tr-none" 
                    : "bg-white border border-neutral-200 text-neutral-800 rounded-tl-none"
                }`}>
                  <p className="whitespace-pre-line">
                    {m.parts[0].text}
                  </p>
                </div>
              </div>
            ))}

            {/* AI Loading bubble */}
            {isLoading && (
              <div className="flex gap-3 max-w-[80%] mr-auto">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-neutral-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span className="text-xs text-neutral-500 font-medium">VendiCart logic indexing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form */}
          <form 
            id="ai-chat-send-form"
            onSubmit={handleSend} 
            className="p-4 border-t border-neutral-200 bg-white flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me: 'black shoes under ₹3000'..."
              className="flex-1 bg-neutral-100 border border-neutral-200 focus:border-neutral-900 focus:bg-white text-sm px-4 py-2.5 rounded-xl outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-neutral-900 hover:bg-neutral-800 active:scale-95 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all shadow-md group cursor-pointer"
            >
              <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
