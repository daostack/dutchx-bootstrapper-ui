import { bindable, bindingMode, customElement } from 'aurelia-framework';
import { WalletService } from 'services/walletService';

@customElement('metamaskfeedback')
export class MetamaskFeedback {
  @bindable({ defaultBindingMode: bindingMode.toView }) public icononly: boolean = false;

  constructor(private walletService: WalletService) { }
}
