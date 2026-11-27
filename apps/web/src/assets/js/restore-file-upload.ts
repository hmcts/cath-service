export async function initRestoreFileUpload(): Promise<void> {
  const inputs = document.querySelectorAll<HTMLInputElement>("input[type='file'][data-pending-file-url]");
  await Promise.all(Array.from(inputs).map(restoreFile));
}

async function restoreFile(input: HTMLInputElement): Promise<void> {
  const url = input.dataset.pendingFileUrl;
  const fileName = input.dataset.pendingFileName;
  if (!url || !fileName || input.files?.length) return;

  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return;

    const blob = await response.blob();
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], fileName, { type: blob.type }));
    input.files = transfer.files;
  } catch (error) {
    console.error("Error restoring uploaded file:", error);
  }
}
