import { Container } from 'aurelia-dependency-injection';
import { autoinject, BindingEngine, TemplatingEngine, transient } from 'aurelia-framework';

@autoinject
export class AureliaHelperService {

  constructor(
    public container: Container,
    private templatingEngine: TemplatingEngine
  ) {

  }

  /**
   * bind the html element located by the path given by elementSelector.
   * @param elementSelector
   * @param bindingContext -- The viewmodel against which the binding should run
   */
  public enhance(elementSelector: string, bindingContext: any): void {
    const el = document.querySelector(elementSelector);
    this.enhanceElement(el, bindingContext);

  }

  public enhanceElement(el: Element, bindingContext: any, reEnhance: boolean = false): void {
    if (el) {
      if (reEnhance) {
        $(el).removeClass('au-target');
      }
      this.templatingEngine.enhance({ element: el, bindingContext });
    }
  }
}
