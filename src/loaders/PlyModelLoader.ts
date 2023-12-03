import { Quaternion } from "../math/Quaternion";
import { GaussianSplattingInstance, GaussianSplattingRenderer, IGaussianSplattingModel } from "../rendering/GaussianSplattingRenderer";
import { IVertex } from "../rendering/IVertex";
import { Material } from "../rendering/Material";
import { Mesh } from "../rendering/Mesh";
import { Entity } from "../scene/Entity";
import { ModelLoader } from "./ModelLoader";

export enum PLYType {
  PLY_TYPE_UNKNOWN = -1,
  PLY_TYPE_DOUBLE,
  PLY_TYPE_FLOAT,
  PLY_TYPE_INT,
  PLY_TYPE_UINT,
  PLY_TYPE_SHORT,
  PLY_TYPE_USHORT,
  PLY_TYPE_CHAR,
  PLY_TYPE_UCHAR,
  PLY_TYPE_MAX
}

export interface IPLYPropertyDefinition {
  type: PLYType;
  offset: number;
}

export interface IPLYModel {
  propertyTypes: Map<string, IPLYPropertyDefinition>;
  customData: Map<string, Uint8Array>;
  vertices: IVertex[];
  headerLength: number;
}

function stringToPLYType(type: string): PLYType {
  switch (type) {
    case 'double':
    return PLYType.PLY_TYPE_DOUBLE;
  case 'float':
    return PLYType.PLY_TYPE_FLOAT;
  case 'int':
    return PLYType.PLY_TYPE_INT;
  case 'uint':
    return PLYType.PLY_TYPE_UINT;
  case 'short':
    return PLYType.PLY_TYPE_SHORT;
  case 'ushort':
    return PLYType.PLY_TYPE_USHORT;
  case 'char':
    return PLYType.PLY_TYPE_CHAR;
  case 'uchar':
    return PLYType.PLY_TYPE_UCHAR;
  default:
    return PLYType.PLY_TYPE_UNKNOWN;
  }
}

function getPLYTypeSize(type: PLYType): number {
  switch (type) {
  case PLYType.PLY_TYPE_DOUBLE:
    return 8;
  case PLYType.PLY_TYPE_FLOAT:
    return 4;
  case PLYType.PLY_TYPE_INT:
    return 4;
  case PLYType.PLY_TYPE_UINT:
    return 4;
  case PLYType.PLY_TYPE_SHORT:
    return 2;
  case PLYType.PLY_TYPE_USHORT:
    return 2;
  case PLYType.PLY_TYPE_CHAR:
    return 1;
  case PLYType.PLY_TYPE_UCHAR:
    return 1;
  default:
    return 0;
  }
}

function readPropertyValue(buffer: ArrayBuffer, model: IPLYModel, rowOffset: number, propertyName: string): Uint8Array {
  const propertyDefinition = model.propertyTypes.get(propertyName);

  if (!propertyDefinition) {
    throw new Error(`Unknown property: ${propertyName}`);
  }

  const propertySize = getPLYTypeSize(propertyDefinition.type);
  const offset: number = propertyDefinition.offset + rowOffset;

  if (offset >= buffer.byteLength || offset + propertySize > buffer.byteLength) {
    throw new Error('Invalid offset');
  }

  return new Uint8Array(buffer.slice(offset, offset + propertySize));
}

function isCustomPropertyName(name: string) {
  return !['x', 'y', 'z'].includes(name);
}

export class PlyModelLoader extends ModelLoader {
  public async load(buffer: ArrayBuffer): Promise<Entity[]> {
    const plyModel: IPLYModel = {
      propertyTypes: new Map<string, IPLYPropertyDefinition>(),
      customData: new Map<string, Uint8Array>(),
      vertices: [],
      headerLength: 0
    };

    let rowLength = 0;

    const decoder = new TextDecoder('utf-8').decode(buffer);
    const lines = decoder.split('\n');

    console.log('Reading PLY header...');

    for (const line of lines) {
      plyModel.headerLength += line.length + 1;

      if (line == 'end_header') {
        break;
      }

      const split = line.split(' ');

      if (!split.length) {
        continue;
      }

      if (split[0] == 'property') {
        const type = stringToPLYType(split[1]);

        if (type == PLYType.PLY_TYPE_UNKNOWN) {
          throw new Error(`Unknown property type: ${split[1]}`);
        }

        const propertyName = split[split.length - 1];

        plyModel.propertyTypes.set(propertyName, {
          type: type,
          offset: rowLength
        });

        rowLength += getPLYTypeSize(type);
      } else if (split[0] == 'element') {
        if (split[1] == 'vertex') {
          const numVertices = parseInt(split[2]);

          plyModel.vertices = Array.from(new Array<IVertex>(numVertices));
        }
      }
    }

    const numVertices = plyModel.vertices.length;

    const plyBuffer = buffer.slice(plyModel.headerLength);

    for (const [key, value] of plyModel.propertyTypes) {
      if (isCustomPropertyName(key)) {
        if (plyModel.customData.has(key)) {
          continue;
        }

        plyModel.customData.set(key, new Uint8Array(numVertices * getPLYTypeSize(value.type)));
      }
    }

    if (plyBuffer.byteLength + plyModel.headerLength != buffer.byteLength) {
      throw new Error(`Invalid buffer length! Expected ${plyBuffer.byteLength + plyModel.headerLength}, got ${buffer.byteLength}`);
    }

    let propertyBuffer: Uint8Array = null;

    for (let index = 0; index < numVertices; index++) {
      const rowOffset = index * rowLength;

      const vertex: IVertex = {
        position: [Number.NaN, Number.NaN, Number.NaN]
      };

      propertyBuffer = readPropertyValue(plyBuffer, plyModel, rowOffset, 'x');
      vertex.position[0] = new Float32Array(propertyBuffer.buffer)[0];

      propertyBuffer = readPropertyValue(plyBuffer, plyModel, rowOffset, 'y');
      vertex.position[1] = new Float32Array(propertyBuffer.buffer)[0];

      propertyBuffer = readPropertyValue(plyBuffer, plyModel, rowOffset, 'z');
      vertex.position[2] = new Float32Array(propertyBuffer.buffer)[0];

      plyModel.vertices[index] = vertex;

      for (const [key, value] of plyModel.propertyTypes) {
        if (!isCustomPropertyName(key)) {
          continue;
        }

        const customData = plyModel.customData.get(key);

        const dataTypeSize = getPLYTypeSize(value.type);
        const offset = index * dataTypeSize;

        const propertyValue = readPropertyValue(plyBuffer, plyModel, rowOffset, key);

        customData.set(propertyValue, offset);
      }

      if (index % 10000 === 0) {
        console.log(`Loading PLY model: ${(index / numVertices * 100).toFixed(2)}% complete`);
      }
    }

    const entity = new Entity('PLYModel');

    const hasRotations = plyModel.customData.has('rot_0') && plyModel.customData.has('rot_1') && plyModel.customData.has('rot_2') && plyModel.customData.has('rot_3');
    const hasScales = plyModel.customData.has('scale_0') && plyModel.customData.has('scale_1') && plyModel.customData.has('scale_2');
    const hasColors = plyModel.customData.has('f_dc_0') && plyModel.customData.has('f_dc_1') && plyModel.customData.has('f_dc_2');
    const hasOpacity = plyModel.customData.has('opacity');

    const gaussianSplattingModel: IGaussianSplattingModel = {
      positions: new Float32Array(plyModel.vertices.length * 3),
      rotations: new Float32Array(plyModel.vertices.length * 4),
      scales: new Float32Array(plyModel.vertices.length * 3),
      colors: new Float32Array(plyModel.vertices.length * 4)
    };

    for (let i = 0; i < numVertices; i++) {
      const offset = i * 3;

      gaussianSplattingModel.positions[offset + 0] = plyModel.vertices[i].position[0];
      gaussianSplattingModel.positions[offset + 1] = plyModel.vertices[i].position[1];
      gaussianSplattingModel.positions[offset + 2] = plyModel.vertices[i].position[2];
    }

    if (hasRotations) {
      const rot_0 = plyModel.customData.get('rot_0');
      const rot_1 = plyModel.customData.get('rot_1');
      const rot_2 = plyModel.customData.get('rot_2');
      const rot_3 = plyModel.customData.get('rot_3');

      const rot_0_f32 = new Float32Array(rot_0.buffer);
      const rot_1_f32 = new Float32Array(rot_1.buffer);
      const rot_2_f32 = new Float32Array(rot_2.buffer);
      const rot_3_f32 = new Float32Array(rot_3.buffer);

      for (let i = 0; i < numVertices; i++) {
        const offset = i * 4;

        let rotation = new Quaternion();
        rotation.w = rot_0_f32[i];
        rotation.x = rot_1_f32[i];
        rotation.y = rot_2_f32[i];
        rotation.z = rot_3_f32[i];
        rotation = Quaternion.normalize(rotation);

        gaussianSplattingModel.rotations[offset + 0] = rotation.x;
        gaussianSplattingModel.rotations[offset + 1] = rotation.y;
        gaussianSplattingModel.rotations[offset + 2] = rotation.z;
        gaussianSplattingModel.rotations[offset + 3] = rotation.w;
      }
    }

    if (hasScales) {
      const scale_0 = plyModel.customData.get('scale_0');
      const scale_1 = plyModel.customData.get('scale_1');
      const scale_2 = plyModel.customData.get('scale_2');

      const scale_0_f32 = new Float32Array(scale_0.buffer);
      const scale_1_f32 = new Float32Array(scale_1.buffer);
      const scale_2_f32 = new Float32Array(scale_2.buffer);

      for (let i = 0; i < numVertices; i++) {
        const offset = i * 3;

        gaussianSplattingModel.scales[offset + 0] = scale_0_f32[i];
        gaussianSplattingModel.scales[offset + 1] = scale_1_f32[i];
        gaussianSplattingModel.scales[offset + 2] = scale_2_f32[i];
      }
    }

    if (hasColors) {
      const SH_C0 = 0.28209479177387814;

      const f_dc_0 = plyModel.customData.get('f_dc_0');
      const f_dc_1 = plyModel.customData.get('f_dc_1');
      const f_dc_2 = plyModel.customData.get('f_dc_2');

      const f_dc_0_f32 = new Float32Array(f_dc_0.buffer);
      const f_dc_1_f32 = new Float32Array(f_dc_1.buffer);
      const f_dc_2_f32 = new Float32Array(f_dc_2.buffer);

      for (let i = 0; i < numVertices; i++) {
        const offset = i * 4;

        gaussianSplattingModel.colors[offset + 0] = 0.5 + SH_C0 * f_dc_0_f32[i];
        gaussianSplattingModel.colors[offset + 1] = 0.5 + SH_C0 * f_dc_1_f32[i];
        gaussianSplattingModel.colors[offset + 2] = 0.5 + SH_C0 * f_dc_2_f32[i];

        if (hasOpacity) {
          const opacity = plyModel.customData.get('opacity');
          const opacity_f32 = new Float32Array(opacity.buffer);

          gaussianSplattingModel.colors[offset + 3] = 1.0 / (1.0 + Math.exp(-opacity_f32[i]));
        } else {
          gaussianSplattingModel.colors[offset + 3] = 1.0 / (1.0 + Math.exp(-1.0));
        }
      }
    }

    const gaussianSplattingInstance = new GaussianSplattingInstance(gaussianSplattingModel);

    const gaussianSplattingRenderer = new GaussianSplattingRenderer();
    gaussianSplattingRenderer.addInstance(gaussianSplattingInstance);
    
    entity.customRenderer = gaussianSplattingRenderer;

    entity.material = new Material();
    entity.material.depthTest = false;
    entity.material.depthWrite = false;

    return [entity];
  }
}