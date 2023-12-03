import { Controller } from "./Controller";

export abstract class BasicController extends Controller {
  public onAdded() {
    console.log(`Added controller ${this.constructor.name} to ${this.parent.name}`);
  }

  public onRemoved() {
    console.log(`Removed controller ${this.constructor.name} from ${this.parent.name}`);
  }
}