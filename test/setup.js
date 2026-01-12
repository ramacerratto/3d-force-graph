import { vi } from 'vitest';

// WebGL constants
const GL = {
  VERSION: 0x1F02,
  SHADING_LANGUAGE_VERSION: 0x8B8C,
  MAX_TEXTURE_SIZE: 0x0D33,
  MAX_VERTEX_ATTRIBS: 0x8869,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8B4C,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8B4D,
  MAX_VERTEX_UNIFORM_VECTORS: 0x8DFB,
  MAX_VARYING_VECTORS: 0x8DFC,
  MAX_FRAGMENT_UNIFORM_VECTORS: 0x8DFD,
  MAX_CUBE_MAP_TEXTURE_SIZE: 0x851C,
  MAX_RENDERBUFFER_SIZE: 0x84E8,
  MAX_VIEWPORT_DIMS: 0x0D3A,
  ALIASED_LINE_WIDTH_RANGE: 0x846E,
  ALIASED_POINT_SIZE_RANGE: 0x846D,
  SAMPLES: 0x80A9,
  DEPTH_BITS: 0x0D56,
  STENCIL_BITS: 0x0D57
};

// Mock WebGL context for Three.js
const createWebGLContext = () => {
  return {
    VERSION: GL.VERSION,
    getExtension: () => null,
    getParameter: (param) => {
      if (param === GL.VERSION) return 'WebGL 2.0';
      if (param === GL.SHADING_LANGUAGE_VERSION) return 'WebGL GLSL ES 3.00';
      if (param === GL.MAX_TEXTURE_SIZE) return 4096;
      if (param === GL.MAX_VERTEX_ATTRIBS) return 16;
      if (param === GL.MAX_TEXTURE_IMAGE_UNITS) return 16;
      if (param === GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS) return 16;
      if (param === GL.MAX_COMBINED_TEXTURE_IMAGE_UNITS) return 32;
      if (param === GL.MAX_VERTEX_UNIFORM_VECTORS) return 256;
      if (param === GL.MAX_VARYING_VECTORS) return 32;
      if (param === GL.MAX_FRAGMENT_UNIFORM_VECTORS) return 256;
      if (param === GL.MAX_CUBE_MAP_TEXTURE_SIZE) return 4096;
      if (param === GL.MAX_RENDERBUFFER_SIZE) return 4096;
      if (param === GL.MAX_VIEWPORT_DIMS) return [4096, 4096];
      if (param === GL.ALIASED_LINE_WIDTH_RANGE) return [1, 1];
      if (param === GL.ALIASED_POINT_SIZE_RANGE) return [1, 1024];
      if (param === GL.SAMPLES) return 4;
      if (param === GL.DEPTH_BITS) return 24;
      if (param === GL.STENCIL_BITS) return 8;
      return 0;
    },
    getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    useProgram: () => {},
    deleteShader: () => {},
    deleteProgram: () => {},
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    bufferSubData: () => {},
    deleteBuffer: () => {},
    enable: () => {},
    disable: () => {},
    depthFunc: () => {},
    depthMask: () => {},
    depthRange: () => {},
    frontFace: () => {},
    cullFace: () => {},
    blendEquation: () => {},
    blendEquationSeparate: () => {},
    blendFunc: () => {},
    blendFuncSeparate: () => {},
    blendColor: () => {},
    viewport: () => {},
    scissor: () => {},
    clearColor: () => {},
    clearDepth: () => {},
    clearStencil: () => {},
    clear: () => {},
    colorMask: () => {},
    stencilMask: () => {},
    stencilFunc: () => {},
    stencilOp: () => {},
    stencilFuncSeparate: () => {},
    stencilOpSeparate: () => {},
    stencilMaskSeparate: () => {},
    createTexture: () => ({}),
    bindTexture: () => {},
    texImage2D: () => {},
    texSubImage2D: () => {},
    texParameteri: () => {},
    texParameterf: () => {},
    pixelStorei: () => {},
    generateMipmap: () => {},
    activeTexture: () => {},
    deleteTexture: () => {},
    compressedTexImage2D: () => {},
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    getActiveAttrib: () => ({ name: '', type: 0, size: 0 }),
    getActiveUniform: () => ({ name: '', type: 0, size: 0 }),
    enableVertexAttribArray: () => {},
    disableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    vertexAttrib1f: () => {},
    vertexAttrib2f: () => {},
    vertexAttrib3f: () => {},
    vertexAttrib4f: () => {},
    vertexAttrib1fv: () => {},
    vertexAttrib2fv: () => {},
    vertexAttrib3fv: () => {},
    vertexAttrib4fv: () => {},
    uniform1i: () => {},
    uniform1f: () => {},
    uniform1fv: () => {},
    uniform1iv: () => {},
    uniform2f: () => {},
    uniform2fv: () => {},
    uniform2i: () => {},
    uniform2iv: () => {},
    uniform3f: () => {},
    uniform3fv: () => {},
    uniform3i: () => {},
    uniform3iv: () => {},
    uniform4f: () => {},
    uniform4fv: () => {},
    uniform4i: () => {},
    uniform4iv: () => {},
    uniformMatrix2fv: () => {},
    uniformMatrix3fv: () => {},
    uniformMatrix4fv: () => {},
    drawArrays: () => {},
    drawElements: () => {},
    drawArraysInstanced: () => {},
    drawElementsInstanced: () => {},
    createFramebuffer: () => ({}),
    bindFramebuffer: () => {},
    framebufferTexture2D: () => {},
    deleteFramebuffer: () => {},
    createRenderbuffer: () => ({}),
    bindRenderbuffer: () => {},
    renderbufferStorage: () => {},
    renderbufferStorageMultisample: () => {},
    framebufferRenderbuffer: () => {},
    deleteRenderbuffer: () => {},
    checkFramebufferStatus: () => 36053,
    readPixels: () => {},
    getContextAttributes: () => ({
      alpha: true,
      antialias: true,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference: 'default',
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false
    }),
    isContextLost: () => false,
    getSupportedExtensions: () => [],
    lineWidth: () => {},
    polygonOffset: () => {},
    sampleCoverage: () => {},
    flush: () => {},
    finish: () => {},
    hint: () => {},
    getError: () => 0,
    createVertexArray: () => ({}),
    bindVertexArray: () => {},
    deleteVertexArray: () => {},
    vertexAttribDivisor: () => {},
    drawBuffers: () => {},
    blitFramebuffer: () => {},
    readBuffer: () => {},
    invalidateFramebuffer: () => {},
    getBufferSubData: () => {},
    copyBufferSubData: () => {},
    getUniformBlockIndex: () => 0,
    uniformBlockBinding: () => {},
    createSampler: () => ({}),
    bindSampler: () => {},
    samplerParameteri: () => {},
    deleteSampler: () => {},
    fenceSync: () => ({}),
    deleteSync: () => {},
    clientWaitSync: () => 0,
    texStorage2D: () => {},
    texStorage3D: () => {},
    texImage3D: () => {},
    texSubImage3D: () => {},
    copyTexSubImage3D: () => {},
    compressedTexImage3D: () => {},
    compressedTexSubImage3D: () => {},
    canvas: { width: 800, height: 600, style: {} }
  };
};

HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
    return createWebGLContext();
  }
  if (type === '2d') {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      rotate: () => {},
      translate: () => {},
      transform: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      arcTo: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      measureText: () => ({ width: 0 }),
      fillText: () => {},
      strokeText: () => {},
      canvas: this
    };
  }
  return null;
};

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn(id => clearTimeout(id));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock performance.now if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now()
  };
}

// Mock PointerEvent if not fully available
if (typeof PointerEvent === 'undefined' || !PointerEvent.prototype) {
  global.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, params = {}) {
      super(type, params);
      this.pointerType = params.pointerType || 'mouse';
      this.pointerId = params.pointerId || 0;
    }
  };
}
