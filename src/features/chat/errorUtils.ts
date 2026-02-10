export const getVerboseError = (error: any): string => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("401")) {
    return "Invalid API Key provided. (401)";
  }

  if (message.includes("429")) {
    return "Rate limit exceeded. Please wait a moment and try again. (429)";
  }

  if (message.includes("503")) {
    return "OpenAI server error. Please try again later. (503)";
  }

  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "Network connection error. Please check your internet connection.";
  }

  return `Error: ${message}`;
};
