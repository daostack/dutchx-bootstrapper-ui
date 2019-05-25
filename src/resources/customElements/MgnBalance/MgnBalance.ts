// tslint:disable-next-line: ordered-imports
import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
import { Address, ExternalLocking4ReputationWrapper } from 'services/ArcService';
import { DisposableCollection } from 'services/DisposableCollection';
import { BigNumber, Web3Service } from '../../../services/Web3Service';

@autoinject
@containerless
@customElement('mgnbalance')
export class MgnBalance {
  @bindable({ defaultBindingMode: bindingMode.toView }) public placement: string = 'top';

  private balance: BigNumber;
  private filter: any;
  private subscriptions = new DisposableCollection();
  private account: Address;
  private checking: boolean = false;
  private mgnWrapper: ExternalLocking4ReputationWrapper;

  constructor(
    private web3: Web3Service,
    private eventAggregator: EventAggregator,
    private appConfig: AureliaConfiguration) {
  }

  public attached() {
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account',
      (account: Address) => {
        this.account = account;
        this.getBalance();
      }));
    /**
     * need this because mgnWrapper won't be available until schemes are loaded
     */
    this.subscriptions.push(this.eventAggregator.subscribe('DAO.loaded',
      () => { this.initialize(); }));
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.stop();
    this.account = this.web3.defaultAccount;
    this.mgnWrapper = this.appConfig.get('mgnWrapper');

    if (this.mgnWrapper) {
      /**
       * this is supposed to fire whenever a new block is created
       */
      this.filter = this.web3.eth.filter('latest', () => {
        this.getBalance();
      });
      this.getBalance();
    }
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
        if (this.mgnWrapper) {
          const accountAddress = this.web3.defaultAccount;
          this.balance = await this.mgnWrapper.accountTokenBalance(accountAddress);
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
