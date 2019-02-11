import { ExternalLocking4ReputationWrapper } from '@daostack/arc.js';
import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
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
  private checking: boolean = false;

  constructor(
    private web3: Web3Service,
    private eventAggregator: EventAggregator,
    private appConfig: AureliaConfiguration) {
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
    if (!this.checking) {
      try {
        this.checking = true;
        const mgnWrapper: ExternalLocking4ReputationWrapper = this.appConfig.get('mgnWrapper');
        if (mgnWrapper) {
          const accountAddress = this.web3.defaultAccount;
          this.balance = await mgnWrapper.accountTokenBalance(accountAddress);
        } else {
          this.balance = null;
        }
        // tslint:disable-next-line:no-empty
      } finally {
        this.checking = false;
      }
    }
  }
}
