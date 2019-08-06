import { FieldElement, MismatchedFields } from "../Field";

test("equal", () => {
  const a = new FieldElement(2n, 31n);
  const b = new FieldElement(2n, 31n);
  const c = new FieldElement(15n, 31n);
  expect(a.equals(b)).toBe(true);
  expect(a.equals(c)).toBe(false);
});

test("add", () => {
  let a = new FieldElement(2n, 31n);
  let b = new FieldElement(15n, 31n);
  expect(a.add(b).equals(new FieldElement(17n, 31n))).toBe(true);
  a = new FieldElement(17n, 31n);
  b = new FieldElement(21n, 31n);
  expect(a.add(b).equals(new FieldElement(7n, 31n))).toBe(true);
});

test("sub", () => {
  let a = new FieldElement(29n, 31n);
  let b = new FieldElement(4n, 31n);
  expect(a.sub(b).equals(new FieldElement(25n, 31n))).toBe(true);
  a = new FieldElement(15n, 31n);
  b = new FieldElement(30n, 31n);
  expect(a.sub(b).equals(new FieldElement(16n, 31n))).toBe(true);
});

test("mul", () => {
  const a = new FieldElement(24n, 31n);
  const b = new FieldElement(19n, 31n);
  expect(a.mul(b).equals(new FieldElement(22n, 31n))).toBe(true);
});

test("pow", () => {
  let a = new FieldElement(17n, 31n);
  expect(a.pow(3n).equals(new FieldElement(15n, 31n))).toBe(true);
  a = new FieldElement(5n, 31n);
  const b = new FieldElement(18n, 31n);
  expect(
    a
      .pow(5n)
      .mul(b)
      .equals(new FieldElement(16n, 31n))
  ).toBe(true);
});

test("div", () => {
  let a = new FieldElement(3n, 31n);
  let b = new FieldElement(24n, 31n);
  expect(a.div(b).equals(new FieldElement(4n, 31n))).toBe(true);
  a = new FieldElement(17n, 31n);
  expect(a.pow(-3n).equals(new FieldElement(29n, 31n))).toBe(true);
  a = new FieldElement(4n, 31n);
  b = new FieldElement(11n, 31n);
  expect(
    a
      .pow(-4n)
      .mul(b)
      .equals(new FieldElement(13n, 31n))
  ).toBe(true);
});

test("errors", () => {
  const a = new FieldElement(3n, 31n);
  const b = new FieldElement(3n, 32n);
  expect(() => a.add(b)).toThrowError(MismatchedFields);
  expect(() => a.sub(b)).toThrowError(MismatchedFields);
  expect(() => a.mul(b)).toThrowError(MismatchedFields);
  expect(() => a.div(b)).toThrowError(MismatchedFields);
  expect(() => new FieldElement(10n, 5n)).toThrowError(
    "Num 10 not in field range 0 to 4"
  );
});
