import { test, expect, describe, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderFlush, renderWithinWorkspace } from "@/testing-utils/render";
import userEvent from "@testing-library/user-event";

import { useSetAtom } from "jotai";

import App, { AppContent } from "@/app/App";
import { updateSimulatorAtom } from "@/globals/simulator";

const RESULTS_PANEL_TEST_ID = "results-panel";

test.skip("results panel should only be visible after simulating", async () => {
  await renderFlush(<App />);

  expect(screen.queryByTestId(RESULTS_PANEL_TEST_ID)).not.toBeInTheDocument();

  const simulateButton = screen.getByText("Simulate");
  await userEvent.click(simulateButton);

  expect(screen.getByTestId(RESULTS_PANEL_TEST_ID)).toBeInTheDocument();
});

describe.skip("sidebar", () => {
  it("should show steady state if it is available", async () => {
    await renderWithinWorkspace(<AppContent />);

    const steadyStateButton = screen.getByLabelText("Steady State");
    expect(steadyStateButton).toBeInTheDocument();
    expect(steadyStateButton).toHaveRole("button");
  });

  it("should not show steady state if it is not available", async () => {
    const SWITCH_TEXT = "SWITCH TO LIBSBMLSIM";
    const SwitchToLibSbmlSimButton = () => {
      const updateSimulator = useSetAtom(updateSimulatorAtom);
      return (
        <button onClick={() => updateSimulator("libsbmlsim")}>
          {SWITCH_TEXT}
        </button>
      );
    };

    await renderWithinWorkspace(
      <>
        <AppContent />
        <SwitchToLibSbmlSimButton />
      </>,
    );

    const steadyStateButton = screen.getByLabelText("Steady State");
    expect(steadyStateButton).toBeInTheDocument();
    expect(steadyStateButton).toHaveRole("button");

    const switchButton = screen.getByText(SWITCH_TEXT);
    expect(switchButton).toBeInTheDocument();
    await userEvent.click(switchButton);

    expect(screen.queryByLabelText("Steady State")).not.toBeInTheDocument();
  });
});
