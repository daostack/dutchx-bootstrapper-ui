declare module 'system' {
  import * as Aurelia from 'aurelia-framework';

  /*
   * List your dynamically imported modules to get typing support
   */
  interface ISystem {
    import(name: string): Promise<any>;
    import(name: 'aurelia-framework'): Promise<typeof Aurelia>;
  }

  global {
    var system: ISystem;
  }
}
