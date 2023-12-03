export abstract class BasicObject {
  private _isInitialized: boolean = false;
  private _refCount: number = 0;
  protected _context: WebGL2RenderingContext = null;
  private _name: string = null;

  constructor(name?: string) {
    this._name = name ?? 'Unnamed';
  }

  public get name(): string {
    return this._name;
  }

  // public set name(value: string) {
  //   this._name = value;
  // }

  protected get isInitialized(): boolean {
    return this._isInitialized;
  }

  protected get gl() {
    return this._context;
  }

  public init(context: WebGL2RenderingContext): void {
    this._refCount++;

    if (this._isInitialized) {
      return;
    }

    if (!context) {
      throw new Error('Context not found');
    }

    this._context = context;

    this.onInit();
    
    this._isInitialized = true;
  }

  public destroy(): void {
    if (this._refCount <= 0) {
      throw new Error('Invalid ref count!');
    }

    this._refCount--;

    if (this._refCount > 0) {
      return;
    }

    if (!this._isInitialized) {
      return;
    }

    this.onDestroy();

    this._isInitialized = false;
    this._context = null;
  }

  protected abstract onInit();
  protected abstract onDestroy();
}