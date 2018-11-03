import { DialogController } from 'aurelia-dialog';
import { autoinject } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { Web3Service } from 'services/Web3Service';
import { DisposableCollection } from 'services/DisposableCollection';
import { Address } from '@daostack/arc.js';

@autoinject
export class ConnectToNet {

  model: ConnectToNetModel;
  networkName: string;
  subscriptions: DisposableCollection = new DisposableCollection();
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
    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Id", () => {
      this.networkName = this.web3.networkName;
      this.userAccount = this.web3.defaultAccount;
    }));
  }

  land() {
    this.model.land();
  }

  accept() {
    this.close(false);
  }

  confirm() {
    this.model.confirm();
  }

  public close(cancelled: boolean = false) {
    this.subscriptions.dispose();
    this.controller.close(!cancelled);
  }
}

interface ConnectToNetModel {
  isConnected: boolean;
  hasAccount: boolean;
  loading: boolean;
  landed: boolean;
  hasDao: boolean;
  confirm: () => void;
  land: () => void;
}
