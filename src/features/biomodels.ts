import { useRef, useState } from "react";

export interface BiomodelInfo {
  name: string;
  authors: string[];
  url: string;
  id: string;
  title: string;
  synopsis: string;
  citation: string | null;
  date: string;
  journal: string;
}

type SearchType =
  /** search using author, title, synopsis, date, or journal */
  | "standard"
  /** search using biomodel number/id */
  | "id";

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

let cacheData: BiomodelInfo[] | null = null;

/**
 * @returns the biomodel cache
 */
const loadCache = async (): Promise<BiomodelInfo[]> => {
  if (!cacheData) {
    const cacheRaw = (await import("@/assets/biomodelsCache.json")).default;
    cacheData = Object.values(cacheRaw).map((info) => ({
      name: info.name,
      authors: info.authors,
      url: info.url,
      id: info.model_id,
      title: info.title,
      synopsis: info.synopsis,
      citation: info.citation,
      date: info.date,
      journal: info.journal,
    }));
    return cacheData;
  } else {
    return cacheData;
  }
};

export const getSearchTypeFromSearchTerm = (term: string): SearchType => {
  if (!isNaN(+term)) {
    return "id";
  } else {
    return "standard";
  }
};

/** make sure to normalize search term before use for best results */
const doesModelMatchTerm = (
  searchTerm: string,
  modelInfo: BiomodelInfo,
): boolean => {
  // cbeck authors
  if (
    modelInfo.authors.some((name) => name.toLowerCase().includes(searchTerm))
  ) {
    return true;
  }

  // check any of the other stuff
  if (
    Object.values(modelInfo).some(
      (value) =>
        typeof value === "string" && value.toLowerCase().includes(searchTerm),
    )
  ) {
    return true;
  }

  return false;
};

/**
 * @param term - the search term
 * @param limit - max number of results to return
 * @param signal - use this to abort the search
 *
 * @returns biomodels matching the search term
 * @throws AbortError if aborted
 */
export const searchBiomodels = async (
  term: string,
  limit: number,
  signal?: AbortSignal,
): Promise<BiomodelInfo[]> => {
  const results: BiomodelInfo[] = [];
  const cache = await loadCache();
  const searchType = getSearchTypeFromSearchTerm(term);
  const normalizedTerm = term.toLowerCase().trim();

  // might've been aborted while loading the cache
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // pretty much the same code except for the if statement to check if the term matches
  // but I split it up into two paths as a micro-optimization to avoid an if check for the
  // searchType
  if (searchType === "id") {
    for (const modelInfo of cache) {
      if (results.length >= limit) {
        break;
      }

      if (modelInfo.id.includes(term)) {
        results.push(modelInfo);
      }
    }
  } else {
    for (const modelInfo of cache) {
      if (results.length >= limit) {
        break;
      }

      if (doesModelMatchTerm(normalizedTerm, modelInfo)) {
        results.push(modelInfo);
      }
    }
  }

  return results;
};

const getBiomodelContentUrl = (modelInfo: BiomodelInfo): string =>
  `https://api.github.com/repos/sys-bio/BiomodelsStore/contents/biomodels/${modelInfo.id}`;

// TODO: unit test this
/**
 * @returns SBML for the given model.
 * @throws Error - whenever the biomodel fails to load for whatever reason
 */
export const loadBiomodelSbml = async (
  modelInfo: BiomodelInfo,
  signal?: AbortSignal,
): Promise<string> => {
  const infoResult = await fetch(getBiomodelContentUrl(modelInfo), {
    signal,
    headers: GITHUB_HEADERS,
  });
  if (!infoResult.ok) {
    throw new Error(
      `Failed to fetch model resource info ${infoResult.status} ${infoResult.statusText}`,
    );
  }

  const infoJson: unknown = await infoResult.json();
  if (!Array.isArray(infoJson)) {
    throw new Error("Unexpected JSON");
  }

  // An array is returned with data for each element in the folder.
  // The first item is the xml file with the SBML.
  const sbmlFileInfo: unknown = infoJson[0];
  if (typeof sbmlFileInfo !== "object" || sbmlFileInfo === null) {
    throw new Error("Missing sbml file?");
  }

  if (
    !("git_url" in sbmlFileInfo) ||
    typeof sbmlFileInfo.git_url !== "string"
  ) {
    throw new Error("Missing download url");
  }

  const sbmlResult = await fetch(sbmlFileInfo.git_url, {
    signal,
    headers: GITHUB_HEADERS,
  });
  if (!sbmlResult.ok) {
    throw new Error(
      `Failed to fetch model contents ${sbmlResult.status} ${sbmlResult.statusText}`,
    );
  }

  const sbmlJson: unknown = await sbmlResult.json();
  if (typeof sbmlJson !== "object" || sbmlJson === null) {
    throw new Error("Unexpected response from GitHub for git_url.");
  }

  if (!("encoding" in sbmlJson && typeof sbmlJson.encoding === "string")) {
    throw new Error("Missing encoding in response.");
  }

  if (sbmlJson.encoding !== "base64") {
    throw new Error("Encoding was not base64");
  }

  if (!("content" in sbmlJson && typeof sbmlJson.content === "string")) {
    throw new Error("Missing content.");
  }

  return atob(sbmlJson.content);
};

/**
 * Hook for easily searching biomodels.
 */
export const useSearchBiomodels = () => {
  const [biomodels, setBiomodels] = useState<BiomodelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchBiomodelsInternal = async (term: string, limit: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await searchBiomodels(term, limit, abortController.signal);
      setBiomodels(result);
      setError(null);
      setIsLoading(false);
      abortControllerRef.current = null;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }

      setError(String(e));
      setIsLoading(false);
      throw e;
    }
  };

  const cancelSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setBiomodels([]);
    setIsLoading(false);
    setError(null);
  };

  return {
    biomodels,
    isLoading,
    error,
    searchBiomodels: searchBiomodelsInternal,
    cancelSearch,
  };
};
