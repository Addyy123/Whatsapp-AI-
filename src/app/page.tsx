"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const AGENT_ID = "5549808b-82b6-47bc-ac6d-c0f3210f887d";
const USER_ID = "148d2021-cd42-4ff5-8eaf-c5cdb9af8aa9";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "agent" | "system";
  content: string;
  isTool?: boolean;
}

type WhatsAppStatus =
  | "disconnected"
  | "starting"
  | "qr_required"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "logged_out"
  | "failed"
  | "bridge_not_configured"
  | "bridge_unreachable";

interface WhatsAppState {
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  phoneMasked: string | null;
  connectedAt: string | null;
  reconnectAttempts?: number;
  lastError?: string | null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: "Hello! I am Alice. How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Brain State
  const [activeTab, setActiveTab] = useState<"memories" | "tasks" | "automations" | "connections">("memories");
  const [memories, setMemories] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);

  // WhatsApp connection state
  const [waState, setWaState] = useState<WhatsAppState>({
    status: "disconnected",
    qrDataUrl: null,
    phoneMasked: null,
    connectedAt: null,
  });
  const [waConnecting, setWaConnecting] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // ── Fetch Brain Data ────────────────────────────────────────────────────────

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
      } else if (activeTab === "connections") {
        fetchWhatsAppStatus();
      }
    } catch (err) {
      console.error("Failed to fetch brain data:", err);
    }
  };

  useEffect(() => {
    fetchBrainData();
  }, [activeTab]);

  // ── WhatsApp SSE Subscription ───────────────────────────────────────────────

  const connectSSE = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
    }

    const sse = new EventSource("/api/whatsapp/events");
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "qr") {
          setWaState((prev) => ({
            ...prev,
            status: "qr_required",
            qrDataUrl: data.qrDataUrl,
          }));
          setWaConnecting(false);
        } else if (data.type === "state" || data.type === "connected") {
          setWaState((prev) => ({
            ...prev,
            status: data.status ?? prev.status,
            qrDataUrl: data.qrDataUrl ?? (data.status === "qr_required" ? prev.qrDataUrl : null),
            phoneMasked: data.phoneMasked ?? prev.phoneMasked,
            connectedAt: data.connectedAt ?? prev.connectedAt,
            reconnectAttempts: data.attempt ?? prev.reconnectAttempts,
            lastError: data.error ?? prev.lastError,
          }));
          setWaConnecting(false);
        } else if (data.type === "error") {
          setWaState((prev) => ({ ...prev, status: "failed", lastError: data.message }));
          setWaConnecting(false);
        }
      } catch {
        // ignore parse errors
      }
    };

    sse.onerror = () => {
      setWaState((prev) =>
        prev.status !== "connected" ? { ...prev, status: "bridge_unreachable" } : prev
      );
    };
  }, []);

  useEffect(() => {
    connectSSE();
    return () => sseRef.current?.close();
  }, [connectSSE]);

  // ── WhatsApp Actions ────────────────────────────────────────────────────────

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWaState((prev) => ({ ...prev, ...data }));
      }
    } catch {
      setWaState((prev) => ({ ...prev, status: "bridge_unreachable" }));
    }
  };

  const handleConnectWhatsApp = async () => {
    setWaConnecting(true);
    setWaState((prev) => ({ ...prev, status: "starting", qrDataUrl: null }));
    try {
      await fetch("/api/whatsapp/start", { method: "POST" });
      // State updates will arrive via SSE
    } catch {
      setWaState((prev) => ({ ...prev, status: "failed" }));
      setWaConnecting(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setWaState({ status: "disconnected", qrDataUrl: null, phoneMasked: null, connectedAt: null });
    } catch {
      console.error("Failed to disconnect");
    }
  };

  // ── Chat Submit ─────────────────────────────────────────────────────────────

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
          request_id: `web-${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action: any) => {
          setMessages((prev) => [
            ...prev,
            { role: "system", content: `Tool Executed: ${action.type || "tool"}`, isTool: true },
          ]);
        });
      }

      setMessages((prev) => [...prev, { role: "agent", content: data.reply }]);
      fetchBrainData();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "Failed to connect to agent.", isTool: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-container">

      {/* LEFT PANE: Chat Interface */}
      <div className="glass-panel chat-pane">
        <div className="pane-header">
          <h2><div className="status-dot"></div> Alice OS</h2>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Autonomy Level: 3</span>
        </div>

        <div className="chat-history">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message-bubble ${msg.isTool ? "message-tool" : msg.role === "user" ? "message-user" : "message-agent"}`}
            >
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
              id="chat-input"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Alice to remember something, search the web, or create a cron job..."
              autoFocus
              disabled={isLoading}
            />
            <button
              id="chat-submit"
              type="submit"
              className="chat-submit"
              disabled={isLoading || !input.trim()}
            >
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
          <button className={`tab-btn ${activeTab === "memories" ? "active" : ""}`} onClick={() => setActiveTab("memories")}>Memories</button>
          <button className={`tab-btn ${activeTab === "tasks" ? "active" : ""}`} onClick={() => setActiveTab("tasks")}>Tasks</button>
          <button className={`tab-btn ${activeTab === "automations" ? "active" : ""}`} onClick={() => setActiveTab("automations")}>Automations</button>
          <button id="connections-tab-btn" className={`tab-btn ${activeTab === "connections" ? "active" : ""}`} onClick={() => setActiveTab("connections")}>Connections</button>
        </div>

        <div className="tab-content">

          {/* Memories Tab */}
          {activeTab === "memories" && (
            memories.length === 0 ? <div className="empty-state">No memories saved yet.</div> :
            memories.map((m) => (
              <div key={m.id} className="data-card">
                <div className="card-header"><span className="card-badge badge-info">{m.category}</span></div>
                <div className="card-title">{m.content}</div>
                <div className="card-meta">{new Date(m.created_at).toLocaleDateString()}</div>
              </div>
            ))
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            tasks.length === 0 ? <div className="empty-state">No tasks available.</div> :
            tasks.map((t) => (
              <div key={t.id} className="data-card">
                <div className="card-header">
                  <span className={`card-badge ${t.status === "completed" ? "badge-completed" : "badge-pending"}`}>{t.status}</span>
                </div>
                <div className="card-title">{t.title}</div>
                <div className="card-meta">Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "No date"}</div>
              </div>
            ))
          )}

          {/* Automations Tab */}
          {activeTab === "automations" && (
            automations.length === 0 ? <div className="empty-state">No automations running.</div> :
            automations.map((a) => (
              <div key={a.id} className="data-card">
                <div className="card-header">
                  <span className={`card-badge ${a.status === "active" ? "badge-active" : "badge-pending"}`}>{a.status}</span>
                  <span className="card-badge badge-info">{a.tool_name}</span>
                </div>
                <div className="card-title">{a.name}</div>
                <div className="card-meta">Cron: {a.cron_schedule} • Next: {new Date(a.next_run_at).toLocaleString()}</div>
              </div>
            ))
          )}

          {/* Connections Tab */}
          {activeTab === "connections" && (
            <div className="connections-section">
              {/* WhatsApp Connection Card */}
              <WhatsAppCard
                state={waState}
                connecting={waConnecting}
                onConnect={handleConnectWhatsApp}
                onDisconnect={handleDisconnectWhatsApp}
              />

              {/* Future connectors placeholder */}
              <div className="connector-card connector-card--future">
                <div className="connector-card__icon">✈️</div>
                <div className="connector-card__info">
                  <div className="connector-card__name">Telegram</div>
                  <div className="connector-card__status connector-card__status--future">Coming Soon</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp Card Component ──────────────────────────────────────────────────

interface WhatsAppCardProps {
  state: WhatsAppState;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function WhatsAppCard({ state, connecting, onConnect, onDisconnect }: WhatsAppCardProps) {
  const isConnected = state.status === "connected";
  const isQR = state.status === "qr_required";
  const isInProgress = ["starting", "connecting", "reconnecting"].includes(state.status);
  const isBridgeDown = ["bridge_not_configured", "bridge_unreachable"].includes(state.status);

  return (
    <div className={`connector-card ${isConnected ? "connector-card--connected" : isQR ? "connector-card--qr" : ""}`}>
      {/* Header */}
      <div className="connector-card__header">
        <div className="connector-card__icon-wrap">
          <span className="connector-card__icon">💬</span>
        </div>
        <div className="connector-card__info">
          <div className="connector-card__name">WhatsApp</div>
          <StatusBadge status={state.status} />
        </div>
        {isConnected && (
          <div className="connector-card__connected-dot" title="Connected"></div>
        )}
      </div>

      {/* Connected details */}
      {isConnected && state.phoneMasked && (
        <div className="connector-card__details">
          <div className="connector-card__detail-row">
            <span className="connector-card__detail-label">Account</span>
            <span className="connector-card__detail-value">{state.phoneMasked}</span>
          </div>
          {state.connectedAt && (
            <div className="connector-card__detail-row">
              <span className="connector-card__detail-label">Connected</span>
              <span className="connector-card__detail-value">
                {new Date(state.connectedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* QR Code display */}
      {isQR && state.qrDataUrl && (
        <div className="qr-section">
          <div className="qr-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.qrDataUrl}
              alt="WhatsApp QR Code — scan with your phone"
              className="qr-image"
              id="whatsapp-qr-code"
            />
            <div className="qr-pulse-ring"></div>
          </div>
          <div className="qr-instructions">
            <p className="qr-instructions__title">Scan with WhatsApp</p>
            <ol className="qr-instructions__steps">
              <li>Open <strong>WhatsApp</strong> on your phone</li>
              <li>Tap <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a Device</strong></li>
              <li>Point your phone at this QR code</li>
            </ol>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isInProgress && !isQR && (
        <div className="connector-card__loading">
          <div className="spinner"></div>
          <span>{statusLabel(state.status)}</span>
        </div>
      )}

      {/* Bridge not available */}
      {isBridgeDown && (
        <div className="connector-card__warning">
          ⚠️ WhatsApp bridge is {state.status === "bridge_not_configured" ? "not configured" : "unreachable"}.
          <br />
          <small>Make sure the bridge service is running locally.</small>
        </div>
      )}

      {/* Error */}
      {state.status === "failed" && (
        <div className="connector-card__warning">
          ⚠️ Connection failed.{state.lastError ? ` ${state.lastError}` : ""}
        </div>
      )}

      {/* Actions */}
      <div className="connector-card__actions">
        {!isConnected && !isInProgress && !isQR ? (
          <button
            id="connect-whatsapp-btn"
            className="connector-btn connector-btn--primary"
            onClick={onConnect}
            disabled={connecting || isBridgeDown}
          >
            {connecting ? "Connecting..." : "Connect WhatsApp"}
          </button>
        ) : isConnected ? (
          <button
            id="disconnect-whatsapp-btn"
            className="connector-btn connector-btn--danger"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        ) : isQR ? (
          <button
            className="connector-btn connector-btn--ghost"
            onClick={onConnect}
            title="Request a new QR code"
          >
            Refresh QR
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WhatsAppStatus }) {
  const map: Record<WhatsAppStatus, { label: string; cls: string }> = {
    connected:              { label: "● Connected",       cls: "badge-connected" },
    disconnected:           { label: "○ Not Connected",   cls: "badge-disconnected" },
    starting:               { label: "◌ Starting…",       cls: "badge-progress" },
    qr_required:            { label: "◌ Scan QR Code",    cls: "badge-progress" },
    connecting:             { label: "◌ Connecting…",     cls: "badge-progress" },
    reconnecting:           { label: "◌ Reconnecting…",   cls: "badge-progress" },
    logged_out:             { label: "✕ Logged Out",      cls: "badge-error" },
    failed:                 { label: "✕ Failed",          cls: "badge-error" },
    bridge_not_configured:  { label: "— Not Configured",  cls: "badge-disconnected" },
    bridge_unreachable:     { label: "— Bridge Offline",  cls: "badge-error" },
  };

  const { label, cls } = map[status] ?? { label: status, cls: "badge-disconnected" };
  return <div className={`wa-status-badge ${cls}`}>{label}</div>;
}

function statusLabel(status: WhatsAppStatus): string {
  const labels: Partial<Record<WhatsAppStatus, string>> = {
    starting:    "Starting session…",
    connecting:  "Connecting to WhatsApp…",
    reconnecting: "Reconnecting…",
  };
  return labels[status] ?? status;
}
