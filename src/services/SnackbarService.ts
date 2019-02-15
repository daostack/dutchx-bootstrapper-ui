import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/operator/concatMap';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'snackbarjs';
import { ActionType, EventConfig, EventConfigTransaction } from '../entities/GeneralEvents';
import { AureliaHelperService } from './AureliaHelperService';
import { DisposableCollection } from './DisposableCollection';

/**
 * TODO:  Ability to queue up simultaneous messages so they are shown sequentially (per Material Design spec)
 */
@autoinject
export class SnackbarService {

  // probably doesn't really need to be a disposable collection since this is a singleton service
  private subscriptions: DisposableCollection = new DisposableCollection();
  private snackQueue: Subject<EventConfig>;

  constructor(
    eventAggregator: EventAggregator,
    private aureliaHelperService: AureliaHelperService
  ) {
    this.subscriptions.push(eventAggregator
      .subscribe('handleTransaction', (config: EventConfigTransaction | any) => this.handleTransaction(config)));
    this.subscriptions.push(eventAggregator
      .subscribe('handleSuccess', (config: EventConfig | string) => this.handleSuccess(config)));
    this.subscriptions.push(eventAggregator
      .subscribe('handleWarning', (config: EventConfig | string) => this.handleWarning(config)));
    this.subscriptions.push(eventAggregator
      .subscribe('showMessage', (config: EventConfig | string) => this.showMessage(config)));

    this.snackQueue = new Subject<EventConfig>();
    /**
     * snack configs added to the snackQueue will show up here, generating a new queue
     * of observables whose values don't resolve until they are observed (hah! Schrodinger observables!)
     */
    const that = this;
    this.snackQueue.concatMap((config: EventConfig) => {
      return Observable.fromPromise(new Promise(function(resolve) {
        // with timeout, give a cleaner buffer in between consecutive snacks
        setTimeout(() => {
          const snackBarConfig = that.getISnackBarConfig(config);
          snackBarConfig.onClose = resolve;
          const $snackbar = ($ as any).snackbar(snackBarConfig);
          // for actions, but this means you can put binding code in the message too,
          // where the config is the bindingContext
          that.aureliaHelperService.enhanceElement($snackbar[0], config);
        }, 200);
      }));
    })
      // this will initiate the execution of the promises
      // each promise is executed after the previous one has resolved
      .subscribe();
  }

  /* shouldn't actually ever happen */
  public dispose() {
    this.subscriptions.dispose();
  }

  private showMessage(config: EventConfig | string) {
    this.serveSnack(config);
  }

  private handleSuccess(config: EventConfig | string) {
    this.serveSnack(config);
  }

  private handleWarning(config: EventConfig | string) {
    this.serveSnack(config);
  }

  private handleTransaction(config: EventConfigTransaction) {
    this.serveSnack(config);
  }

  private completeConfig(config: EventConfig | string, defaults: any = {}): EventConfig {
    if (typeof config === 'string') {
      config = { message: config as string } as EventConfig;
    }

    return Object.assign({ style: 'snack-info', duration: 3000, actionType: ActionType.none },
      defaults, config);
  }

  private getISnackBarConfig(config: EventConfig): ISnackBarConfig {
    return {
      content: this.formatContent(config),
      htmlAllowed: true,
      style: config.style,
      timeout: config.duration,
    };
  }

  private formatContent(config: EventConfig) {
    const templateMessage = `<span class="snackbar-message-text">${config.message}</span>`;
    let templateAction = '';
    let text;
    switch (config.actionType) {
      case ActionType.address:
        text = config.actionText || config.address;
        templateAction =
          `<span class="snackbar-action-wrapper"><etherscanlink address=
        "${config.address}" text="${text}" type="${config.addressType || 'address'}"></etherscanlink></span>`;
        break;
      case ActionType.button:
        templateAction =
          `<span class="snackbar-action-wrapper"><button type="button" class="btn" click.delegate='action()'>
        ${config.actionText}</button></span>`;
        break;
    }
    return `${templateMessage}${templateAction}`;
  }

  private serveSnack(config: EventConfig | string, defaults: any = {}) {
    const completeConfig = this.completeConfig(config, defaults);

    /**
     * duration < 0 suppresses the snack
     */
    if (completeConfig.duration >= 0) {
      this.snackQueue.next(completeConfig);
    }
  }
}

interface ISnackBarConfig {
  content: string;
  style: string;
  timeout: number;
  htmlAllowed: boolean;
  onClose?: () => void;
}
