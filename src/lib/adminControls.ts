import type { Poster } from "../data/shop";
export function tagNames(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}
export function editTag(posters: Poster[], tag: string, next?: string) {
  const before = tag.trim().toLowerCase(),
    after = next?.trim().toLowerCase();
  if (
    !before ||
    before.length > 40 ||
    (after !== undefined && (!after || after.length > 40))
  )
    throw new Error("Tags must contain 1–40 characters.");
  return posters.map((p) => ({
    ...p,
    tags: [
      ...new Set(
        (p.tags || [])
          .map((t) => (t.toLowerCase() === before ? after : t))
          .filter((t): t is string => !!t),
      ),
    ],
  }));
}
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return (
    '"' +
    (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""') +
    '"'
  );
}
