import { isString } from '../../shared';
import { BasicObject } from '../core/BasicObject';
import { MathUtil } from '../math/MathUtil';

export class Texture extends BasicObject {
  private static _blankTexture: Texture = null;

  protected _texture: WebGLTexture = null;
  private _image: HTMLImageElement = null;

  protected _width: number = 0;
  protected _height: number = 0;

  private _filterMode: number;

  protected _isLoaded: boolean = false;

  private _isDepthTexture: boolean = false;
  private _hasMipmaps?: boolean;

  public static get blank() {
    if (!Texture._blankTexture) {
      Texture._blankTexture = new Texture(1, 1);
      Texture._blankTexture.init(null);
    }

    return Texture._blankTexture;
  }

  constructor(element: HTMLImageElement);
  constructor(url: string | URL);
  constructor(width: number, height: number);
  constructor(elementOrUrlOrWidth: HTMLImageElement | string | URL | number, height?: number) {
    super((isString(elementOrUrlOrWidth) || elementOrUrlOrWidth instanceof URL) ? elementOrUrlOrWidth.toString() : 'Unnamed Texture');

    if (typeof elementOrUrlOrWidth === 'number') {
      this._width = elementOrUrlOrWidth;
      this._height = height;
    } else if (typeof elementOrUrlOrWidth === 'string' || elementOrUrlOrWidth instanceof URL) {
      this._image = new Image();
      this._image.src = elementOrUrlOrWidth.toString();
    } else {
      this._image = elementOrUrlOrWidth;
    }
  }

  get isDepthTexture(): boolean {
    return this._isDepthTexture;
  }

  set isDepthTexture(value: boolean) {
    this._isDepthTexture = value;
  }

  get hasMipmaps(): boolean {
    return this._hasMipmaps;
  }

  set hasMipmaps(value: boolean) {
    this._hasMipmaps = value;
  }

  get filterMode() {
    return this._filterMode;
  }

  set filterMode(value: number) {
    this._filterMode = value;
  }

  protected onInit() {
    if (typeof this._hasMipmaps === 'undefined') {
      this._hasMipmaps = !this.isDepthTexture && MathUtil.isPowerOf2(this._width) && MathUtil.isPowerOf2(this._height);
    }

    const initTexture = () => {
      const gl = this.gl;

      const internalFormat = this._isDepthTexture ? gl.DEPTH_COMPONENT24 : gl.RGBA;
      const format = this._isDepthTexture ? gl.DEPTH_COMPONENT : gl.RGBA;
      const dataType = this._isDepthTexture ? gl.UNSIGNED_INT : gl.UNSIGNED_BYTE;

      const filterMode = this._filterMode ?? (this._isDepthTexture
        ? gl.NEAREST
        : this._hasMipmaps
          ? gl.LINEAR_MIPMAP_LINEAR
          : gl.LINEAR);

      this._texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._texture);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode);

      if (this._image) {
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, dataType, this._image);

        this._width = this._image.width;
        this._height = this._image.height;
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, this._width, this._height, 0, format, dataType, null);
      }

      if (this._hasMipmaps) {
        gl.generateMipmap(gl.TEXTURE_2D);
      }

      this._isLoaded = true;
    };

    if (this._image) {
      this._image.onload = () => {
        initTexture();

        this._image.onload = null;
        this._image.onerror = null;
        this._image = null;
      };

      this._image.onerror = () => {
        throw new Error(`Error loading image: ${this._image.src}`);
      };
    } else if (this._width != 0 && this._height != 0) {
      initTexture();
    } else {
      throw new Error('Invalid texture');
    }
  }

  protected onDestroy() {
    const gl = this.gl;

    if (this._image) {
      this._image.onload = null;
      this._image.onerror = null;
    }

    if (this._isLoaded) {
      gl.deleteTexture(this._texture);
    }

    this._texture = null;
  }

  public get isLoaded(): boolean {
    return this._isLoaded;
  }

  public get width(): number {
    return this._width;
  }

  public get height(): number {
    return this._height;
  }

  public get webglTexture(): WebGLTexture {
    return this._texture;
  }

  public bind(slot: number) {
    const gl = this.gl;

    gl.activeTexture(gl.TEXTURE0 + slot);

    gl.bindTexture(gl.TEXTURE_2D, this._texture);
  }
}

type TextureCubeSourceList = [HTMLImageElement | string | URL, HTMLImageElement | string | URL, HTMLImageElement | string | URL, HTMLImageElement | string | URL, HTMLImageElement | string | URL, HTMLImageElement | string | URL];

export class TextureCube extends Texture {
  private _images: TextureCubeSourceList = null;

  constructor(images: TextureCubeSourceList) {
    super(null);

    this._images = images;
  }

  get hasMipmaps(): boolean {
    return true;
  }

  protected onInit() {
    if (!this._images) {
      return;
    }

    const initTexture = (images: HTMLImageElement[]) => {
      const gl = this.gl;

      this._texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._texture);

      const internalFormat = gl.RGBA;
      const format = gl.RGBA;
      const dataType = gl.UNSIGNED_BYTE;

      for (let i = 0; i < this._images.length; i++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, internalFormat, format, dataType, images[i]);
      }

      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      if (this.hasMipmaps) {
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }

      const ext = gl.getExtension('EXT_texture_filter_anisotropic') || 
        gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
        gl.getExtension('MOZ_EXT_texture_filter_anisotropic');

      if (ext) {
        const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(gl.TEXTURE_CUBE_MAP, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
      }
    };

    const promises: Promise<HTMLImageElement>[] = [];

    for (let image of this._images) {
      if (typeof image === 'string' || image instanceof URL) {
        promises.push(new Promise((resolve, reject) => {
          const img = new Image();
          img.src = image.toString();
          img.onload = () => resolve(img);
          img.onerror = reject;
        }));
      } else {
        promises.push(Promise.resolve(image));
      }
    }

    Promise.all(promises).then(images => {
      if (!images.every(image => image.width === image.height)) {
        throw new Error('Invalid image dimensions: all images must be square');
      }

      if (!images.every(image => image.width === images[0].width && image.height === images[0].height)) {
        throw new Error('Invalid image dimensions: all images must have the same dimensions');
      }

      this._width = images[0].width;
      this._height = images[0].height;

      initTexture(images);

      this._isLoaded = true;
    });
  }

  public bind(slot: number) {
    const gl = this.gl;

    gl.activeTexture(this.gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._texture);
  }
}