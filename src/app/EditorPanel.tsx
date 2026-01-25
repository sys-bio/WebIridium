import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import * as monaco from "monaco-editor";

import { useToast } from "@/components/Toast";

import styles from "./EditorPanel.module.css";
import { editorContentAtom, updateEditorContentAtom } from "@/globals/model";
import { editorFontSizeAtom, themeAtom } from "@/globals/appearance";
import {
  editorActionsDispatcherAtom,
  type EditorActionsDispatcher,
} from "@/globals/editorActions";
import {
  addVariablePresetToModel,
  createLoadPresetCommandHandler,
  createLoadPresetProvider,
} from "@/features/editor/presetComments";
import { type SettableVariable } from "@/features/simulation/Simulator";
import ModelSemanticsChecker from "@/features/editor/language-handler/ModelSemanticChecker";
import {
  areSlidersActiveAtom,
  loadPresetAndSimulateAtom,
  variableSliderStatesAtom,
} from "@/globals/slider";
import { monacoThemes } from "@/features/editor/monacoThemes";

const SEMANTIC_CHECKER_DEBOUNCE = 100; // in ms
const ANNOTATION_COLOR = "Red";

const VARIABLE_CHANGED_WARNING_DEBOUNCE = 10_000; // in ms

const EditorPanel = () => {
  const theme = useAtomValue(themeAtom);
  const fontSize = useAtomValue(editorFontSizeAtom);

  const loadPresetAndSimulate = useSetAtom(loadPresetAndSimulateAtom);
  const setEditorActionsDispatcher = useSetAtom(editorActionsDispatcherAtom);

  const variableSliderStates = useAtomValue(variableSliderStatesAtom);
  const areSlidersActive = useAtomValue(areSlidersActiveAtom);

  const editorContent = useAtomValue(editorContentAtom);
  const updateEditorContent = useSetAtom(updateEditorContentAtom);

  const { toast } = useToast();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const semanticCheckerTimerIdRef = useRef<number | null>(null);
  const areAnnotationsEnabledRef = useRef(false);

  const canWarnChangedRef = useRef(true); // used for debouncing the warning when a variable with a slider on changes
  const onEditorChangeRef = useRef<() => Promise<void>>(async () => {});
  onEditorChangeRef.current = async () => {
    if (!editorRef.current) return;

    queueSemanticCheck();

    const result = await updateEditorContent({
      content: editorRef.current.getValue(),
    });

    if (
      canWarnChangedRef.current &&
      areSlidersActive &&
      result.type === "success"
    ) {
      const oldValues = new Map(
        result.oldVariables
          .filter((v) => v.type === "settable")
          .map((v) => [v.name, v.defaultValue]),
      );

      for (const v of result.newVariables) {
        const oldValue = oldValues.get(v.name);
        if (oldValue === undefined) continue;

        if (oldValue !== (v as SettableVariable).defaultValue) {
          if (Object.hasOwn(variableSliderStates, v.name)) {
            canWarnChangedRef.current = false;

            setTimeout(() => {
              canWarnChangedRef.current = true;
            }, VARIABLE_CHANGED_WARNING_DEBOUNCE);

            toast({
              type: "warning",
              title: "Variable changed while slider active",
              description:
                "The slider value will take precedence over the updated model value.",
            });

            break;
          }
        }
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container && !editorRef.current) {
      // monaco instance setup

      const editor = monaco.editor.create(container, {
        value: editorContent,
        language: "antimony",
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        matchBrackets: "always",
        showFoldingControls: "always",
        minimap: {
          enabled: false,
        },
        padding: {
          top: 4,
        },
        codeLens: true,
        fontSize,
      });

      const editorChangeEvent = editor.onDidChangeModelContent(() => {
        void onEditorChangeRef.current();
      });

      monaco.editor.setTheme(monacoThemes[theme].name);

      const handlePresetLoad = (
        name: string,
        preset: Record<string, number>,
      ) => {
        loadPresetAndSimulate(preset);
        toast({
          type: "success",
          title: `Loaded ${name}`,
          description: Object.entries(preset)
            .map(([k, v]) => `${k}=${v}`)
            .join(", "),
        });
      };

      const loadPresetCommandId = editor.addCommand(
        0,
        createLoadPresetCommandHandler(editor.getModel()!, handlePresetLoad),
      );

      const loadPresetProvider = monaco.languages.registerCodeLensProvider(
        "antimony",
        createLoadPresetProvider(loadPresetCommandId!),
      );

      editorRef.current = editor;

      // dispatcher setup

      const dispatcher: EditorActionsDispatcher = {
        addPresetAsComment: (name, presets) => {
          const [newContent, { line, column }] = addVariablePresetToModel(
            editor.getValue(),
            name,
            presets,
          );

          editor.setValue(newContent);
          editor.revealPositionInCenter({
            lineNumber: line + 1,
            column: 1,
          });
          editor.focus();
          editor.setSelection({
            startLineNumber: line + 1,
            endLineNumber: line + 1,
            startColumn: column + 1,
            endColumn: 9999, // select the rest of the line
          });
        },
      };

      setEditorActionsDispatcher(dispatcher);

      return () => {
        editorChangeEvent.dispose();
        editor.dispose();
        loadPresetProvider.dispose();
        editorRef.current = null;

        setEditorActionsDispatcher((prev) =>
          prev === dispatcher ? null : prev,
        );
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    containerRef,
    onEditorChangeRef,
    updateEditorContent,
    setEditorActionsDispatcher,
    loadPresetAndSimulate,
    theme,
    fontSize,
  ]);

  // sychronize when editor content changes externally
  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      if (editor.getValue() !== editorContent) {
        editor.setValue(editorContent);
      }
    }
  }, [editorContent]);

  const queueSemanticCheck = () => {
    const editor = editorRef.current;
    if (!editor) return;

    if (semanticCheckerTimerIdRef.current) {
      clearTimeout(semanticCheckerTimerIdRef.current);
    }

    semanticCheckerTimerIdRef.current = window.setTimeout(() => {
      semanticCheckerTimerIdRef.current = null;
      ModelSemanticsChecker(
        editor,
        areAnnotationsEnabledRef.current,
        true,
        ANNOTATION_COLOR,
        decorationsRef.current,
      );
    }, SEMANTIC_CHECKER_DEBOUNCE);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.container} ref={containerRef} />
    </div>
  );
};

export default EditorPanel;
