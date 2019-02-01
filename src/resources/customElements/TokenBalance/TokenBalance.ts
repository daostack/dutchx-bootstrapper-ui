import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
import { Address } from 'services/ArcService';
import { IDisposable } from 'services/IDisposable';
import { BigNumber } from 'services/Web3Service';
import { TokenService } from '../../../services/TokenService';

@autoinject
@containerless
@customElement('tokenbalance')
export class TokenBalance {

  @bindable({ defaultBindingMode: bindingMode.toView }) public token: Address;
  @bindable({ defaultBindingMode: bindingMode.toView }) public placement: string = 'top';
  @bindable({ defaultBindingMode: bindingMode.fromView }) public balance: BigNumber = null;

  private subscription: IDisposable;

  private events;

  constructor(
    private tokenService: TokenService,
    private eventAggregator: EventAggregator
  ) {
  }

  public attached() {
    this.subscription = this.eventAggregator.subscribe('Network.Changed.Account', () => { this.initialize(); });
    this.initialize();
  }

  private initialize() {
    this.stop();
    this.readBalance();
  }

  private detached() {
    if (this.subscription) {
      this.subscription.dispose();
      this.subscription = null;
    }

    this.stop();
  }

  private tokenChanged() {
    this.initialize();
  }

  private stop() {
    if (this.events) {
      this.events.stopWatching();
      this.events = null;
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
