import styles from "./AppErrorWrapperPage.module.css";
import * as React from "react";

const GITHUB_ISSUES_LINK = "https://github.com/sys-bio/WebIridium/issues";

type Props = {
  children: React.ReactNode;
};

type State =
  | { errorInfo: null; error: null }
  | {
      errorInfo: React.ErrorInfo;
      error: Error;
    };

/**
 * This page shows up anytime the app errors while rendering.
 * It will prompt them to create an issue.
 */
class AppErrorWrapperPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { errorInfo: null, error: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.error) {
      const message =
        `Error: ${this.state.error.name} ${this.state.error.message}\n\n` +
        // eslint-disable-next-line
        `Cause: ${String(this.state.error.cause || "missing")}\n\n` +
        `Stacktrace: ${this.state.error.stack || "missing"}\n\n` +
        `Component Stack: ${this.state.errorInfo.componentStack}\n\n`;

      return (
        <div className={styles.container}>
          <div className={styles.root}>
            <h1 className={styles.title}>Unexpected Error Occurred</h1>

            <p className={styles.message}>
              Please create a GitHub issue for this on the sys-bio/WebIridium
              repository if it has not yet been reported. Provide these logs:
            </p>

            <textarea className={styles.textarea} readOnly value={message} />

            <div className={styles.buttons}>
              <a
                className={styles.link}
                href={GITHUB_ISSUES_LINK}
                target="_blank"
              >
                Create GitHub Issue
              </a>
            </div>
          </div>
        </div>
      );
    } else {
      return this.props.children;
    }
  }
}

export default AppErrorWrapperPage;
