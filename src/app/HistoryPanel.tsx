import { useAtomValue, useSetAtom, useAtom } from "jotai";
import { useEffect, useState } from "react";

import styles from "./HistoryPanel.module.css";
import PanelTitle from "../components/PanelTitle";

import CheckIcon from "@/assets/icons/CheckIcon.svg?react";

import { historyAtom, type HistoryRecord } from "@/globals/history";
import { timeToAgoText } from "@/features/formatUtils";
import { simulationResultAtom } from "@/globals/simulation";
import { currentRightPanelAtom } from "@/globals/layout";
import { updateEditorContentAtom } from "@/globals/model";

const HistoryItem = ({
  record,
  selected,
  onClick,
}: {
  record: HistoryRecord;
  selected: boolean;
  onClick: (record: HistoryRecord) => void;
}) => {
  const { simulationResult, unixTimestampMs: recordTimestampMs } = record;
  const [timestampMs, setTimestampMs] = useState(() => Date.now());

  // prettier-ignore
  const simulationType =
    simulationResult.type === "timeCourse" ? "Time Course"
    : simulationResult.type === "steadyState" ? "Steady State"
    : simulationResult.type === "parameterScan" && simulationResult.mode === "timeCourse" ? "Time Course Parameter Scan"
    : simulationResult.type === "parameterScan" && simulationResult.mode === "steadyState" ? "Steady State Parameter Scan"
    : "Unknown";

  const time = timeToAgoText(timestampMs - recordTimestampMs).toLowerCase();

  useEffect(() => {
    const id = setInterval(() => {
      setTimestampMs(Date.now());
    }, 60 * 1_000);

    return () => clearInterval(id);
  }, []);

  return (
    <button
      className={styles.button}
      onClick={() => onClick(record)}
      role="option"
      aria-selected={selected}
    >
      <div className={styles.buttonMain}>
        <span className={styles.buttonTitle}>{record.modelName}</span>
        <span className={styles.buttonSubtitle}>
          {simulationType}, {time}
        </span>
      </div>

      <div className={styles.buttonCheck}>
        {selected && <CheckIcon width="1em" height="1em" aria-hidden />}
      </div>
    </button>
  );
};

export interface HistoryPanelProps {
  visible: boolean;
}

const HistoryPanel = ({ visible }: HistoryPanelProps) => {
  const history = useAtomValue(historyAtom);
  const updateEditorContent = useSetAtom(updateEditorContentAtom);
  const [simulationResult, setSimulationResult] = useAtom(simulationResultAtom);
  const setCurrentRightPanel = useSetAtom(currentRightPanelAtom);

  const handleRecordClick = (record: HistoryRecord) => {
    setSimulationResult(record.simulationResult);
    setCurrentRightPanel("Results");
    void updateEditorContent({ content: record.code, skipDebounce: true });
  };

  if (!visible) {
    return null;
  } else {
    const reversedHistory = [...history];
    reversedHistory.reverse();

    return (
      <div className={styles.panel} data-testid="history-panel">
        <PanelTitle title="History" />
        {history.length === 0 ? (
          <p className={styles.noHistory}>No history</p>
        ) : (
          <ul className={styles.list}>
            {reversedHistory.map((record) => (
              <HistoryItem
                key={record.unixTimestampMs}
                record={record}
                selected={simulationResult === record.simulationResult}
                onClick={handleRecordClick}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }
};

export default HistoryPanel;
