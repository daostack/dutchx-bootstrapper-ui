import { autoinject, bindable, customAttribute } from 'aurelia-framework';
import { Router } from 'aurelia-router';

@customAttribute('click-to-route')
@autoinject
export class ClickToRoute {

  @bindable({ primaryProperty: true }) public route: string;
  @bindable public params?: Object;

  constructor(private element: Element, private router: Router) {
  }

  public attached() {
    this.element.addEventListener('click', () => {
      this.router.navigateToRoute(this.route, this.params);
    });
  }
}
