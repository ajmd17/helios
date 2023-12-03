import { isNullish } from "../../shared";
import { Vector3 } from "../math/Vector3";
import { IVertex } from "../rendering/IVertex";
import { Material } from "../rendering/Material";
import { Mesh } from "../rendering/Mesh";
import { Texture } from "../rendering/Texture";
import { Entity } from "../scene/Entity";
import { ModelLoader } from "./ModelLoader";

export interface IObjModel {
  meshes: IObjMesh[];
  positions: [number, number, number][];
  uvs: [number, number][];
  normals?: [number, number, number][];
  currentMaterial?: string;
  mtlLib?: string;
}

type ObjIndex = [number, number, number];

export interface IObjMesh {
  name: string;
  indices: ObjIndex[];
  material?: string;
}

export interface IObjVertex {
}

export class MtlLoader {
  public static async fromUrl(url: string | URL): Promise<Map<string, Material>> {
    const loader = new MtlLoader();

    // fetch as text
    const response = await fetch(url);
    const text = await response.text();

    return loader.load(text);
  }

  public async load(text: string): Promise<Map<string, Material>> {
    const lines = text.split('\n');

    const materials = new Map<string, Material>();

    let currentMaterial: Material = null;

    const makeTextureUrl = (textureName: string) => {
      return `/data/models/${textureName}`;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.length === 0 || trimmed.startsWith('#')) {
        continue;
      }

      const tokens = trimmed.split(/\s+/gi);

      if (tokens.length === 0) {
        continue;
      }

      const command = tokens[0];

      switch (command) {
      case 'newmtl': {
        const materialName = tokens[1];

        currentMaterial = new Material(materialName);
        materials.set(materialName, currentMaterial);

        break;
      }
      case 'Kd': {
        const r = parseFloat(tokens[1]);
        const g = parseFloat(tokens[2]);
        const b = parseFloat(tokens[3]);

        // currentMaterial.diffuseColor = new Vector3(r, g, b);

        break;
      }
      case 'map_Kd': {
        const textureUrl = tokens[1];

        const texture = new Texture(makeTextureUrl(textureUrl));
        currentMaterial.setTexture('diffuseMap', texture);

        break;
      }
      case 'map_Ks': {
        const textureUrl = tokens[1];

        const texture = new Texture(makeTextureUrl(textureUrl));
        currentMaterial.setTexture('specularMap', texture);

        break;
      }
      case 'map_Ns': {
        const textureUrl = tokens[1];

        // const texture = new Texture(makeTextureUrl(textureUrl));
        // currentMaterial.setTexture('normalMap', texture);

        break;
      }
      case 'Ns': {
        const ns = parseFloat(tokens[1]);

        const maxNs = 1000;
        const minNs = 0;

        const specular = Math.min(maxNs, Math.max(minNs, ns));
        const roughness = 1.0 - Math.sqrt(specular / maxNs);

        currentMaterial.roughness = roughness;

        break;
      }
      case 'map_bump':
      case 'bump': {
        const textureUrl = tokens[1];

        // const texture = new Texture(makeTextureUrl(textureUrl));
        // currentMaterial.setTexture('normalMap', texture);

        break;
      }
      }
    }

    for (const material of materials.values()) {
      if (!material.getTexture('diffuseMap')) {
        material.setTexture('diffuseMap', Texture.blank);
      }
    }

    return materials;
  }
}

export class ObjModelLoader extends ModelLoader {
  public async load(buffer: ArrayBuffer): Promise<Entity[]> {
    const lines = new TextDecoder('utf-8').decode(buffer).split('\n');

    const objModel: IObjModel = {
      meshes: [],
      positions: [],
      uvs: [],
      normals: []
    };

    const getLastMesh = () => {
      if (objModel.meshes.length === 0) {
        objModel.meshes.push({
          name: 'default',
          indices: [],
          material: objModel.currentMaterial ?? null
        });
      }

      return objModel.meshes[objModel.meshes.length - 1];
    };

    const parseObjIndex = (token: string): ObjIndex => {
      let result: ObjIndex = [0, 0, 0];
      let tokenIndex = 0;

      const parts = token.split('/');

      for (const part of parts) {
        if (part.length === 0) {
          continue;
        }

        if (tokenIndex >= 3) {
          break;
        }

        result[tokenIndex++] = parseInt(part) - 1;
      }

      return result;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.length === 0 || trimmed.startsWith('#')) {
        continue;
      }

      const tokens = trimmed.split(/\s+/gi);

      if (tokens.length === 0) {
        continue;
      }

      const command = tokens[0];

      switch (command) {
      case 'v':
        objModel.positions.push([parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])]);

        break;
      case 'vn':
        objModel.normals = objModel.normals ?? [];
        objModel.normals.push([parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])]);

        break;
      case 'vt':
        objModel.uvs = objModel.uvs ?? [];
        objModel.uvs.push([parseFloat(tokens[1]), parseFloat(tokens[2])]);

        break;
      case 'f': {
        const lastMesh = getLastMesh();

        if (tokens.length > 5) {
          console.warn('Unsupported face with more than 4 vertices');

          continue;
        }

        for (let i = 0; i < tokens.length - 3; i++) {
          lastMesh.indices.push(parseObjIndex(tokens[1]));
          lastMesh.indices.push(parseObjIndex(tokens[2 + i]));
          lastMesh.indices.push(parseObjIndex(tokens[3 + i]));
        }

        break;
      }
      case 'o': {
        const meshName = tokens[1];
        objModel.meshes.push({
          name: meshName,
          indices: []
        });

        break;
      }
      case 'mtllib': {
        objModel.mtlLib = tokens[1];

        break;
      }
      case 'usemtl': {
        objModel.currentMaterial = tokens[1];
        
        getLastMesh().material = objModel.currentMaterial;

        break;
      }
      }
    }

    let mtlLib: Map<string, Material> = null;

    if (objModel.mtlLib) {
      try {
        const mtlLibUrl = `/data/models/${objModel.mtlLib}`;

        mtlLib = await MtlLoader.fromUrl(mtlLibUrl);
      } catch (err) {
        console.error(`Failed to load mtl file: ${err}`);
      }
    }
    
    let entities: Entity[] = [];

    for (const objMesh of objModel.meshes) {
      const vertices: IVertex[] = [];
      const indices: number[] = [];

      const hasIndices = objMesh.indices.length > 0;

      if (hasIndices) {
        const indexMap = new Map<string, number>();

        for (const index of objMesh.indices) {
          if (index[0] >= objModel.positions.length) {
            throw new Error('Invalid vertex position index');
          }

          if (!isNullish(index[1]) && (index[1] >= objModel.uvs?.length || !objModel.uvs)) {
            throw new Error('Invalid vertex uv index');
          }

          if (!isNullish(index[2]) && (index[2] >= objModel.normals?.length || !objModel.normals)) {
            throw new Error('Invalid vertex normal index');
          }

          const vertex: IVertex = {
            position: objModel.positions[index[0]],
            uv: !isNullish(index[1]) ? objModel.uvs[index[1]] : undefined,
            normal: !isNullish(index[2]) ? objModel.normals[index[2]] : undefined
          };

          const vertexKey = Mesh.vertexToString(vertex);

          if (indexMap.has(vertexKey)) {
            indices.push(indexMap.get(vertexKey));
          } else {
            const index = vertices.length;

            indexMap.set(vertexKey, index);

            vertices.push(vertex);
            indices.push(index);
          }
        }
      } else {
        for (let i = 0; i < objModel.positions.length; i++) {
          vertices.push({
            position: objModel.positions[i],
            uv: objModel.uvs[i],
            normal: objModel.normals[i]
          });
        }
      }

      const mesh = new Mesh(vertices, hasIndices ? indices : undefined);

      const entity = new Entity(objMesh.name);
      entity.mesh = mesh;

      if (objMesh.material && mtlLib) {
        const material = mtlLib.get(objMesh.material);

        if (material) {
          entity.material = material;
        }
      } else {
        const material = new Material();
        material.diffuseColor = Vector3.one();
        entity.material = material;
      }

      entities.push(entity);
    }

    return entities;
  }
}