import { useEffect, useRef, useState } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";

import {
  chatHistoryAtom,
  activeConversationAtom,
  upsertActiveConversationAtom,
  migrateFromLegacyDbAtom,
  apiKeyAtom,
  systemPromptAtom,
  DEFAULT_SYSTEM_PROMPT,
  modelAtom,
  AVAILABLE_MODELS,
} from "@/globals/chat";
import { editorContentAtom } from "@/globals/model";
import styles from "./ChatPanel.module.css";
import PanelTitle from "../components/PanelTitle";
import PulseLoader from "../components/PulseLoader";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { timeToAgoText } from "@/features/formatUtils";
import { getVerboseError } from "@/features/chat/errorUtils";
import { Tooltip } from "@/components/Tooltip";

import SettingsIcon from "@/assets/icons/SettingsIcon.svg?react";
import HistoryIcon from "@/assets/icons/HistoryIcon.svg?react";
import PlusIcon from "@/assets/icons/PlusIcon.svg?react";
import CheckIcon from "@/assets/icons/CheckIcon.svg?react";
import SendIcon from "@/assets/icons/SendIcon.svg?react";

import Select from "@/components/input/Select";

import type { OpenAiResponse } from "@/features/chat/API-models/OpenAIModel";
import type { ChatConversation } from "@/globals/chat";
import clsx from "clsx";
import { hasActiveProjectAtom } from "@/globals/project";

export interface ChatPanelProps {
  visible: boolean;
}

type Message = {
  id: string;
  role: "user" | "llm";
  text: string;
  thinking?: boolean;
  isError?: boolean;
};

const ConversationItem = ({
  conv,
  selected,
  setMessages,
  setShowHistory,
  setActiveConversation,
  disabled,
}: {
  conv: ChatConversation;
  selected: boolean;
  setMessages: (to: Message[]) => void;
  setShowHistory: (to: boolean) => void;
  setActiveConversation: (to: ChatConversation) => void;
  disabled?: boolean;
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
            isError: m.isError,
          })),
        );
        setShowHistory(false);
        setActiveConversation(conv);
      }}
      disabled={disabled}
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

const ChatSettings = ({
  apiKey,
  setApiKey,
  onClose,
  waitingForReply,
}: {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  onClose: () => void;
  waitingForReply: boolean;
}) => {
  const [keyInput, setKeyInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [systemPrompt, setSystemPrompt] = useAtom(systemPromptAtom);
  const [promptInput, setPromptInput] = useState(systemPrompt);

  // Sync local state when global state changes (e.g. reset)
  useEffect(() => {
    setPromptInput(systemPrompt);
  }, [systemPrompt]);

  const handleSaveKey = async () => {
    if (!keyInput) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const resp = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${keyInput}` },
      });

      if (!resp.ok) {
        throw new Error(`Invalid API Key (Status ${resp.status})`);
      }

      setApiKey(keyInput);
      setKeyInput("");
    } catch (err: unknown) {
      setVerificationError(
        err instanceof Error ? err.message : "Failed to verify API key",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearKey = () => {
    setApiKey(null);
  };

  const handleSavePrompt = () => {
    setSystemPrompt(promptInput);
  };

  const handleResetPrompt = () => {
    setPromptInput(DEFAULT_SYSTEM_PROMPT);
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  return (
    <div className={styles.settingsPanel}>
      <div className={styles.settingsHeader}>
        <h3 className={styles.settingsTitle}>Settings</h3>
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>

      <div className={styles.settingsSection}>
        <div className={styles.settingsLabel}>OpenAI API Key</div>
        {apiKey ? (
          <div className={styles.keyStatus}>
            <div className={styles.keyActive}>
              <CheckIcon width="1em" height="1em" />
              <span>API Key is set</span>
            </div>
            <button
              className={styles.clearKeyButton}
              onClick={handleClearKey}
              disabled={waitingForReply}
            >
              Clear Key
            </button>
          </div>
        ) : (
          <div className={styles.apiKeyRow}>
            <input
              type="password"
              className={styles.apiKeyInput}
              placeholder="Enter OpenAI API key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              aria-label="OpenAI API key"
            />
            <button
              className={styles.apiKeyButton}
              onClick={handleSaveKey}
              disabled={!keyInput}
            >
              {isVerifying ? "Verifying..." : "Save"}
            </button>
          </div>
        )}
        <div className={styles.settingsNote}>
          Your API key is stored locally and never shared.
        </div>
        {verificationError && (
          <div className={styles.verificationError}>
            Error: {verificationError}
          </div>
        )}
      </div>

      <div className={styles.settingsSection}>
        <div className={styles.settingsLabel}>System Prompt</div>
        <textarea
          className={styles.settingsTextarea}
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="Enter system prompt..."
          rows={4}
          disabled={waitingForReply}
        />
        <div className={styles.settingsActions}>
          <button
            className={styles.secondaryButton}
            onClick={handleResetPrompt}
            disabled={waitingForReply || promptInput === DEFAULT_SYSTEM_PROMPT}
          >
            Reset to Default
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleSavePrompt}
            disabled={waitingForReply || promptInput === systemPrompt}
          >
            Save Prompt
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatPanel = ({ visible }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [includeModel, setIncludeModel] = useState(true);
  const [waitingForReply, setWaitingForReply] = useState(false);

  const [apiKey, setApiKey] = useAtom(apiKeyAtom);
  const [systemPrompt] = useAtom(systemPromptAtom);
  const [model, setModel] = useAtom(modelAtom);
  const editorContent = useAtomValue(editorContentAtom);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatHistory] = useAtom(chatHistoryAtom);
  const hasActiveProject = useAtomValue(hasActiveProjectAtom);
  const [activeConversation, setActiveConversation] = useAtom(
    activeConversationAtom,
  );

  const upsertActiveConversation = useSetAtom(upsertActiveConversationAtom);
  const migrateChatData = useSetAtom(migrateFromLegacyDbAtom);

  useEffect(() => {
    void migrateChatData();
  }, [migrateChatData]);

  const isContextActive = includeModel && hasActiveProject;

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.role === "llm" && !lastMessage.thinking) {
      // If the last message is a completed LLM response, scroll to its top
      requestAnimationFrame(() => {
        const lastMessageEl = el.lastElementChild;
        lastMessageEl?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    } else {
      // Otherwise (user message or thinking), scroll to bottom
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
      isError: m.isError,
    }));

    try {
      void upsertActiveConversation({ messages: conv });
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

    let contextMessage = "";
    if (isContextActive) {
      contextMessage = `\n\nContext:\nCurrent Model:\n\`\`\`antimony\n${editorContent}\n\`\`\``;
    }

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

      // Replace the last user message with the one containing context
      const lastUserMsg = convo.findLast((m) => m.role === "user");

      if (lastUserMsg && isContextActive) {
        lastUserMsg.content += contextMessage;
      }

      const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          input: convo,
          max_output_tokens: 1024,
          instructions: systemPrompt,
        }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`OpenAI error ${resp.status}: ${body}`);
      }

      const data = (await resp.json()) as OpenAiResponse;

      const reply =
        data?.output?.find((i) => i.type === "message")?.content[0]?.text ??
        "(no response)";
      finalizedMessages = finalizedMessages.map((m) =>
        m.id === placeholderId ? { ...m, text: reply, thinking: false } : m,
      );
    } catch (err: unknown) {
      finalizedMessages = newMessages.map((m) =>
        m.id === placeholderId
          ? {
              ...m,
              text: getVerboseError(err),
              thinking: false,
              isError: true,
            }
          : m,
      );
    } finally {
      setMessages(finalizedMessages);
      saveConversation(finalizedMessages);
      setWaitingForReply(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<
    HTMLTextAreaElement
  > = async () => {
    // Prevent sending messages with keyboard shortcuts
    // Users must use the send button instead
  };

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";

    const computedStyle = window.getComputedStyle(ta);
    const maxHeightStr = computedStyle.maxHeight || "0px";
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
          <ChatSettings
            apiKey={apiKey}
            setApiKey={setApiKey}
            onClose={() => setShowSettings(false)}
            waitingForReply={waitingForReply}
          />
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
                      disabled={waitingForReply}
                    />
                  ))
              )}
            </div>
          </div>
        ) : null}

        <div className={styles.chatContent}>
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
                  className={clsx(
                    styles.messageBubble,
                    m.thinking && styles.thinkingBubble,
                    m.isError && styles.errorBubble,
                  )}
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
            {!apiKey ? (
              <div className={styles.overlay} aria-hidden="true">
                <div className={styles.overlayContent}>
                  <div>Please enter an OpenAI API key in settings</div>
                </div>
              </div>
            ) : null}

            <div className={styles.inputColumn}>
              <div
                className={clsx(
                  styles.inputWrapper,
                  isContextActive && styles.inputWrapperConnected,
                )}
              >
                <div
                  className={clsx(
                    styles.contextBar,
                    isContextActive && styles.contextBarConnected,
                    !hasActiveProject && styles.contextBarDisabled,
                  )}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={isContextActive}
                      onChange={(e) => setIncludeModel(e.target.checked)}
                      disabled={!hasActiveProject}
                    />
                    Include current model as context
                  </label>
                </div>
                <textarea
                  ref={inputRef}
                  className={clsx(
                    styles.input,
                    isContextActive && styles.inputWithContext,
                  )}
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
              <div className={styles.inputToolbar}>
                <Select
                  name="Model"
                  value={model}
                  onChange={setModel}
                  options={Object.fromEntries(
                    AVAILABLE_MODELS.map((m) => [m.name, m.id]),
                  )}
                  className={styles.modelSelector}
                  aria-label="Select Model"
                />
                <button
                  id="chat-enter-button"
                  className={styles.sendButton}
                  aria-label="Send message"
                  onClick={sendMessage}
                  disabled={waitingForReply || !apiKey || !input.trim()}
                >
                  <SendIcon width="1em" height="1em" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
