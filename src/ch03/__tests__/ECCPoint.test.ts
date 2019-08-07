import { FieldElement } from "../../ch01/Field";
import { ECCPoint } from "../ECCPoint";

test("on curve", () => {
  const prime = 223n;
  const a = new FieldElement(0n, prime);
  const b = new FieldElement(7n, prime);
  const validPoints = [[192n, 105n], [17n, 56n], [1n, 193n]];
  const invalidPoints = [[200n, 119n], [42n, 99n]];

  for (const [xRaw, yRaw] of validPoints) {
    const x = new FieldElement(xRaw, prime);
    const y = new FieldElement(yRaw, prime);
    new ECCPoint(x, y, a, b);
  }
  for (const [xRaw, yRaw] of invalidPoints) {
    const x = new FieldElement(xRaw, prime);
    const y = new FieldElement(yRaw, prime);
    expect(() => new ECCPoint(x, y, a, b)).toThrowError(
      `(FieldElement { num: ${x.num}, prime: ${prime} }, FieldElement { num: ${
        y.num
      }, prime: ${prime} }) is not on the curve`
    );
  }
});

test("add", () => {
  const prime = 223n;
  const a = new FieldElement(0n, prime);
  const b = new FieldElement(7n, prime);

  const additions = [
    // (x1, y1, x2, y2, x3, y3)
    [192n, 105n, 17n, 56n, 170n, 142n],
    [47n, 71n, 117n, 141n, 60n, 139n],
    [143n, 98n, 76n, 66n, 47n, 71n]
  ];

  for (const [x1_raw, y1_raw, x2_raw, y2_raw, x3_raw, y3_raw] of additions) {
    const x1 = new FieldElement(x1_raw, prime);
    const y1 = new FieldElement(y1_raw, prime);
    const p1 = new ECCPoint(x1, y1, a, b);
    const x2 = new FieldElement(x2_raw, prime);
    const y2 = new FieldElement(y2_raw, prime);
    const p2 = new ECCPoint(x2, y2, a, b);
    const x3 = new FieldElement(x3_raw, prime);
    const y3 = new FieldElement(y3_raw, prime);
    const p3 = new ECCPoint(x3, y3, a, b);
    expect(p1.add(p2).equals(p3)).toBe(true);
  }

  // other + 0 = other
  let p1 = new ECCPoint(undefined, undefined, a, b);
  let p2 = p1;
  expect(p1.add(p2).isInfinity()).toBe(true);

  // 0 + this = this
  let x = new FieldElement(192n, prime);
  let y = new FieldElement(105n, prime);
  p2 = new ECCPoint(x, y, a, b);
  expect(p2.add(p1).equals(p2)).toBe(true);

  // the points are vertically opposite
  y = new FieldElement(118n, prime);
  p1 = new ECCPoint(x, y, a, b);
  expect(p2.add(p1).isInfinity()).toBe(true);

  // tangent to the vertical line
  x = new FieldElement(6n, prime);
  y = new FieldElement(0n, prime);
  p1 = new ECCPoint(x, y, a, b);
  expect(p1.add(p1).isInfinity()).toBe(true);

  // p1 = p2
  x = new FieldElement(68n, prime);
  y = new FieldElement(3n, prime);
  p1 = new ECCPoint(x, y, a, b);
  expect(
    p1
      .add(p1)
      .equals(
        new ECCPoint(
          new FieldElement(121n, prime),
          new FieldElement(111n, prime),
          a,
          b
        )
      )
  ).toBe(true);
});

test("rmul", () => {
  //  tests the following scalar multiplications
  //  2*(192,105)
  //  2*(143,98)
  //  2*(47,71)
  //  4*(47,71)
  //  8*(47,71)
  //  21*(47,71)
  const prime = 223n;
  const a = new FieldElement(0n, prime);
  const b = new FieldElement(7n, prime);
  const multiplications: Array<
    [bigint, bigint, bigint, bigint | null, bigint | null]
  > = [
    // (coefficient, x1, y1, x2, y2)
    [2n, 192n, 105n, 49n, 71n],
    [2n, 143n, 98n, 64n, 168n],
    [2n, 47n, 71n, 36n, 111n],
    [4n, 47n, 71n, 194n, 51n],
    [8n, 47n, 71n, 116n, 55n],
    [21n, 47n, 71n, null, null]
  ];
  for (const [s, x1_raw, y1_raw, x2_raw, y2_raw] of multiplications) {
    const x1 = new FieldElement(x1_raw, prime);
    const y1 = new FieldElement(y1_raw, prime);
    const p1 = new ECCPoint(x1, y1, a, b);
    let p2: ECCPoint;
    // initialize the second point based on whether it's the point at infinity
    if (x2_raw === null) {
      p2 = new ECCPoint(undefined, undefined, a, b);
    } else {
      const x2 = new FieldElement(x2_raw, prime);
      const y2 = new FieldElement(y2_raw!, prime);
      p2 = new ECCPoint(x2, y2, a, b);
    }
    expect(p1.rmul(s!).equals(p2)).toBe(true);
  }
});
