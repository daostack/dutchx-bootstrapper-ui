import { autoinject, containerless } from 'aurelia-framework';
import { EventConfig, EventConfigException } from 'entities/GeneralEvents';
import { EventAggregator } from 'aurelia-event-aggregator';
import { DisposableCollection } from 'services/DisposableCollection';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { fnVoid } from 'services/ArcService';
import { CssAnimator } from 'aurelia-animator-css';

@containerless
@autoinject
export class Banner {

  message: string = null;
  resolveToClose: fnVoid;
  okButton: HTMLElement;
  banner: HTMLElement;
  subscriptions: DisposableCollection = new DisposableCollection();
  queue: Subject<string>;

  constructor(
    eventAggregator: EventAggregator,
    private animator: CssAnimator
  ) {
    this.subscriptions.push(eventAggregator.subscribe("handleException", (config: EventConfigException | any) => this.handleException(config)));
    this.subscriptions.push(eventAggregator.subscribe("handleFailure", (config: EventConfig | string) => this.handleFailure(config)));

    this.queue = new Subject<string>();
    /**
     * messages added to the queue will show up here, generating a new queue
     * of observables whose values don't resolve until they are observed
     */
    let that = this;
    this.queue.concatMap((message: string) => {
      return Observable.fromPromise(new Promise(function (resolve: fnVoid) {
        // with timeout, give a cleaner buffer in between consecutive snacks
        setTimeout(async () => {
          that.resolveToClose = resolve;
          // fire up this banner
          that.message = message;
          that.animator.enter(that.banner);
        }, 200);
      }));
    })
      // this will initiate the execution of the promises
      // each promise is executed after the previous one has resolved
      .subscribe();
  }

  dispose() {
    this.subscriptions.dispose();
  }

  attached() {
    // attach-focus doesn't work
    $(this.okButton).focus();
  }

  async close() {
    await this.animator.leave(this.banner);
    this.message = null;
    this.resolveToClose();
  }

  public handleException(config: EventConfigException | any) {
    if (!(config instanceof EventConfigException)) {
      // then config is the exception itself
      let ex = config as any;
      config = { message: `${ex.message ? ex.message : ex}` } as any;
    }

    this.queueEventConfig(config);
  }


  handleFailure(config: EventConfig | string) {
    this.queueEventConfig(config);
  }

  queueEventConfig(config: EventConfig | string) {
    const message = (typeof config === "string") ? <string>config : (<EventConfig>config).message;
    this.queue.next(message);
  }
}
