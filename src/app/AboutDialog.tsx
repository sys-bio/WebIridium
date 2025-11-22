import styles from "./AboutDialogue.module.css";
import Dialog from "@/components/Dialog";

export interface AboutDialogProps {
  onClose: () => void;
}

const AboutDialog = ({ onClose }: AboutDialogProps) => {
  return (
    <Dialog
      title="About"
      description="Information about Web Iridium"
      showDescription={false}
      onClose={onClose}
    >
      <p className={styles.aboutText}>
        Version: 0.0.1
        <br />
        Copyright: 2025
        <br />
        <br />
        Antimony: 3.1.1
        <br />
        libSBML: 5.20.4
        <br />
        COPASI: 4.44
        <br />
        libsbmlsim: 1.4.0
        <br />
      </p>
    </Dialog>
  );
};

export default AboutDialog;
