export function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((chunks, item, idx) => {
    if (idx % size === 0) {
      chunks.push([]);
    }
    chunks[chunks.length - 1].push(item);
    return chunks;
  }, [] as T[][]);
}
