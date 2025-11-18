// TODO: unit test

import clsx from "clsx";
import { useState } from "react";
import { useSetAtom } from "jotai";

import styles from "./ExamplesPanel.module.css";
import buttonStyles from "@/components/Button.module.css";

import {
  exampleFormattedNames,
  examplePresets,
  examples,
} from "@/features/examples";

import PlayIcon from "@/assets/icons/PlayIcon.svg?react";

import PanelTitle from "../components/PanelTitle";
import PulseLoader from "@/components/PulseLoader";

import { setModelAtom } from "@/globals/model";
import { useToast } from "@/components/Toast";
import { simulateTimeCourseAtom } from "@/globals/simulation";
import {
  independentVariableAtom,
  timeCourseParametersAtom,
} from "@/globals/settings";

const ExampleButton = ({
  name,
  running,
  onRun,
}: {
  name: string;
  running: boolean;
  onRun: () => void;
}) => {
  return (
    <button
      className={clsx(
        buttonStyles.default,
        styles.item,
        running && styles.running,
      )}
      disabled={running}
      onClick={onRun}
    >
      <span className={styles.itemText}>{exampleFormattedNames[name]}</span>
      <div className={styles.itemIcon} aria-hidden>
        {running ? (
          <PulseLoader size="0.3em" />
        ) : (
          <PlayIcon width="1em" height="1em" />
        )}
      </div>
    </button>
  );
};

export interface ExamplesPanelProps {
  visible: boolean;
}

const ExamplesPanel = ({ visible }: ExamplesPanelProps) => {
  const setModel = useSetAtom(setModelAtom);
  const simulateTimeCourse = useSetAtom(simulateTimeCourseAtom);
  const setTimeCourseParameters = useSetAtom(timeCourseParametersAtom);
  const setIndependentVariable = useSetAtom(independentVariableAtom);

  const { toast } = useToast();
  const [runningExample, setRunningExample] = useState<string | null>(null);

  const handleRun = async (example: string) => {
    setRunningExample(example);

    const wasModelSetSuccessful = await setModel({
      name: exampleFormattedNames[example],
      content: examples[example],
      resetCurrentResult: false,
    });

    if (!wasModelSetSuccessful) {
      toast({
        type: "error",
        title: "Example Failed to Load",
        description: "Something happened while loading the model.",
      });

      // only set running to null if another one did not override
      setRunningExample((old) => {
        if (old === example) {
          return null;
        } else {
          return old;
        }
      });
    } else {
      // apply preset
      const preset = examplePresets[example];
      if (preset) {
        setTimeCourseParameters(preset.parameters);
        if (preset.independentVariable) {
          setIndependentVariable(preset.independentVariable);
        }
      }

      const timeCourseResult = await simulateTimeCourse();
      if (timeCourseResult.type === "success") {
        setRunningExample(null);
      } else if (timeCourseResult.type === "failure") {
        toast({
          type: "error",
          title: "Example Simulation Error",
          description: timeCourseResult.message,
        });
        setRunningExample(null);
      }
    }
  };

  if (!visible) {
    return null;
  } else {
    return (
      <div className={styles.panel}>
        <PanelTitle title="Examples" />

        <div className={styles.list}>
          {Object.keys(examples).map((example) => (
            <ExampleButton
              key={example}
              name={example}
              running={example === runningExample}
              onRun={() => void handleRun(example)}
            />
          ))}
        </div>
      </div>
    );
  }
};

export default ExamplesPanel;
