class Vec2 {
  constructor(x, y) { this.x = x; this.y = y; }
  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s) { return new Vec2(this.x * s, this.y * s); }
  len() { return Math.hypot(this.x, this.y); }
  normalize() {
    const l = this.len();
    return l > 0 ? new Vec2(this.x / l, this.y / l) : new Vec2(0, 0);
  }
  dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
  angleTo(v) { return Math.atan2(v.y - this.y, v.x - this.x); }
}

class PriorityQueue {
  constructor(comparator) {
    this.heap = [];
    this.comparator = comparator || ((a, b) => a.priority - b.priority);
  }

  push(item, priority) {
    const node = { item, priority };
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return top.item;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0].item : undefined;
  }

  size() {
    return this.heap.length;
  }

  _bubbleUp(idx) {
    const node = this.heap[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.heap[parentIdx];
      if (this.comparator(node, parent) >= 0) break;
      this.heap[parentIdx] = node;
      this.heap[idx] = parent;
      idx = parentIdx;
    }
  }

  _sinkDown(idx) {
    const len = this.heap.length;
    const node = this.heap[idx];
    while (true) {
      let swap = null;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < len && this.comparator(this.heap[left], node) < 0) swap = left;
      if (right < len && this.comparator(this.heap[right], swap !== null ? this.heap[left] : node) < 0) swap = right;
      if (swap === null) break;
      this.heap[idx] = this.heap[swap];
      this.heap[swap] = node;
      idx = swap;
    }
  }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function key(x, y) { return `${x},${y}`; }
function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function formatShiftDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function randRange(a, b) { return a + Math.random() * (b - a); }
function hashNoise(x, y, seed) {
  const n = Math.sin((x * 127.1 + y * 311.7 + seed * 17.7) * 0.09) * 43758.5453;
  return n - Math.floor(n);
}
