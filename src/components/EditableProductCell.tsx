import React, { useState, useEffect } from "react";

interface EditableProductCellProps {
  value: string;
  onSave: (newValue: string) => void;
}

export function EditableProductCell({ value, onSave }: EditableProductCellProps) {
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSave(tempValue);
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setTempValue(value);
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    if (tempValue !== value) {
      onSave(tempValue);
    }
  };

  return (
    <input
      type="text"
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="w-full text-center bg-white border border-slate-300 rounded-lg p-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-sm"
    />
  );
}
