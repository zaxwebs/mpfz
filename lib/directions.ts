export function getDirectionLabel(direction: string) {
  const labels: Record<string, string> = {
    N: "North",
    NE: "North east",
    E: "East",
    SE: "South east",
    S: "South",
    SW: "South west",
    W: "West",
    NW: "North west"
  };

  return labels[direction.toUpperCase()] ?? (direction || "Not listed");
}

export function getDirectionTag(direction: string) {
  const normalizedDirection = direction.trim().toUpperCase();
  return normalizedDirection || "NA";
}
