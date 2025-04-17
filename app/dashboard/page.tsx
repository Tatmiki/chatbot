'use client';

const style = document.createElement('style');
style.innerHTML = `
@keyframes bounceDot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}`;
if (typeof window !== 'undefined' && !document.getElementById('bounceDot')) {
  style.id = 'bounceDot';
  document.head.appendChild(style);
}

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, SendHorizonal, Save, RefreshCcw } from 'lucide-react';

// Detecta clique fora do input de edição
function useClickOutside(callback: () => void) {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('textarea')) {
        callback();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [callback]);
}

type Message = {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  parentId?: number;
  previousBotReplies?: string[];
  showPrevious?: boolean;
  isEditing?: boolean;
};

export default function Dashboard() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authEmail = localStorage.getItem('auth');
    if (!authEmail) router.push('/');
    else setEmail(authEmail);

    const savedMessages = localStorage.getItem('chat_messages');
    if (savedMessages) setMessages(JSON.parse(savedMessages));
  }, []);

  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  useClickOutside(() => {
    setMessages((prev) => prev.map((msg) => ({ ...msg, isEditing: false })));
  });

  const handleSend = async (customPrompt?: string, editingId?: number) => {
    const prompt = customPrompt ?? input;
    if (!prompt.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now(),
      sender: 'user',
      text: prompt,
    };

    const botMsgId = Date.now() + 1;

    setMessages((prev) => {
      let filtered = [...prev];
      if (editingId) {
        const botIndex = prev.findIndex(
          (m) => m.sender === 'bot' && m.parentId === editingId,
        );
        const userIndex = prev.findIndex((m) => m.id === editingId);
        if (botIndex !== -1) {
          const previousBot = prev[botIndex];
          filtered.splice(botIndex, 1);
          filtered[userIndex] = userMsg;
          filtered.push({
            id: botMsgId,
            sender: 'bot',
            text: 'typing',
            parentId: userMsg.id,
            previousBotReplies: [previousBot.text],
          });
          return filtered;
        }
      }
      return [
        ...filtered,
        userMsg,
        { id: botMsgId, sender: 'bot', text: 'typing', parentId: userMsg.id },
      ];
    });

    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://10.99.8.173:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const botResponse = data.response || 'Erro na resposta';

      let currentText = '';
      for (let i = 0; i < botResponse.length; i++) {
        currentText += botResponse[i];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, text: currentText } : msg,
          ),
        );
        await new Promise((r) => setTimeout(r, 20));
      }
    } catch (err) {
      console.error('Erro ao chamar backend:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, text: 'Erro na resposta.' } : msg,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    if (loading) return;
    setMessages((prev) =>
      prev.map((msg) => ({ ...msg, isEditing: msg.id === id })),
    );
  };

  const handleSaveEdit = (id: number, newText: string) => {
    if (loading) return;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, text: newText, isEditing: false } : msg,
      ),
    );
    handleSend(newText, id);
  };

  const toggleBotVersion = (id: number) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, showPrevious: !msg.showPrevious } : msg,
      ),
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    router.push('/');
  };

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem('chat_messages');
  };
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-between px-4 py-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-semibold">ChatBot</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              <RefreshCcw size={16} className="mr-1" />
              Apagar conversa
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 h-[75vh] overflow-y-auto space-y-4 w-full">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-xl px-4 py-2 ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-black'
                }`}
                style={{
                  maxWidth: '80%',
                  minWidth: '80px',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.isEditing ? (
                  <div className="flex flex-col space-y-2">
                    <textarea
                      className="w-full p-2 rounded-md border border-gray-300"
                      rows={3}
                      value={msg.text}
                      onChange={(e) =>
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === msg.id
                              ? { ...m, text: e.target.value }
                              : m,
                          ),
                        )
                      }
                    />
                    <Button
                      size="sm"
                      className="self-end"
                      onClick={() => handleSaveEdit(msg.id, msg.text)}
                    >
                      <Save size={16} className="mr-1" />
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      {msg.sender === 'bot' && msg.text === 'typing' ? (
                        <span
                          style={{
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#4b5563',
                              borderRadius: '50%',
                              animation: 'bounceDot 1.4s infinite',
                            }}
                          />
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#4b5563',
                              borderRadius: '50%',
                              animation: 'bounceDot 1.4s infinite',
                              animationDelay: '0.2s',
                            }}
                          />
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#4b5563',
                              borderRadius: '50%',
                              animation: 'bounceDot 1.4s infinite',
                              animationDelay: '0.4s',
                            }}
                          />
                        </span>
                      ) : (
                        <span>
                          {msg.showPrevious && msg.previousBotReplies?.length
                            ? msg.previousBotReplies[
                                msg.previousBotReplies.length - 1
                              ]
                            : msg.text}
                        </span>
                      )}
                      {msg.sender === 'user' && (
                        <Pencil
                          size={16}
                          className={`cursor-pointer opacity-70 hover:opacity-100 ${loading ? 'pointer-events-none opacity-30' : ''}`}
                          onClick={() => handleEdit(msg.id)}
                        />
                      )}
                    </div>
                    {msg.sender === 'bot' &&
                      msg.previousBotReplies?.length > 0 && (
                        <div className="flex gap-2 mt-1 self-start">
                          <button
                            onClick={() => toggleBotVersion(msg.id)}
                            className="w-6 h-6 rounded-md bg-gray-300 text-black hover:bg-gray-400 text-xs"
                            title="Ver anterior"
                          >
                            &lt;
                          </button>
                          <button
                            onClick={() => toggleBotVersion(msg.id)}
                            className="w-6 h-6 rounded-md bg-gray-300 text-black hover:bg-gray-400 text-xs"
                            title="Ver atual"
                          >
                            &gt;
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={() => handleSend()} disabled={loading}>
            <SendHorizonal className="w-4 h-4 mr-1" />
            {loading ? 'Aguarde...' : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
