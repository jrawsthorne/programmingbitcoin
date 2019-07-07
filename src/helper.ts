import { sha256 } from "hash.js";

// Double sha256 hash
export const hash256 = (s: Buffer): Buffer => {
  return Buffer.from(
    sha256()
      .update(
        sha256()
          .update(s)
          .digest()
      )
      .digest()
  );
};
