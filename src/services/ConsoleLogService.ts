import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { LogManager } from 'aurelia-framework';
import { EventConfig, EventConfigException, EventConfigTransaction, EventMessageType } from '../entities/GeneralEvents';
import { DisposableCollection } from './DisposableCollection';

@autoinject
export class ConsoleLogService {

  // probably doesn't really need to be a disposable collection since this is a singleton service
  private subscriptions: DisposableCollection = new DisposableCollection();
  private logger = LogManager.getLogger('dxDAO Bootstrapper');

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
        (config: EventConfigTransaction | string) => this.handleTransaction(config)));
    this.subscriptions.push(eventAggregator
      .subscribe('handleWarning', (config: EventConfig | string) => this.handleWarning(config)));
    this.subscriptions.push(eventAggregator
      .subscribe('handleFailure', (config: EventConfig | string) => this.handleFailure(config)));
    this.subscriptions.push(eventAggregator
      .subscribe('handleMessage', (config: EventConfig | string) => this.handleMessage(config)));
  }

  /* shouldn't actually ever happen */
  public dispose() {
    this.subscriptions.dispose();
  }

  private handleSuccess(config: EventConfig | string) {
    this.logger.debug(this.getMessage(config));
  }

  private handleTransaction(config: EventConfigTransaction | string) {
    if (typeof config === 'string') {
      this.logger.debug(config);
    } else {
      this.logger.debug(`${config.message}: ${config.address}`);
    }
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

  private handleMessage(config: EventConfig | string) {
    if (typeof config === 'string') {
      this.logger.info(this.getMessage(config));
    } else {
      switch (config.type) {
        case EventMessageType.Info:
          this.logger.info(this.getMessage(config));
          break;
        case EventMessageType.Warning:
          this.logger.warn(this.getMessage(config));
          break;
        case EventMessageType.Failure:
        case EventMessageType.Exception:
          this.logger.error(this.getMessage(config));
          break;
        case EventMessageType.Debug:
          this.logger.debug(this.getMessage(config));
          break;
      }
    }
  }

  private getMessage(config: EventConfig | string): string {
    return (typeof config === 'string') ? config : config.message;
  }
}
