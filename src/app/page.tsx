"use client";

import { useState, useEffect, useRef } from "react";

const AGENT_ID = "5549808b-82b6-47bc-ac6d-c0f3210f887d";
const USER_ID = "148d2021-cd42-4ff5-8eaf-c5cdb9af8aa9";

interface Message {
  role: "user" | "agent" | "system";
  content: string;
  isTool?: boolean;
}

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: "Hello! I am Alice. How can I assist you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Brain State
  const [activeTab, setActiveTab] = useState<"memories" | "tasks" | "automations">("memories");
  const [memories, setMemories] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const fetchBrainData = async () => {
    try {
      if (activeTab === "memories") {
        const res = await fetch(`/api/memories?agent_id=${AGENT_ID}&user_id=${USER_ID}`);
        if (res.ok) setMemories((await res.json()).memories);
      } else if (activeTab === "tasks") {
        const res = await fetch(`/api/tasks?agent_id=${AGENT_ID}&user_id=${USER_ID}`);
        if (res.ok) setTasks((await res.json()).tasks);
      } else if (activeTab === "automations") {
        const res = await fetch(`/api/automations?agent_id=${AGENT_ID}&user_id=${USER_ID}`);
        if (res.ok) setAutomations((await res.json()).automations);
      }
    } catch (err) {
      console.error("Failed to fetch brain data:", err);
    }
  };

  useEffect(() => {
    fetchBrainData();
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: AGENT_ID,
          user_id: USER_ID,
          message: userMessage,
          source: "web",
          request_id: `web-${Date.now()}`
        }),
      });

      const data = await res.json();
      
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action: any) => {
           setMessages((prev) => [...prev, { role: "system", content: `Tool Executed: ${action.type || 'tool'}`, isTool: true }]);
        });
      }

      setMessages((prev) => [...prev, { role: "agent", content: data.reply }]);
      
      // Refresh the active tab because the agent might have changed it!
      fetchBrainData();

    } catch (err) {
      setMessages((prev) => [...prev, { role: "system", content: "Failed to connect to agent.", isTool: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      
      {/* LEFT PANE: Chat Interface */}
      <div className="glass-panel chat-pane">
        <div className="pane-header">
          <h2><div className="status-dot"></div> Alice OS</h2>
          <span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>Autonomy Level: 3</span>
        </div>
        
        <div className="chat-history">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-bubble ${msg.isTool ? 'message-tool' : msg.role === 'user' ? 'message-user' : 'message-agent'}`}>
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className="message-bubble message-agent">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <form onSubmit={handleSubmit} className="chat-form">
            <input
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Alice to remember something, search the web, or create a cron job..."
              autoFocus
              disabled={isLoading}
            />
            <button type="submit" className="chat-submit" disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANE: Brain Dashboard */}
      <div className="glass-panel brain-pane">
        <div className="pane-header">
          <h2>Brain State</h2>
          <button className="refresh-btn" onClick={fetchBrainData}>↻ Refresh</button>
        </div>

        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'memories' ? 'active' : ''}`} onClick={() => setActiveTab('memories')}>Memories</button>
          <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tasks</button>
          <button className={`tab-btn ${activeTab === 'automations' ? 'active' : ''}`} onClick={() => setActiveTab('automations')}>Automations</button>
        </div>

        <div className="tab-content">
          {activeTab === 'memories' && (
            memories.length === 0 ? <div className="empty-state">No memories saved yet.</div> :
            memories.map((m) => (
              <div key={m.id} className="data-card">
                <div className="card-header">
                  <span className="card-badge badge-info">{m.category}</span>
                </div>
                <div className="card-title">{m.content}</div>
                <div className="card-meta">{new Date(m.created_at).toLocaleDateString()}</div>
              </div>
            ))
          )}

          {activeTab === 'tasks' && (
            tasks.length === 0 ? <div className="empty-state">No tasks available.</div> :
            tasks.map((t) => (
              <div key={t.id} className="data-card">
                <div className="card-header">
                  <span className={`card-badge ${t.status === 'completed' ? 'badge-completed' : 'badge-pending'}`}>{t.status}</span>
                </div>
                <div className="card-title">{t.title}</div>
                <div className="card-meta">Due: {t.due_at ? new Date(t.due_at).toLocaleString() : 'No date'}</div>
              </div>
            ))
          )}

          {activeTab === 'automations' && (
            automations.length === 0 ? <div className="empty-state">No automations running.</div> :
            automations.map((a) => (
              <div key={a.id} className="data-card">
                <div className="card-header">
                  <span className={`card-badge ${a.status === 'active' ? 'badge-active' : 'badge-pending'}`}>{a.status}</span>
                  <span className="card-badge badge-info">{a.tool_name}</span>
                </div>
                <div className="card-title">{a.name}</div>
                <div className="card-meta">Cron: {a.cron_schedule} • Next: {new Date(a.next_run_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
