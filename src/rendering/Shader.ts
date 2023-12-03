import { BasicObject } from '../core/BasicObject';
import { Matrix4 } from '../math/Matrix4';
import { TypedArray } from '../core/Types';
import { ShaderType } from './ShaderType';

export class Shader extends BasicObject {
  private _program: WebGLProgram = null;
  private _shaders: WebGLShader[] = [];

  private _sources: Map<ShaderType, string> = new Map<ShaderType, string>();

  private _uniforms: Map<string, any> = new Map<string, any>();
  private _dirtyUniforms: Set<string> = new Set<string>();

  private _hasLighting: boolean = true;

  constructor(name: string) {
    super(name);
  }

  public get hasLighting(): boolean {
    return this._hasLighting;
  }

  public set hasLighting(value: boolean) {
    this._hasLighting = value;
  }

  public addSource(type: ShaderType, source: string) {
    this._sources.set(type, source);
  }

  private static _getWebGLShaderType(type: ShaderType): number {
    switch (type) {
      case ShaderType.VERTEX:
        return WebGL2RenderingContext.VERTEX_SHADER;
      case ShaderType.FRAGMENT:
        return WebGL2RenderingContext.FRAGMENT_SHADER;
      default:
        return -1;
    }
  }

  protected onInit() {
    if (this._program) {
      throw new Error('Shader already initialized');
    }

    if (!this._sources.size) {
      throw new Error('No shader sources found');
    }

    const gl = this.gl;

    this._program = gl.createProgram();

    for (const [type, source] of this._sources) {
      const shaderSourceType = Shader._getWebGLShaderType(type);

      if (shaderSourceType === -1) {
        throw new Error(`Unknown shader type: ${type}`);
      }

      const shader = gl.createShader(shaderSourceType);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`Error compiling shader: ${gl.getShaderInfoLog(shader)}`);
      }

      gl.attachShader(this._program, shader);

      this._shaders.push(shader);
    }

    gl.linkProgram(this._program);
    gl.useProgram(this._program);

    if (!gl.getProgramParameter(this._program, gl.LINK_STATUS)) {
      throw Error('Linking failed: ' + gl.getProgramInfoLog(this._program));
    }
  }

  protected onDestroy() {
    const gl = this.gl;

    for (const shader of this._shaders) {
      gl.detachShader(this._program, shader);
      gl.deleteShader(shader);
    }

    this._shaders = [];

    if (this._program) {
      gl.deleteProgram(this._program);

      this._program = null;
    }
  }

  public get webglProgram(): WebGLProgram {
    return this._program;
  }

  public use() {
    const gl = this.gl;

    gl.useProgram(this._program);
    // gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

    this.updateUniforms();
  }

  public updateUniforms() {
    for (const [name, value] of this._uniforms) {
      if (this._dirtyUniforms.has(name)) {
        this._setUniform(name, value);

        this._dirtyUniforms.delete(name);
      }
    }

    this._dirtyUniforms.clear();
  }

  private _setUniform(name: string, value: Exclude<TypedArray, BigUint64Array | BigInt64Array> | number | number[] | Matrix4) {
    if (!this._program) {
      throw new Error('Shader not initialized');
    }

    const gl = this.gl;

    const location = gl.getUniformLocation(this._program, name);

    if (!location) {
      return;
    }

    if (value instanceof Float32Array || value instanceof Float64Array) {
      if (value.length === 1) {
        gl.uniform1fv(location, value);
      } else if (value.length === 2) {
        gl.uniform2fv(location, value);
      } else if (value.length === 3) {
        gl.uniform3fv(location, value);
      } else if (value.length === 4) {
        gl.uniform4fv(location, value);
      }
    } else if (value instanceof Int32Array || value instanceof Int16Array || value instanceof Int8Array) {
      if (value.length === 1) {
        gl.uniform1iv(location, value);
      } else if (value.length === 2) {
        gl.uniform2iv(location, value);
      } else if (value.length === 3) {
        gl.uniform3iv(location, value);
      } else if (value.length === 4) {
        gl.uniform4iv(location, value);
      }
    } else if (value instanceof Uint32Array || value instanceof Uint16Array || value instanceof Uint8Array || value instanceof Uint8ClampedArray) {
      if (value.length === 1) {
        gl.uniform1uiv(location, value);
      } else if (value.length === 2) {
        gl.uniform2uiv(location, value);
      } else if (value.length === 3) {
        gl.uniform3uiv(location, value);
      } else if (value.length === 4) {
        gl.uniform4uiv(location, value);
      }
    } else if (value instanceof Matrix4) {
      gl.uniformMatrix4fv(location, true, value.values);
    } else if (typeof value === 'number') {
      gl.uniform1f(location, value);
    } else if (value instanceof Array) {
      if (value.length === 1) {
        gl.uniform1fv(location, value);
      } else if (value.length === 2) {
        gl.uniform2fv(location, value);
      } else if (value.length === 3) {
        gl.uniform3fv(location, value);
      } else if (value.length === 4) {
        gl.uniform4fv(location, value);
      }
    } else {
      throw new Error(`Unknown uniform type: ${typeof value}`);
    }
  }

  public setUniform(name: string, value: Exclude<TypedArray, BigUint64Array | BigInt64Array> | number | number[] | Matrix4) {
    this._uniforms.set(name, value);
    this._dirtyUniforms.add(name);
  }
}