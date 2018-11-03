import { autoinject, computedFrom } from 'aurelia-framework';
import { DialogService } from 'services/dialogService';
import { ArcService, Utils } from 'services/ArcService';
import { Web3Service } from 'services/Web3Service';
import { ConnectToNet } from "../resources/dialogs/connectToNet/connectToNet";
import { EventAggregator } from 'aurelia-event-aggregator';
import { DialogOpenResult, DialogController } from 'aurelia-dialog';
import { DisposableCollection } from 'services/DisposableCollection';
import { DialogCloseResult } from 'aurelia-dialog';

@autoinject
export class NetworkConnectionWizards {
  constructor(
    private dialogService: DialogService
    , private arcService: ArcService
    , private web3: Web3Service
    , private eventAggregator: EventAggregator
  ) {
    this.subscriptions = new DisposableCollection();
  }

  isConnected: boolean;
  hasAccount: boolean;
  loading: boolean = false;
  landed: boolean = false;
  hasDao: boolean = false;
  subscriptions: DisposableCollection;
  promise: Promise<DialogCloseResult>;
  dialogViewModel: ConnectToNet;

  public run(skipLanding: boolean): Promise<DialogCloseResult> {

    if (this.promise) {
      return this.promise;
    }

    /** don't show the intro if we already have a DAO */
    this.landed = skipLanding;

    /** but assume we're going to look for another DAO */
    this.hasDao = false;

    const connectionChanged = () => {
      this.isConnected = this.web3.isConnected && !!this.arcService.arcContracts;
      this.hasAccount = !!this.web3.defaultAccount;
    };

    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Id", () => connectionChanged()));
    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Account", () => connectionChanged()));
    this.subscriptions.push(this.eventAggregator.subscribe("DAO.loaded", () => { this.hasDao = true; }));
    this.subscriptions.push(this.eventAggregator.subscribe("DAO.Loading", (onOff: boolean): void => {
      this.loading = onOff;
    }));

    connectionChanged();

    /**
     * the dialog will close itself when a dao is loaded
     */
    return this.promise = (this.dialogService.open(ConnectToNet, this)
      .then((openDialogResult: DialogOpenResult) => {
        this.dialogViewModel = openDialogResult.controller.controller.viewModel as ConnectToNet;
        return openDialogResult.closeResult;
      }) as any)
      .then((result: DialogCloseResult) => {
        this.subscriptions.dispose();
        this.promise = null;
        return result;
      });
  }

  /**
   * normal automated close is going to be !cancelled.  manual close should indiciate cancelled
   * @param cancelled 
   */
  public close(cancelled: boolean) {
    if (this.dialogViewModel) {
      this.dialogViewModel.close(cancelled);
    }
  }


  public isRunning(): boolean {
    return !!this.promise;
  }

  private land() {
    this.landed = true;
  }

  private confirm() {
    Utils.getUserApprovalForAccounts();
  }
}
