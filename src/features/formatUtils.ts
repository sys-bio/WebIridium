const SECONDS_MS = 1_000;
const MINUTES_MS = 60 * SECONDS_MS;
const HOURS_MS = 60 * MINUTES_MS;
const DAYS_MS = 24 * HOURS_MS;

/**
 * Given a time span in milliseconds, returns a string
 * saying "[that amount of time] ago"
 *
 * @param ms - how many milliseconds (should be greater than 0)
 * @returns string in the format "[TIME] ago" or "Just now"
 */
export const timeToAgoText = (ms: number) => {
  const days = Math.floor(ms / DAYS_MS);
  const hours = Math.floor((ms % DAYS_MS) / HOURS_MS);
  const minutes = Math.floor((ms % HOURS_MS) / MINUTES_MS);

  const chunks = [];

  if (days === 1) {
    chunks.push("1 day");
  } else if (days > 0) {
    chunks.push(`${days} days`);
  }

  if (hours === 1) {
    chunks.push("1 hour");
  } else if (hours > 0) {
    chunks.push(`${hours} hours`);
  }

  if (minutes === 1) {
    chunks.push("1 minute");
  } else if (minutes > 0) {
    chunks.push(`${minutes} minutes`);
  }

  if (chunks.length === 0) {
    return "Just now";
  } else {
    chunks.push("ago");
    return chunks.join(" ");
  }
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Prettifies a date in the format of "2020-1" into "Jan 2020"
 */
export const biomodelsDateToEnglish = (date: string): string => {
  const match = /(\d+)-(\d+)?/.exec(date);
  if (match) {
    if (match[2] === undefined) {
      return match[1];
    } else {
      return `${MONTHS[+match[2] - 1]} ${match[1]}`;
    }
  } else {
    return date;
  }
};
