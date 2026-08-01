import { useState, useMemo } from "react";
import { getTodayShamsi, getTomorrowShamsi } from "../utils/shamsi";

export function useDateManagement() {
  const todayShamsi = getTodayShamsi();
  const tomorrowShamsi = getTomorrowShamsi();
  
  const [shamsiYear, setShamsiYear] = useState<number>(tomorrowShamsi.year);
  const [shamsiMonth, setShamsiMonth] = useState<number>(tomorrowShamsi.month);
  const [shamsiDay, setShamsiDay] = useState<number>(tomorrowShamsi.day);

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [tempYear, setTempYear] = useState<number>(tomorrowShamsi.year);
  const [tempMonth, setTempMonth] = useState<number>(tomorrowShamsi.month);
  const [tempDay, setTempDay] = useState<number>(tomorrowShamsi.day);
  const [manualDateInput, setManualDateInput] = useState<string>("");

  const formattedDate = useMemo(
    () => `${shamsiYear}/${shamsiMonth.toString().padStart(2, "0")}/${shamsiDay.toString().padStart(2, "0")}`,
    [shamsiYear, shamsiMonth, shamsiDay]
  );

  return {
    todayShamsi,
    tomorrowShamsi,
    shamsiYear, setShamsiYear,
    shamsiMonth, setShamsiMonth,
    shamsiDay, setShamsiDay,
    showDatePicker, setShowDatePicker,
    tempYear, setTempYear,
    tempMonth, setTempMonth,
    tempDay, setTempDay,
    manualDateInput, setManualDateInput,
    formattedDate
  };
}
