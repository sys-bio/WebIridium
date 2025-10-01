import clsx from "clsx";

import buttonStyles from "./Button.module.css";
import styles from "./IconButton.module.css";

import { Tooltip } from "./Tooltip";

export interface IconButtonProps extends React.ComponentProps<"button"> {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** default is "normal" */
  size?: "normal" | "small";
  ref?: React.RefObject<HTMLButtonElement>;
  children: React.ReactNode;
}

const IconButton = ({
  label,
  onClick,
  disabled = false,
  size = "normal",
  ref,
  children,
  ...rest
}: IconButtonProps) => {
  return (
    <Tooltip text={label}>
      <button
        className={clsx(
          buttonStyles.ghostText,
          styles.iconButton,
          styles[size],
        )}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        ref={ref}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
};

export default IconButton;
