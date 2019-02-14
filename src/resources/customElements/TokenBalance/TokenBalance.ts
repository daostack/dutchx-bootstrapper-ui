import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
import { Address } from 'services/ArcService';
import { DisposableCollection } from 'services/DisposableCollection';
import { BigNumber } from 'services/Web3Service';
import { TokenService } from '../../../services/TokenService';

@autoinject
@containerless
@customElement('tokenbalance')
export class TokenBalance {

  @bindable({ defaultBindingMode: bindingMode.toView }) public token: Address;
  @bindable({ defaultBindingMode: bindingMode.toView }) public placement: string = 'top';
  @bindable({ defaultBindingMode: bindingMode.twoWay }) public balance: BigNumber = null;
  @bindable({ defaultBindingMode: bindingMode.toView }) public trailingZeroes?: number | string = 2;

  private subscriptions = new DisposableCollection();

  private events;

  constructor(
    private tokenService: TokenService,
    private eventAggregator: EventAggregator
  ) {
  }

  public attached() {
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account', () => { this.initialize(); }));
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Id', () => { this.initialize(); }));
    this.initialize();
  }

  private async initialize() {
    await this.stop();
    this.readBalance();
  }

  private detached(): Promise<void> {
    if (this.subscriptions) {
      this.subscriptions.dispose();
    }

    return this.stop();
  }

  private tokenChanged() {
    this.initialize();
  }

  private stop(): Promise<void> {
    if (this.events) {
      return (Promise as any).promisify(() => this.events.stopWatching())()
        .then(() => {
          this.events = null;
        });
    } else {
      return Promise.resolve();
    }
  }

  private async readBalance() {

    if (this.token) {

      const token = await this.tokenService.getErc20Token(this.token);

      if (token) {
        this.getBalance(token);

        this.events = token.contract.allEvents({ fromBlock: 'latest' });

        this.events.watch(() => {
          this.getBalance(token);
        });
      }
    }

    if (!this.events) {
      this.balance = null;
    }
  }
  private async getBalance(token) {
    try {
      this.balance = await this.tokenService.getUserErc20TokenBalance(token);
      // tslint:disable-next-line:no-empty
    } catch {
    }
  }
}
