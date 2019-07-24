import { FieldElement } from "../../ch01/Field";
import { ECCPoint } from "../ECCPoint";

test("on curve", () => {
  const prime = 223;
  const a = new FieldElement(0, prime);
  const b = new FieldElement(7, prime);
  const validPoints = [[192, 105], [17, 56], [1, 193]];
  const invalidPoints = [[200, 119], [42, 99]];

  for (const [xRaw, yRaw] of validPoints) {
    const x = new FieldElement(xRaw, prime);
    const y = new FieldElement(yRaw, prime);
    new ECCPoint({ x, y, a, b });
  }
  for (const [xRaw, yRaw] of invalidPoints) {
    const x = new FieldElement(xRaw, prime);
    const y = new FieldElement(yRaw, prime);
    expect(() => new ECCPoint({ x, y, a, b })).toThrowError(
      `(FieldElement { num: ${x.num}, prime: ${prime} }, FieldElement { num: ${
        y.num
      }, prime: ${prime} }) is not on the curve`
    );
  }
});

test("add", () => {
  const prime = 223;
  const a = new FieldElement(0, prime);
  const b = new FieldElement(7, prime);

  const additions = [
    // (x1, y1, x2, y2, x3, y3)
    [192, 105, 17, 56, 170, 142],
    [47, 71, 117, 141, 60, 139],
    [143, 98, 76, 66, 47, 71]
  ];

  for (const [x1_raw, y1_raw, x2_raw, y2_raw, x3_raw, y3_raw] of additions) {
    const x1 = new FieldElement(x1_raw, prime);
    const y1 = new FieldElement(y1_raw, prime);
    const p1 = new ECCPoint({ x: x1, y: y1, a, b });
    const x2 = new FieldElement(x2_raw, prime);
    const y2 = new FieldElement(y2_raw, prime);
    const p2 = new ECCPoint({ x: x2, y: y2, a, b });
    const x3 = new FieldElement(x3_raw, prime);
    const y3 = new FieldElement(y3_raw, prime);
    const p3 = new ECCPoint({ x: x3, y: y3, a, b });
    expect(p1.add(p2).equals(p3)).toBeTruthy();
  }

  // other + 0 = other
  let p1 = new ECCPoint({ a, b });
  let p2 = new ECCPoint({ a, b });
  expect(p1.add(p2).isPointAtInfinity()).toBeTruthy();

  // 0 + this = this
  let x = new FieldElement(192, prime);
  let y = new FieldElement(105, prime);
  p2 = new ECCPoint({ x, y, a, b });
  expect(p2.add(p1).equals(p2)).toBeTruthy();

  // the points are vertically opposite
  y = new FieldElement(118, prime);
  p1 = new ECCPoint({ x, y, a, b });
  expect(p2.add(p1).isPointAtInfinity()).toBeTruthy();

  // tangent to the vertical line
  x = new FieldElement(6, prime);
  y = new FieldElement(0, prime);
  p1 = new ECCPoint({ x, y: new FieldElement(0, prime), a, b });
  expect(p1.add(p1).isPointAtInfinity()).toBeTruthy();

  // p1 = p2
  x = new FieldElement(68, prime);
  y = new FieldElement(3, prime);
  p1 = new ECCPoint({ x, y, a, b });
  expect(
    p1.add(p1).equals(
      new ECCPoint({
        x: new FieldElement(121, prime),
        y: new FieldElement(111, prime),
        a,
        b
      })
    )
  ).toBeTruthy();
});

test("rmul", () => {
  //  tests the following scalar multiplications
  //  2*(192,105)
  //  2*(143,98)
  //  2*(47,71)
  //  4*(47,71)
  //  8*(47,71)
  //  21*(47,71)
  const prime = 223;
  const a = new FieldElement(0, prime);
  const b = new FieldElement(7, prime);
  const multiplications = [
    // (coefficient, x1, y1, x2, y2)
    [2, 192, 105, 49, 71],
    [2, 143, 98, 64, 168],
    [2, 47, 71, 36, 111],
    [4, 47, 71, 194, 51],
    [8, 47, 71, 116, 55],
    [21, 47, 71, null, null]
  ];
  for (const [s, x1_raw, y1_raw, x2_raw, y2_raw] of multiplications) {
    const x1 = new FieldElement(x1_raw!, prime);
    const y1 = new FieldElement(y1_raw!, prime);
    const p1 = new ECCPoint({ x: x1, y: y1, a, b });
    let p2: ECCPoint;
    // initialize the second point based on whether it's the point at infinity
    if (x2_raw === null) {
      p2 = new ECCPoint({ a, b });
    } else {
      const x2 = new FieldElement(x2_raw, prime);
      const y2 = new FieldElement(y2_raw!, prime);
      p2 = new ECCPoint({ x: x2, y: y2, a, b });
    }
    expect(p1.rmul(s!).equals(p2)).toBe(true);
  }
});
