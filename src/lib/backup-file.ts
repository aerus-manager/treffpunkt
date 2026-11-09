import { exportBackup } from "@/lib/store";

function backupFile(): File {
  const name = `treffpunkt-${new Date().toISOString().slice(0, 10)}.json`;
  return new File([exportBackup()], name, { type: "application/json" });
}

export function downloadBackup() {
  const file = backupFile();
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canShareBackup(): boolean {
  try {
    return (
      typeof navigator.canShare === "function" && navigator.canShare({ files: [backupFile()] })
    );
  } catch {
    return false;
  }
}

/** Send the backup to mail, cloud drive or another phone through the system share sheet. */
export async function shareBackup(): Promise<"shared" | "cancelled"> {
  try {
    await navigator.share({ files: [backupFile()], title: "Treffpunkt sikkerhetskopi" });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    throw error;
  }
}
