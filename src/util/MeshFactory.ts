import { Vector3 } from "../math/Vector3";
import { IVertex } from "../rendering/IVertex";
import { Mesh } from "../rendering/Mesh";

export class MeshFactory {
  private static _instance: MeshFactory = null;

  public static get instance() {
    if (!MeshFactory._instance) {
      MeshFactory._instance = new MeshFactory();
    }

    return MeshFactory._instance;
  }

  cube(): Mesh {
    return new Mesh([
      { position: [-1.0, 1.0, 1.0], uv: [1.0, 1.0], normal: [-1.0, 0.0, 0.0] },
      { position: [-1.0, 1.0, -1.0], uv: [0.0, 1.0], normal: [-1.0, 0.0, 0.0] },
      { position: [-1.0, -1.0, -1.0], uv: [0.0, 0.0], normal: [-1.0, 0.0, 0.0] },

      { position: [-1.0, -1.0, -1.0], uv: [0.0, 0.0], normal: [-1.0, 0.0, 0.0] },
      { position: [-1.0, -1.0, 1.0], uv: [1.0, 0.0], normal: [-1.0, 0.0, 0.0] },
      { position: [-1.0, 1.0, 1.0], uv: [1.0, 1.0], normal: [-1.0, 0.0, 0.0] },

      { position: [1.0, 1.0, 1.0], uv: [1.0, 1.0], normal: [0.0, 0.0, 1.0] },
      { position: [-1.0, 1.0, 1.0], uv: [0.0, 1.0], normal: [0.0, 0.0, 1.0] },
      { position: [-1.0, -1.0, 1.0], uv: [0.0, 0.0], normal: [0.0, 0.0, 1.0] },

      { position: [-1.0, -1.0, 1.0], uv: [0.0, 0.0], normal: [0.0, 0.0, 1.0] },
      { position: [1.0, -1.0, 1.0], uv: [1.0, 0.0], normal: [0.0, 0.0, 1.0] },
      { position: [1.0, 1.0, 1.0], uv: [1.0, 1.0], normal: [0.0, 0.0, 1.0] },

      { position: [1.0, -1.0, -1.0], uv: [0.0, 0.0], normal: [1.0, 0.0, 0.0] },
      { position: [1.0, 1.0, -1.0], uv: [0.0, 1.0], normal: [1.0, 0.0, 0.0] },
      { position: [1.0, 1.0, 1.0], uv: [1.0, 1.0], normal: [1.0, 0.0, 0.0] },

      { position: [1.0, 1.0, 1.0], uv: [1.0, 1.0], normal: [1.0, 0.0, 0.0] },
      { position: [1.0, -1.0, 1.0], uv: [1.0, 0.0], normal: [1.0, 0.0, 0.0] },
      { position: [1.0, -1.0, -1.0], uv: [0.0, 0.0], normal: [1.0, 0.0, 0.0] },

      { position: [-1.0, -1.0, -1.0], uv: [0.0, 0.0], normal: [0.0, 0.0, -1.0] },
      { position: [-1.0, 1.0, -1.0], uv: [0.0, 1.0], normal: [0.0, 0.0, -1.0] },
      { position: [1.0, 1.0, -1.0], uv: [1.0, 1.0], normal: [0.0, 0.0, -1.0] },

      { position: [1.0, 1.0, -1.0], uv: [1.0, 1.0], normal: [0.0, 0.0, -1.0] },
      { position: [1.0, -1.0, -1.0], uv: [1.0, 0.0], normal: [0.0, 0.0, -1.0] },
      { position: [-1.0, -1.0, -1.0], uv: [0.0, 0.0], normal: [0.0, 0.0, -1.0] },

      { position: [1.0, 1.0, -1.0], uv: [0.0, 0.0], normal: [0.0, 1.0, 0.0] },
      { position: [-1.0, 1.0, -1.0], uv: [0.0, 1.0], normal: [0.0, 1.0, 0.0] },
      { position: [-1.0, 1.0, 1.0], uv: [1.0, 1.0], normal: [0.0, 1.0, 0.0] },

      { position: [-1.0, 1.0, 1.0], uv: [1.0, 1.0], normal: [0.0, 1.0, 0.0] },
      { position: [1.0, 1.0, 1.0], uv: [1.0, 0.0], normal: [0.0, 1.0, 0.0] },
      { position: [1.0, 1.0, -1.0], uv: [0.0, 0.0], normal: [0.0, 1.0, 0.0] },

      { position: [-1.0, -1.0, 1.0], uv: [1.0, 1.0], normal: [0.0, -1.0, 0.0] },
      { position: [-1.0, -1.0, -1.0], uv: [0.0, 1.0], normal: [0.0, -1.0, 0.0] },
      { position: [1.0, -1.0, -1.0], uv: [0.0, 0.0], normal: [0.0, -1.0, 0.0] },

      { position: [1.0, -1.0, -1.0], uv: [0.0, 0.0], normal: [0.0, -1.0, 0.0] },
      { position: [1.0, -1.0, 1.0], uv: [1.0, 0.0], normal: [0.0, -1.0, 0.0] },
      { position: [-1.0, -1.0, 1.0], uv: [1.0, 1.0], normal: [0.0, -1.0, 0.0] }
    ]);
  }

  quad(): Mesh {
    return new Mesh([
      { position: [-1.0, -1.0, 0.0], uv: [0.0, 0.0], normal: [0.0, 0.0, -1.0] },
      { position: [1.0, -1.0, 0.0], uv: [1.0, 0.0], normal: [0.0, 0.0, -1.0] },
      { position: [1.0,  1.0, 0.0], uv: [1.0, 1.0], normal: [0.0, 0.0, -1.0] },
      { position: [-1.0,  1.0, 0.0], uv: [0.0, 1.0], normal: [0.0, 0.0, -1.0] }
    ], [
      0, 3, 2,
      0, 2, 1
    ]);
  }

  icosphere(subdivisions: number): Mesh {
    const t = (1.0 + Math.sqrt(5.0)) / 2.0;

    const vertices: IVertex[] = [
      { position: [-1.0, t, 0.0] },
      { position: [1.0, t, 0.0] },
      { position: [-1.0, -t, 0.0] },
      { position: [1.0, -t, 0.0] },

      { position: [0.0, -1.0, t] },
      { position: [0.0, 1.0, t] },
      { position: [0.0, -1.0, -t] },
      { position: [0.0, 1.0, -t] },

      { position: [t, 0.0, -1.0] },
      { position: [t, 0.0, 1.0] },
      { position: [-t, 0.0, -1.0] },
      { position: [-t, 0.0, 1.0] }
    ];

    const indices: number[] = [
      0, 11, 5,
      0, 5, 1,
      0, 1, 7,
      0, 7, 10,
      0, 10, 11,

      1, 5, 9,
      5, 11, 4,
      11, 10, 2,
      10, 7, 6,
      7, 1, 8,

      3, 9, 4,
      3, 4, 2,
      3, 2, 6,
      3, 6, 8,
      3, 8, 9,

      4, 9, 5,
      2, 4, 11,
      6, 2, 10,
      8, 6, 7,
      9, 8, 1
    ];

    const midpoints: Record<string, number> = {};

    const getMidpointIndex = (index1: number, index2: number) => {
      const key = `${index1},${index2}`;

      if (midpoints[key] !== undefined) {
        return midpoints[key];
      }

      const vertex1 = vertices[index1];
      const vertex2 = vertices[index2];
      const midpoint = Vector3.normalize(Vector3.add(new Vector3(...vertex1.position), new Vector3(...vertex2.position)));

      const index = vertices.length;

      vertices.push({ position: midpoint.values });

      midpoints[key] = index;

      return index;
    };

    for (let i = 0; i < subdivisions; i++) {
      const newIndices: number[] = [];

      for (let j = 0; j < indices.length; j += 3) {
        const index1 = indices[j];
        const index2 = indices[j + 1];
        const index3 = indices[j + 2];

        const index12 = getMidpointIndex(index1, index2);
        const index23 = getMidpointIndex(index2, index3);
        const index31 = getMidpointIndex(index3, index1);

        newIndices.push(
          index1, index12, index31,
          index2, index23, index12,
          index3, index31, index23,
          index12, index23, index31
        );
      }

      indices.splice(0, indices.length, ...newIndices);
    }

    for (let vertex of vertices) {
      vertex.normal = vertex.position;
    }

    return new Mesh(vertices, indices);
  }
}