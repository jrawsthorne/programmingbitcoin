import { Point } from "../Point";

test("equals", () => {
  const a = new Point({ x: 3, y: -7, a: 5, b: 7 });
  const b = new Point({ x: 18, y: 77, a: 5, b: 7 });
  expect(a.equals(b)).toBeFalsy();
});

test("on curve", () => {
  expect(() => new Point({ x: -2, y: 4, a: 5, b: 7 })).toThrowError(
    "(-2, 4) is not on the curve"
  );
  new Point({ x: 3, y: -7, a: 5, b: 7 });
  new Point({ x: 18, y: 77, a: 5, b: 7 });
});

test("add", () => {
  let a = new Point({ a: 5, b: 7 });
  let b = new Point({ x: 2, y: 5, a: 5, b: 7 });
  const c = new Point({ x: 2, y: -5, a: 5, b: 7 });
  expect(a.add(b).equals(b)).toBeTruthy();
  expect(b.add(a).equals(b)).toBeTruthy();
  expect(b.add(c).equals(a)).toBeTruthy();

  a = new Point({ x: 3, y: 7, a: 5, b: 7 });
  b = new Point({ x: -1, y: -1, a: 5, b: 7 });
  expect(a.add(b).equals(new Point({ x: 2, y: -5, a: 5, b: 7 }))).toBeTruthy();

  a = new Point({ x: -1, y: -1, a: 5, b: 7 });
  expect(a.add(a).equals(new Point({ x: 18, y: 77, a: 5, b: 7 }))).toBeTruthy();
});
