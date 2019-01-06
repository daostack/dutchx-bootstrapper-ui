import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
import { Address } from 'services/ArcService';
import { TokenService } from '../../../services/TokenService';

@autoinject
@containerless
@customElement('tokenbalance')
export class TokenBalance {

  @bindable({ defaultBindingMode: bindingMode.toView }) public token: Address;

  private balance: string;
  private text: string;

  private events;

  constructor(
    private tokenService: TokenService,
    eventAggregator: EventAggregator,
  ) {
    eventAggregator.subscribe('Network.Changed.Account', () => { this.initialize(); });
  }

  public initialize() {
    this.stop();
    this.readBalance();
  }

  public attached() {
    this.initialize();
  }

  public detached() {
    this.stop();
  }

  public tokenChanged() {
    this.initialize();
  }

  public stop() {
    if (this.events) {
      this.events.stopWatching();
      this.events = null;
    }
  }

  public async readBalance() {

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
      this.text = `N/A`;
    }
  }
  public async getBalance(token) {
    try {
      this.balance = (await this.tokenService.getUserErc20TokenBalance(token, true)).toFixed(2);
      this.text = this.balance.toString();
      // tslint:disable-next-line:no-empty
    } catch {
    }
  }
}
