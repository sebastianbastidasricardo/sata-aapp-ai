import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
}

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: '1',
        role: 'assistant',
        text: '¡Hola! Soy el asistente virtual de SATA. ¿En qué te puedo ayudar hoy con tu configuración?'
    }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare history (excluding the very first welcome message if we want, or map it)
            // But we can map the whole state directly
            const history = messages.map(m => ({ role: m.role, text: m.text }));

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userMessage.text, history })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Network response was not ok');
            }
            
            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: data.text || 'No pude procesar tu solicitud.'
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: error.message || 'Hubo un error de conexión, por favor intenta nuevamente más tarde.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <motion.button
                className="fixed bottom-6 right-6 p-4 bg-primary text-white rounded-full shadow-lg shadow-primary/30 z-50 flex items-center justify-center hover:bg-emerald-500 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: isOpen ? 'none' : 'flex' }}
            >
                <MessageSquare className="w-6 h-6" />
            </motion.button>

            {/* Chatbot Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Header */}
                        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                            <div className="flex items-center space-x-2 text-primary">
                                <Bot className="w-5 h-5" />
                                <span className="font-semibold">Asistente SATA</span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`p-2 rounded-full shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-300'}`}>
                                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div
                                        className={`px-3 py-2 rounded-2xl max-w-[75%] text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-primary text-slate-900 rounded-tr-none font-medium'
                                                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                                        }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-2">
                                    <div className="p-2 rounded-full shrink-0 bg-slate-700 text-slate-300 flex items-center justify-center">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="px-3 py-2 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 rounded-tl-none text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-slate-800 border-t border-slate-700">
                            <div className="relative flex items-end">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Escribe tu mensaje..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none min-h-[44px] max-h-[120px]"
                                    rows={1}
                                    style={{ fieldSizing: "content" } as any}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 bottom-2 p-1.5 bg-primary text-slate-900 rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;
