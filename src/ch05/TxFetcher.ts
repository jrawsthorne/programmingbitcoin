import { Tx } from "./Tx";
import fetch from "node-fetch";
import fs from "fs";

interface TxCahe {
  [key: string]: Tx;
}

interface DiskCache {
  [keyof: string]: string;
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
      let response = await fetch(url);
      if (response.status !== 200) {
        throw Error(`Error fetching tx: ${txId}`);
      }
      const rawTx = await response.text();
      let raw = Buffer.from(rawTx, "hex");
      let tx: Tx;
      if (raw[4] === 0) {
        raw = Buffer.concat([raw.slice(0, 4), raw.slice(6)]);
        tx = Tx.parse(raw, testnet);
        tx.locktime = raw.slice(raw.length - 4).readUInt32LE(0);
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

  static loadCache = (filename: string): void => {
    const diskCache: DiskCache = JSON.parse(
      fs.readFileSync(filename).toString("ascii")
    );

    Object.entries(diskCache).map(([k, rawHex]) => {
      let raw = Buffer.from(rawHex, "hex");
      let tx: Tx;
      if (raw[4] === 0) {
        raw = Buffer.concat([raw.slice(0, 4), raw.slice(6)]);
        tx = Tx.parse(raw);
        tx.locktime = raw.slice(raw.length - 4).readUInt32LE(0);
      } else {
        tx = Tx.parse(raw);
      }
      TxFetcher.cache[k] = tx;
    });
  };
}
