import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
import { Address, DecodedLogEntryEvent, Erc20Wrapper, EventFetcher, TransferEventResult } from 'services/ArcService';
import { DisposableCollection } from 'services/DisposableCollection';
import { BigNumber, Web3Service } from 'services/Web3Service';
import { TokenService } from '../../../services/TokenService';

@autoinject
@containerless
@customElement('tokenbalance')
export class TokenBalance {

  @bindable({ defaultBindingMode: bindingMode.toView }) public token: Address;
  @bindable({ defaultBindingMode: bindingMode.toView }) public placement: string = 'top';
  @bindable({ defaultBindingMode: bindingMode.twoWay }) public balance: BigNumber = null;
  @bindable({ defaultBindingMode: bindingMode.toView }) public trailingZeroes?: number | string = 2;

  private event: EventFetcher<TransferEventResult>;
  private subscriptions = new DisposableCollection();
  private tokenWrapper: Erc20Wrapper;
  private checking: boolean = false;
  private account: Address;

  constructor(
    private web3: Web3Service,
    private tokenService: TokenService,
    private eventAggregator: EventAggregator
  ) {
  }

  public attached() {
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account',
      (account: Address) => {
        this.account = account;
        if (!this.tokenWrapper) {
          this.initialize();
        } else {
          this.getBalance();
        }
      }));
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Id',
      () => { this.initialize(); }));
    this.initialize();
  }

  private async initialize() {
    this.stop();
    this.account = this.web3.defaultAccount;
    if (this.account && this.token) {

      this.tokenWrapper = await this.tokenService.getErc20Token(this.token);

      if (this.tokenWrapper) {
        // note we're not handling Mint here, assuming it is not important
        this.event = this.tokenWrapper.Transfer({}, { fromBlock: 'latest' },
          (error: Error, event: DecodedLogEntryEvent<TransferEventResult>): void => {
            if (!error) {
              // events on this contract may relate to other accounts than the current one
              if ((event.args.from === this.account) || (event.args.to === this.account)) {
                this.getBalance();
              }
            }
          });

        this.getBalance();
      }
    }

    if (!this.event) {
      this.balance = null;
    }
  }

  private detached(): void {
    if (this.subscriptions) {
      this.subscriptions.dispose();
    }

    this.stop();
  }

  private tokenChanged() {
    this.initialize();
  }

  private stop(): void {
    if (this.event) {
      this.event.stopWatching();
      this.event = null;
    }
  }

  private async getBalance() {
    if (!this.checking) {
      try {
        this.checking = true;
        if (this.account) {
          this.balance = await this.tokenService.getUserErc20TokenBalance(this.tokenWrapper);
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
