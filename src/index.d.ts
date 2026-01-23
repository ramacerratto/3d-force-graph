import { Scene, Light, Camera, WebGLRenderer, WebGLRendererParameters, Renderer, Object3D } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ThreeForceGraphGeneric, NodeObject, LinkObject } from 'three-forcegraph';
import * as THREE from 'three';

export interface ConfigOptions {
  controlType?: 'trackball' | 'orbit' | 'fly'
  rendererConfig?: WebGLRendererParameters,
  extraRenderers?: Renderer[]
}

type Accessor<In, Out> = Out | string | ((obj: In) => Out);
type ObjAccessor<T, InT = object> = Accessor<InT, T>;

type Label = string | HTMLElement;

type Coords = { x: number; y: number; z: number; };

// don't surface these internal props from inner ThreeForceGraph
type ExcludedInnerProps = 'onLoading' | 'onFinishLoading' | 'onUpdate' | 'onFinishUpdate' | 'tickFrame' | 'd3AlphaTarget' | 'resetCountdown';

interface GraphData<N extends NodeObject = NodeObject, L extends LinkObject<N> = LinkObject<N>> {
  nodes: N[];
  links: L[];
}

interface ApiLoaderResult<N extends NodeObject = NodeObject, L extends LinkObject<N> = LinkObject<N>> {
  nodes: N[];
  links: L[];
}

interface ForceGraph3DGenericInstance<ChainableInstance, N extends NodeObject = NodeObject, L extends LinkObject<N> = LinkObject<N>>
  extends Omit<ThreeForceGraphGeneric<ChainableInstance, N, L>, ExcludedInnerProps> {

  _destructor(): void;

  // API loader configuration
  apiBaseUrl(): string;
  apiBaseUrl(url: string): ChainableInstance;
  apiInitEndpoint(): string;
  apiInitEndpoint(endpoint: string): ChainableInstance;
  apiLoadNodesEndpoint(): string;
  apiLoadNodesEndpoint(endpoint: string): ChainableInstance;
  apiFetchOptions(): RequestInit;
  apiFetchOptions(options: RequestInit): ChainableInstance;
  onApiError(callback: (error: Error, methodName: string) => void): ChainableInstance;

  // API loader methods
  initGraphFromApi(dimensionId?: string | number): Promise<GraphData<N, L>>;
  loadNextNodes(nodeIds: Array<string | number>): Promise<ApiLoaderResult<N, L>>;

  // Container layout
  width(): number;
  width(width: number): ChainableInstance;
  height(): number;
  height(height: number): ChainableInstance;
  backgroundColor(): string;
  backgroundColor(color: string): ChainableInstance;
  showNavInfo(): boolean;
  showNavInfo(enabled: boolean): ChainableInstance;

  // Labels
  nodeLabel(): ObjAccessor<Label, N>;
  nodeLabel(textAccessor: ObjAccessor<Label, N>): ChainableInstance;
  linkLabel(): ObjAccessor<Label, L>;
  linkLabel(textAccessor: ObjAccessor<Label, L>): ChainableInstance;

  // Interaction
  onNodeClick(callback: (node: N, event: MouseEvent) => void): ChainableInstance;
  onNodeRightClick(callback: (node: N, event: MouseEvent) => void): ChainableInstance;
  onNodeHover(callback: (node: N | null, previousNode: N | null) => void): ChainableInstance;
  onNodeDrag(callback: (node: N, translate: Coords) => void): ChainableInstance;
  onNodeDragEnd(callback: (node: N, translate: Coords) => void): ChainableInstance;
  onLinkClick(callback: (link: L, event: MouseEvent) => void): ChainableInstance;
  onLinkRightClick(callback: (link: L, event: MouseEvent) => void): ChainableInstance;
  onLinkHover(callback: (link: L | null, previousLink: L | null) => void): ChainableInstance;
  onBackgroundClick(callback: (event: MouseEvent) => void): ChainableInstance;
  onBackgroundRightClick(callback: (event: MouseEvent) => void): ChainableInstance;
  linkHoverPrecision(): number;
  linkHoverPrecision(precision: number): ChainableInstance;
  showPointerCursor(): ObjAccessor<boolean, N | L>;
  showPointerCursor(objAccessor: ObjAccessor<boolean, N | L>): ChainableInstance;
  enablePointerInteraction(): boolean;
  enablePointerInteraction(enable: boolean): ChainableInstance;
  enableNodeDrag(): boolean;
  enableNodeDrag(enable: boolean): ChainableInstance;
  enableNavigationControls(): boolean;
  enableNavigationControls(enable: boolean): ChainableInstance;

  // Render control
  pauseAnimation(): ChainableInstance;
  resumeAnimation(): ChainableInstance;
  cameraPosition(): Coords;
  cameraPosition(position: Partial<Coords>, lookAt?: Coords, transitionMs?: number): ChainableInstance;
  zoomToFit(durationMs?: number, padding?: number, nodeFilter?: (node: N) => boolean): ChainableInstance;
  postProcessingComposer(): EffectComposer;
  lights(): Light[];
  lights(lights: Light[]): ChainableInstance;
  scene(): Scene;
  camera(): Camera;
  renderer(): WebGLRenderer;
  controls(): object;

  // Camera orbit
  cameraOrbit(): boolean;
  cameraOrbit(enabled: boolean): ChainableInstance;
  cameraOrbitSpeed(): number;
  cameraOrbitSpeed(degreesPerSecond: number): ChainableInstance;
  cameraOrbitDistance(): number | null;
  cameraOrbitDistance(distance: number | null): ChainableInstance;
  cameraOrbitTarget(): Coords;
  cameraOrbitTarget(target: Partial<Coords>): ChainableInstance;
  cameraOrbitAxis(): 'x' | 'y' | 'z';
  cameraOrbitAxis(axis: 'x' | 'y' | 'z'): ChainableInstance;
  cameraOrbitDirection(): 1 | -1;
  cameraOrbitDirection(direction: 1 | -1): ChainableInstance;
  startOrbit(): ChainableInstance;
  stopOrbit(): ChainableInstance;
  isOrbiting(): boolean;

  // Node animations
  nodeHoverAnimation(): string | null;
  nodeHoverAnimation(animationName: string | null): ChainableInstance;
  nodeHoverAnimationOptions(): AnimationOptions;
  nodeHoverAnimationOptions(options: AnimationOptions): ChainableInstance;
  animationManager(): IAnimationManager;
  setAnimationManager(manager: IAnimationManager): ChainableInstance;
  startNodeAnimation(node: N, animationName: string, options?: AnimationOptions): number;
  stopNodeAnimation(node: N, animationName?: string, immediate?: boolean): ChainableInstance;
  toggleNodeAnimation(node: N, animationName: string, options?: AnimationOptions, immediate?: boolean): boolean;
  isNodeAnimating(node: N, animationName?: string): boolean;

  // Utility
  graph2ScreenCoords(x: number, y: number, z: number): Coords;
  screen2GraphCoords(screenX: number, screenY: number, distance: number): Coords;
}

export type { NodeObject, LinkObject };

export type ForceGraph3DInstance<NodeType extends NodeObject = NodeObject, LinkType extends LinkObject<NodeType> = LinkObject<NodeType>>
  = ForceGraph3DGenericInstance<ForceGraph3DInstance<NodeType, LinkType>, NodeType, LinkType>;

interface IForceGraph3D<NodeType extends NodeObject = NodeObject, LinkType extends LinkObject<NodeType> = LinkObject<NodeType>> {
  new(element: HTMLElement, configOptions?: ConfigOptions): ForceGraph3DInstance<NodeType, LinkType>;
}

declare const ForceGraph3D: IForceGraph3D;

export default ForceGraph3D;

// Node Object Factory

export type NodeObjectCreator<N extends NodeObject = NodeObject> = (
  node: N,
  THREE: typeof import('three'),
  factory?: INodeObjectFactory
) => Object3D;

export interface FactoryStats {
  registeredTypes: number;
  activeObjects: number;
  pooledObjects: Record<string, number>;
  cachedGeometries: number;
  cachedMaterials: number;
}

/**
 * Node Object Factory interface.
 * Manages THREE.js objects for nodes with object pooling and lifecycle management.
 */
export interface ActiveObjectEntry {
  nodeId: string | number;
  object: Object3D;
  typeName: string;
}

export interface INodeObjectFactory {
  registerType<N extends NodeObject = NodeObject>(typeName: string, creatorFn: NodeObjectCreator<N>): void;
  unregisterType(typeName: string): boolean;
  hasType(typeName: string): boolean;
  getRegisteredTypes(): string[];
  getGeometry<G extends THREE.BufferGeometry>(key: string, createFn: () => G): G;
  getMaterial<M extends THREE.Material>(key: string, createFn: () => M): M;
  createObject<N extends NodeObject = NodeObject>(node: N, THREE: typeof import('three'), typeAttribute?: string): Object3D | null;
  releaseObject(nodeId: string | number): void;
  getActiveObject(nodeId: string | number): Object3D | null;
  getActiveObjects(): ActiveObjectEntry[];
  clearPools(): void;
  clear(): void;
  disposeCache(): void;
  dispose(): void;
  createAccessor<N extends NodeObject = NodeObject>(THREE: typeof import('three'), fallbackAccessor?: ((node: N) => Object3D | null) | Object3D | null, typeAttribute?: string): (node: N) => Object3D | null;
  getStats(): FactoryStats;
}

export const nodeObjectFactory: INodeObjectFactory;
export const NodeObjectFactory: new () => INodeObjectFactory;

export interface NodeObjectTypeModule {
  typeName: string;
  create: NodeObjectCreator;
}

export function registerBuiltInTypes(): void;

export const builtInTypes: {
  cube: NodeObjectTypeModule;
  cone: NodeObjectTypeModule;
  cylinder: NodeObjectTypeModule;
};

// Animation Manager

/**
 * Animation options
 */
export interface AnimationOptions {
  loop?: boolean;
  duration?: number;
  easing?: string | ((t: number) => number);
  transitionDuration?: number;
  speed?: number;
  amplitude?: number;
  axis?: 'x' | 'y' | 'z' | 'all';
  direction?: 1 | -1;
  color?: number | string;
  minIntensity?: number;
  maxIntensity?: number;
  pulse?: boolean;
  baseScale?: number | null;
  [key: string]: unknown;
}

/**
 * Animation type configuration
 */
export interface AnimationConfig {
  update: (object: Object3D, state: object, deltaTime: number, options: AnimationOptions, transitionProgress: number) => object;
  defaultOptions?: AnimationOptions;
  init?: (object: Object3D, options: AnimationOptions) => object;
  cleanup?: (object: Object3D, state: object, options: AnimationOptions) => void;
}

/**
 * Animation manager statistics
 */
export interface AnimationStats {
  animatedObjects: number;
  totalAnimations: number;
  registeredTypes: number;
  byType: Record<string, number>;
}

/**
 * Animation Manager interface.
 * Manages animations for THREE.js objects with support for multiple simultaneous animations.
 */
export interface IAnimationManager {
  registerAnimation(name: string, config: AnimationConfig): void;
  unregisterAnimation(name: string): boolean;
  hasAnimation(name: string): boolean;
  getRegisteredAnimations(): string[];
  startAnimation(object: Object3D, animationName: string, options?: AnimationOptions): number;
  stopAnimation(object: Object3D, animationNameOrId?: string | number, immediate?: boolean): void;
  stopAllAnimations(object: Object3D, immediate?: boolean): void;
  toggleAnimation(object: Object3D, animationName: string, options?: AnimationOptions, immediate?: boolean): boolean;
  isAnimating(object: Object3D, animationName?: string): boolean;
  getAnimationState(object: Object3D, animationName?: string): object | null;
  tick(deltaTime: number): void;
  getStats(): AnimationStats;
  clear(immediate?: boolean): void;
}

export const animationManager: IAnimationManager;
export const AnimationManager: new () => IAnimationManager;

// Easing functions

export interface EasingFunctions {
  linear: (t: number) => number;
  easeInQuad: (t: number) => number;
  easeOutQuad: (t: number) => number;
  easeInOutQuad: (t: number) => number;
  easeOutCubic: (t: number) => number;
  easeInCubic: (t: number) => number;
  easeInOutCubic: (t: number) => number;
  easeOutElastic: (t: number) => number;
  easeOutBounce: (t: number) => number;
}

export const easing: EasingFunctions;
export function getEasing(easingOrName: string | ((t: number) => number)): (t: number) => number;

// Built-in animations

export interface AnimationTypeModule {
  name: string;
  defaultOptions: AnimationOptions;
  update: (object: Object3D, state: object, deltaTime: number, options: AnimationOptions, transitionProgress: number) => object;
  init?: (object: Object3D, options: AnimationOptions) => object;
  cleanup?: (object: Object3D, state: object, options: AnimationOptions) => void;
}

export function registerBuiltInAnimations(manager?: IAnimationManager): void;

export const builtInAnimations: {
  pulse: AnimationTypeModule;
  spin: AnimationTypeModule;
  glow: AnimationTypeModule;
};
