'use client';

import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, SendHorizonal, Save, RefreshCcw } from 'lucide-react';
import { X } from 'lucide-react'

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

type Message = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  parentId?: string;
  isEditing?: boolean;
  dbId?: number;
  originalText?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authEmail = localStorage.getItem('auth');
    if (!authEmail) {
      router.push('/');
      return;
    }
    setEmail(authEmail);

    fetch(`http://localhost:8000/users/${authEmail}`)
      .then((res) => {
        if (!res.ok) throw new Error('Novo usuário');
        return res.json();
      })
      .then((user) => {
        fetch(`http://localhost:8000/users/${user.id}/messages`)
          .then((res) => res.json())
          .then((data) => {
            const loaded: Message[] = [];
            data.forEach((m: any) => {
              const userUuid = uuidv4();
              const botUuid = uuidv4();
              loaded.push({ id: userUuid, sender: 'user', text: m.question, dbId: m.id });
              loaded.push({ id: botUuid, sender: 'bot', text: m.answer, parentId: userUuid, dbId: m.id });
            });
            setMessages(loaded);
          });
      });
  }, []);

  const handleSend = async (customPrompt?: string, editingId?: string) => {
    const prompt = customPrompt ?? input;
    if (!prompt.trim() || loading) return;

    const userMsg: Message = { id: uuidv4(), sender: 'user', text: prompt };
    const botMsgId = uuidv4();
    const parentId = editingId ?? userMsg.id;

    if (!editingId) {
      setMessages((prev) => [...prev, userMsg, { id: botMsgId, sender: 'bot', text: 'typing', parentId }]);
    } else {
      setMessages((prev) =>
        prev.reduce<Message[]>((acc, m) => {
          if (m.id === editingId) {
            acc.push({ ...m, text: prompt });
            acc.push({ id: botMsgId, sender: 'bot', text: 'typing', parentId });
          } else if (!(m.sender === 'bot' && m.parentId === editingId)) {
            acc.push(m);
          }
          return acc;
        }, [])
      );
    }

    setInput('');
    setLoading(true);

    try {
      const userRes = await fetch(`http://localhost:8000/users/${email}`);
      const userId = (await userRes.json()).id;

      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, prompt })
      });
      const data = await res.json();
      const botResponse = data.response || 'Erro na resposta';

      let currentText = '';
      for (let i = 0; i < botResponse.length; i++) {
        currentText += botResponse[i];
        setMessages((prev) =>
          prev.map((msg) => (msg.id === botMsgId ? { ...msg, text: currentText } : msg))
        );
        await new Promise((r) => setTimeout(r, 20));
      }

      if (editingId) {
        const msgToEdit = messages.find((m) => m.id === editingId);
        const dbIdToUpdate = msgToEdit?.dbId;
        if (!dbIdToUpdate) throw new Error('dbId não encontrado para atualização');
        await fetch(`http://localhost:8000/messages/${dbIdToUpdate}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: prompt, answer: botResponse })
        });
      } else {
        const resSave = await fetch(`http://localhost:8000/users/${userId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: prompt, answer: botResponse })
        });
        const saved = await resSave.json();
        setMessages((prev) =>
          prev.map((msg) => (msg.id === userMsg.id || msg.id === botMsgId ? { ...msg, dbId: saved.id } : msg))
        );
      }
    } catch (err) {
      console.error('Erro ao chamar backend:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    if (loading) return;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? { ...msg, isEditing: true, originalText: msg.text }
          : { ...msg, isEditing: false }
      )
    );
  };

  const handleSaveEdit = (id: string, newText: string) => {
    if (loading) return;
    setMessages((prev) => prev.map((msg) => ({ ...msg, isEditing: false })));
    handleSend(newText, id);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    router.push('/');
  };

  const handleNewChat = async () => {
    const confirmClear = confirm('Deseja mesmo apagar todo o histórico?');
    if (!confirmClear) return;
    const res = await fetch(`http://localhost:8000/users/${email}`);
    const user = await res.json();
    await fetch(`http://localhost:8000/users/${user.id}/messages`, { method: 'DELETE' });
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-between px-4 py-6">
      <div className="w-full max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-semibold">ChatBot</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              <RefreshCcw size={16} className="mr-1" /> Apagar conversa
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
  
        {/* Chat messages */}
        <div className="bg-white rounded-xl shadow p-4 h-[75vh] overflow-y-auto space-y-4 w-full">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`rounded-xl px-4 py-2 ${
                  msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
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
                            m.id === msg.id ? { ...m, text: e.target.value } : m
                          )
                        )
                      }
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(msg.id, msg.text)}>
                        <Save size={16} className="mr-1" /> Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-black"
                        onClick={() =>
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === msg.id
                                ? { ...m, isEditing: false, text: m.originalText || m.text }
                                : m
                            )
                          )
                        }
                      >
                        <X size={16} className="mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      {msg.sender === 'bot' && msg.text === 'typing' ? (
                        <span className="flex gap-[6px] items-center">
                          {[0, 0.2, 0.4].map((delay, i) => (
                            <span
                              key={i}
                              className="w-[8px] h-[8px] bg-gray-600 rounded-full animate-bounce"
                              style={{ animationDelay: `${delay}s` }}
                            />
                          ))}
                        </span>
                      ) : (
                        <span>{msg.text}</span>
                      )}
  
                      {msg.sender === 'user' && (
                        <Pencil
                          size={16}
                          className={`cursor-pointer opacity-70 hover:opacity-100 ${
                            loading ? 'pointer-events-none opacity-30' : ''
                          }`}
                          onClick={() => handleEdit(msg.id)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
  
        {/* Input field */}
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
};  