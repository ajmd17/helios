export enum VertexAttribute {
  POSITION = 0,
  UV = 1,
  NORMAL = 2,

  // For gaussian splatting
  CENTER = 4,
  ROTATION = 5,
  SCALE = 6,
  COLOR = 7
}

export class VertexAttributes {
  public static readonly ATTRIBUTE_SIZES: Record<VertexAttribute, number> = {
    [VertexAttribute.POSITION]: 3,
    [VertexAttribute.UV]: 2,
    [VertexAttribute.NORMAL]: 3,

    [VertexAttribute.CENTER]: 3,
    [VertexAttribute.ROTATION]: 4,
    [VertexAttribute.SCALE]: 3,
    [VertexAttribute.COLOR]: 4
  };

  public static readonly INSTANCED_ATTRIBUTE_DIVISORS: Record<VertexAttribute, number> = {
    [VertexAttribute.POSITION]: 0,
    [VertexAttribute.UV]: 0,
    [VertexAttribute.NORMAL]: 0,

    [VertexAttribute.CENTER]: 1,
    [VertexAttribute.ROTATION]: 1,
    [VertexAttribute.SCALE]: 1,
    [VertexAttribute.COLOR]: 1
  };

  private _attributes: Set<VertexAttribute> = new Set<VertexAttribute>();

  public get attributes() {
    return this._attributes;
  }

  public add(attribute: VertexAttribute) {
    this._attributes.add(attribute);
  }

  public has(attribute: VertexAttribute) {
    return this._attributes.has(attribute);
  }

  public get vertexSize() {
    let size = 0;

    for (const attribute of this._attributes) {
      size += VertexAttributes.ATTRIBUTE_SIZES[attribute];
    }

    return size;
  }
}