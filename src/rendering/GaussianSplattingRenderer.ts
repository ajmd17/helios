import { getPrimaryDomain } from '../../shared';
import { BasicObject } from '../core/BasicObject';
import { Matrix4 } from '../math/Matrix4';
import { Camera } from '../scene/Camera';
import { MeshFactory } from '../util/MeshFactory';
import { ShaderFactory } from '../util/ShaderFactory';
import { IRenderable } from './IRenderable';
import { Mesh } from './Mesh';
import { Shader } from './Shader';
import { VertexAttribute } from './VertexAttributes';

// import type definitions for wasm_bindgen
/// <reference path="src/helios/wasm/gaussian_splatting_sorter/pkg/gaussian_splatting_sorter.d.ts" />
/// <reference path="src/helios/wasm/gaussian_splatting_sorter/pkg/gaussian_splatting_sorter_bg.wasm.d.ts" />

function gaussianSplattingSorterWorker(self, url: string) {
  const worker = self;
  let viewProjectionMatrix: Float32Array = new Float32Array([
    1, 0, 0, 0, 
    0, 1, 0, 0, 
    0, 0, 1, 0, 
    0, 0, 0, 1
  ]);
  let lastSortedViewProjectionMatrix: Float32Array = new Float32Array([
    1, 0, 0, 0, 
    0, 1, 0, 0, 
    0, 0, 1, 0, 
    0, 0, 0, 1
  ]);

  let sortTimeout = null;

  importScripts(`${url}/wasm/gaussian_splatting_sorter.js`);

  wasm_bindgen(`${url}/wasm/gaussian_splatting_sorter_bg.wasm`).then((wasm) => {
    const wasmMemory = wasm.memory as WebAssembly.Memory;

    wasm.init();

    const runSort = (viewProjectionMatrix: Float32Array) => {
      const now = performance.now();

      wasm.set_camera_matrix(
        viewProjectionMatrix[0], viewProjectionMatrix[1], viewProjectionMatrix[2], viewProjectionMatrix[3],
        viewProjectionMatrix[4], viewProjectionMatrix[5], viewProjectionMatrix[6], viewProjectionMatrix[7],
        viewProjectionMatrix[8], viewProjectionMatrix[9], viewProjectionMatrix[10], viewProjectionMatrix[11],
        viewProjectionMatrix[12], viewProjectionMatrix[13], viewProjectionMatrix[14], viewProjectionMatrix[15]
      );

      const numInstancesToRender: number = wasm.perform_sort();

      const sortedPositionsBuffer = new Float32Array(wasmMemory.buffer, wasm.get_sorted_positions(), numInstancesToRender * 3);
      const sortedRotationsBuffer = new Float32Array(wasmMemory.buffer, wasm.get_sorted_rotations(), numInstancesToRender * 4);
      const sortedScalesBuffer = new Float32Array(wasmMemory.buffer, wasm.get_sorted_scales(), numInstancesToRender * 3);
      const sortedColorsBuffer = new Float32Array(wasmMemory.buffer, wasm.get_sorted_colors(), numInstancesToRender * 4);

      // Post the sorted data back to the main thread
      worker.postMessage({
        type: 'SortResults',
        positions: sortedPositionsBuffer,
        rotations: sortedRotationsBuffer,
        scales: sortedScalesBuffer,
        colors: sortedColorsBuffer,
        numInstances: numInstancesToRender,
        viewProjectionMatrix
      });

      const elapsed = performance.now() - now;

      console.log(`Sort took ${elapsed}ms`);
    };

    worker.postMessage({
      type: 'WorkerReady'
    });

    worker.onmessage = function (e) {
      if (e.data.type === 'SetBuffers') {
        const positions = e.data.positions as Float32Array;
        const rotations = e.data.rotations as Float32Array;
        const scales = e.data.scales as Float32Array;
        const colors = e.data.colors as Float32Array;

        if (!positions || !rotations || !scales || !colors) {
          throw new Error('Invalid buffer(s) received');
        }
        
        const wasmPositionsBufferMemory: number = wasm.allocate_buffer(positions.length * 4);
        new Float32Array(wasmMemory.buffer, wasmPositionsBufferMemory, positions.length).set(positions);
        wasm.set_positions(wasmPositionsBufferMemory, positions.length);

        const wasmRotationsBufferMemory: number = wasm.allocate_buffer(rotations.length * 4);
        new Float32Array(wasmMemory.buffer, wasmRotationsBufferMemory, rotations.length).set(rotations);
        wasm.set_rotations(wasmRotationsBufferMemory, rotations.length);

        const wasmScalesBufferMemory: number = wasm.allocate_buffer(scales.length * 4);
        new Float32Array(wasmMemory.buffer,wasmScalesBufferMemory, scales.length).set(scales);
        wasm.set_scales(wasmScalesBufferMemory, scales.length);

        const wasmColorsBufferMemory: number = wasm.allocate_buffer(colors.length * 4);
        new Float32Array(wasmMemory.buffer, wasmColorsBufferMemory, colors.length).set(colors);
        wasm.set_colors(wasmColorsBufferMemory, colors.length);

        return;
      }

      if (e.data.type === 'UpdateViewProjectionMatrix' || e.data.type === 'PerformSort') {
        if (e.data.viewProjectionMatrix) {
          viewProjectionMatrix = e.data.viewProjectionMatrix;
        }

        if (e.data.type === 'UpdateViewProjectionMatrix') {
          wasm.set_camera_matrix(
            viewProjectionMatrix[0], viewProjectionMatrix[1], viewProjectionMatrix[2], viewProjectionMatrix[3],
            viewProjectionMatrix[4], viewProjectionMatrix[5], viewProjectionMatrix[6], viewProjectionMatrix[7],
            viewProjectionMatrix[8], viewProjectionMatrix[9], viewProjectionMatrix[10], viewProjectionMatrix[11],
            viewProjectionMatrix[12], viewProjectionMatrix[13], viewProjectionMatrix[14], viewProjectionMatrix[15]
          );

          return;
        }
      }

      if (e.data.type === 'PerformSort') {
        if (sortTimeout) {
          return;
        }

        runSort(lastSortedViewProjectionMatrix)

        sortTimeout = setTimeout(() => {
          if (lastSortedViewProjectionMatrix !== viewProjectionMatrix) {
            runSort(viewProjectionMatrix);
          }

          sortTimeout = null;
          lastSortedViewProjectionMatrix = viewProjectionMatrix;
        }, 0);
      }
    };
  });

  // worker.onmessage = function (e) {
  //   if (e.data.type === 'UpdateViewProjectionMatrix' || e.data.type === 'PerformSort') {
  //     if (e.data.viewProjectionMatrix) {
  //       viewProjectionMatrix.set(e.data.viewProjectionMatrix);
  //     }
  //   }

  //   if (e.data.type === 'PerformSort') {
  //     // Don't sort if the view projection matrix hasn't changed
  //     if (viewProjectionMatrix.every((value, index) => value.toFixed(5) === lastSortedViewProjectionMatrix[index].toFixed(5))) {
  //       return;
  //     }

  //     if (sortTimeout) {
  //       // clearTimeout(sortTimeout);
  //       // sortTimeout = null;
  //       return;
  //     }

  //     sortTimeout = setTimeout(() => {
  //       console.log('Begin sort');

  //       runSort({
  //         positions: e.data.positions,
  //         rotations: e.data.rotations,
  //         scales: e.data.scales,
  //         colors: e.data.colors
  //       });

  //       console.log('End sort');
  //     }, 0);
  //   }
  // };
}

export interface IGaussianSplattingModel {
  positions: Float32Array;
  rotations: Float32Array;
  scales: Float32Array;
  colors: Float32Array;
}

export class GaussianSplattingInstance extends BasicObject implements IRenderable {
  private _quadMesh: Mesh = null;

  private _gaussianSplattingModel: IGaussianSplattingModel = null;

  private _worker: Worker = null;
  private _numInstances: number = 0;
  private _numInstancesToRender: number = 0;
  private _lastSortedViewProjectionMatrix: Matrix4 = null;

  private _lastViewMatrix: Matrix4 = null;

  constructor(gaussianSplattingModel: IGaussianSplattingModel) {
    super();

    this._gaussianSplattingModel = gaussianSplattingModel;
  }

  private _createWorker() {
    const blob = new Blob([`(${gaussianSplattingSorterWorker.toString()})(self, "${getPrimaryDomain({ usePublicFacingDomain: true })}")`], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    this._worker = new Worker(url);

    this._worker.onmessage = (e) => {
      if (e.data.type === 'WorkerReady') {
        this._sendBuffersToWorker();

        return;
      }

      if (e.data.type === 'SortResults') {
        const positionsBuffer = new Float32Array(e.data.positions);
        const rotationsBuffer = new Float32Array(e.data.rotations);
        const scalesBuffer = new Float32Array(e.data.scales);
        const colorsBuffer = new Float32Array(e.data.colors);

        this._numInstancesToRender = e.data.numInstances;
        this._lastSortedViewProjectionMatrix = new Matrix4(Array.from(e.data.viewProjectionMatrix) as any);

        this._quadMesh.setAdditionalBuffer(VertexAttribute.CENTER, positionsBuffer);
        this._quadMesh.setAdditionalBuffer(VertexAttribute.ROTATION, rotationsBuffer);
        this._quadMesh.setAdditionalBuffer(VertexAttribute.SCALE, scalesBuffer);
        this._quadMesh.setAdditionalBuffer(VertexAttribute.COLOR, colorsBuffer);
      }
    };
  }

  protected onInit() {
    this._quadMesh = MeshFactory.instance.quad();

    this._quadMesh.vertexAttributes.add(VertexAttribute.CENTER);
    this._quadMesh.vertexAttributes.add(VertexAttribute.ROTATION);
    this._quadMesh.vertexAttributes.add(VertexAttribute.SCALE);
    this._quadMesh.vertexAttributes.add(VertexAttribute.COLOR);

    this._quadMesh.setAdditionalBuffer(VertexAttribute.CENTER, this._gaussianSplattingModel.positions);
    this._quadMesh.setAdditionalBuffer(VertexAttribute.ROTATION, this._gaussianSplattingModel.rotations);
    this._quadMesh.setAdditionalBuffer(VertexAttribute.SCALE, this._gaussianSplattingModel.scales);
    this._quadMesh.setAdditionalBuffer(VertexAttribute.COLOR, this._gaussianSplattingModel.colors);
    
    this._quadMesh.init(this.gl);

    this._numInstances = this._gaussianSplattingModel.positions.length / 3;
    this._numInstancesToRender = this._numInstances;

    this._createWorker();
  }

  protected onDestroy() {
    this._quadMesh.destroy();
    this._quadMesh = null;

    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
  }

  private _sendBuffersToWorker() {
    this._worker.postMessage({
      type: 'SetBuffers',
      positions: this._gaussianSplattingModel.positions,
      rotations: this._gaussianSplattingModel.rotations,
      scales: this._gaussianSplattingModel.scales,
      colors: this._gaussianSplattingModel.colors
    });
  }

  private _requestSort(modelViewProjectionMatrix?: Matrix4) {
    this._worker.postMessage({
      type: 'PerformSort',
      viewProjectionMatrix: modelViewProjectionMatrix?.values
    });
  }

  public update(delta: number, camera: Camera, parentTransform?: Matrix4): void {
    if (!this._lastViewMatrix || !this._lastViewMatrix.equals(camera.viewMatrix) || this._gaussianSplattingModel.positions.length / 3 !== this._numInstances) {
      const modelViewProjectionMatrix = parentTransform
        ? Matrix4.multiply(camera.viewProjectionMatrix, parentTransform)
        : camera.viewProjectionMatrix;

      this._requestSort(modelViewProjectionMatrix);

      this._lastViewMatrix = camera.viewMatrix;
    }
  }

  public render(camera: Camera, parentTransform?: Matrix4): void {
    if (!this._numInstancesToRender) {
      return;
    }

    const gl = this.gl;

    gl.bindVertexArray(this._quadMesh['_vertexArrayObject']);
    // gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, this._numInstances);
    gl.drawElementsInstanced(gl.TRIANGLES, this._quadMesh.numIndices, gl.UNSIGNED_INT, 0, this._numInstancesToRender);
    gl.bindVertexArray(null);
  }
}

export class GaussianSplattingRenderer extends BasicObject implements IRenderable {
  private _instances: GaussianSplattingInstance[] = [];

  protected onInit() {
    for (let instance of this._instances) {
      instance.init(this.gl);
    }
  }

  protected onDestroy() {
    for (let instance of this._instances) {
      instance.destroy();
    }
  }

  public addInstance(instance: GaussianSplattingInstance) {
    this._instances.push(instance);

    if (this.isInitialized) {
      instance.init(this.gl);
    }
  }

  public removeInstance(instance: GaussianSplattingInstance) {
    const index = this._instances.indexOf(instance);

    if (index >= 0) {
      this._instances.splice(index, 1);

      if (this.isInitialized) {
        instance.destroy();
      }
    }
  }

  public update(delta: number, camera: Camera, parentTransform?: Matrix4): void {
    for (let instance of this._instances) {
      if (instance.update) {
        instance.update(delta, camera, parentTransform);
      }
    }
  }

  public render(camera: Camera, parentTransform?: Matrix4): void {
    for (let instance of this._instances) {
      instance.render(camera, parentTransform);
    }
  }
}