import { autoinject } from 'aurelia-framework';
import { BlockWithoutTransactionData } from 'web3';
import { Hash, TransactionReceipt } from '../services/ArcService';
import { Web3Service } from '../services/Web3Service';

@autoinject
export class TxInfo {

  private txHash: Hash;
  private txReceipt: TransactionReceipt;
  private block: BlockWithoutTransactionData;
  private timestamp: string;

  constructor(private web3Service: Web3Service) { }

  public async activate(params: any): Promise<void> {
    this.txHash = params.txHash;

    this.txReceipt = await this.web3Service.getTxReceipt(this.txHash);

    this.block = await this.web3Service.getBlock(this.txReceipt.blockHash) as BlockWithoutTransactionData;
    this.timestamp = new Date(this.block.timestamp * 1000).toLocaleString();
  }
}
