import { useProjectActions } from "@/globals/project";
import styles from "./NoActiveProjectPanel.module.css";
import buttonStyles from "@/components/Button.module.css";

import PlusIcon from "@/assets/icons/PlusIcon.svg?react";

const NoActiveProjectPanel = () => {
  const { createNewProject, projectActionStatus } = useProjectActions();

  return (
    <div className={styles.panel}>
      <p className={styles.text}>No project open.</p>
      <button
        className={buttonStyles.primary}
        onClick={() => createNewProject()}
        disabled={projectActionStatus !== null}
      >
        <PlusIcon aria-hidden width="1em" height="1em" />
        New Project
      </button>
    </div>
  );
};

export default NoActiveProjectPanel;
