import { Address } from '@daostack/arc.js';
import { DialogCancelableOperationResult, DialogController } from 'aurelia-dialog';
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
  private userAccount: Address = null;
  private isDone: boolean;
  private landed: boolean;
  private checked1: boolean = false;
  private checked2: boolean = false;

  private get hasAccepted(): boolean {
    return LocalStorageService.getItem(this.disclaimerAcceptanceKey(), false) === 'yes';
  }
  private set hasAccepted(val: boolean) {
    if (this.userAccount && val) {
      LocalStorageService.setItem(this.disclaimerAcceptanceKey(), val ? 'yes' : 'no', false);
    }
    this.eventAggregator.publish('connect.disclaimed', this.hasAccepted);
  }

  constructor(
    private controller: DialogController,
    private eventAggregator: EventAggregator,
    private web3: Web3Service) { }

  public async activate(model: IConnectToNetModel) {
    this.networkName = this.web3.networkName;
    this.landed = model.skipLanding;
    this.model = model;
    this.userAccount = this.web3.defaultAccount;

    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Id', () => {
      this.networkName = this.web3.networkName;
      this.userAccount = this.web3.defaultAccount;
      this.hasAccepted = this.checked1 = this.checked2 = false;
    }));
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account', () => {
      this.userAccount = this.web3.defaultAccount;
      this.hasAccepted = this.checked1 = this.checked2 = false;
    }));

    if (this.hasAccepted) {
      this.eventAggregator.publish('connect.disclaimed', true);
    }
  }

  public close(cancelled: boolean = false): Promise<DialogCancelableOperationResult> {
    this.subscriptions.dispose();
    return this.controller.close(!cancelled);
  }

  private async land() {
    if (this.hasAccepted) {
      // disclaimer has  already been accepted
      await this.close(false);
      this.eventAggregator.publish('connect.complete');
    } else {
      this.landed = true;
    }
  }

  private async accept() {
    if (this.checked1 && this.checked2) {
      this.hasAccepted = true;
    }
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
