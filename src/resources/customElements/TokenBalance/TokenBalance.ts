import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
import { Address } from 'services/ArcService';
import { NumberService } from 'services/numberService';
import { TokenService } from '../../../services/TokenService';

@autoinject
@containerless
@customElement('tokenbalance')
export class TokenBalance {

  @bindable({ defaultBindingMode: bindingMode.toView }) public token: Address;

  private balance: string;

  private events;

  constructor(
    private tokenService: TokenService,
    eventAggregator: EventAggregator,
    private numberService: NumberService
  ) {
    eventAggregator.subscribe('Network.Changed.Account', () => { this.initialize(); });
  }

  public attached() {
    this.initialize();
  }

  private initialize() {
    this.stop();
    this.readBalance();
  }

  private detached() {
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
      this.balance = `N/A`;
    }
  }
  private async getBalance(token) {
    try {
      this.balance =
        this.numberService.toFixedNumberString(await this.tokenService.getUserErc20TokenBalance(token, true), 5);
      // tslint:disable-next-line:no-empty
    } catch {
    }
  }
}
