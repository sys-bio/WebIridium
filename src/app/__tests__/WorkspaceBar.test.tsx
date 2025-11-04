import { it, expect } from "vitest";
import { useAtomValue } from "jotai";
import { screen } from "@testing-library/react";

import { renderWithinWorkspace } from "@/testing-utils/render";
import { nameAtom } from "@/globals/settings";
import WorkspaceBar from "../WorkspaceBar";
import userEvent from "@testing-library/user-event";

const getWorkspaceNameLabelText = (workspaceName: string) =>
  `Workspace Name: ${workspaceName}`;

/** Helper test component that shows the workspace name. */
const WorkspaceNameLabel = () => {
  const workspaceName = useAtomValue(nameAtom);
  return <p>{getWorkspaceNameLabelText(workspaceName)}</p>;
};

const renderWorkspaceBar = async () => {
  await renderWithinWorkspace(
    <div>
      <WorkspaceNameLabel />
      <WorkspaceBar />
    </div>,
  );
};

const clickRename = async () => {
  await userEvent.click(screen.getByRole("button"));
};

it("should rename the workspace", async () => {
  await renderWorkspaceBar();

  await clickRename();

  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, "new name[Enter]");

  expect(input).not.toHaveFocus();
  expect(
    screen.getByText(getWorkspaceNameLabelText("new name")),
  ).toBeInTheDocument();
});

it("should cancel rename on escape", async () => {
  await renderWorkspaceBar();

  await clickRename();

  const input = screen.getByRole("textbox");
  await userEvent.type(input, "new name[Escape]");

  expect(input).not.toHaveFocus();
  expect(
    screen.queryByText(getWorkspaceNameLabelText("new name")),
  ).not.toBeInTheDocument();
});

it("should cancel rename when clicking somewhere else", async () => {
  await renderWorkspaceBar();

  await clickRename();

  const input = screen.getByRole("textbox");
  await userEvent.type(input, "new name");

  await userEvent.pointer({ keys: "[MouseLeft]" });

  expect(input).not.toHaveFocus();
  expect(
    screen.queryByText(getWorkspaceNameLabelText("new name")),
  ).not.toBeInTheDocument();
});

it("should not rename when name is invalid", async () => {
  await renderWorkspaceBar();

  await clickRename();

  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, "      [Enter]");

  expect(input).toHaveFocus();
  expect(
    screen.queryByText(getWorkspaceNameLabelText("      ")),
  ).not.toBeInTheDocument();
});

// TODO: add more tests
