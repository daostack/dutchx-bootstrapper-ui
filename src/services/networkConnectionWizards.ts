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
    , private web3: Web3Service
    , private eventAggregator: EventAggregator
  ) {
    this.subscriptions = new DisposableCollection();
  }

  isConnected: boolean;
  hasAccount: boolean;
  loading: boolean = false;
  skipLanding: boolean = false;
  hasDao: boolean = false;
  subscriptions: DisposableCollection;
  promise: Promise<DialogCloseResult>;
  dialogViewModel: ConnectToNet;
  hasApprovedAccountAccess: boolean;

  public async run(
    hasDao: boolean,
    skipLanding: boolean): Promise<DialogCloseResult> {

    if (this.promise) {
      return this.promise;
    }

    return this.promise = new Promise(async (): Promise<DialogCloseResult> => {
      /** don't show the intro if we already have a DAO */
      this.skipLanding = skipLanding;

      /** but assume we're going to look for another DAO */
      this.hasDao = hasDao;

      const connectionChanged = async () => {
        this.isConnected = this.web3.isConnected; // && !!this.arcService.arcContracts;

        if (this.isConnected) {
          this.hasAccount = !!this.web3.defaultAccount;
          const theWindow = (window as any);
          /**
           * ethereum._metamask:
           * 
           * isEnabled  - determines if this domain has been approved
           *              (returns true if privacy mode is off or user has approved)
           * isApproved - determines if this domain is currently enabled
           *              (returns true only if domain has been approved in privacy mode)
           * isUnlocked - determines if MetaMask is unlocked by the user
           *              (returns true when user has simply logged on to MetaMask)
           * 
           * Note that on particular browsers, these may not be implemented, in which case we always return true and
           * the UI will need to rely solely on hasAccount.
           * 
           * See: https://github.com/MetaMask/metamask-extension/pull/4703#issuecomment-430814765
           */
          const enabled = !theWindow.ethereum._metamask.isEnabled || (await theWindow.ethereum._metamask.isEnabled());
          const approved = !theWindow.ethereum._metamask.isApproved || (await theWindow.ethereum._metamask.isApproved());
          // const unlocked = !theWindow.ethereum._metamask.isUnlocked || (await theWindow.ethereum._metamask.isUnlocked());

          // console.log(`enabled: ${enabled}`);
          // console.log(`approved: ${approved}`);
          // console.log(`unlocked: ${unlocked}`);
          // console.log(`isConnected: ${this.isConnected}`);
          // console.log(`hasAccount: ${this.hasAccount}`);

          this.hasApprovedAccountAccess =
            /**
             * !theWindow.ethereum happens when there is a local server or otherwise not using metamask.
             * We return true in this case because MM is thus not present and we don't want to trigger
             * any interaction with it.  If there is no connection we'll do the right thing.
             */
            !theWindow.ethereum || (enabled || approved);
        }
      };

      this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Id", () => { this.hasDao = false; connectionChanged() }));
      this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Account", () => connectionChanged()));
      this.subscriptions.push(this.eventAggregator.subscribe("DAO.loaded", () => { this.hasDao = true; }));
      this.subscriptions.push(this.eventAggregator.subscribe("DAO.Loading", (onOff: boolean): void => {
        this.loading = onOff;
      }));

      await connectionChanged();

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

  private confirm() {
    /**
     * Note: calling `_metamask.enable()` will ask the user to approve access to the account
     * even if privacy mode is turned off.  This behavior anticipates that privacy mode is
     * intended to eventually go away.
     * 
     * If the user is not logged-in, will ask them to log in first.
     * 
     * Don't expect caching of the approval, it may not implemented by MM or the particular browser.
     * 
     * A weird thing happens when privacy mode is off:  We are notified when the user logs in and at that point
     * detect that we are 'enabled' for account access, and will proceed to load the DAO accordingly,
     * yet MM will still be in the process of prompting the user for access.  The latter is fine (see comment above).
     * What is weird is that we will nevertheless be loading the DAO.  I expect this behavior to go away when
     * MM permanently enables privacy mode.
     */
    Utils.getUserApprovalForAccounts();
  }
}
