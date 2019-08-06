export class Script {
  constructor() {}

  static parse = (): Script => {
    return new Script();
  };

  serialize = (): Buffer => {
    return Buffer.alloc(0);
  };

  toString = (): string => ``;
}
