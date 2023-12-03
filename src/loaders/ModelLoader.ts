import { Entity } from "../scene/Entity";

export abstract class ModelLoader {
  public static async getLoaderForExtension(extension: string): Promise<ModelLoader> {
    switch (extension) {
    case 'obj': {
      const { ObjModelLoader } = await import('./ObjModelLoader');

      return new ObjModelLoader();
    }
    case 'ply': // fallthrough
    case 'splat': {
      const { PlyModelLoader } = await import('./PlyModelLoader');

      return new PlyModelLoader();
    }
    default:
      throw new Error(`Unknown model extension: ${extension}`);
    }
  }

  public static async fromUrl(url: string | URL): Promise<Entity[]> {
    const loader = await ModelLoader.getLoaderForExtension(url.toString().split('.').pop());

    // fetch as ArrayBuffer
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    return loader.load(buffer);
  }

  public abstract load(buffer: ArrayBuffer): Promise<Entity[]>;
}