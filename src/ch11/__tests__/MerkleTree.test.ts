import { MerkleTree } from "../MerkleBlock";

test("init", () => {
  const tree = new MerkleTree(9);
  expect(tree.nodes[0].length).toBe(1);
  expect(tree.nodes[1].length).toBe(2);
  expect(tree.nodes[2].length).toBe(3);
  expect(tree.nodes[3].length).toBe(5);
  expect(tree.nodes[4].length).toBe(9);
});
