export class SpatialHash {
  constructor(cellSize = 256) {
    if (!(cellSize > 0)) throw new Error('SpatialHash cellSize must be positive');
    this.cellSize = cellSize;
    this.cells = new Map();
    this.entries = new Map();
  }
  keysFor(bounds) {
    const keys = [];
    const left = Math.floor(bounds.x / this.cellSize), right = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const top = Math.floor(bounds.y / this.cellSize), bottom = Math.floor((bounds.y + bounds.height) / this.cellSize);
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) keys.push(`${x},${y}`);
    return keys;
  }
  insert(id, value, bounds) {
    this.remove(id);
    const keys = this.keysFor(bounds);
    this.entries.set(id, { value, bounds, keys });
    for (const key of keys) {
      if (!this.cells.has(key)) this.cells.set(key, new Set());
      this.cells.get(key).add(id);
    }
    return value;
  }
  remove(id) {
    const entry = this.entries.get(id);
    if (!entry) return false;
    for (const key of entry.keys) {
      const cell = this.cells.get(key);
      cell?.delete(id);
      if (cell?.size === 0) this.cells.delete(key);
    }
    this.entries.delete(id);
    return true;
  }
  query(bounds) {
    const ids = new Set();
    for (const key of this.keysFor(bounds)) for (const id of this.cells.get(key) || []) ids.add(id);
    return [...ids].map(id => this.entries.get(id)?.value).filter(value => value !== undefined);
  }
  clear() { this.cells.clear(); this.entries.clear(); }
}
