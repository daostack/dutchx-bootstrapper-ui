import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { LogManager } from 'aurelia-framework';
import { EventConfig, EventConfigException } from '../entities/GeneralEvents';
import { DisposableCollection } from './DisposableCollection';

@autoinject
export class ConsoleLogService {

  // probably doesn't really need to be a disposable collection since this is a singleton service
  private subscriptions: DisposableCollection = new DisposableCollection();
  private logger = LogManager.getLogger('DxBootStrapper');

  constructor(
    eventAggregator: EventAggregator
  ) {
    this.subscriptions.push(eventAggregator
                           .subscribe('handleException',
                                      (config: EventConfigException | any) => this.handleException(config)));
    this.subscriptions.push(eventAggregator
                           .subscribe('handleSuccess', (config: EventConfig | string) => this.handleSuccess(config)));
    this.subscriptions.push(eventAggregator
                           .subscribe('handleTransaction',
                            (config: EventConfig | string) => this.handleSuccess(config)));
    this.subscriptions.push(eventAggregator
                           .subscribe('handleWarning', (config: EventConfig | string) => this.handleWarning(config)));
    this.subscriptions.push(eventAggregator
                           .subscribe('handleFailure', (config: EventConfig | string) => this.handleFailure(config)));
  }

  /* shouldn't actually ever happen */
  public dispose() {
    this.subscriptions.dispose();
  }

  private handleSuccess(config: EventConfig | string) {
    this.logger.debug(this.getMessage(config));
  }

  private handleException(config: EventConfigException | any) {
    let message;
    let ex;
    if (!(config instanceof EventConfigException)) {
      ex = config as any;
      message = `${ex.message ? ex.message : ex}`;
    } else {
      config = config as EventConfigException;
      ex = config.exception;
      message = config.message;
    }

    this.logger.error(`${message}${ex.stack ? `\n${ex.stack}` : ''}`);
  }

  private handleFailure(config: EventConfig | string) {
    this.logger.error(this.getMessage(config));
  }

  private handleWarning(config: EventConfig | string) {
    this.logger.debug(this.getMessage(config));
  }

  private getMessage(config: EventConfig | string): string {
    return (typeof config === 'string') ? config : config.message;
  }
}
