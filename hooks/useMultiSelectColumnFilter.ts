import { useEffect, useState } from "react";
import { Table } from "@tanstack/react-table";

export function useMultiSelectColumnFilter<T extends string>({
    table,
    columnId,
    allValues,
}: {
    table: Table<unknown>;
    columnId: string;
    allValues: T[];
}) {
    const [selectedValues, setSelectedValues] = useState<T[]>(allValues);

    useEffect(() => {
        const column = table.getColumn(columnId);
        if (!column) return;

        if (selectedValues.length === allValues.length) {
            column.setFilterValue(undefined);
            return;
        }

        column.setFilterValue(selectedValues);
    }, [selectedValues, allValues, columnId, table]);

    return {
        selectedValues,
        setSelectedValues,
    };
}
