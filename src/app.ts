import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';
import { Router, RouterConfiguration } from 'aurelia-router';
import { BindingSignaler } from 'aurelia-templating-resources';
import '../static/styles.scss';

@autoinject
export class App {

  /**
   * public for tests
   */
  public router: Router;

  private intervalId: any;

  constructor(
    private signaler: BindingSignaler,
    private eventAggregator: EventAggregator
  ) {
  }

  public attached() {
    ($('body') as any)
      .bootstrapMaterialDesign({ global: { label: { className: 'bmd-label-floating' } } });

  }

  private configureRouter(config: RouterConfiguration, router: Router) {

    config.title = 'dxDAO';
    config.options.pushState = true;
    config.options.root = '/';
    config.map([
      {
        moduleId: PLATFORM.moduleName('./landing'),
        name: 'landing',
        nav: false,
        route: ['', '/', 'landing', 'home'],
        title: '',
      },
    ]);

    config.fallbackRoute('');

    this.router = router;
  }
}
