/* eslint-disable react-refresh/only-export-components */
/**
 * Shared tests between simulation panels.
 *
 * MAKE SURE to mock everything required to get a simulation to run in the test
 * environment
 */

import { it, afterEach, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  resetWorkerResponseDelay,
  setWorkerResponseDelay,
  resetWorkerFailMode,
  setWorkerFailMode,
} from "@/testing-utils/mockWorker.ts";
import { getToastHistory, resetToastHistory } from "@/testing-utils/mockToast";
import { useSetAtom } from "jotai";
import { updateEditorContentAtom } from "@/globals/model";
import { renderWithinWorkspace } from "@/testing-utils/render";

afterEach(() => {
  resetWorkerResponseDelay();
  resetWorkerFailMode();
  resetToastHistory();
});

export interface TestSimulationButtonOptions {
  render: () => Promise<void>;
  buttonText: string;
}

export const itShouldDisableWhenStartingSimulation = ({
  render,
  buttonText,
}: TestSimulationButtonOptions) => {
  it("should disable when starting a simulation", async () => {
    // need to have some delay otherwise the button will instantly simulate and undisable itself

    await render();

    // This has to go after the render because the model info update
    // also goes through a worker round-trip. The button will refuse
    // to run a simulation if there is no parameter to scan with.
    setWorkerResponseDelay(100);

    const button = screen.getByText(buttonText);
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
    await userEvent.click(button);
    expect(button).toBeDisabled();
  });
};

export const itShouldDisplayPlot = ({
  render,
  buttonText,
}: TestSimulationButtonOptions) => {
  it("should display a plot", async () => {
    await render();

    const button = screen.getByText(buttonText);
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
    await userEvent.click(button);
    expect(screen.getByTestId("results-plot")).toBeInTheDocument();
  });
};

export const itShouldBeCancellable = ({
  render,
  buttonText,
}: TestSimulationButtonOptions) => {
  it.skip("should be cancellable", async () => {
    await render();

    setWorkerResponseDelay(100);

    const button = screen.getByText(buttonText);
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
    await userEvent.click(button);

    const cancel = screen.getByLabelText("Cancel");
    await userEvent.click(cancel);

    // add a bunch of wait for, this test is very flaky :(
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
    await waitFor(() => {
      expect(cancel).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByTestId("results-plot")).not.toBeInTheDocument();
    });
  });
};

export const itShouldDisplayToasts = ({
  render,
  buttonText,
}: TestSimulationButtonOptions) => {
  it("should toast on an error", async () => {
    await render();

    setWorkerFailMode("always");

    const button = screen.getByText(buttonText);
    await userEvent.click(button);

    await waitFor(() => {
      expect(getToastHistory()).toHaveLength(1);
    });
  });
};

export const ForceModelUpdateButton = () => {
  const updateEditorContent = useSetAtom(updateEditorContentAtom);
  return (
    <button onClick={() => updateEditorContent({ content: "test" })}>
      FORCE UPDATE
    </button>
  );
};

/** For this render function, make sure to include the ForceModelUpdateButton component in the render. */
export const itShouldBeLoadingWhenModelIsLoading = ({
  render,
  buttonText,
}: TestSimulationButtonOptions) => {
  it("should be loading when model is loading", async () => {
    setWorkerResponseDelay(50);

    await render();

    const forceUpdateButton = screen.getByText("FORCE UPDATE");
    const button = screen.getByText(buttonText);

    await userEvent.click(forceUpdateButton);

    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
};

export const itShouldShowNoActiveProjectPanel = (
  render: () => React.ReactNode,
) => {
  it("should show no active project panel", async () => {
    await renderWithinWorkspace(render(), { shouldStubActiveFile: false });

    const button = screen.getByRole("button");

    expect(button).toHaveTextContent("New Project");
  });

  it("should let you create a project", async () => {
    await renderWithinWorkspace(render(), { shouldStubActiveFile: false });

    const button = screen.getByRole("button");

    expect(button).toHaveTextContent("New Project");

    await userEvent.click(button);

    expect(button).not.toBeInTheDocument();
  });
};
