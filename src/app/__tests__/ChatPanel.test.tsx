import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithinWorkspace } from "@/testing-utils/render";
import ChatPanel from "../ChatPanel";

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setupChatWithKey = async () => {
    await renderWithinWorkspace(<ChatPanel visible={true} />);

    await userEvent.click(screen.getByLabelText("Chat Settings"));

    const keyInput = screen.getByPlaceholderText("Enter OpenAI API key");
    await userEvent.type(keyInput, "sk-test-key");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await userEvent.click(screen.getAllByText("Save")[0]);

    await waitFor(() => {
      expect(screen.queryByText("Verifying...")).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Close"));
  };

  it("should display a verbose error message when API returns 401", async () => {
    await setupChatWithKey();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    const input = screen.getByLabelText("Message input");
    await userEvent.type(input, "Hello");

    await userEvent.click(screen.getByLabelText("Send message"));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid API Key provided. (401)"),
      ).toBeInTheDocument();
    });

    const messages = screen.getAllByTestId("chat-message");
    const errorBubble = messages.find((m) =>
      within(m).queryByText("Invalid API Key provided. (401)"),
    );
    expect(errorBubble?.className).toMatch(/errorBubble/);
  });

  it("should display a verbose error message when API returns 429", async () => {
    await setupChatWithKey();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Too Many Requests"),
    });

    const input = screen.getByLabelText("Message input");
    await userEvent.type(input, "Hello again");

    await userEvent.click(screen.getByLabelText("Send message"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Rate limit exceeded. Please wait a moment and try again. (429)",
        ),
      ).toBeInTheDocument();
    });
  });

  it("should display generic error for unknown errors", async () => {
    await setupChatWithKey();

    global.fetch = vi.fn().mockRejectedValue(new Error("Something exploded"));

    const input = screen.getByLabelText("Message input");
    await userEvent.type(input, "Boom");

    await userEvent.click(screen.getByLabelText("Send message"));

    await waitFor(() => {
      expect(screen.getByText("Error: Something exploded")).toBeInTheDocument();
    });
  });

  it("should render LaTeX as MathML with correct attributes", async () => {
    await setupChatWithKey();

    // Mock API response with LaTeX content
    const mockResponse = {
      output: [
        {
          type: "message",
          content: [
            {
              text: "Here is math: $$ E=mc^2 $$",
            },
          ],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });

    const input = screen.getByLabelText("Message input");
    await userEvent.type(input, "Show me math");
    await userEvent.click(screen.getByLabelText("Send message"));

    await screen.findByTestId("latex-math");
  });
});
