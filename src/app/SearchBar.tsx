import clsx from "clsx";
import { useState, useEffect, useRef } from "react";
import { useAtom } from "jotai";

import styles from "./SearchBar.module.css";
import buttonStyles from "@/components/Button.module.css";

import { convertSbmlToAntimony } from "@/features/antimony";
import { biomodelsDateToEnglish } from "@/features/formatUtils";

import {
  getSearchTypeFromSearchTerm,
  loadBiomodelSbml,
  useSearchBiomodels,
  type BiomodelInfo,
} from "@/features/biomodels";

import SearchIcon from "@/assets/icons/SearchIcon.svg?react";

import PulseLoader from "@/components/PulseLoader";
import { useToast } from "@/components/Toast";

import { nameAtom } from "@/globals/settings";
import { useSetAtom } from "jotai";
import { setModelAtom } from "@/globals/model";

type AutocompleteItems = { [group: string]: AutocompleteItem[] };

const ACTIONS_GROUP_NAME = "Actions";
const AUTOCOMPLETE_POPUP_ID = "searchBarAutocomplete";
const BIOMODELS_SEARCH_LIMIT = 25;

const isNameValid = (name: string): boolean => {
  return name.trim().length > 0;
};

const getFirstSentence = (synopysis: string): string =>
  synopysis.slice(0, synopysis.indexOf(".") + 1);

const getBiomodelLink = (info: BiomodelInfo): string =>
  `https://www.ebi.ac.uk/biomodels/${info.id}`;

const getSelectedAutocompleteItemFromIndex = (
  items: AutocompleteItems,
  index: number,
) => {
  const flattenedItems = Object.values(items)
    .flat()
    .filter((item) => item.type !== "loading");
  return flattenedItems[index];
};

const decrementIndexFromItems = (
  items: AutocompleteItems,
  index: number,
): number => {
  if (index === 0) {
    const flattenedItems = Object.values(items)
      .flat()
      .filter((item) => item.type !== "loading");
    return flattenedItems.length - 1;
  } else {
    return index - 1;
  }
};

const incrementIndexFromItems = (
  items: AutocompleteItems,
  index: number,
): number => {
  const flattenedItems = Object.values(items)
    .flat()
    .filter((item) => item.type !== "loading");
  return (index + 1) % flattenedItems.length;
};

export const SearchBar = () => {
  const { toast } = useToast();
  const [workspaceName, setWorkspaceName] = useAtom(nameAtom);
  const setModel = useSetAtom(setModelAtom);

  const popupRef = useRef<HTMLElement | null>(null);

  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState("");
  const [isLoadingBiomodel, setIsLoadingBiomodel] = useState(false);
  const searchType = typing && getSearchTypeFromSearchTerm(typing);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    biomodels,
    isLoading: isLoadingSearch,
    searchBiomodels,
    cancelSearch,
  } = useSearchBiomodels();

  const renameItem = {
    type: "simple",
    name: "Rename model to",
    value: typing,
  } as const;
  const items: AutocompleteItems = !typing
    ? {}
    : {
        [ACTIONS_GROUP_NAME]: isNameValid(typing) ? [renameItem] : [],
        Biomodels: isLoadingSearch
          ? [{ type: "loading" }]
          : biomodels.map((info) => ({ type: "biomodel", info })),
      };

  const selected = getSelectedAutocompleteItemFromIndex(items, selectedIndex);

  const openInput = () => {
    setOpen(true);
    setTyping(workspaceName);
    setSelectedIndex(0);
  };

  const cancelInput = () => {
    setOpen(false);
    cancelSearch();
  };

  /** Rename workspace and close input. */
  const rename = (name: string) => {
    if (isNameValid(name)) {
      setOpen(false);
      setWorkspaceName(name);
    } else {
      cancelInput();
    }
  };

  /** Load biomodel and update loading state. */
  const loadBiomodel = async (modelInfo: BiomodelInfo) => {
    setIsLoadingBiomodel(true);
    cancelInput();
    try {
      const sbml = await loadBiomodelSbml(modelInfo);
      const antimony = await convertSbmlToAntimony(sbml);

      void setModel({ name: modelInfo.name, content: antimony });
    } catch (e) {
      console.error(e);
      toast({
        type: "error",
        title: "Failed to load model",
        description: e instanceof Error ? e.message : "Unexpected error",
      });
    } finally {
      setIsLoadingBiomodel(false);
    }
  };

  /** Runs command action associated with given autocomplete item. */
  const activate = async (item: AutocompleteItem) => {
    if (item === renameItem) {
      rename(typing);
    } else if (item.type === "biomodel") {
      await loadBiomodel(item.info);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (selected) {
        await activate(selected);
      }
    } else if (e.key === "Escape") {
      cancelInput();
    } else if (e.key === "ArrowDown") {
      setSelectedIndex((prev) => incrementIndexFromItems(items, prev));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prev) => decrementIndexFromItems(items, prev));
      e.preventDefault();
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTyping = e.target.value;
    setTyping(newTyping);
    setSelectedIndex(0);

    await searchBiomodels(newTyping, BIOMODELS_SEARCH_LIMIT);
  };

  if (!open) {
    return (
      <button
        className={styles.main}
        onClick={openInput}
        disabled={isLoadingBiomodel}
      >
        {isLoadingBiomodel ? (
          <div>
            <PulseLoader color="var(--color-input-fg-dim)" size="6px" />
          </div>
        ) : (
          <>
            <SearchIcon
              className={styles.searchIcon}
              width="1em"
              height="1em"
            />
            <span className={styles.name}>{workspaceName}</span>
          </>
        )}
      </button>
    );
  } else {
    return (
      <div className={clsx(styles.main, styles.active)}>
        <SearchIcon className={styles.searchIcon} width="1em" height="1em" />
        <input
          id="searchBar"
          type="text"
          className={styles.input}
          autoFocus
          onFocus={(e) => e.target.select()}
          value={typing}
          placeholder="Rename your model or search for one"
          onBlur={cancelInput}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={typing.length > 0 ? AUTOCOMPLETE_POPUP_ID : undefined}
          aria-haspopup="listbox"
        />

        {typing.length > 0 && (
          <AutocompletePopup
            id={AUTOCOMPLETE_POPUP_ID}
            ref={popupRef}
            selected={selected}
            isEmphasizeId={searchType === "id"}
            items={items}
            onClick={activate}
          />
        )}
      </div>
    );
  }
};

type AutocompleteItem =
  | { type: "simple"; name: string; value: string }
  | { type: "biomodel"; info: BiomodelInfo }
  | { type: "loading" };

const AutocompletePopup = ({
  id,
  ref,
  selected,
  isEmphasizeId,
  items,
  onClick,
}: {
  id: string;
  ref: React.RefObject<HTMLElement | null>;
  selected: AutocompleteItem;
  isEmphasizeId: boolean;
  items: AutocompleteItems;
  onClick: (item: AutocompleteItem) => void;
}) => {
  const isEmpty = Object.values(items).every(
    (groupItems) => groupItems.length === 0,
  );
  return (
    <ul
      id={id}
      ref={ref as React.RefObject<HTMLUListElement>}
      className={styles.autocompletePopup}
      /* prevent unfocusing when clicking in this area because it will disappear if that happens */
      onPointerDown={(e) => e.preventDefault()}
      role="listbox"
    >
      {isEmpty ? (
        <p className={styles.noResults}>No results.</p>
      ) : (
        Object.entries(items).map(([group, groupItems]) =>
          groupItems.length === 0 ? null : (
            <div key={group} className={styles.autocompleteGroup}>
              {/* special case for action group, don't show the title */}
              {group === ACTIONS_GROUP_NAME ? null : (
                <h3 className={styles.autocompleteGroupTitle}>{group}</h3>
              )}
              {groupItems.map((item) =>
                item.type === "simple" ? (
                  <AutocompleteSimpleItem
                    key={item.value}
                    item={item}
                    selected={selected === item}
                    onClick={onClick}
                  />
                ) : item.type === "biomodel" ? (
                  <AutocompleteBiomodelItem
                    isEmphasizeId={isEmphasizeId}
                    key={item.info.id}
                    item={item}
                    selected={selected === item}
                    onClick={onClick}
                  />
                ) : item.type === "loading" ? (
                  <AutocompleteLoadingItem key={group} />
                ) : null,
              )}
            </div>
          ),
        )
      )}
    </ul>
  );
};

const useFocusOnSelected = (
  buttonRef: React.RefObject<HTMLButtonElement | null>,
  selected: boolean,
) => {
  useEffect(() => {
    if (selected && buttonRef.current) {
      buttonRef.current.scrollIntoView({
        block: "nearest",
      });
    }
  }, [buttonRef, selected]);
};

const AutocompleteSimpleItem = ({
  item,
  selected,
  onClick,
}: {
  item: Extract<AutocompleteItem, { type: "simple" }>;
  selected: boolean;
  onClick: (item: AutocompleteItem) => void;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useFocusOnSelected(buttonRef, selected);

  return (
    <li>
      <button
        ref={buttonRef}
        className={clsx(buttonStyles.ghost, styles.autocompleteItem)}
        data-active={selected}
        onClick={() => onClick(item)}
      >
        <b className={styles.autocompleteSimpleItemName}>{item.name}:</b>
        {item.value}
      </button>
    </li>
  );
};

const AutocompleteBiomodelItem = ({
  item,
  selected,
  isEmphasizeId,
  onClick,
}: {
  item: Extract<AutocompleteItem, { type: "biomodel" }>;
  selected: boolean;
  isEmphasizeId: boolean;
  onClick: (item: AutocompleteItem) => void;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useFocusOnSelected(buttonRef, selected);

  const name = isEmphasizeId ? (
    <span className={styles.biomodelNameMajor}>
      {item.info.id}
      <span className={styles.biomodelNameMinor}> ({item.info.name})</span>
    </span>
  ) : (
    <span className={styles.biomodelNameMajor}>
      {item.info.name}
      <span className={styles.biomodelNameMinor}> ({item.info.id})</span>
    </span>
  );

  return (
    <li>
      <div
        className={clsx(
          styles.autocompleteItem,
          styles.autocompleteBiomodelItem,
          buttonStyles.ghost,
        )}
        data-active={selected}
      >
        <button
          ref={buttonRef}
          className={styles.autocompleteBiomodelButton}
          onClick={() => onClick(item)}
        >
          {name}
          <span className={styles.biomodelCitation}>
            <span>{item.info.authors.join(", ")}</span>
            <span> - {item.info.journal}</span>
            <span>, {biomodelsDateToEnglish(item.info.date)}</span>
          </span>
          <span className={styles.biomodelSynopsis}>
            {getFirstSentence(item.info.synopsis)}
          </span>
        </button>
        <span className={styles.biomodelExtra}>
          <a href={getBiomodelLink(item.info)} target="_blank">
            {getBiomodelLink(item.info)}
          </a>
        </span>
      </div>
    </li>
  );
};

const AutocompleteLoadingItem = () => {
  return (
    <div className={styles.autocompleteLoadingItem}>
      <PulseLoader size="6px" />
    </div>
  );
};

export default SearchBar;
