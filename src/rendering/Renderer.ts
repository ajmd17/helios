import { ModelLoader } from '../loaders/ModelLoader';
import { Matrix4 } from '../math/Matrix4';
import { Quaternion } from '../math/Quaternion';
import { Vector3 } from '../math/Vector3';
import { Entity } from '../scene/Entity';
import { FirstPersonCameraController } from '../scene/FirstPersonCameraController';
import { Light, LightType } from '../scene/Light';
import { Scene } from '../scene/Scene';
import { SkyboxController } from '../scene/SkyboxController';
import { MeshFactory } from '../util/MeshFactory';
import { ShaderFactory } from '../util/ShaderFactory';
import { Framebuffer } from './Framebuffer';
import { GaussianSplattingInstance, GaussianSplattingRenderer } from './GaussianSplattingRenderer';
import { Material } from './Material';
import { Mesh } from './Mesh';
import { Shader } from './Shader';
import { Texture, TextureCube } from './Texture';

export class Renderer {
  public static readonly MAX_BOUND_LIGHTS = 16;
  public static readonly MAX_BOUND_TEXTURES = 16;

  private _canvas: HTMLCanvasElement;
  private _context: WebGL2RenderingContext;

  private _parentElement: HTMLElement;

  private _scene: Scene;

  private _quad: Mesh = null;
  private _blitShader: Shader = null;
  private _fxaaShader: Shader = null;
  private _lowResDepthFramebuffer: Framebuffer = null;
  private _pixelBufferDepth: Uint8Array = null;
  private _pixelBufferNormals: Uint8Array = null;

  private _gaussianSplattingRenderer: GaussianSplattingRenderer = new GaussianSplattingRenderer();

  private _lastTime: number = 0;
  
  private _animationFrameId: number = 0;

  constructor(parentElement?: HTMLElement) {
    this._parentElement = parentElement ?? null;

    this._scene = new Scene();
  }

  public get scene(): Scene {
    return this._scene;
  }

  async init() {
    if (!this._parentElement) {
      throw new Error('Parent element not found');
    }

    this._canvas = this._parentElement.querySelector('canvas');

    this._parentElement.addEventListener('resize', this._onResize);
    this._parentElement.addEventListener('keydown', this._handleKeyboardEvent, { passive: true, capture: true });
    this._parentElement.addEventListener('keyup', this._handleKeyboardEvent, { passive: true, capture: true });

    if (!this._canvas) {
      this._canvas = document.createElement('canvas');

      this._canvas.addEventListener('click', (event) => this._scene.camera.onMouseEvent(event));
      this._canvas.addEventListener('mousemove', (event) => this._scene.camera.onMouseEvent(event));
      this._canvas.addEventListener('mousedown', (event) => this._scene.camera.onMouseEvent(event));
      this._canvas.addEventListener('mouseup', (event) => this._scene.camera.onMouseEvent(event));
      this._canvas.addEventListener('mouseleave', (event) => this._scene.camera.onMouseEvent(event));
      this._canvas.addEventListener('mouseenter', (event) => this._scene.camera.onMouseEvent(event));
      this._canvas.addEventListener('touchmove', (event) => this._scene.camera.onTouchEvent(event));
      this._canvas.addEventListener('touchstart', (event) => this._scene.camera.onTouchEvent(event));
      this._canvas.addEventListener('touchend', (event) => this._scene.camera.onTouchEvent(event));
      
      this._parentElement.appendChild(this._canvas);

      this._canvas.focus();
    }

    this._canvas.width = this._parentElement.clientWidth;
    this._canvas.height = this._parentElement.clientHeight;

    this._context = this._canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true });

    const maxBoundTextureUnits = this._context.getParameter(this._context.MAX_TEXTURE_IMAGE_UNITS);

    if (maxBoundTextureUnits < Renderer.MAX_BOUND_TEXTURES) {
      throw new Error(`Max bound textures (${maxBoundTextureUnits}) is less than required (${Renderer.MAX_BOUND_TEXTURES})`);
    }

    this._scene.init(this._context);

    const sun = new Light('sun', LightType.DIRECTIONAL);
    sun.direction = Vector3.normalize(new Vector3(0.0, 1.0, 0.35));
    this._scene.addLight(sun);

    const firstPersonCameraController = new FirstPersonCameraController();
    firstPersonCameraController.onClickEvent = () => {
      const currentCameraController = this._scene.camera.currentCameraController;
      const [worldPosition, normal] = this._rayPick(currentCameraController.mousePosition[0], currentCameraController.mousePosition[1]);

      if (worldPosition && normal) {
        const cameraDirection = Vector3.normalize(this._scene.camera.direction);

        const moveDirection = Vector3.normalize(Vector3.subtract(worldPosition, this._scene.camera.translation));
        let newMoveTarget = worldPosition;//Vector3.subtract(worldPosition, Vector3.scale(moveDirection, 1.0));
        console.log('set move target', newMoveTarget);
        
        // Must be within 50 units
        const maxDistance = 50.0;

        if (Vector3.distance(newMoveTarget, this._scene.camera.translation) >= maxDistance) {
          newMoveTarget = Vector3.add(this._scene.camera.translation, Vector3.scale(moveDirection, maxDistance));
        }
        
        // Must be looking at the same direction
        if (Vector3.dot(moveDirection, cameraDirection) > 0.0) {
          return;
        }

        this._scene.camera.moveTarget = newMoveTarget;
      }
    };

    // firstPersonCameraController.onClick = () => {
    //   const [worldPosition, normal] = this._rayPick(firstPersonCameraController.mousePosition[0], firstPersonCameraController.mousePosition[1]);

    //   if (worldPosition && normal) {
    //     this._scene.camera.translation = worldPosition;
    //   }
    // };

    this._scene.camera.addCameraController(firstPersonCameraController);
    this._scene.camera.setDimensions(this._canvas.width, this._canvas.height);

    this._scene.environmentMap = new TextureCube([
      '/images/skybox/meadow/posx.jpg',
      '/images/skybox/meadow/negx.jpg',
      '/images/skybox/meadow/posy.jpg',
      '/images/skybox/meadow/negy.jpg',
      '/images/skybox/meadow/posz.jpg',
      '/images/skybox/meadow/negz.jpg'
    ]);
    this._scene.environmentMap.init(this._context);

    // Init depth write / test
    this._context.enable(this._context.DEPTH_TEST);
    this._context.depthFunc(this._context.LESS);
    this._context.depthMask(true);

    this._quad = MeshFactory.instance.quad();
    this._quad.init(this._context);
    
    this._blitShader = ShaderFactory.instance.getShader('blit');
    this._blitShader.init(this._context);

    this._fxaaShader = ShaderFactory.instance.getShader('fxaa');
    this._fxaaShader.init(this._context);

    this._lowResDepthFramebuffer = new Framebuffer(256, 256);
    this._lowResDepthFramebuffer.init(this._context);

    // const testModelEntities = await ModelLoader.fromUrl('/data/models/house.obj');
    // for (const entity of testModelEntities) {
    //   entity.translation = new Vector3(0, 0, 5);
    //   this._scene.addEntity(entity);
    // }

    const cursorEntity = new Entity('cursor');
    cursorEntity.mesh = MeshFactory.instance.quad();
    cursorEntity.mesh.init(this._context);
    cursorEntity.material = new Material();
    cursorEntity.material.setTexture('diffuseMap', new Texture('/images/avatar.png'));
    cursorEntity.material.init(this._context);
    cursorEntity.material.depthWrite = false;
    cursorEntity.material.depthTest = true;
    cursorEntity.scale = new Vector3(0.25, 0.25, 0.25);
    this._scene.addEntity(cursorEntity, 'overlay', 11);

    // const sky = new Entity('sky');
    // sky.mesh = (await ModelLoader.fromUrl('/data/models/dome.obj'))[0].mesh;
    // sky.mesh.init(this._context);
    // sky.material = new Material();
    // sky.material.init(this._context);
    // sky.material.depthWrite = false;
    // sky.material.depthTest = false;
    // sky.scale = new Vector3(50, 50, 50);
    // sky.addController(new SkyboxController());
    // this._scene.addEntity(sky, 'skybox', -1);

    const testGaussianSplatting = (await ModelLoader.fromUrl('/data/models/point_cloud.ply'))[0];
    testGaussianSplatting.rotation = Quaternion.fromAxisAngles(new Vector3(1, 0, 0), Math.PI);
    this._scene.addEntity(testGaussianSplatting, 'gaussianSplatting', 11);

    this._lastTime = performance.now();

    this._animationFrameId = requestAnimationFrame(this._render);
  }

  destroy() {
    cancelAnimationFrame(this._animationFrameId);
    this._animationFrameId = 0;

    this._lowResDepthFramebuffer.destroy();

    this._blitShader.destroy();

    this._quad.destroy();

    this._scene.destroy();

    if (this._parentElement) {
      this._parentElement.removeEventListener('resize', this._onResize);
      this._parentElement.removeEventListener('keydown', this._handleKeyboardEvent);
      this._parentElement.removeEventListener('keyup', this._handleKeyboardEvent);
    }

    if (this._canvas) {
      this._canvas.remove();
      this._canvas = null;
    }

    this._context = null;
    this._parentElement = null;
  }

  private _handleKeyboardEvent = (event: KeyboardEvent) => {
    this._scene.camera.onKeyboardEvent(event);
  };

  private _onResize = () => {
    this._canvas.width = this._parentElement.clientWidth;
    this._canvas.height = this._parentElement.clientHeight;

    this._scene.camera.setDimensions(this._canvas.width, this._canvas.height);
  };

  set parentElement(parentElement: HTMLElement) {
    this._parentElement = parentElement;
  }

  get parentElement(): HTMLElement {
    return this._parentElement;
  }

  update(delta: number) {
    this._scene.update(delta, this._scene.camera);

    if (this._scene.camera.currentCameraController) {
      const cameraController = this._scene.camera.currentCameraController;
      const mousePosition = cameraController.mousePosition;

      const [worldPosition, normal] = this._rayPick(mousePosition[0], mousePosition[1]);

      if (worldPosition && normal) {
        const cursorEntity = this._scene.getEntity('cursor');

        if (cursorEntity) {
          cursorEntity.translation = worldPosition;
          cursorEntity.rotation = Quaternion.lookRotation(normal);
        }
      }

      const sky = this._scene.getEntity('sky');
      
      if (sky) {
        sky.translation = this._scene.camera.translation;
      }
    }
  }

  render() {
    // this._context.clearColor(0, 0, 0, 0);
    // this._context.clear(this._context.COLOR_BUFFER_BIT | this._context.DEPTH_BUFFER_BIT);
    // this._context.viewport(0, 0, this._scene.camera.width, this._scene.camera.height);

    // this._scene.render(-100, 10, true);

    // // this._scene.camera.framebuffer.packedDepthTexture.bind(0);
    // this._scene.camera.framebuffer.colorTexture.bind(0);
    // // this._fxaaShader.setUniform('u_texture', new Int32Array([0]));
    // // this._fxaaShader.setUniform('u_resolution', [this._canvas.width, this._canvas.height]);
    // // this._fxaaShader.use();

    // this._blitShader.setUniform('u_texture', new Int32Array([0]));
    // this._blitShader.use();

    // this._context.disable(this._context.DEPTH_TEST);
    // this._context.depthMask(false);

    // this._context.viewport(0, 0, this._canvas.width, this._canvas.height);
    // this._quad.render();

    // this._context.enable(this._context.DEPTH_TEST);
    // this._context.depthMask(true);

    // this._copyDepthTextureToCpu();
    
    this._context.clearColor(0, 0, 0, 1);
    this._context.clear(this._context.COLOR_BUFFER_BIT | this._context.DEPTH_BUFFER_BIT);

    // Render overlay items
    this._context.enable(this._context.BLEND);
    // this._context.blendFunc(this._context.SRC_ALPHA, this._context.ONE_MINUS_SRC_ALPHA);
    this._context.blendFuncSeparate(
      this._context.ONE,
      this._context.ONE_MINUS_SRC_ALPHA,
      this._context.ONE,
      this._context.ONE_MINUS_SRC_ALPHA
    );


    // this._context.blendFuncSeparate(
    //   this._context.ONE_MINUS_DST_ALPHA,
    //   this._context.ONE,
    //   this._context.ONE_MINUS_DST_ALPHA,
    //   this._context.ONE
    // );

    this._context.blendEquationSeparate(this._context.FUNC_ADD, this._context.FUNC_ADD);
    this._scene.render(this._scene.camera, undefined, 10, -1, false, false);
    this._context.disable(this._context.BLEND);
  }

  private _render = (time: number) => {
    const delta = (time - this._lastTime) / 1000;

    this._lastTime = time;

    this.update(delta);
    this.render();

    this._animationFrameId = requestAnimationFrame(this._render);
  };

  // Copy a low-res version of the depth buffer to
  // a cpu-side buffer. Used for ray picking.
  private _copyDepthTextureToCpu() {
    const gl = this._context;

    // const width = this._lowResDepthTexture.width;
    // const height = this._lowResDepthTexture.height;

    // this._lowResDepthTexture.bind(0);

    // Copy to low res depth texture
    this._scene.camera.framebuffer.bind('read');
    this._lowResDepthFramebuffer.bind('draw');

    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.blitFramebuffer(0, 0, this._scene.camera.framebuffer.width, this._scene.camera.framebuffer.height, 0, 0, this._lowResDepthFramebuffer.width, this._lowResDepthFramebuffer.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    this._scene.camera.framebuffer.unbind('read');
    this._lowResDepthFramebuffer.unbind('draw');

    this._lowResDepthFramebuffer.bind('read');

    const pixelBufferSize = this._lowResDepthFramebuffer.width * this._lowResDepthFramebuffer.height;

    if (!this._pixelBufferDepth || this._pixelBufferDepth.byteLength !== pixelBufferSize * 4) {
      this._pixelBufferDepth = new Uint8Array(pixelBufferSize * 4);
    }

    gl.readPixels(0, 0, this._lowResDepthFramebuffer.width, this._lowResDepthFramebuffer.height, gl.RGBA, gl.UNSIGNED_BYTE, this._pixelBufferDepth);

    

    this._scene.camera.framebuffer.bind('read');
    this._lowResDepthFramebuffer.bind('draw');

    gl.readBuffer(gl.COLOR_ATTACHMENT2);
    gl.blitFramebuffer(0, 0, this._scene.camera.framebuffer.width, this._scene.camera.framebuffer.height, 0, 0, this._lowResDepthFramebuffer.width, this._lowResDepthFramebuffer.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    this._scene.camera.framebuffer.unbind('read');
    this._lowResDepthFramebuffer.unbind('draw');

    this._lowResDepthFramebuffer.bind('read');

    if (!this._pixelBufferNormals || this._pixelBufferNormals.byteLength !== pixelBufferSize * 4) {
      this._pixelBufferNormals = new Uint8Array(pixelBufferSize * 4);
    }

    gl.readPixels(0, 0, this._lowResDepthFramebuffer.width, this._lowResDepthFramebuffer.height, gl.RGBA, gl.UNSIGNED_BYTE, this._pixelBufferNormals);




    this._lowResDepthFramebuffer.unbind('read');
  }

  // Use the low-res depth texture to perform a ray pick
  // Returns the world position of the intersection
  private _rayPick(x: number, y: number): [Vector3, Vector3] {
    if (!this._pixelBufferDepth) {
      return [null, null];
    }

    const unpackDepth32 = (depthBytes: Uint8Array) => {
      const buffer = new ArrayBuffer(4);
      const view = new Uint8Array(buffer);

      for (let i = 0; i < 4; i++) {
          view[i] = depthBytes[i];
      }

      const dataView = new DataView(buffer);

      return dataView.getFloat32(0, true);
    };

    const linearizeDepth = (depth: number) => {
      const near = this._scene.camera.nearClip;
      const far = this._scene.camera.farClip;

      return (2.0 * near) / (far + near - depth * (far - near));
    };

    const width = this._lowResDepthFramebuffer.width;
    const height = this._lowResDepthFramebuffer.height;

    const xIndex = Math.floor(x * width);
    const yIndex = Math.floor(y * height);

    const pixelIndex = yIndex * width + xIndex;
    const byteIndex = pixelIndex * 4;

    const depth = unpackDepth32(this._pixelBufferDepth.slice(byteIndex, byteIndex + 4));

    // Normals' bytes are in range [0, 255]
    // Corresponding to [-1, 1]
    const normal = Vector3.normalize(new Vector3(
      this._pixelBufferNormals[byteIndex] / 256 * 2.0 - 1.0,
      this._pixelBufferNormals[byteIndex + 1] / 256 * 2.0 - 1.0,
      this._pixelBufferNormals[byteIndex + 2] / 256 * 2.0 - 1.0
    ));

    const clipX = x * 2 - 1;
    const clipY = y * 2 - 1;

    const clipSpacePosition = new Vector3(clipX, clipY, depth);

    const projectionMatrix = Matrix4.perspective(this._scene.camera.fov, width, height, this._scene.camera.nearClip, this._scene.camera.farClip);

    const inverseProjectionMatrix = Matrix4.invert(this._scene.camera.projectionMatrix);
    const inverseViewMatrix = Matrix4.invert(this._scene.camera.viewMatrix);

    const eyeSpacePosition = Vector3.transform(clipSpacePosition, inverseProjectionMatrix);
    const worldSpacePosition = Vector3.transform(eyeSpacePosition, inverseViewMatrix, false);

    return [worldSpacePosition, normal];
  }
}