/**
 * Utility to generate concise faculty initials from full names and titles.
 * e.g., "Prof. Amruth V" -> "AV", "Dr. Ravi P" -> "RP", "Prof. Ganavi N P" -> "GNP"
 */
export function generateFacultyInitials(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') return '';

  // Clean and remove common academic titles/prefixes
  const cleaned = fullName
    .replace(/\b(Prof\.|Prof|Dr\.|Dr|Mr\.|Mr|Mrs\.|Mrs|Ms\.|Ms|Assistant Professor|Associate Professor|Professor|HOD)\b/gi, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim();

  const parts = cleaned.split(/\s+/).filter((p) => p.length > 0);
  if (parts.length === 0) {
    // Fallback on raw string
    return fullName.slice(0, 2).toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  // If name has 2 or more parts:
  // e.g. "Ganavi N P" -> G, N, P -> "GNP"
  // e.g. "Amruth V" -> A, V -> "AV"
  // e.g. "Rohith Gowda K S" -> R, K, S -> "RKS" (or first letter of parts)
  if (parts.length === 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // 3 or more parts: take first letter of each significant part up to 3-4 chars
  return parts.map((p) => p[0].toUpperCase()).slice(0, 4).join('');
}
