import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  getFinancialYearLabel,
  getFinancialYearOptions,
  getFinancialYearRange,
} from "@/lib/challan-number";

type DateFilterValue = {
  financialYear: string;
  fromDate: string;
  toDate: string;
  options: string[];
  setFinancialYear: (value: string) => void;
  setDateRange: (range: { fromDate: string; toDate: string }) => void;
};

const DateFilterContext = createContext<DateFilterValue | undefined>(undefined);

const padDate = (value: number) => value.toString().padStart(2, "0");

const toISO = (date: Date) =>
  `${date.getFullYear()}-${padDate(date.getMonth() + 1)}-${padDate(date.getDate())}`;

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const initialFinancialYear = getFinancialYearLabel();
  const initialRange = getFinancialYearRange(initialFinancialYear);

  const [financialYear, setFinancialYearState] = useState(initialFinancialYear);
  const [fromDate, setFromDate] = useState(toISO(initialRange.from));
  const [toDate, setToDate] = useState(toISO(initialRange.to));

  const options = useMemo(() => getFinancialYearOptions(5), []);

  const setFinancialYear = (value: string) => {
    const range = getFinancialYearRange(value);
    setFinancialYearState(value);
    setFromDate(toISO(range.from));
    setToDate(toISO(range.to));
  };

  const setDateRange = (range: { fromDate: string; toDate: string }) => {
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setFinancialYearState(getFinancialYearLabel(new Date(range.fromDate)));
  };

  return (
    <DateFilterContext.Provider
      value={{
        financialYear,
        fromDate,
        toDate,
        options,
        setFinancialYear,
        setDateRange,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error("useDateFilter must be used within DateFilterProvider");
  }
  return context;
}
