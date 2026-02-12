import { useEffect, useState } from "react";
import styles from "./SearchSection.module.css";
import SearchBox from "@/components/input/SearchBox";
import {
  getSearchTypeFromSearchTerm,
  useSearchBiomodels,
  type BiomodelInfo,
} from "@/features/biomodels";
import SearchItem from "./SearchItem";
import { useProjectActions } from "@/globals/project";

const LIMIT = 50;

const SearchSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const searchType = searchTerm && getSearchTypeFromSearchTerm(searchTerm);

  const [openingProject, setOpeningProject] = useState<string | null>(null);
  const { createNewProjectFromBiomodel } = useProjectActions();
  const { biomodels, isLoading, error, searchBiomodels } = useSearchBiomodels();

  const handleSelectFor = (info: BiomodelInfo) => async () => {
    if (openingProject) return;

    setOpeningProject(info.id);
    await createNewProjectFromBiomodel(info);
    setOpeningProject(null);
  };

  useEffect(() => {
    void searchBiomodels(searchTerm, LIMIT);
  }, [searchTerm, searchBiomodels]);

  return (
    <div className={styles.section}>
      <h3 className={styles.title}>BioModels</h3>
      <SearchBox
        name="biomodelsSearch"
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Model Name or Number"
      />
      {isLoading ? null : error ? (
        <p className={styles.noResults}>Error: {error}</p>
      ) : biomodels.length === 0 ? (
        <p className={styles.noResults}>No results</p>
      ) : (
        <div className={styles.list}>
          {biomodels.map((info) => (
            <SearchItem
              key={info.id}
              info={info}
              isEmphasizeId={searchType === "id"}
              isLoading={openingProject === info.id}
              onSelect={handleSelectFor(info)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchSection;
