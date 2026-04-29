import { describe, it, expect, afterEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithinWorkspace } from "@/testing-utils/render";
import TimeCoursePanel from "@/app/simulation/TimeCoursePanel";
import StartPanel from "../StartPanel";
import AppMenubar from "@/app/AppMenubar";
import {
  removeMockProject,
  resetMockDatabaseDelay,
  resetMockProjects,
  setMockDatabaseDelay,
  setMockProject,
} from "@/testing-utils/mockDatabase";
import { getNewProjectData, type ProjectData } from "@/features/savedData";
import { getToastHistory } from "@/testing-utils/mockToast";

afterEach(() => {
  resetMockDatabaseDelay();
  resetMockProjects();
});

const getProjectDataWithName = (name: string): ProjectData => {
  const data = getNewProjectData();
  data.metadata.name = name;
  return data;
};

describe("selecting project", () => {
  it("should enable simulation", async () => {
    await setMockProject("1", getProjectDataWithName("test"));

    await renderWithinWorkspace(
      <>
        <TimeCoursePanel visible />
        <StartPanel />
      </>,
      { shouldStubActiveFile: false },
    );

    await waitFor(() => {
      expect(screen.getByText("test")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("test"));

    await waitFor(() => {
      expect(screen.getByText("Simulate")).toBeInTheDocument();
    });
  });

  it("should show project name in menubar", async () => {
    await setMockProject("1", getProjectDataWithName("test"));

    await renderWithinWorkspace(
      <>
        <AppMenubar />
        <TimeCoursePanel visible />
        <StartPanel />
      </>,
      { shouldStubActiveFile: false },
    );

    const menubar = screen.getByTestId("app-menubar");
    expect(screen.queryByText("Simulate")).not.toBeInTheDocument();
    expect(within(menubar).queryByText("test")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("test")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("test"));

    await waitFor(() => {
      expect(within(menubar).getByText("test")).toBeInTheDocument();
    });
  });

  it("should have a reasonable error message if the file no longer exists", async () => {
    await setMockProject("1", getProjectDataWithName("test"));

    await renderWithinWorkspace(
      <>
        <TimeCoursePanel visible />
        <StartPanel />
      </>,
      { shouldStubActiveFile: false },
    );

    await waitFor(() => {
      expect(screen.getByText("test")).toBeInTheDocument();
    });

    await removeMockProject("1");

    await userEvent.click(screen.getByText("test"));

    await waitFor(() => {
      const toastHistory = getToastHistory();
      expect(toastHistory[0].description).toMatch(/deleted/i);
    });
  });
});

describe("creating a project", () => {
  it("should enable simulation", async () => {
    await renderWithinWorkspace(
      <>
        <TimeCoursePanel visible />
        <StartPanel />
      </>,
      { shouldStubActiveFile: false },
    );

    expect(screen.queryByText("Simulate")).not.toBeInTheDocument();

    // eslint-disable-next-line
    const myProjects = screen.getByText("My Projects").parentElement!;
    await userEvent.click(within(myProjects).getByText("New Project"));

    await waitFor(() => {
      expect(screen.getByText("Simulate")).toBeInTheDocument();
    });
  });

  it("should show project name in menubar", async () => {
    await renderWithinWorkspace(
      <>
        <AppMenubar />
        <TimeCoursePanel visible />
        <StartPanel />
      </>,
      { shouldStubActiveFile: false },
    );

    const menubar = screen.getByTestId("app-menubar");
    expect(screen.queryByText("Simulate")).not.toBeInTheDocument();
    expect(within(menubar).queryByText("test")).not.toBeInTheDocument();

    // eslint-disable-next-line
    const myProjects = screen.getByText("My Projects").parentElement!;
    await userEvent.click(within(myProjects).getByText("New Project"));

    const defaultName = getNewProjectData().metadata.name;
    await waitFor(() => {
      expect(within(menubar).getByText(defaultName)).toBeInTheDocument();
    });
  });

  it("should not create if opening a project", async () => {
    await setMockProject("1", getProjectDataWithName("test"));

    await renderWithinWorkspace(
      <>
        <AppMenubar />
        <TimeCoursePanel visible />
        <StartPanel />
      </>,
      { shouldStubActiveFile: false },
    );

    const menubar = screen.getByTestId("app-menubar");

    expect(screen.queryByText("Simulate")).not.toBeInTheDocument();

    expect(within(menubar).queryByText("test")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("test")).toBeInTheDocument();
    });

    setMockDatabaseDelay(50);

    await userEvent.click(screen.getByText("test"));

    // eslint-disable-next-line
    const myProjects = screen.getByText("My Projects").parentElement!;
    await userEvent.click(within(myProjects).getByText("New Project"));

    await waitFor(
      () => {
        expect(within(menubar).getByText("test")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });
});

describe("deleting", () => {
  it("should remove an item from the list", async () => {
    await setMockProject("1", getProjectDataWithName("test"));

    await renderWithinWorkspace(
      <>
        <TimeCoursePanel visible />
        <StartPanel />
      </>,
      { shouldStubActiveFile: false },
    );

    expect(screen.getByText("test")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("More"));
    await userEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.queryByText("test")).not.toBeInTheDocument();
    });
  });

  it("should not do anything if opening a file", async () => {
    await setMockProject("1", getProjectDataWithName("test1"));
    await setMockProject("2", getProjectDataWithName("test2"));

    await renderWithinWorkspace(
      <>
        <TimeCoursePanel visible />
        <StartPanel />
      </>,
      { shouldStubActiveFile: false },
    );

    await waitFor(() => {
      expect(screen.getByText("test1")).toBeInTheDocument();
    });

    setMockDatabaseDelay(50);

    await userEvent.click(screen.getByText("test1"));

    await userEvent.click(screen.getAllByLabelText("More")[0]);

    await userEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.getByText("test1")).toBeInTheDocument();
    });
  });
});
