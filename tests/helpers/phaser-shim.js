export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  lengthSq() { return this.x * this.x + this.y * this.y; }
  normalize() { const length = Math.hypot(this.x, this.y) || 1; this.x /= length; this.y /= length; return this; }
  clone() { return new Vector2(this.x, this.y); }
}

export default {
  Scene: class {},
  Math: {
    Vector2,
    Angle: { Between: (x, y, tx, ty) => Math.atan2(ty - y, tx - x), Wrap: (angle) => Math.atan2(Math.sin(angle), Math.cos(angle)) },
    Distance: { Between: (x, y, tx, ty) => Math.hypot(tx - x, ty - y) },
    Between: (min, max) => Math.floor((min + max) / 2),
  },
  Utils: { Array: { GetRandom: (items) => items[0] } },
};
