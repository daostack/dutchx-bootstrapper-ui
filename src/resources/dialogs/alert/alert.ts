import { autoinject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';
// import { AureliaConfiguration } from 'aurelia-configuration';

@autoinject
export class Alert {

  model: AlertModel;

  constructor(private controller: DialogController) { }

  activate(model: AlertModel) {
    this.model = model;
  }
}

interface AlertModel {
  message: string;
}
