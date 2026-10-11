import { csvCell } from "../lib/adminControls";
export function downloadAdminCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob(
    ["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import type { AdminOrder } from "../data/adminOrders";
import { getContactSettings } from "./settings";
export function adminReplyLink(order: AdminOrder) {
  const digits = order.phone.replace(/\D/g, "");
  const number = digits.length === 10 ? "91" + digits : digits;
  if (!/^91[6-9]\d{9}$/.test(number)) return null;
  const values = {
    name: order.name,
    prints: order.items.map((i) => i.posterTitle + " × " + i.qty).join(", "),
    size: order.items.map((i) => i.size).join(", "),
    total: String(order.total),
  };
  const message = getContactSettings().whatsappTemplate.replace(
    /\{(name|prints|size|total)\}/g,
    (_, key: keyof typeof values) => values[key],
  );
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
}
