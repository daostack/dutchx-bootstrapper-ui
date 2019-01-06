import { Web3EventService } from '@daostack/arc.js';
import { autoinject } from 'aurelia-framework';
import { BigNumber } from 'bignumber.js';
import {
  BlockWithoutTransactionData,
  BlockWithTransactionData,
  EthApi,
  providers as Web3Providers,
  Transaction,
  TransactionReceipt,
  Unit,
  VersionApi,
  Web3,
} from 'web3';
import { Address, Hash, Utils } from './ArcService';

@autoinject()
export class Web3Service {

  public get web3(): Web3 { return this._web3; }
  public set web3(newVal: Web3) { this._web3 = newVal; }

  public get accounts(): string[] { return this.web3 ? this.web3.eth.accounts : []; }

  public get currentProvider(): Web3Providers.HttpProvider { return this.web3 ? this.web3.currentProvider : null; }

  public get eth(): EthApi { return this.web3 ? this.web3.eth : null; }

  public get version(): VersionApi { return this.web3 ? this.web3.version : null; }

  public defaultAccount: Address;
  public networkName: string;

  public isConnected: boolean = false;

  private _web3: Web3;

  constructor(
  ) {
  }

  public async getTxReceipt(txHash: Hash): Promise<Transaction & TransactionReceipt> {
    const receipt = await (Promise as any).promisify(this.web3.eth.getTransactionReceipt)(txHash)
      .then((_tx) => _tx);
    const tx = await (Promise as any).promisify(this.web3.eth.getTransaction)(txHash)
      .then((_tx) => _tx);
    return Object.assign(tx, receipt);
  }

  public getBlock(blockHash: Hash, withTransactions: boolean = false): Promise<BlockWithoutTransactionData | BlockWithTransactionData> {
    return (Promise as any).promisify(this.web3.eth.getBlock)(blockHash, withTransactions)
      .then((_block) => _block);
  }

  public bytes32ToUtf8(bytes32: string): string {
    return this.web3.toUtf8(bytes32);
  }

  public fromWei(value: Number | String | BigNumber, unit: Unit = 'ether'): BigNumber {
    return this.toBigNumber(this.web3.fromWei(value as any, unit));
  }

  public toWei(value: Number | String | BigNumber, unit: Unit = 'ether'): BigNumber {
    return this.toBigNumber(this.web3.toWei(value as any, unit));
  }

  public toBigNumber(value: Number | String | BigNumber): BigNumber {
    return this.web3.toBigNumber(value as any);
  }

  /**
   *
   * @param ethAddress in Wei by default
   * @param inEth
   */
  public getBalance(ethAddress: string, inEth: boolean = false): Promise<BigNumber> {
    return new Promise((resolve, reject) => {
      this.web3.eth.getBalance(ethAddress, undefined, (error: Error, balance) => {
        if (error) {
          reject(error);
        }
        if (inEth) {
          balance = this.web3.fromWei(balance);
        }
        resolve(balance);
      });
    });
  }

  public async initialize(web3): Promise<Web3> {
    /**
     * so won't throw exceptions and we can use methods like .isNaN().
     * See: https://mikemcl.github.io/bignumber.js/#errors
     */
    BigNumber.config({ ERRORS: false });

    this.networkName = await Utils.getNetworkName();
    console.log(`Connected to Ethereum (${this.networkName})`);
    this._web3 = web3;
    this.isConnected = true;
    try {
      this.defaultAccount = await this.getDefaultAccount();
    } catch {
      this.defaultAccount = undefined;
    }
    return web3;
  }

  private getDefaultAccount(): Promise<string> {
    return Utils.getDefaultAccount();
  }
}

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const SOME_ADDRESS = '0x1000000000000000000000000000000000000000';
export const NULL_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const SOME_HASH = '0x1000000000000000000000000000000000000000000000000000000000000000';
export { BigNumber } from 'bignumber.js';
