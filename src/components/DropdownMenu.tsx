import styles from "./DropdownMenu.module.css";
import { DropdownMenu as RadixDropdownMenu } from "radix-ui";

export interface DropdownMenuRootProps {
  children: React.ReactNode;
}

export const DropdownMenuRoot = ({ children }: DropdownMenuRootProps) => {
  return <RadixDropdownMenu.Root>{children}</RadixDropdownMenu.Root>;
};

export interface DropdownMenuTriggerProps {
  children: React.ReactNode;
}

export const DropdownMenuTrigger = ({ children }: DropdownMenuTriggerProps) => {
  return (
    <RadixDropdownMenu.Trigger asChild>{children}</RadixDropdownMenu.Trigger>
  );
};

export interface DropdownMenuContentProps {
  children: React.ReactNode;
}

export const DropdownMenuContent = ({ children }: DropdownMenuContentProps) => {
  return (
    <RadixDropdownMenu.Portal>
      <RadixDropdownMenu.Content
        className={styles.content}
        collisionPadding={8}
      >
        {children}
      </RadixDropdownMenu.Content>
    </RadixDropdownMenu.Portal>
  );
};

export interface DropdownMenuItemProps {
  name: string;
  onSelect: () => void;
}

export const DropdownMenuItem = ({ name, onSelect }: DropdownMenuItemProps) => {
  return (
    <RadixDropdownMenu.Item className={styles.item} onSelect={onSelect}>
      {name}
    </RadixDropdownMenu.Item>
  );
};
