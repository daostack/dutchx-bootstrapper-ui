import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
import { Address } from 'services/ArcService';
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
  private checking: boolean = false;
  private account: Address;

  constructor(
    private web3: Web3Service,
    private eventAggregator: EventAggregator) {
  }

  public attached() {
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account',
      (account: Address) => {
        this.account = account;
        this.getBalance();
      }));
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Id',
      () => { this.initialize(); }));
    this.initialize();
  }

  private initialize(): void {
    this.stop();
    this.account = this.web3.defaultAccount;
    /**
     * this is supposed to fire whenever a new block is created
     */
    this.filter = this.web3.eth.filter('latest', () => {
      this.getBalance();
    });
    this.getBalance();
  }

  private stop(): void {
    if (this.filter) {
      this.filter.stopWatching();
      this.filter = null;
    }
  }

  private detached(): void {
    if (this.subscriptions) {
      this.subscriptions.dispose();
    }

    this.stop();
  }

  private async getBalance() {
    if (!this.checking) {
      try {
        this.checking = true;
        if (this.account) {
          this.balance = await this.web3.getBalance(this.account);
        } else {
          this.balance = null;
        }
        // tslint:disable-next-line:no-empty
      } catch (ex) {
      } finally {
        this.checking = false;
      }
    }
  }
}
