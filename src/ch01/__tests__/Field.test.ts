import { FieldElement, MismatchedFields } from "../Field";

test("equal", () => {
  const a = new FieldElement(2, 31);
  const b = new FieldElement(2, 31);
  const c = new FieldElement(15, 31);
  expect(a.equals(b)).toBeTruthy();
  expect(!a.equals(c)).toBeTruthy();
  expect(!a.equals(b)).toBeFalsy();
});

test("add", () => {
  let a = new FieldElement(2, 31);
  let b = new FieldElement(15, 31);
  expect(a.add(b).equals(new FieldElement(17, 31))).toBeTruthy();
  a = new FieldElement(17, 31);
  b = new FieldElement(21, 31);
  expect(a.add(b).equals(new FieldElement(7, 31))).toBeTruthy();
});

test("sub", () => {
  let a = new FieldElement(29, 31);
  let b = new FieldElement(4, 31);
  expect(a.sub(b).equals(new FieldElement(25, 31))).toBeTruthy();
  a = new FieldElement(15, 31);
  b = new FieldElement(30, 31);
  expect(a.sub(b).equals(new FieldElement(16, 31))).toBeTruthy();
});

test("mul", () => {
  const a = new FieldElement(24, 31);
  const b = new FieldElement(19, 31);
  expect(a.mul(b).equals(new FieldElement(22, 31))).toBeTruthy();
});

test("pow", () => {
  let a = new FieldElement(17, 31);
  expect(a.pow(3).equals(new FieldElement(15, 31))).toBeTruthy();
  a = new FieldElement(5, 31);
  const b = new FieldElement(18, 31);
  expect(
    a
      .pow(5)
      .mul(b)
      .equals(new FieldElement(16, 31))
  ).toBeTruthy();
});

test("div", () => {
  let a = new FieldElement(3, 31);
  let b = new FieldElement(24, 31);
  expect(a.div(b).equals(new FieldElement(4, 31))).toBeTruthy();
  a = new FieldElement(17, 31);
  expect(a.pow(-3).equals(new FieldElement(29, 31))).toBeTruthy();
  a = new FieldElement(4, 31);
  b = new FieldElement(11, 31);
  expect(
    a
      .pow(-4)
      .mul(b)
      .equals(new FieldElement(13, 31))
  ).toBeTruthy();
});

test("errors", () => {
  const a = new FieldElement(3, 31);
  const b = new FieldElement(3, 32);
  expect(() => a.add(b)).toThrowError(MismatchedFields);
  expect(() => a.sub(b)).toThrowError(MismatchedFields);
  expect(() => a.mul(b)).toThrowError(MismatchedFields);
  expect(() => a.div(b)).toThrowError(MismatchedFields);
  expect(() => new FieldElement(10, 5)).toThrowError(
    "Num 10 not in field range 0 to 4"
  );
});
