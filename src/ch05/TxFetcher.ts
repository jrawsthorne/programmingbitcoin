import { Tx } from "./Tx";
import fetch from "node-fetch";

interface TxCahe {
  [key: string]: Tx;
}

export class TxFetcher {
  public static cache: TxCahe = {};

  static getUrl = (testnet: boolean = false): string => {
    return testnet
      ? "https://blockstream.info/testnet/api"
      : "https://blockstream.info/api";
  };

  static fetch = async (
    txId: string,
    testnet: boolean = false,
    fresh: boolean = false
  ): Promise<Tx> => {
    if (fresh || TxFetcher.cache[txId] === undefined) {
      const url = `${TxFetcher.getUrl(testnet)}/tx/${txId}/hex`;
      const response = await fetch(url);
      let raw = Buffer.from(await response.text());
      let tx: Tx;
      if (raw[4] === 0) {
        raw = Buffer.concat([raw.slice(0, 4), raw.slice(6)]);
        tx = Tx.parse(raw, testnet);
        tx.locktime = raw
          .reverse()
          .slice(0, 4)
          .readUInt32LE(0);
      } else {
        tx = Tx.parse(raw, testnet);
      }
      if (tx.id() !== txId)
        throw Error(`not the same id: ${tx.id()} vs ${txId}`);
      TxFetcher.cache[txId] = tx;
    }
    TxFetcher.cache[txId].testnet = testnet;
    return TxFetcher.cache[txId];
  };
}
