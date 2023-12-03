import { BasicObject } from "../core/BasicObject";
import { Matrix4 } from "../math/Matrix4";
import { Camera } from "../scene/Camera";
import { IRenderable } from "./IRenderable";
import { IVertex } from "./IVertex";
import { VertexAttribute, VertexAttributes } from "./VertexAttributes";

export class Mesh extends BasicObject implements IRenderable {
  private _vertices: IVertex[] = [];
  private _indices: number[] = [];

  private _vertexBuffer: WebGLBuffer = null;
  private _indexBuffer: WebGLBuffer = null;

  private _vertexArrayObject: WebGLVertexArrayObject = null;

  private _vertexAttributes: VertexAttributes = new VertexAttributes();

  private _additionalBuffers = new Map<VertexAttribute, { cpu: Float32Array, gpu: WebGLBuffer }>();

  public static vertexToString(vertex: IVertex): string {
    return `${vertex.position.join(',')},${vertex.uv?.join(',') ?? ''},${vertex.normal?.join(',') ?? ''}`;
  }

  constructor(vertices?: IVertex[], indices?: number[]) {
    super();

    this._vertices = vertices ?? [];
    this._indices = indices ?? [];

    for (const vertex of this._vertices) {
      if (vertex.position) {
        if (vertex.position.length !== 3) {
          throw new Error('Invalid vertex position');
        }
  
        this._vertexAttributes.add(VertexAttribute.POSITION);
      }

      if (vertex.uv) {
        if (vertex.uv.length !== 2) {
          throw new Error('Invalid vertex uv');
        }

        this._vertexAttributes.add(VertexAttribute.UV);
      }

      if (vertex.normal) {
        if (vertex.normal.length !== 3) {
          throw new Error('Invalid vertex normal');
        }

        this._vertexAttributes.add(VertexAttribute.NORMAL);
      }
    }

    if (vertices && !indices) {
      const indexMap = new Map<string, number>();

      const newVertices: IVertex[] = [];
      const newIndices: number[] = [];

      for (const vertex of this._vertices) {
        const vertexKey = Mesh.vertexToString(vertex);

        if (indexMap.has(vertexKey)) {
          newIndices.push(indexMap.get(vertexKey));
        } else {
          const index = newVertices.length;

          indexMap.set(vertexKey, index);

          newVertices.push(vertex);
          newIndices.push(index);
        }
      }

      this._vertices = newVertices;
      this._indices = newIndices;
    }

    // Ensure all indices are valid
    for (let i = 0; i < this._indices.length; i++) {
      if (this._indices[i] >= this._vertices.length) {
        throw new Error('Invalid index');
      }
    }
  }

  get vertexAttributes(): VertexAttributes {
    return this._vertexAttributes;
  }

  get numVertices(): number {
    return this._vertices.length;
  }

  get numIndices(): number {
    return this._indices.length;
  }

  // Set buffer data for an instanced vertex attribute
  public setAdditionalBuffer(name: VertexAttribute, data: Float32Array) {
    if (!this._vertexAttributes.has(name)) {
      throw new Error(`Invalid vertex attribute: ${name}`);
    }

    if (this._additionalBuffers.has(name)) {
      this._additionalBuffers.get(name).cpu = data;
    } else {
      this._additionalBuffers.set(name, {
        cpu: data,
        gpu: null
      });
    }

    if (this.isInitialized) {
      this._updateAdditionalBuffer(name);
    }
  }

  private _updateAdditionalBuffer(name: VertexAttribute) {
    const gl = this.gl;

    const buffer = this._additionalBuffers.get(name);

    if (!buffer) {
      throw new Error(`Invalid buffer: ${name}`);
    }

    // const oldBuffer = buffer.gpu;

    if (!buffer.gpu) {
      buffer.gpu = gl.createBuffer();
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.gpu);
    gl.bufferData(gl.ARRAY_BUFFER, buffer.cpu, gl.DYNAMIC_DRAW);

    // if (oldBuffer) {
    //   gl.deleteBuffer(oldBuffer);
    // }
  }

  protected onInit() {
    const gl = this.gl;

    const rawVertices: number[] = [];

    for (const vertex of this._vertices) {
      if (this._vertexAttributes.has(VertexAttribute.POSITION) && !this._additionalBuffers.has(VertexAttribute.POSITION)) {
        rawVertices.push(...(vertex.position || [0, 0, 0]));
      }

      if (this._vertexAttributes.has(VertexAttribute.UV) && !this._additionalBuffers.has(VertexAttribute.UV)) {
        rawVertices.push(...(vertex.uv || [0, 0]));
      }

      if (this._vertexAttributes.has(VertexAttribute.NORMAL) && !this._additionalBuffers.has(VertexAttribute.NORMAL)) {
        rawVertices.push(...(vertex.normal || [0, 0, 0]));
      }
    }

    // if (rawVertices.length !== this._vertices.length * this._vertexAttributes.vertexSize) {
    //   throw new Error(`Invalid vertex data! Got total size: ${rawVertices.length}, expected ${this._vertices.length * this._vertexAttributes.vertexSize}`);
    // }

    for (const [name, buffer] of this._additionalBuffers) {
      this._updateAdditionalBuffer(name);
    }

    this._vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rawVertices), gl.STATIC_DRAW);

    this._indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this._indices), gl.STATIC_DRAW);

    this._vertexArrayObject = gl.createVertexArray();
    gl.bindVertexArray(this._vertexArrayObject);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);

    let offset = 0;
    let index = 0;

    let stride = 0;

    for (const attribute of this._vertexAttributes.attributes) {
      if (!this._additionalBuffers.has(attribute)) {
        stride += VertexAttributes.ATTRIBUTE_SIZES[attribute] * 4;
      }
    }

    for (const attribute of this._vertexAttributes.attributes) {
      const attributeLocation = index++;
      const attributeSize = VertexAttributes.ATTRIBUTE_SIZES[attribute];

      gl.enableVertexAttribArray(attributeLocation);

      if (this._additionalBuffers.has(attribute)) {
        if (!this._additionalBuffers.get(attribute).gpu) {
          throw new Error(`Invalid gpu buffer: ${attribute}. Not initialized?`);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this._additionalBuffers.get(attribute).gpu);
        gl.vertexAttribPointer(attributeLocation, attributeSize, gl.FLOAT, false, 0, 0);
      } else {
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(attributeLocation, attributeSize, gl.FLOAT, false, stride, offset);

        offset += attributeSize * 4;
      }

      const divisor = VertexAttributes.INSTANCED_ATTRIBUTE_DIVISORS[attribute];
      gl.vertexAttribDivisor(attributeLocation, divisor);
    }

    gl.bindVertexArray(null);
  }

  protected onDestroy() {
    const gl = this.gl;

    for (const [name, buffer] of this._additionalBuffers) {
      if (buffer.gpu) {
        gl.deleteBuffer(buffer.gpu);
        buffer.gpu = null;
      }
    }

    gl.deleteBuffer(this._vertexBuffer);
    gl.deleteBuffer(this._indexBuffer);
    gl.deleteVertexArray(this._vertexArrayObject);

    super.destroy();
  }

  public render(camera: Camera, parentTransform?: Matrix4) {
    const gl = this.gl;

    gl.bindVertexArray(this._vertexArrayObject);
    gl.drawElements(gl.TRIANGLES, this._indices.length, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
}