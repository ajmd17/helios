import { isString, wrapArray } from "../../shared";
import { BasicObject } from "../core/BasicObject";
import { Matrix4 } from "../math/Matrix4";
import { IRenderable } from "../rendering/IRenderable";
import { Renderer } from "../rendering/Renderer";
import { Shader } from "../rendering/Shader";
import { TextureCube } from "../rendering/Texture";
import { BuiltinShaderName, ShaderFactory } from "../util/ShaderFactory";
import { Camera } from "./Camera";
import { Entity } from "./Entity";
import { EntityGroup } from "./EntityGroup";
import { Light } from "./Light";

export class Scene extends BasicObject implements IRenderable {
  camera: Camera = new Camera();

  private _lights: Light[] = [];
  private _entityGroups: EntityGroup[] = [];

  private _environmentMap: TextureCube = null;

  public get environmentMap(): TextureCube {
    return this._environmentMap;
  }

  public set environmentMap(environmentMap: TextureCube) {
    if (this._environmentMap && this.isInitialized) {
      this._environmentMap.destroy();
    }

    this._environmentMap = environmentMap;

    if (this.isInitialized) {
      this._environmentMap.init(this.gl);
    }
  }

  public get lights() {
    return this._lights;
  }

  public addLight(light: Light) {
    this._lights.push(light);

    if (this.isInitialized) {
      light.init(this.gl);
    }
  }

  public getLight(name: string) {
    for (let light of this._lights) {
      if (light.name === name) {
        return light;
      }
    }

    return null;
  }

  public removeLight(light: Light | string) {
    if (isString(light)) {
      light = this.getLight(light);
    }

    if (!light) {
      return;
    }

    const index = this._lights.indexOf(light);

    if (index > -1) {
      if (this.isInitialized) {
        light.destroy();
      }

      this._lights.splice(index, 1);
    }
  }

  public getEntity(name: string) {
    for (let entityGroup of this._entityGroups) {
      for (let entity of entityGroup.entities) {
        if (entity.name === name) {
          return entity;
        }
      }
    }

    return null;
  }

  public getEntityGroup(shader: Shader | BuiltinShaderName): EntityGroup {
    const shaderName = shader instanceof Shader
      ? shader.name
      : shader;

    for (let entityGroup of this._entityGroups) {
      if (entityGroup.shader.name === shaderName) {
        return entityGroup;
      }
    }

    return null;
  }

  public update(delta: number, camera: Camera, parentTransform?: Matrix4) {
    this.camera.update(delta, camera, parentTransform);

    for (let entityGroup of this._entityGroups) {
      entityGroup.update(delta, camera, parentTransform);
    }
  }

  public addEntity(entityOrEntities: Entity | Entity[], shaderOrName: Shader | BuiltinShaderName = 'basic', stage?: number) {
    const entities = wrapArray(entityOrEntities);

    let entityGroup = this.getEntityGroup(shaderOrName);

    if (!entityGroup || (typeof stage === 'number' && entityGroup.stage !== stage)) {
      const shader = shaderOrName instanceof Shader
        ? shaderOrName
        : ShaderFactory.instance.getShader(shaderOrName);

      entityGroup = new EntityGroup(shader, stage ?? 0);
      entityGroup.scene = this;

      if (this.isInitialized) {
        entityGroup.init(this.gl);
      }

      this._entityGroups.push(entityGroup);

      // Lower numbers first
      this._entityGroups.sort((a, b) => {
        return a.stage - b.stage;
      });
    }

    for (const entity of entities) {
      entityGroup.addEntity(entity);
    }
  }

  protected onInit() {
    this.camera.init(this.gl);

    for (let entityGroup of this._entityGroups) {
      entityGroup.init(this.gl);
    }

    for (let light of this._lights) {
      light.init(this.gl);
    }

    if (this._environmentMap) {
      this._environmentMap.init(this.gl);
    }
  }

  protected onDestroy() {
    this.camera.destroy();

    for (let entityGroup of this._entityGroups) {
      entityGroup.destroy();
      entityGroup.scene = null;
    }

    for (let light of this._lights) {
      light.destroy();
    }

    if (this._environmentMap) {
      this._environmentMap.destroy();
    }
  }

  public render(camera: Camera, parentTransform?: Matrix4, minStage: number = 0, maxStage: number = 10, useFramebuffer = true, clear = true) {
    if (useFramebuffer) {
      this.camera.framebuffer.bind();

      // Clear with white so that our packed depth texture is 1.0 (far clip)
      if (clear) {
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
      }
    }

    for (let entityGroup of this._entityGroups) {
      if (entityGroup.stage < minStage) {
        continue;
      }

      if (maxStage >= 0 && entityGroup.stage >= maxStage) {
        continue;
      }

      const shader = entityGroup.shader;

      if (!shader) {
        continue;
      }

      if (shader.hasLighting) {
        const numLights = Math.min(this._lights.length, Renderer.MAX_BOUND_LIGHTS);

        for (let index = 0; index < numLights; index++) {
          this._lights[index].bind(shader, index);
        }

        shader.setUniform('u_numLights', new Int32Array([numLights]));
      }

      shader.setUniform('u_cameraPosition', [this.camera.translation.x, this.camera.translation.y, this.camera.translation.z]);
      shader.setUniform('u_viewMatrix', this.camera.viewMatrix);
      shader.setUniform('u_projectionMatrix', this.camera.projectionMatrix);
      shader.setUniform('u_viewProjectionMatrix', this.camera.viewProjectionMatrix);
      shader.setUniform('u_resolution', [this.camera.canvasWidth, this.camera.canvasHeight]);

      entityGroup.render(this.camera, parentTransform);
    }

    if (useFramebuffer) {
      this.camera.framebuffer.unbind();
    }
  }
}