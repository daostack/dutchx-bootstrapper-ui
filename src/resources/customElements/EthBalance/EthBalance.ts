import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
import { DisposableCollection } from 'services/DisposableCollection';
import { BigNumber, Web3Service } from '../../../services/Web3Service';

@autoinject
@containerless
@customElement('ethbalance')
export class EthBalance {
  @bindable({ defaultBindingMode: bindingMode.toView }) public placement: string = 'top';

  private balance: BigNumber = null;
  private filter: any;
  private subscriptions = new DisposableCollection();

  constructor(
    private web3: Web3Service,
    private eventAggregator: EventAggregator) {
  }

  public attached() {
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account', () => { this.initialize(); }));
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Id', () => { this.initialize(); }));
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.stop();
    this.readBalance();
  }

  private stop(): Promise<void> {
    if (this.filter) {
      return (Promise as any).promisify(() => this.filter.stopWatching())()
        .then(() => {
          this.filter = null;
        });
    } else {
      return Promise.resolve();
    }
  }

  private detached(): Promise<void> {
    if (this.subscriptions) {
      this.subscriptions.dispose();
    }

    return this.stop();
  }

  private readBalance() {
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
      if (ethAddress) {
        this.balance = await this.web3.getBalance(ethAddress);
      } else {
        this.balance = null;
      }
      // tslint:disable-next-line:no-empty
    } catch (ex) {
    }
  }
}
