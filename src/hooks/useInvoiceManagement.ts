import { useState, useMemo } from "react";
import { InvoiceRun, Driver } from "../types";

export function useInvoiceManagement(
  initialInvoices: InvoiceRun[],
  role: string | null,
  user: any | null
) {
  const [invoices, setInvoices] = useState<InvoiceRun[]>(initialInvoices);

  const isDriverMatched = (invoiceDriver: string | null | undefined, userDriver: string | null | undefined): boolean => {
    if (!invoiceDriver || !userDriver) return false;
    const norm = (s: string) => s
      .trim()
      .replace(/[\u064A\u06CC]/g, 'ی')
      .replace(/[\u0643\u06A9]/g, 'ک')
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
      .replace(/[0-9]/g, (d) => d)
      .replace(/\s+/g, '');
    const nInvoice = norm(invoiceDriver);
    
    const userDrivers = userDriver.split(/[,،]/);
    return userDrivers.some((uDrv) => {
      const trimmed = uDrv.trim();
      if (!trimmed) return false;
      const nUser = norm(trimmed);
      return nInvoice.includes(nUser) || nUser.includes(nInvoice);
    });
  };

  const visibleInvoices = useMemo(() => {
    if (role === 'driver') {
      const uDriver = user?.driverName;
      if (!uDriver) return [];
      return invoices.filter((inv) => isDriverMatched(inv.driverName, uDriver));
    }
    return invoices;
  }, [invoices, role, user?.driverName]);

  return {
    invoices, setInvoices,
    visibleInvoices
  };
}
