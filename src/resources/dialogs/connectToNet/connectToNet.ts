import { Address } from '@daostack/arc.js';
import { AureliaConfiguration } from 'aurelia-configuration';
import { DialogCancelableOperationResult, DialogController } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom, View } from 'aurelia-framework';
import { EventMessageType } from 'entities/GeneralEvents';
import { BalloonService } from 'services/balloonService';
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
  private checked3: boolean = false;
  private checked4: boolean = false;
  private checked5: boolean = false;
  private checked6: boolean = false;
  private checkStateChangeTimerId: any;
  private hasAccepted: boolean = false;
  private paUrl: string;

  constructor(
    private controller: DialogController,
    private eventAggregator: EventAggregator,
    private web3: Web3Service,
    appConfig: AureliaConfiguration) {

    this.paUrl = appConfig.get('paUrl');

    $(window).resize(() => {
      setTimeout(() => this.reposition(), 100);
    });
  }

  public async activate(model: IConnectToNetModel) {
    this.networkName = this.web3.networkName;
    this.landed = model.skipLanding;
    this.model = model;
    this.userAccount = this.web3.defaultAccount;

    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Id', () => {
      this.networkName = this.web3.networkName;
      this.userAccount = this.web3.defaultAccount;
      this.checked1 = this.checked2 = this.checked3 = this.checked4 = this.checked5 = this.checked6 = false;
      this.setHasAccepted(this.getHasAccepted());
    }));
    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account', () => {
      this.userAccount = this.web3.defaultAccount;
      this.checked1 = this.checked2 = this.checked3 = this.checked4 = this.checked5 = this.checked6 = false;
      this.setHasAccepted(this.getHasAccepted());
    }));

    this.hasAccepted = this.getHasAccepted();

    if (this.hasAccepted) {
      this.eventAggregator.publish('connect.disclaimed', true);
    }

    /**
     * hack to moniter when the disclaimer window may become visible
     */
    if (!this.readyToShowDisclaimer) {
      this.checkStateChangeTimerId = setInterval(() => {
        /**
         * checking here to see if we are about to show the disclaimer window
         * and want to resize the window.
         */
        if (this.readyToShowDisclaimer) {
          this.reposition();
          this.stopInterval();
        }
      }, 250);
    }
  }

  public deactivate() {
    this.stopInterval();
  }

  public attached() {
    this.reposition();
  }

  public close(cancelled: boolean = false): Promise<DialogCancelableOperationResult> {
    this.subscriptions.dispose();
    return this.controller.close(!cancelled);
  }

  private reposition(): void {
    const bodyHeight = $(window).height() || 0;
    $('ux-dialog.connections .disclaimer').css(
      {
        'max-height': `${bodyHeight * .7}px`,
      });
    (this.controller.renderer as any).centerDialog();
  }

  private stopInterval() {
    if (this.checkStateChangeTimerId) {
      clearInterval(this.checkStateChangeTimerId);
      this.checkStateChangeTimerId = null;
    }
  }
  private getHasAccepted(): boolean {
    return LocalStorageService.getItem(this.disclaimerAcceptanceKey, false) === 'yes';
  }

  private setHasAccepted(val: boolean): void {
    if (val) {
      LocalStorageService.setItem(this.disclaimerAcceptanceKey, 'yes', false);
    }
    this.hasAccepted = val;
    this.eventAggregator.publish('connect.disclaimed', val);
  }

  private get readyToShowDisclaimer(): boolean {
    return !this.hasAccepted &&
      this.model.isConnected &&
      this.model.hasAccount &&
      this.model.hasApprovedAccountAccess;
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

  private get disclaimerSubmitButton(): HTMLElement {
    return $('ux-dialog #disclaimerSubmitButton')[0];
  }

  private async accept() {
    if (this.checked1 && this.checked2 && this.checked3 && this.checked4 && this.checked5 && this.checked6) {
      this.setHasAccepted(true);
      setTimeout(() => this.reposition(), 0);
    } else {
      await BalloonService.show({
        content: `To continue please acknowledge your intent to be bound by the Agreement by ticking the boxes`,
        eventMessageType: EventMessageType.Warning,
        originatingUiElement: this.disclaimerSubmitButton,
      });
    }
  }

  /**
   * confirms access to MM accounts
   */
  private confirm() {
    this.model.confirm();
  }

  private get disclaimerAcceptanceKey(): string {
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
