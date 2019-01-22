import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, containerless, customElement } from 'aurelia-framework';
import { NumberService } from 'services/numberService';
import { Web3Service } from '../../../services/Web3Service';

@autoinject
@containerless
@customElement('ethbalance')
export class EthBalance {

  private text: string;
  private ethBalance: string = '';
  private rawBalance: string = '';
  private filter: any;
  private textElement: HTMLElement;

  constructor(
    private web3: Web3Service,
    eventAggregator: EventAggregator,
    private numberService: NumberService) {
    eventAggregator.subscribe('Network.Changed.Account', () => { this.initialize(); });
    eventAggregator.subscribe('Network.Changed.Id', () => { this.initialize(); });
  }

  public attached() {
    this.initialize();
  }

  private initialize(): Promise<void> {
    this.stop();
    return this.readBalance().then(() => {
      ($(this.textElement) as any).tooltip('dispose');
      ($(this.textElement) as any).tooltip(
        {
          placement: 'left',
          title: this.rawBalance,
          toggle: 'tooltip',
          trigger: 'hover',
        }
      );
    });
  }

  private stop() {
    if (this.filter) {
      this.filter.stopWatching();
      this.filter = null;
    }
  }

  private detached() {
    this.stop();
  }

  private async readBalance() {
    /**
     * this is supposed to fire whenever a new block is created
     */
    this.filter = this.web3.eth.filter({ fromBlock: 'latest' }).watch(() => {
      this.getBalance();
    });
    return this.getBalance();
  }

  private async getBalance() {
    try {
      const ethAddress = this.web3.defaultAccount;
      const balance = this.web3.fromWei(await this.web3.getBalance(ethAddress));
      this.rawBalance = `${balance.toString(10)} ETH`;
      this.ethBalance = this.numberService.toFixedNumberString(balance, 5);

      this.text = `${this.ethBalance} ETH`;
      // tslint:disable-next-line:no-empty
    } catch (ex) {
    }
  }
}
