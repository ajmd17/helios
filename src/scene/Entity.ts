import { BasicObject } from "../core/BasicObject";
import { Matrix4 } from "../math/Matrix4";
import { Quaternion } from "../math/Quaternion";
import { Vector3 } from "../math/Vector3";
import { IRenderable } from "../rendering/IRenderable";
import { Material } from "../rendering/Material";
import { Mesh } from "../rendering/Mesh";
import { Camera } from "./Camera";
import { Controller } from "./Controller";
import { Scene } from "./Scene";

export class Entity extends BasicObject implements IRenderable {
  private _modelMatrix: Matrix4 = Matrix4.identity();
  private _mesh: Mesh = null;
  private _material: Material = null;
  private _controllers: Controller[] = [];
  private _customRenderer: IRenderable = null;
  private _scene: Scene = null;

  public translation: Vector3 = Vector3.zero();
  public rotation: Quaternion = Quaternion.identity();
  public scale: Vector3 = Vector3.one();

  constructor(name?: string, mesh: Mesh = null, material: Material = null) {
    super(name);

    this._mesh = mesh;
    this._material = material;
  }

  public get scene() {
    return this._scene;
  }

  public set scene(scene: Scene) {
    this._scene = scene;

    for (let controller of this._controllers) {
      controller.scene = scene;
    }
  }

  public get mesh() {
    return this._mesh;
  }

  public set mesh(mesh: Mesh) {
    if (this._mesh && this._mesh != mesh) {
      this._mesh.destroy();

      this._mesh = null;
    }

    this._mesh = mesh;

    if (mesh) {
      if (this.isInitialized) {
        this._mesh.init(this.gl);
      }
    }
  }

  public get material() {
    return this._material;
  }

  public set material(material: Material) {
    if (this._material && this._material != material) {
      this._material.destroy();

      this._material = null;
    }

    this._material = material;

    if (material) {
      if (this.isInitialized) {
        this._material.init(this.gl);
      }
    }
  }

  public get modelMatrix(): Matrix4 {
    return this._modelMatrix;
  }

  public get customRenderer(): IRenderable {
    return this._customRenderer;
  }

  public set customRenderer(renderer: IRenderable) {
    if (this._customRenderer === renderer) {
      return;
    }

    if (this._customRenderer && this.isInitialized) {
      this._customRenderer.destroy();
    }

    this._customRenderer = renderer;

    if (this._customRenderer && this.isInitialized) {
      this._customRenderer.init(this.gl);
    }
  }

  public addController(controller: Controller) {
    controller.parent = this;
    controller.scene = this._scene;
    controller.onAdded();

    this._controllers.push(controller);
  }

  public removeController(controller: Controller) {
    let index = this._controllers.indexOf(controller);

    if (index > -1) {
      const controller = this._controllers[index];
      controller.onRemoved();

      controller.parent = null;
      controller.scene = null;

      this._controllers.splice(index, 1);
    }
  }

  protected onInit() {
    if (this._mesh) {
      this._mesh.init(this.gl);
    }

    if (this._material) {
      this._material.init(this.gl);
    }

    if (this._customRenderer) {
      this._customRenderer.init(this.gl);
    }
  }

  protected onDestroy() {
    if (this._customRenderer) {
      this._customRenderer.destroy();
    }

    if (this._mesh) {
      this._mesh.destroy();
    }

    if (this._material) {
      this._material.destroy();
    }
  }

  public render(camera: Camera, parentTransform?: Matrix4) {
    parentTransform = parentTransform
      ? Matrix4.multiply(parentTransform, this._modelMatrix)
      : this._modelMatrix;

    if (this._customRenderer) {
      this._customRenderer.render(camera, parentTransform);

      return;
    }

    if (!this._mesh) {
      return;
    }

    this._mesh.render(camera, parentTransform);
  }

  public update(delta: number, camera: Camera, parentTransform?: Matrix4) {
    for (let controller of this._controllers) {
      controller.update(delta);
    }

    this._modelMatrix = Matrix4.translation(this.translation);
    this._modelMatrix = Matrix4.multiply(this._modelMatrix, Matrix4.rotation(this.rotation));
    this._modelMatrix = Matrix4.multiply(this._modelMatrix, Matrix4.scaling(this.scale));

    if (this._customRenderer && this._customRenderer.update) {
      parentTransform = parentTransform
        ? Matrix4.multiply(parentTransform, this._modelMatrix)
        : this._modelMatrix;
  
      this._customRenderer.update(delta, camera, parentTransform);
    }
  }
}