import { BasicObject } from "../core/BasicObject";
import { Texture } from "./Texture";

export class Framebuffer extends BasicObject {
  private _framebuffer: WebGLFramebuffer = null;
  private _colorTexture: Texture = null;
  private _packedDepthTexture: Texture = null;
  private _normalsTexture: Texture = null;
  private _depthTexture: Texture = null;

  private _colorRenderbuffer: WebGLRenderbuffer = null;
  private _packedDepthRenderbuffer: WebGLRenderbuffer = null;
  private _normalsRenderbuffer: WebGLRenderbuffer = null;
  private _depthRenderbuffer: WebGLRenderbuffer = null;

  private _blitFramebuffer: Framebuffer = null;

  private _width: number = 0;
  private _height: number = 0;

  private _msaa: boolean = false;

  constructor(width: number, height: number) {
    super();

    this._width = width;
    this._height = height;
  }

  protected onInit() {
    const gl = this.gl;

    if (this._width === 0 || this._height === 0) {
      throw new Error('Invalid dimensions for framebuffer');
    }

    this._framebuffer = gl.createFramebuffer();

    if (this._msaa) {
      this._blitFramebuffer = new Framebuffer(this._width, this._height);
      // this._blitFramebuffer.msaa = true;
      this._blitFramebuffer.init(this.gl);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);

    if (this._msaa) {
      this._colorTexture = this._blitFramebuffer.colorTexture;
      this._colorTexture.init(this.gl); // increase ref count

      this._packedDepthTexture = this._blitFramebuffer.packedDepthTexture;
      this._packedDepthTexture.init(this.gl); // increase ref count

      this._normalsTexture = this._blitFramebuffer.normalsTexture;
      this._normalsTexture.init(this.gl); // increase ref count

      this._depthTexture = this._blitFramebuffer.depthTexture;
      this._depthTexture.init(this.gl); // increase ref count

      const maxSamples: number = Math.min(gl.getParameter(gl.MAX_SAMPLES), 4);

      this._colorRenderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._colorRenderbuffer);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, maxSamples, gl.RGBA8, this._width, this._height);

      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this._colorRenderbuffer);

      this._packedDepthRenderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._packedDepthRenderbuffer);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, maxSamples, gl.RGBA8, this._width, this._height);

      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.RENDERBUFFER, this._packedDepthRenderbuffer);

      this._normalsRenderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._normalsRenderbuffer);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, maxSamples, gl.RGBA8, this._width, this._height);

      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.RENDERBUFFER, this._normalsRenderbuffer);

      this._depthRenderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._depthRenderbuffer);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, maxSamples, gl.DEPTH_COMPONENT24, this._width, this._height);

      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._depthRenderbuffer);
    } else {
      this._colorTexture = new Texture(this._width, this._height);
      this._colorTexture.filterMode = gl.LINEAR;
      this._colorTexture.init(this.gl);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._colorTexture.webglTexture, 0);

      this._packedDepthTexture = new Texture(this._width, this._height);
      this._packedDepthTexture.filterMode = gl.NEAREST;
      this._packedDepthTexture.init(this.gl);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this._packedDepthTexture.webglTexture, 0);

      this._normalsTexture = new Texture(this._width, this._height);
      this._normalsTexture.filterMode = gl.NEAREST;
      this._normalsTexture.init(this.gl);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this._normalsTexture.webglTexture, 0);

      this._depthTexture = new Texture(this._width, this._height);
      this._depthTexture.filterMode = gl.NEAREST;
      this._depthTexture.isDepthTexture = true;
      this._depthTexture.init(this.gl);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this._depthTexture.webglTexture, 0);
    }

    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: ${status}`);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  protected onDestroy() {
    const gl = this.gl;

    if (this._colorRenderbuffer) {
      gl.deleteRenderbuffer(this._colorRenderbuffer);
      this._colorRenderbuffer = null;
    }

    if (this._packedDepthRenderbuffer) {
      gl.deleteRenderbuffer(this._packedDepthRenderbuffer);
      this._packedDepthRenderbuffer = null;
    }

    if (this._normalsRenderbuffer) {
      gl.deleteRenderbuffer(this._normalsRenderbuffer);
      this._normalsRenderbuffer = null;
    }

    if (this._depthRenderbuffer) {
      gl.deleteRenderbuffer(this._depthRenderbuffer);
      this._depthRenderbuffer = null;
    }

    if (this._blitFramebuffer) {
      this._blitFramebuffer.destroy();
      this._blitFramebuffer = null;
    }

    this._colorTexture.destroy();
    this._packedDepthTexture.destroy();
    this._normalsTexture.destroy();
    this._depthTexture.destroy();

    gl.deleteFramebuffer(this._framebuffer);

    this._framebuffer = null;
  }

  public get width(): number {
    return this._width;
  }

  public get height(): number {
    return this._height;
  }

  public get colorTexture(): Texture {
    return this._colorTexture;
  }

  public get packedDepthTexture(): Texture {
    return this._packedDepthTexture;
  }

  public get normalsTexture(): Texture {
    return this._normalsTexture;
  }

  public get depthTexture(): Texture {
    return this._depthTexture;
  }

  public get msaa(): boolean {
    return this._msaa;
  }

  public set msaa(value: boolean) {
    this._msaa = value;
  }

  public get webglFramebuffer(): WebGLFramebuffer {
    return this._framebuffer;
  }

  public bind(mode: 'normal' | 'draw' | 'read' = 'normal') {
    const gl = this.gl;

    if (mode === 'normal') {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
    } else if (mode === 'draw') {
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this._framebuffer);
    } else if (mode === 'read') {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._framebuffer);
    }
  }

  public unbind(mode: 'normal' | 'draw' | 'read' = 'normal') {
    const gl = this.gl;

    if (mode === 'normal') {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      if (this.msaa) {
        this.bind('read');
        this._blitFramebuffer.bind('draw');

        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.blitFramebuffer(0, 0, this._width, this._height, 0, 0, this._width, this._height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

        gl.readBuffer(gl.COLOR_ATTACHMENT1);
        gl.blitFramebuffer(0, 0, this._width, this._height, 0, 0, this._width, this._height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

        gl.readBuffer(gl.COLOR_ATTACHMENT2);
        gl.blitFramebuffer(0, 0, this._width, this._height, 0, 0, this._width, this._height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

        gl.readBuffer(gl.DEPTH_ATTACHMENT);
        gl.blitFramebuffer(0, 0, this._width, this._height, 0, 0, this._width, this._height, gl.DEPTH_BUFFER_BIT, gl.NEAREST);

        this.unbind('read');
        this._blitFramebuffer.unbind('draw');
      }
    } else if (mode === 'draw') {
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    } else if (mode === 'read') {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    }
  }
}
