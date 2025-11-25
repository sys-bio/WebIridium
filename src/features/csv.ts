import type { DataTableProps } from "@/components/DataTable";

const escape = (value: string): string =>
  '"' + value.replaceAll('"', '""') + '"';

export const escapeCsvCell = (value: string): string => {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return escape(value);
  } else {
    return value;
  }
};

export const convertColumnsToCsv = (
  columns: DataTableProps["columns"],
): string => {
  const lines = [];
  const firstColumn = columns[0];
  if (!firstColumn) return "";

  const line = [];
  for (const { title } of columns) {
    line.push(escapeCsvCell(title));
  }
  lines.push(line.join(","));

  for (let i = 0; i < firstColumn.values.length; i++) {
    const line = [];
    for (const { values } of columns) {
      line.push(escapeCsvCell(values[i].toString()));
    }
    lines.push(line.join(","));
  }

  return lines.join("\n");
};
