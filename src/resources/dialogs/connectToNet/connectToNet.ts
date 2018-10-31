import { DialogController } from 'aurelia-dialog';
import { autoinject } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { Web3Service } from 'services/Web3Service';
import { DisposableCollection } from 'services/DisposableCollection';
import { Address, Utils } from '@daostack/arc.js';
// import { AureliaConfiguration } from 'aurelia-configuration';

@autoinject
export class ConnectToNet {

  model: ConnectToNetModel;
  networkName: string;
  subscriptions: DisposableCollection = new DisposableCollection();
  loading: boolean = false;
  userAccount: Address;
  isDone: boolean;
  // lockingPeriodEndDate: Date;

  constructor(
    private controller: DialogController
    , private eventAggregator: EventAggregator
    // , private appConfig: AureliaConfiguration
    , private web3: Web3Service) { }

  activate(model: ConnectToNetModel) {
    // this.lockingPeriodEndDate = new Date(this.appConfig.get("lockingPeriodEndDate"))
    this.networkName = this.web3.networkName;
    this.model = model;
    this.subscriptions.push(this.eventAggregator.subscribe("DAO.loaded", () => { this.close(); }));
    this.subscriptions.push(this.eventAggregator.subscribe("DAO.loaded", () => { this.close(); }));
    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Id", () => {
      this.networkName = this.web3.networkName;
      this.userAccount = this.web3.defaultAccount;
    }));
    this.subscriptions.push(this.eventAggregator.subscribe("DAO.Loading", (onOff: boolean): void => {
      this.loading = onOff;
    }));
  }

  confirm() {
    Utils.getUserApprovalForAccounts().then(() => {
      this.close();
    });
  }

  public close() {
    this.subscriptions.dispose();
    this.controller.close(true);
  }
}

interface ConnectToNetModel {
  isConnected: boolean;
  hasAccount: boolean;
}
