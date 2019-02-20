import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode } from 'aurelia-framework';
import { Address } from 'services/ArcService';
import { Web3Service } from 'services/Web3Service';

@autoinject
export class Header {

  @bindable({ defaultBindingMode: bindingMode.toView }) public network;

  private connected: boolean;
  private collapsePanel: HTMLElement;
  private collapsed: boolean = true;
  private collapseButtonVisible: boolean = false;

  constructor(
    eventAggregator: EventAggregator,
    private web3Service: Web3Service
  ) {
    this.initialize();
    eventAggregator.subscribe('Network.Changed.Id', () => { this.initialize(); });
  }

  private initialize() {
    this.connected = this.web3Service.isConnected;
    this.windowResized();
    $(window).resize(() => this.windowResized());
  }

  private windowResized() {
    const button = $('.header #collapseButton');
    this.collapseButtonVisible = button.is(':visible');
    const panel = $(this.collapsePanel);
    const showing = panel.hasClass('show');
    if (showing) {
      panel.collapse('hide');
      setTimeout(() => { this.collapsed = true; }, 100);
    }
  }

  private collapse() {
    const panel = $(this.collapsePanel);
    const hide = panel.hasClass('show');
    if (!hide) {
      this.collapsed = hide;
    } else {
      setTimeout(() => { this.collapsed = hide; }, 100);
    }
    return true;
  }
}
