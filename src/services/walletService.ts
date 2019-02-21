import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { BindingSignaler } from 'aurelia-templating-resources';
import { DisposableCollection } from 'services/DisposableCollection';
import { Web3Service } from 'services/Web3Service';

@autoinject
export class WalletService {

  private static METAMASK: IWalletInfo =
    {
      icon: 'metamask.png',
      name: 'MetaMask',
    };

  private static SAFE: IWalletInfo =
    {
      icon: 'GnosisSafe.svg',
      name: 'Gnosis Safe',
    };

  private static UNKNOWN: IWalletInfo =
    {
      icon: '',
      name: '[Unknown]',
    };

  public currentWallet: IWalletInfo = WalletService.UNKNOWN;

  private subscriptions: DisposableCollection;

  constructor(
    private web3: Web3Service,
    private signaler: BindingSignaler,
    private eventAggregator: EventAggregator
  ) {
    this.subscriptions = new DisposableCollection();
    this.subscriptions.push(this.eventAggregator
      .subscribe('Network.Changed.Id', () => { this.refreshWallet(); }));
    this.subscriptions.push(this.eventAggregator
      .subscribe('Network.Changed.Account', () => this.refreshWallet()));
    this.refreshWallet();
  }

  /* shouldn't actually ever happen */
  public dispose() {
    this.subscriptions.dispose();
  }

  private setCurrentWallet(wallet: IWalletInfo) {
    this.currentWallet = wallet;
    this.signaler.signal('wallet.changed');
  }

  private async refreshWallet() {
    if (this.web3.isConnected) {
      const theWindow = (window as any);
      if (theWindow.ethereum && theWindow.ethereum._metamask) {
        this.setCurrentWallet(WalletService.METAMASK);
      } else if (this.web3 && (this.web3.currentProvider as any).isSafe) {
        this.setCurrentWallet(WalletService.SAFE);
      } else {
        this.setCurrentWallet(WalletService.UNKNOWN);
      }
    } else {
      this.setCurrentWallet(undefined);
    }
  }
}

export interface IWalletInfo {
  icon: string;
  name: string;
}
