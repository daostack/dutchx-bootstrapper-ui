import { DialogController } from 'aurelia-dialog';
import { autoinject, computedFrom } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { Web3Service } from 'services/Web3Service';
import { DisposableCollection } from 'services/DisposableCollection';
import { Address } from '@daostack/arc.js';
import { LocalStorageService } from 'services/localStorageService';

@autoinject
export class ConnectToNet {

  model: ConnectToNetModel;
  networkName: string;
  subscriptions: DisposableCollection = new DisposableCollection();
  userAccount: Address;
  isDone: boolean;
  landed: boolean;
  _hasAccepted = false;

  @computedFrom("userAccount, _hasAccepted")
  get hasAccepted(): boolean {
    return LocalStorageService.getItem(this.disclaimerAcceptanceKey(), false) === "yes";
  };
  set hasAccepted(val: boolean) {
    this._hasAccepted = val;
    if (this.userAccount) {
      LocalStorageService.setItem(this.disclaimerAcceptanceKey(), val ? "yes" : "no", false);
    }
  };

  constructor(
    private controller: DialogController
    , private eventAggregator: EventAggregator
    , private web3: Web3Service) { }

  async activate(model: ConnectToNetModel) {
    this.networkName = this.web3.networkName;
    this.landed = model.skipLanding;
    this.model = model;
    this.userAccount = this.web3.defaultAccount;

    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Id", () => {
      this.networkName = this.web3.networkName;
      this.userAccount = this.web3.defaultAccount;
    }));
    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Account", () => {
      this.userAccount = this.web3.defaultAccount;
    }));
  }

  land() {
    if (this.hasAccepted) {
      // disclaimer has  already been accepted
      this.close(false);
    } else {
      this.landed = true;
    }
  }

  accept() {
    this.close(false);
    // timeout to keep GUI transition clean
    setTimeout(() => { this.hasAccepted = true; }, 10);
  }

  /**
   * confirms access to MM accounts
   */
  confirm() {
    this.model.confirm();
  }

  public close(cancelled: boolean = false) {
    this.subscriptions.dispose();
    this.controller.close(!cancelled);
  }

  private disclaimerAcceptanceKey() {
    // the '_1' is a version number
    return `disclaimerAccepted_1_${this.userAccount}`;
  }
}

interface ConnectToNetModel {
  isConnected: boolean;
  hasAccount: boolean;
  loading: boolean;
  skipLanding: boolean;
  hasDao: boolean;
  hasApprovedAccountAccess: boolean;
  confirm: () => void;
}
