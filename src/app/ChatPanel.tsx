import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ChatPanel.module.css";
import PanelTitle from "../components/PanelTitle";
import PulseLoader from "../components/PulseLoader";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export interface ChatPanelProps {
  visible: boolean;
}

type Message = { id: string; role: "user" | "llm"; text: string; thinking?: boolean };

const ChatPanel = ({ visible }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([
  ]);

  const [input, setInput] = useState("");
  const [waitingForReply, setWaitingForReply] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const saveApiKey = useCallback(() => {
    setApiKey(apiKeyInput || null);
    setApiKeyInput("");
  }, [apiKeyInput]);

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (waitingForReply) return; // prevent sending while waiting
    if (!apiKey) return; // require API key before sending

    const userMsg: Message = { id: String(Date.now()), role: "user", text: trimmed };
    const placeholderId = `llm-pending-${Date.now()}`;
    const llmPlaceholder: Message = {
      id: placeholderId,
      role: "llm",
      text: "",
      thinking: true,
    };

    // prevent duplicate requests in the same tick (e.g., double click or double enter)
    if (requestInFlightRef.current) return;

    // create the new message list and update UI immediately
    const newMessages = [...messages, userMsg, llmPlaceholder];
    setMessages(newMessages);
    setInput("");
    // set waiting early to block duplicate sends
    setWaitingForReply(true);
    // mark request immediately so further calls are blocked synchronously
    requestInFlightRef.current = true;

    // perform the async call outside of state updater to avoid accidental double-invokes
    void (async () => {
      try {
        const convo = newMessages
          .filter((m) => !m.thinking)
          .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

        const resp = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1",
            input: convo,
            max_output_tokens: 1024,
            instructions:
              "You are a biology scientist that specializes in a biological compound and reaction modeling language named Antimony that is based off of SBML, help the user debug and analyze their models that are written in Antimony",
          }),
        });

        if (!resp.ok) {
          const body = await resp.text();
          throw new Error(`OpenAI error ${resp.status}: ${body}`);
        }

        // TODO: cleaner to write these classes out elsewhere
        type OpenAiMessage = { text: string };
        type OpenAiOutput = { content: OpenAiMessage[] };
        type OpenAiResponse = { output: OpenAiOutput[] };

        const data = (await resp.json()) as OpenAiResponse;
        const reply = data?.output?.[0]?.content[0]?.text ?? "(no response)";
        setMessages((cur) => cur.map((m) => (m.id === placeholderId ? { ...m, text: reply, thinking: false } : m)));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setMessages((cur) => cur.map((m) => (m.id === placeholderId ? { ...m, text: `Error: ${message}`, thinking: false } : m)));
      } finally {
        setWaitingForReply(false);
        requestInFlightRef.current = false;
      }
    })();
  }, [input, waitingForReply, apiKey, messages]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (waitingForReply) return;
    if (!apiKey) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!visible) return null;

  return (
    <div className={styles.panel}>
      <PanelTitle title="Chat" />

      <div className={styles.chatBox} role="region" aria-label="Chat panel">
        {!apiKey ? (
          <div className={styles.apiKeyRow}>
            <input
              type="password"
              className={styles.apiKeyInput}
              placeholder="Enter OpenAI API key"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              aria-label="OpenAI API key"
            />
            <button className={styles.apiKeyButton} onClick={saveApiKey} disabled={!apiKeyInput}>
              Save key
            </button>
          </div>
        ) : null}

        <div className={styles.chatContent}>
          {!apiKey ? (
            <div className={styles.overlay} aria-hidden="true">
              <div className={styles.overlayContent}>
                <div>Please enter an OpenAI API key to enable chat</div>
              </div>
            </div>
          ) : null}

          <div className={styles.messages} ref={messagesRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={styles.message + " " + (m.role === "user" ? styles.messageUser : styles.messageLlm)}
              >
                <div className={styles.messageBubble + (m.thinking ? ` ${styles.thinkingBubble}` : "") }>
                  {m.thinking ? (
                    <PulseLoader size="8px" spacing="6px" />
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const codeText = String(children).replace(/\n$/, "");
                          const language = /language-(\w+)/.exec(className || "")?.[1] ?? "";

                          return inline ? (
                            <code {...props} className={className}>
                              {children}
                            </code>
                          ) : (
                            <div className={styles.codeBlockWrapper}>
                              <div className={styles.codeBlockHeader}>
                                <div className={styles.codeBlockTitle}>Code Block{language ? ` — ${language}` : ""}</div>
                                <button
                                  className={styles.copyButton}
                                  onClick={() => {
                                    void navigator.clipboard?.writeText(codeText);
                                  }}
                                  aria-label="Copy code"
                                >
                                  Copy
                                </button>
                              </div>
                              <pre className={className}>
                                <code {...props}>
                                  {children}
                                </code>
                              </pre>
                            </div>
                          );
                        },
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
          </div>

            <div className={styles.inputRow}>
            <textarea
              className={styles.input}
              placeholder="Type a message..."
              aria-label="Message input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
                disabled={waitingForReply || !apiKey}
            />
            <button className={styles.sendButton} aria-label="Send message" onClick={sendMessage} disabled={waitingForReply || !apiKey}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
