import { useEffect, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { saveAtom } from "@/globals/saving";
import {
  chatHistoryAtom,
  activeConversationAtom,
  upsertActiveConversationAtom,
  apiKeyAtom,
} from "@/globals/chat";
import styles from "./ChatPanel.module.css";
import PanelTitle from "../components/PanelTitle";
import PulseLoader from "../components/PulseLoader";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { timeToAgoText } from "@/features/formatUtils";
import { Tooltip } from "@/components/Tooltip";

import SettingsIcon from "@/assets/icons/SettingsIcon.svg?react";
import HistoryIcon from "@/assets/icons/HistoryIcon.svg?react";
import PlusIcon from "@/assets/icons/PlusIcon.svg?react";
import CheckIcon from "@/assets/icons/CheckIcon.svg?react";

import type { OpenAiResponse } from "@/features/chat/API-models/OpenAIModel";
import type { ChatConversation } from "@/globals/chat";

export interface ChatPanelProps {
  visible: boolean;
}

type Message = {
  id: string;
  role: "user" | "llm";
  text: string;
  thinking?: boolean;
};

const ConversationItem = ({
  conv,
  selected,
  setMessages,
  setShowHistory,
  setActiveConversation,
}: {
  conv: ChatConversation;
  selected: boolean;
  setMessages: (to: Message[]) => void;
  setShowHistory: (to: boolean) => void;
  setActiveConversation: (to: ChatConversation) => void;
}) => {
  const [timestampMs, setTimestampMs] = useState(() => Date.now());
  const time = timeToAgoText(timestampMs - conv.unixTimestampMs).toLowerCase();

  useEffect(() => {
    const id = setInterval(() => {
      setTimestampMs(Date.now());
    }, 60 * 1_000);

    return () => clearInterval(id);
  }, []);

  return (
    <button
      key={conv.id}
      className={styles.historyItem}
      onClick={() => {
        setMessages(
          conv.messages.map((m) => ({
            id: m.id,
            role: m.role,
            text: m.text,
          })),
        );
        setShowHistory(false);
        setActiveConversation(conv);
      }}
    >
      <div className={styles.historyMain}>
        <span className={styles.historyTitle}>{conv.title}</span>
        <span className={styles.historySubtitle}>{time}</span>
      </div>

      <div className={styles.historyCheck}>
        {selected && <CheckIcon width="1em" height="1em" aria-hidden />}
      </div>
    </button>
  );
};

const ChatPanel = ({ visible }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [waitingForReply, setWaitingForReply] = useState(false);

  const [apiKey, setApiKey] = useAtom(apiKeyAtom);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const setSave = useSetAtom(saveAtom);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatHistory] = useAtom(chatHistoryAtom);
  const [activeConversation, setActiveConversation] = useAtom(
    activeConversationAtom,
  );

  const upsertActiveConversation = useSetAtom(upsertActiveConversationAtom);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const saveConversation = (newMessages: Message[]) => {
    const nonThinking = newMessages.filter((m) => !m.thinking && m.text);
    if (nonThinking.length === 0) return;

    const conv = nonThinking.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
    }));

    try {
      void upsertActiveConversation({ messages: conv });
    } catch (_e) {
      void _e;
    }
  };

  const saveApiKey = () => {
    if (apiKeyInput) {
      setApiKey(apiKeyInput);
    } else {
      setApiKey(null);
    }
    setApiKeyInput("");
    try {
      void setSave();
    } catch (_e) {
      void _e;
    }
  };

  const toggleHistory = () => {
    setShowHistory((show) => !show);
    setShowSettings(false);
  };

  const toggleSettings = () => {
    setShowSettings((show) => !show);
    setShowHistory(false);
  };

  const sendMessage = async () => {
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

    // append placeholder and clear input immediately
    const newMessages = [...messages, userMsg, llmPlaceholder];
    setMessages(newMessages);
    setInput("");
    // reset inline height so textarea returns to default after send
    if (inputRef.current) inputRef.current.style.height = "";
    setWaitingForReply(true);
    let finalizedMessages: Message[] = newMessages;
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
            "You are a systems biologist that specializes in a biological compound and reaction modeling language named Antimony that is based off of SBML, help the user debug and analyze their models that are written in Antimony",
        }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`OpenAI error ${resp.status}: ${body}`);
      }

      const data = (await resp.json()) as OpenAiResponse;
      const reply = data?.output?.[0]?.content[0]?.text ?? "(no response)";
      finalizedMessages = finalizedMessages.map((m) =>
        m.id === placeholderId ? { ...m, text: reply, thinking: false } : m,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      finalizedMessages = messages.map((m) =>
        m.id === placeholderId
          ? { ...m, text: `Error: ${message}`, thinking: false }
          : m,
      );
    } finally {
      setMessages(finalizedMessages);
      saveConversation(finalizedMessages);
      setWaitingForReply(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = async (
    e,
  ) => {
    if (waitingForReply || !apiKey) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await sendMessage();
    }
  };

  useEffect(() => {
    const ta = inputRef.current;
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
  }, [input]);

  if (!visible) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.titleRow}>
        <PanelTitle title="Chat" />
        <div>
          <button
            className={styles.titleButton}
            aria-expanded={showHistory}
            aria-label="Chat History"
            onClick={toggleHistory}
          >
            <Tooltip text="Chat History">
              <HistoryIcon height="0.75em" width="0.75em" />
            </Tooltip>
          </button>
          <button
            className={styles.titleButton}
            aria-expanded={showSettings}
            aria-label="Chat Settings"
            onClick={toggleSettings}
          >
            <Tooltip text="Chat Settings">
              <SettingsIcon height="0.75em" width="0.75em" />
            </Tooltip>
          </button>
          <button
            className={styles.titleButton}
            aria-expanded={showSettings}
            aria-label="New Chat"
            onClick={() => {
              setMessages([]);
              setActiveConversation(null);
            }}
          >
            <Tooltip text="New Chat">
              <PlusIcon height="0.75em" width="0.75em" />
            </Tooltip>
          </button>
        </div>
      </div>

      <div className={styles.chatBox} role="region" aria-label="Chat panel">
        {showSettings ? (
          <div className={styles.settingsPanel}>
            <div className={styles.settingsRow}>
              <button
                type="button"
                className={styles.historyItem}
                onClick={() => {
                  setApiKey(null);
                  try {
                    void setSave();
                  } catch (_e) {
                    void _e;
                  }
                  setShowSettings(false);
                }}
                disabled={waitingForReply || !apiKey}
              >
                Clear API key
              </button>
              <div className={styles.settingsNote}>
                Clearing the key will disable chat until a new key is saved.
              </div>
            </div>
          </div>
        ) : null}

        {showHistory ? (
          <div className={styles.settingsPanel}>
            <div className={styles.historyList}>
              {chatHistory.length === 0 ? (
                <div className={styles.settingsNote}>
                  No saved conversations
                </div>
              ) : (
                chatHistory
                  .slice()
                  .reverse()
                  .map((conv) => (
                    <ConversationItem
                      selected={conv === activeConversation}
                      conv={conv}
                      setMessages={setMessages}
                      setActiveConversation={setActiveConversation}
                      setShowHistory={setShowHistory}
                    />
                  ))
              )}
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
                        code({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) {
                          const codeText = String(children).replace(/\n$/, "");

                          const language =
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                            /language-(\w+)/.exec(className || "")?.[1] ?? "";

                          // Only render code block wrapper for triple-backtick code (has language or contains newlines)
                          const isCodeBlock =
                            language || codeText.includes("\n");

                          return inline || !isCodeBlock ? (
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
                              <div className={styles.codeBlockContentWrapper}>
                                <code {...props}>{children}</code>
                              </div>
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
                }}
                onKeyDown={handleKeyDown}
                disabled={waitingForReply || !apiKey}
              />
            </div>
            <button
              id="chat-enter-button"
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
