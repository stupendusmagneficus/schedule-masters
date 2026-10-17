export function moveManualBookingService(
  serviceIds: readonly string[],
  serviceId: string,
  offset: -1 | 1,
): string[] {
  const sourceIndex = serviceIds.indexOf(serviceId);
  const targetIndex = sourceIndex + offset;
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= serviceIds.length) {
    return [...serviceIds];
  }

  const next = [...serviceIds];
  [next[sourceIndex], next[targetIndex]] = [
    next[targetIndex],
    next[sourceIndex],
  ];
  return next;
}
