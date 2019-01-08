import { Address } from '@daostack/arc.js';
import { DialogController } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom } from 'aurelia-framework';
import { DisposableCollection } from 'services/DisposableCollection';
import { LocalStorageService } from 'services/localStorageService';
import { Web3Service } from 'services/Web3Service';

@autoinject
export class ConnectToNet {

  private model: IConnectToNetModel;
  private networkName: string;
  private subscriptions: DisposableCollection = new DisposableCollection();
  private userAccount: Address;
  private isDone: boolean;
  private landed: boolean;
  private _hasAccepted = false;

  @computedFrom('userAccount, _hasAccepted')
  private get hasAccepted(): boolean {
    return LocalStorageService.getItem(this.disclaimerAcceptanceKey(), false) === 'yes';
  }
  private set hasAccepted(val: boolean) {
    this._hasAccepted = val;
    if (this.userAccount) {
      LocalStorageService.setItem(this.disclaimerAcceptanceKey(), val ? 'yes' : 'no', false);
    }
  }

  constructor(
      private controller: DialogController
    , private eventAggregator: EventAggregator
    , private web3: Web3Service) { }

  public async activate(model: IConnectToNetModel) {
    this.networkName = this.web3.networkName;
    this.landed = model.skipLanding;
    this.model = model;
    this.userAccount = this.web3.defaultAccount;

    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Id', () => {
      this.networkName = this.web3.networkName;
      this.userAccount = this.web3.defaultAccount;
    }));
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account', () => {
      this.userAccount = this.web3.defaultAccount;
    }));
  }

  public close(cancelled: boolean = false) {
    this.subscriptions.dispose();
    this.controller.close(!cancelled);
  }

  private land() {
    if (this.hasAccepted) {
      // disclaimer has  already been accepted
      this.close(false);
    } else {
      this.landed = true;
    }
  }

  private accept() {
    this.close(false);
    // timeout to keep GUI transition clean
    setTimeout(() => { this.hasAccepted = true; }, 10);
  }

  /**
   * confirms access to MM accounts
   */
  private confirm() {
    this.model.confirm();
  }

  private disclaimerAcceptanceKey() {
    // the '_1' is a version number
    return `disclaimerAccepted_1_${this.userAccount}`;
  }
}

interface IConnectToNetModel {
  isConnected: boolean;
  hasAccount: boolean;
  loading: boolean;
  skipLanding: boolean;
  hasDao: boolean;
  hasApprovedAccountAccess: boolean;
  confirm: () => void;
}
