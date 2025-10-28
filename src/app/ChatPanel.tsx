import { useCallback, useEffect, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { apiKeyAtom, saveAtom } from "@/globals/saving";
import { requestSavedData } from "@/features/saving";
import styles from "./ChatPanel.module.css";
import PanelTitle from "../components/PanelTitle";
import PulseLoader from "../components/PulseLoader";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { OpenAiResponse } from "@/features/chat/API-models/OpenAIModel";

export interface ChatPanelProps {
  visible: boolean;
}

type Message = {
  id: string;
  role: "user" | "llm";
  text: string;
  thinking?: boolean;
};

const ChatPanel = ({ visible }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [waitingForReply, setWaitingForReply] = useState(false);

  // Use the shared apiKeyAtom so saving and other globals can operate on it.
  const [apiKey, setApiKey] = useAtom(apiKeyAtom);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const requestInFlightRef = useRef(false);
  const setSave = useSetAtom(saveAtom);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const saveApiKey = useCallback(() => {
    // set the atom and trigger the global save flow which persists via commitSavedData
    if (apiKeyInput) {
      setApiKey(apiKeyInput);
    } else {
      setApiKey(null);
    }
    setApiKeyInput("");
    // trigger a save (fire-and-forget)
    try {
      void setSave();
    } catch (_e) {
      void _e;
    }
  }, [apiKeyInput, setApiKey, setSave]);

  // load stored API key from the saved workspace on mount
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const data = await requestSavedData();
        const key = data?.workspace?.apiKey ?? null;
        if (mounted && key) setApiKey(key);
      } catch (_e) {
        void _e;
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setApiKey]);

  const [showOptions, setShowOptions] = useState(false);

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (waitingForReply) return;
    if (!apiKey) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      text: trimmed,
    };
    const placeholderId = `llm-pending-${Date.now()}`;
    const llmPlaceholder: Message = {
      id: placeholderId,
      role: "llm",
      text: "",
      thinking: true,
    };

    // prevent duplicate requests in the same tick (e.g., double click or double enter)
    if (requestInFlightRef.current) return;

    // append placeholder and clear input immediately
    const newMessages = [...messages, userMsg, llmPlaceholder];
    setMessages(newMessages);
    setInput("");
    // reset inline height so textarea returns to default after send
    if (inputRef.current) inputRef.current.style.height = "";
    // mark waiting to block duplicate sends
    setWaitingForReply(true);
    // mark request immediately so further calls are blocked synchronously
    requestInFlightRef.current = true;

    // perform the async call outside of state updater to avoid accidental double-invokes
    void (async () => {
      try {
        const convo = newMessages
          .filter((m) => !m.thinking)
          .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          }));

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

        const data = (await resp.json()) as OpenAiResponse;
        const reply = data?.output?.[0]?.content[0]?.text ?? "(no response)";
        setMessages((cur) =>
          cur.map((m) =>
            m.id === placeholderId ? { ...m, text: reply, thinking: false } : m,
          ),
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setMessages((cur) =>
          cur.map((m) =>
            m.id === placeholderId
              ? { ...m, text: `Error: ${message}`, thinking: false }
              : m,
          ),
        );
      } finally {
        setWaitingForReply(false);
        requestInFlightRef.current = false;
      }
    })();
  }, [input, waitingForReply, apiKey, messages]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e,
  ) => {
    if (waitingForReply || !apiKey) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const adjustTextareaHeight = useCallback(
    (el?: HTMLTextAreaElement | null) => {
      const ta = el ?? inputRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      const wrapper = ta.parentElement;
      const computedTarget = wrapper
        ? window.getComputedStyle(wrapper)
        : window.getComputedStyle(ta);
      const maxHeightStr = computedTarget.maxHeight || "0px";
      const maxHeight = parseFloat(maxHeightStr.replace("px", "")) || Infinity;
      const newHeight = Math.min(ta.scrollHeight, maxHeight);
      ta.style.height = `${newHeight}px`;
      ta.style.overflow = ta.scrollHeight > maxHeight ? "auto" : "hidden";
    },
    [],
  );

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  if (!visible) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.titleRow}>
        <PanelTitle title="Chat" />
        <button
          type="button"
          className={styles.optionsButton}
          onClick={() => setShowOptions((s) => !s)}
          aria-expanded={showOptions}
          aria-label="Chat options"
        >
          Options
        </button>
      </div>

      <div className={styles.chatBox} role="region" aria-label="Chat panel">
        {showOptions ? (
          <div className={styles.optionsPanel}>
            <div className={styles.optionsRow}>
              <button
                type="button"
                className={styles.clearKeyButton}
                onClick={() => {
                  setApiKey(null);
                  try {
                    void setSave();
                  } catch (_e) {
                    void _e;
                  }
                  setShowOptions(false);
                }}
              >
                Clear API key
              </button>
              <div className={styles.optionsNote}>
                Clearing the key will disable chat until a new key is saved.
              </div>
            </div>
          </div>
        ) : null}
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
            <button
              className={styles.apiKeyButton}
              onClick={saveApiKey}
              disabled={!apiKeyInput}
            >
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
                className={
                  styles.message +
                  " " +
                  (m.role === "user" ? styles.messageUser : styles.messageLlm)
                }
              >
                <div
                  className={
                    styles.messageBubble +
                    (m.thinking ? ` ${styles.thinkingBubble}` : "")
                  }
                >
                  {m.thinking ? (
                    <PulseLoader size="8px" spacing="6px" />
                  ) : m.role === "llm" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const codeText = String(children).replace(/\n$/, "");
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                          const language =
                            /language-(\w+)/.exec(className || "")?.[1] ?? "";
                          return inline ? (
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            <code {...props} className={className}>
                              {children}
                            </code>
                          ) : (
                            <div className={styles.codeBlockWrapper}>
                              <div className={styles.codeBlockHeader}>
                                <div className={styles.codeBlockTitle}>
                                  Code Block{language ? ` — ${language}` : ""}
                                </div>
                                <button
                                  className={styles.copyButton}
                                  onClick={() => {
                                    void navigator.clipboard?.writeText(
                                      codeText,
                                    );
                                  }}
                                  aria-label="Copy code"
                                >
                                  Copy
                                </button>
                              </div>
                              <pre
                                className={
                                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                  className
                                }
                              >
                                <code {...props}>{children}</code>
                              </pre>
                            </div>
                          );
                        },
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  ) : (
                    <div className={styles.plainText}>{m.text}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.inputRow}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={inputRef}
                className={styles.input}
                placeholder="Type a message..."
                aria-label="Message input"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextareaHeight(e.target);
                }}
                onKeyDown={handleKeyDown}
                disabled={waitingForReply || !apiKey}
              />
            </div>
            <button
              className={styles.sendButton}
              aria-label="Send message"
              onClick={sendMessage}
              disabled={waitingForReply || !apiKey}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
