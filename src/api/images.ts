import { validateImageFile } from "./safety.ts";

/** Check a raster's content as well as the browser-supplied MIME label. */
export async function validateRasterFile(file: File) {
  validateImageFile(file);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid =
    file.type === "image/jpeg"
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.type === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every(
            (value, index) => bytes[index] === value,
          )
        : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
          String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!valid)
    throw new Error("This file is not a valid JPEG, PNG or WebP image.");
}

/** Both dimensions must have enough pixels for the selected print. */
export function effectivePrintDpi(
  width: number,
  height: number,
  printWidth: number,
  printHeight: number,
) {
  if (
    ![width, height, printWidth, printHeight].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    return 0;
  return 300 * Math.min(width / printWidth, height / printHeight);
}
