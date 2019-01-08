import { CssAnimator } from 'aurelia-animator-css';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, containerless } from 'aurelia-framework';
import { EventConfig, EventConfigException, EventConfigTransaction, EventMessageType } from 'entities/GeneralEvents';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { fnVoid } from 'services/ArcService';
import { AureliaHelperService } from 'services/AureliaHelperService';
import { DisposableCollection } from 'services/DisposableCollection';

@containerless
@autoinject
export class Banner {

  private resolveToClose: fnVoid;
  private okButton: HTMLElement;
  private showing: boolean = false;
  private banner: HTMLElement;
  private elMessage: HTMLElement;
  private subscriptions: DisposableCollection = new DisposableCollection();
  private queue: Subject<IBannerConfig >;
  private etherScanTooltipConfig = {
    placement: 'bottom',
    title: 'Click to go to etherscan.io transaction information page',
    toggle: 'tooltip',
    trigger: 'hover',
  };

  constructor(
      eventAggregator: EventAggregator
    , private animator: CssAnimator
    , private aureliaHelperService: AureliaHelperService
  ) {
    this.subscriptions.push(eventAggregator
      .subscribe('handleTransaction', (config: EventConfigException | any) => this.handleTransaction(config)));
    this.subscriptions.push(eventAggregator
      .subscribe('handleException', (config: EventConfigException | any) => this.handleException(config)));
    this.subscriptions.push(eventAggregator
      .subscribe('handleFailure', (config: EventConfig | string) => this.handleFailure(config)));

    this.queue = new Subject<IBannerConfig >();
    /**
     * messages added to the queue will show up here, generating a new queue
     * of observables whose values don't resolve until they are observed
     */
    const that = this;
    this.queue.concatMap((config: IBannerConfig ) => {
      return Observable.fromPromise(new Promise(function(resolve: fnVoid) {
        // with timeout, give a cleaner buffer in between consecutive snacks
        setTimeout(async () => {
          that.resolveToClose = resolve;
          // fire up this banner
          $(that.elMessage).html(config.message);
          switch (config.type) {
            case EventMessageType.Info:
              $(that.banner).addClass('info');
              $(that.banner).removeClass('failure');
              break;
            default:
              $(that.banner).addClass('failure');
              $(that.banner).removeClass('info');
              break;
          }
          that.aureliaHelperService.enhanceElement(that.elMessage, that, true);
          that.showing = true;
          that.animator.enter(that.banner);
        }, 200);
      }));
    })
      // this will initiate the execution of the promises
      // each promise is executed after the previous one has resolved
      .subscribe();
  }

  public attached() {
    // attach-focus doesn't work
    $(this.okButton).focus();
  }

  public dispose() {
    this.subscriptions.dispose();
  }

  private async close() {
    await this.animator.leave(this.banner);
    this.showing = false;
    this.resolveToClose();
  }

  private handleException(config: EventConfigException | any) {
    if (!(config instanceof EventConfigException)) {
      // then config is the exception itself
      const ex = config as any;
      config = { message: `${ex.message ? ex.message : ex}` } as any;
    }

    this.queueEventConfig({ message: config.message, type: EventMessageType.Exception });
  }

  private handleTransaction(config: EventConfigTransaction) {
    // tslint:disable-next-line:max-line-length
    const message = `${config.message}<etherscanlink address="${config.address}" text="${config.actionText || config.address}" type="${config.addressType || 'address'}" tooltip.bind="etherScanTooltipConfig"></etherscanlink>`;
    this.queueEventConfig({ message, type: EventMessageType.Info });
  }

  private handleFailure(config: EventConfig | string) {
    const bannerConfig = { message: (typeof config === 'string')
    ? config as string : config.message, type: EventMessageType.Failure };
    this.queueEventConfig(bannerConfig);
  }

  private queueEventConfig(config: IBannerConfig ) {
    this.queue.next(config);
  }
}

interface IBannerConfig  {
  type: EventMessageType;
  message: string;
}
