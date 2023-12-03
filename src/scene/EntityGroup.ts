import { BasicObject } from "../core/BasicObject";
import { Matrix4 } from "../math/Matrix4";
import { IRenderable } from "../rendering/IRenderable";
import { Renderer } from "../rendering/Renderer";
import { Shader } from "../rendering/Shader";
import { Camera } from "./Camera";
import { Entity } from "./Entity";
import { Scene } from "./Scene";

export class EntityGroup extends BasicObject implements IRenderable {
  private _entities: Entity[] = [];
  private _shader: Shader = null;
  private _stage: number = 0;
  private _scene: Scene = null;

  constructor(shader: Shader = null, stage: number = 0) {
    super();

    this._shader = shader;
    this._stage = stage;
  }

  get entities() {
    return this._entities;
  }

  get shader() {
    return this._shader;
  }

  set shader(shader: Shader) {
    if (this._shader && this._shader != shader) {
      this._shader.destroy();

      this._shader = null;
    }

    this._shader = shader;

    if (this._shader) {
      if (this.isInitialized) {
        this._shader.init(this.gl);
      }
    }
  }

  get stage() {
    return this._stage;
  }

  get scene() {
    return this._scene;
  }

  set scene(scene: Scene) {
    this._scene = scene;

    for (let entity of this._entities) {
      entity.scene = scene;
    }
  }

  protected onInit() {
    if (this._shader) {
      this._shader.init(this.gl);
    }

    for (let entity of this._entities) {
      entity.init(this.gl);
    }
  }

  protected onDestroy() {
    if (this._shader) {
      this._shader.destroy();
    }

    for (let entity of this._entities) {
      entity.destroy();
      entity.scene = null;
    }
  }

  public update(delta: number, camera: Camera, parentTransform?: Matrix4) {
    for (let entity of this._entities) {
      entity.update(delta, camera, parentTransform);
    }
  }

  public render(camera: Camera, parentTransform?: Matrix4) {
    if (!this._shader) {
      return;
    }

    this._shader.setUniform('u_modelMatrix', Matrix4.identity());
    this._shader.use();

    let depthWrite: boolean;
    let depthTest: boolean;

    for (let entity of this._entities) {
      let hasDiffuseMap = false;

      this._shader.setUniform('u_modelMatrix', entity.modelMatrix);
      
      let textureOffset = 0;

      if (entity.material) {
        const material = entity.material;

        if (material.depthWrite !== depthWrite) {
          depthWrite = material.depthWrite;

          this.gl.depthMask(depthWrite);
        }

        if (material.depthTest !== depthTest) {
          depthTest = material.depthTest;

          if (depthTest) {
            this.gl.enable(this.gl.DEPTH_TEST);
          } else {
            this.gl.disable(this.gl.DEPTH_TEST);
          }
        }

        for (let [name, texture] of material.textures) {
          if (textureOffset >= Renderer.MAX_BOUND_TEXTURES) {
            break;
          }

          if (!texture) {
            continue;
          }

          if (!texture.isLoaded) {
            continue;
          }

          if (name === 'diffuseMap') {
            hasDiffuseMap = true;
          }

          const textureSlot = textureOffset++;

          texture.bind(textureSlot);

          this._shader.setUniform(`u_${name}`, new Int32Array([textureSlot]));
        }

        material.bind(this._shader);
      }

      if (textureOffset < Renderer.MAX_BOUND_TEXTURES && this._scene.environmentMap) {
        const textureSlot = textureOffset++;

        this._scene.environmentMap.bind(textureSlot);
        this._shader.setUniform('u_environmentMap', new Int32Array([textureSlot]));
      }

      let flags = 0;

      if (hasDiffuseMap) {
        flags |= 1;
      }

      this._shader.setUniform('u_flags', new Int32Array([flags]));
      this._shader.updateUniforms();
      
      entity.render(camera, parentTransform);
    }

    this.gl.depthMask(true);
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  addEntity(entity: Entity) {
    if (this._entities.indexOf(entity) > -1) {
      return;
    }

    this._entities.push(entity);

    entity.scene = this._scene;

    if (this.isInitialized) {
      entity.init(this.gl);
    }
  }
}