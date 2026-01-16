// TODO: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

import styles from "./Sidebar.module.css";

import { type LeftPanel } from "@/globals/layout";

import TimeCourseIcon from "@/assets/icons//TimeCourseIcon.svg?react";
import ParameterScanIcon from "@/assets/icons/ParameterScanIcon.svg?react";
import SteadyStateIcon from "@/assets/icons/SteadyStateIcon.svg?react";
import HistoryIcon from "@/assets/icons/HistoryIcon.svg?react";
import NotebookIcon from "@/assets/icons/NotebookIcon.svg?react";
import RobotIcon from "@/assets/icons/RobotIcon.svg?react";

const PANEL_ICONS: Record<
  LeftPanel,
  React.ComponentType<{ width: string; height: string }>
> = {
  "Time Course": TimeCourseIcon,
  "Parameter Scan": ParameterScanIcon,
  "Steady State": SteadyStateIcon,
  History: HistoryIcon,
  Examples: NotebookIcon,
  Chat: RobotIcon,
} as const;

const TAB_ALIASES: Record<string, string> = {
  "Time Course": "Time",
  "Parameter Scan": "Scan",
  "Steady State": "Steady",
};

// These one's appear the at the top, the rest appear at the bottom of the bar
const TOP_PANELS = new Set<LeftPanel>([
  "Time Course",
  "Parameter Scan",
  "Steady State",
]);

interface SidebarItemProps {
  panel: LeftPanel;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem = ({ panel: tab, isActive, onClick }: SidebarItemProps) => {
  const TabIcon = PANEL_ICONS[tab];
  return (
    <button
      className={styles.trigger}
      aria-label={tab}
      onClick={onClick}
      data-state={isActive ? "active" : "inactive"}
    >
      <TabIcon aria-hidden width="1em" height="1em" />
      <span>{TAB_ALIASES[tab] ?? tab}</span>
    </button>
  );
};

export interface SidebarProps {
  panels: readonly LeftPanel[];
  currentPanel: LeftPanel | null;
  onPanelChange: (panel: LeftPanel | null) => void;
}

const Sidebar = ({ panels, currentPanel, onPanelChange }: SidebarProps) => {
  const handleTabClick = (panel: LeftPanel) => {
    if (currentPanel === panel) {
      onPanelChange(null);
    } else {
      onPanelChange(panel);
    }
  };

  return (
    <div className={styles.root} data-collapsed={currentPanel === null}>
      <div className={styles.list}>
        {panels
          .filter((t) => TOP_PANELS.has(t))
          .map((panel) => (
            <SidebarItem
              key={panel}
              panel={panel}
              isActive={currentPanel === panel}
              onClick={() => handleTabClick(panel)}
            />
          ))}
      </div>

      <div className={styles.list}>
        {panels
          .filter((t) => !TOP_PANELS.has(t))
          .map((panel) => (
            <SidebarItem
              key={panel}
              panel={panel}
              isActive={currentPanel === panel}
              onClick={() => handleTabClick(panel)}
            />
          ))}
      </div>
    </div>
  );
};

export default Sidebar;
