import { AmbientLight, DirectionalLight, Vector3, REVISION } from 'three';

const three = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : { AmbientLight, DirectionalLight, Vector3, REVISION };

import animationManager from './animation-manager.js';

import { DragControls as ThreeDragControls } from 'three/examples/jsm/controls/DragControls.js';

import ThreeForceGraph from 'three-forcegraph';
import ThreeRenderObjects from 'three-render-objects';

import accessorFn from 'accessor-fn';
import Kapsule from 'kapsule';

import linkKapsule from './kapsule-link.js';

//

const CAMERA_DISTANCE2NODES_FACTOR = 170;

//

// Expose config from forceGraph
const bindFG = linkKapsule('forceGraph', ThreeForceGraph);
const linkedFGProps = Object.assign(...[
  'jsonUrl',
  'graphData',
  'numDimensions',
  'dagMode',
  'dagLevelDistance',
  'dagNodeFilter',
  'onDagError',
  'nodeRelSize',
  'nodeId',
  'nodeVal',
  'nodeResolution',
  'nodeColor',
  'nodeAutoColorBy',
  'nodeOpacity',
  'nodeVisibility',
  'nodeThreeObject',
  'nodeThreeObjectExtend',
  'nodePositionUpdate',
  'linkSource',
  'linkTarget',
  'linkVisibility',
  'linkColor',
  'linkAutoColorBy',
  'linkOpacity',
  'linkWidth',
  'linkResolution',
  'linkCurvature',
  'linkCurveRotation',
  'linkMaterial',
  'linkThreeObject',
  'linkThreeObjectExtend',
  'linkPositionUpdate',
  'linkDirectionalArrowLength',
  'linkDirectionalArrowColor',
  'linkDirectionalArrowRelPos',
  'linkDirectionalArrowResolution',
  'linkDirectionalParticles',
  'linkDirectionalParticleSpeed',
  'linkDirectionalParticleOffset',
  'linkDirectionalParticleWidth',
  'linkDirectionalParticleColor',
  'linkDirectionalParticleResolution',
  'linkDirectionalParticleThreeObject',
  'forceEngine',
  'd3AlphaDecay',
  'd3VelocityDecay',
  'd3AlphaMin',
  'ngraphPhysics',
  'warmupTicks',
  'cooldownTicks',
  'cooldownTime',
  'onEngineTick',
  'onEngineStop'
].map(p => ({ [p]: bindFG.linkProp(p)})));
const linkedFGMethods = Object.assign(...[
  'refresh',
  'getGraphBbox',
  'd3Force',
  'd3ReheatSimulation',
  'emitParticle'
].map(p => ({ [p]: bindFG.linkMethod(p)})));

// Expose config from renderObjs
const bindRenderObjs = linkKapsule('renderObjs', ThreeRenderObjects);
const linkedRenderObjsProps = Object.assign(...[
  'width',
  'height',
  'backgroundColor',
  'showNavInfo',
  'enablePointerInteraction'
].map(p => ({ [p]: bindRenderObjs.linkProp(p)})));
const linkedRenderObjsMethods = Object.assign(
  ...[
    'lights',
    'cameraPosition',
    'postProcessingComposer'
  ].map(p => ({ [p]: bindRenderObjs.linkMethod(p)})),
  {
    graph2ScreenCoords: bindRenderObjs.linkMethod('getScreenCoords'),
    screen2GraphCoords: bindRenderObjs.linkMethod('getSceneCoords')
  }
);

//

export default Kapsule({

  props: {
    // API loader configuration
    apiBaseUrl: { default: '', triggerUpdate: false },
    apiInitEndpoint: { default: '/graph-data', triggerUpdate: false },
    apiLoadNodesEndpoint: { default: '/graph-data/nodes', triggerUpdate: false },
    apiFetchOptions: { default: {}, triggerUpdate: false },
    onApiError: { default: () => {}, triggerUpdate: false },

    // Camera orbit configuration
    cameraOrbit: { default: false, triggerUpdate: false },
    cameraOrbitSpeed: { default: 1, triggerUpdate: false }, // Degrees per second
    cameraOrbitDistance: {
      default: null, // null means auto-calculate from current camera distance
      triggerUpdate: false
    },
    cameraOrbitTarget: { default: { x: 0, y: 0, z: 0 }, triggerUpdate: false }, // Point to orbit around
    cameraOrbitAxis: { default: 'y', triggerUpdate: false }, // 'x', 'y', or 'z' - axis to orbit around
    cameraOrbitDirection: { default: 1, triggerUpdate: false }, // 1 for clockwise, -1 for counter-clockwise

    // Animation configuration
    nodeHoverAnimation: { default: null, triggerUpdate: false }, // Animation name to play on hover (e.g., 'pulse', 'glow')
    nodeHoverAnimationOptions: { default: {}, triggerUpdate: false }, // Options for hover animation

    nodeLabel: { default: 'name', triggerUpdate: false },
    linkLabel: { default: 'name', triggerUpdate: false },
    linkHoverPrecision: { default: 1, onChange: (p, state) => state.renderObjs.lineHoverPrecision(p), triggerUpdate: false },
    enableNavigationControls: {
      default: true,
      onChange(enable, state) {
        const controls = state.renderObjs.controls();
        if (controls) {
          controls.enabled = enable;
          // trigger mouseup on re-enable to prevent sticky controls
          enable && controls.domElement && controls.domElement.dispatchEvent(new PointerEvent('pointerup'));
        }
      },
      triggerUpdate: false
    },
    enableNodeDrag: { default: true, triggerUpdate: false },
    onNodeDrag: { default: () => {}, triggerUpdate: false },
    onNodeDragEnd: { default: () => {}, triggerUpdate: false },
    onNodeClick: { triggerUpdate: false },
    onNodeRightClick: { triggerUpdate: false },
    onNodeHover: { triggerUpdate: false },
    onLinkClick: { triggerUpdate: false },
    onLinkRightClick: { triggerUpdate: false },
    onLinkHover: { triggerUpdate: false },
    onBackgroundClick: { triggerUpdate: false },
    onBackgroundRightClick: { triggerUpdate: false },
    showPointerCursor: { default: true, triggerUpdate: false },
    ...linkedFGProps,
    ...linkedRenderObjsProps
  },

  methods: {
    zoomToFit: function(state, transitionDuration, padding, ...bboxArgs) {
      state.renderObjs.fitToBbox(
        state.forceGraph.getGraphBbox(...bboxArgs),
        transitionDuration,
        padding
      );
      return this;
    },
    pauseAnimation: function(state) {
      if (state.animationFrameRequestId !== null) {
        cancelAnimationFrame(state.animationFrameRequestId);
        state.animationFrameRequestId = null;
      }
      return this;
    },

    resumeAnimation: function(state) {
      if (state.animationFrameRequestId === null) {
        this._animationCycle();
      }
      return this;
    },

    // Camera orbit methods
    startOrbit: function(state) {
      if (!state.cameraOrbit) {
        state.cameraOrbit = true;
        state._orbitLastTime = null; // Reset timing for smooth start
      }
      return this;
    },
    stopOrbit: function(state) {
      state.cameraOrbit = false;
      return this;
    },
    isOrbiting: function(state) {
      return state.cameraOrbit;
    },

    _updateCameraOrbit(state) {
      if (!state.cameraOrbit) return;

      const camera = state.renderObjs.camera();
      const now = performance.now();
      const target = state.cameraOrbitTarget || { x: 0, y: 0, z: 0 };
      const axisName = state.cameraOrbitAxis || 'y';

      // Create target vector
      const targetVec = new three.Vector3(target.x, target.y, target.z);

      // Calculate camera offset from target
      const offsetVec = new three.Vector3().subVectors(camera.position, targetVec);

      // Define rotation axis vector
      const axisVec = new three.Vector3(
        axisName === 'x' ? 1 : 0,
        axisName === 'y' ? 1 : 0,
        axisName === 'z' ? 1 : 0
      );

      // Initialize orbit state on first run
      if (state._orbitLastTime === null || state._orbitLastTime === undefined) {
        state._orbitLastTime = now;

        // Store the current offset vector for orbit calculations
        state._orbitOffset = offsetVec.clone();

        // Calculate orbit distance if not specified (distance from target)
        if (state.cameraOrbitDistance === null || state.cameraOrbitDistance === undefined) {
          state._orbitDistance = offsetVec.length();
        }

        // Store last known camera position to detect user interaction
        state._lastCameraPos = camera.position.clone();
        return; // Skip first frame to ensure smooth start
      }

      // Detect if user moved the camera manually
      const lastPos = state._lastCameraPos;
      const cameraMoved = lastPos && camera.position.distanceTo(lastPos) > 0.01;

      if (cameraMoved) {
        // User moved the camera - update the offset vector from new position
        state._orbitOffset = offsetVec.clone();

        // Update orbit distance if not explicitly set
        if (state.cameraOrbitDistance === null || state.cameraOrbitDistance === undefined) {
          state._orbitDistance = offsetVec.length();
        }
      }

      const deltaTime = (now - state._orbitLastTime) / 1000; // Convert to seconds
      state._orbitLastTime = now;

      // Calculate angular velocity (convert degrees/sec to radians/sec)
      const speed = (state.cameraOrbitSpeed || 1) * (Math.PI / 180);
      const direction = state.cameraOrbitDirection || 1;
      const deltaAngle = speed * direction * deltaTime;

      // Rotate the offset vector around the axis
      state._orbitOffset.applyAxisAngle(axisVec, deltaAngle);

      // Get orbit distance (use explicit distance if set, otherwise use calculated)
      const distance = state.cameraOrbitDistance !== null && state.cameraOrbitDistance !== undefined
        ? state.cameraOrbitDistance
        : state._orbitDistance;

      // Normalize and scale offset to maintain consistent distance
      const newOffset = state._orbitOffset.clone().normalize().multiplyScalar(distance);

      // Calculate new camera position
      const newPos = new three.Vector3().addVectors(targetVec, newOffset);

      // Update camera position
      camera.position.copy(newPos);

      // Always look at the target (keeps camera facing the graph)
      camera.lookAt(targetVec);

      // Update stored offset to match the scaled version
      state._orbitOffset.copy(newOffset);

      // Store current position for next frame comparison
      state._lastCameraPos = camera.position.clone();
    },

    _animationCycle(state) {
      if (state.enablePointerInteraction) {
        // reset canvas cursor (override dragControls cursor)
        this.renderer().domElement.style.cursor = null;
      }

      // Calculate delta time for animations
      const now = performance.now();
      const deltaTime = state._lastFrameTime ? (now - state._lastFrameTime) / 1000 : 0;
      state._lastFrameTime = now;

      // Update camera orbit
      this._updateCameraOrbit();

      // Update node animations
      if (state._animationManager) {
        state._animationManager.tick(deltaTime);
      }

      // Frame cycle
      state.forceGraph.tickFrame();
      state.renderObjs.tick();
      state.animationFrameRequestId = requestAnimationFrame(this._animationCycle);
    },
    scene: state => state.renderObjs.scene(), // Expose scene
    camera: state => state.renderObjs.camera(), // Expose camera
    renderer: state => state.renderObjs.renderer(), // Expose renderer
    controls: state => state.renderObjs.controls(), // Expose controls
    tbControls: state => state.renderObjs.tbControls(), // To be deprecated

    // Animation methods
    animationManager: state => state._animationManager,
    setAnimationManager: function(state, manager) {
      state._animationManager = manager;
      return this;
    },

    /**
     * Start an animation on a node
     * @param {object} node - The node object or node data
     * @param {string} animationName - Name of the animation to start
     * @param {object} [options] - Animation options
     * @returns {number} Animation instance ID
     */
    startNodeAnimation: function(state, node, animationName, options = {}) {
      if (!state._animationManager) {
        console.warn('ForceGraph3D: No animation manager set. Use setAnimationManager() first.');
        return -1;
      }

      // Get the THREE.js object for this node
      const nodeObj = node.__threeObj || node;
      if (!nodeObj) {
        console.warn('ForceGraph3D: Node has no THREE.js object');
        return -1;
      }

      return state._animationManager.startAnimation(nodeObj, animationName, options);
    },

    /**
     * Stop an animation on a node
     * @param {object} node - The node object or node data
     * @param {string} [animationName] - Animation name to stop (omit to stop all)
     * @param {boolean} [immediate=false] - Stop immediately without transition
     */
    stopNodeAnimation: function(state, node, animationName, immediate = false) {
      if (!state._animationManager) return this;

      const nodeObj = node.__threeObj || node;
      if (!nodeObj) return this;

      if (animationName) {
        state._animationManager.stopAnimation(nodeObj, animationName, immediate);
      } else {
        state._animationManager.stopAllAnimations(nodeObj, immediate);
      }
      return this;
    },

    /**
     * Check if a node has an animation running
     * @param {object} node - The node object or node data
     * @param {string} [animationName] - Animation name to check (omit to check any)
     * @returns {boolean}
     */
    isNodeAnimating: function(state, node, animationName) {
      if (!state._animationManager) return false;

      const nodeObj = node.__threeObj || node;
      if (!nodeObj) return false;

      return state._animationManager.isAnimating(nodeObj, animationName);
    },

    /**
     * Toggle an animation on a node - starts if not running, stops if running
     * @param {object} node - The node object or node data
     * @param {string} animationName - Name of the animation to toggle
     * @param {object} [options] - Animation options (used when starting)
     * @param {boolean} [immediate=false] - Stop immediately without transition
     * @returns {boolean} True if animation was started, false if stopped
     */
    toggleNodeAnimation: function(state, node, animationName, options = {}, immediate = false) {
      if (!state._animationManager) {
        console.warn('ForceGraph3D: No animation manager set. Use setAnimationManager() first.');
        return false;
      }

      const nodeObj = node.__threeObj || node;
      if (!nodeObj) {
        console.warn('ForceGraph3D: Node has no THREE.js object');
        return false;
      }

      return state._animationManager.toggleAnimation(nodeObj, animationName, options, immediate);
    },

    _destructor: function() {
      this.pauseAnimation();
      this.graphData({ nodes: [], links: []});
    },

    // API loader methods
    initGraphFromApi: function(state, dimensionId) {
      const baseUrl = state.apiBaseUrl;
      const endpoint = state.apiInitEndpoint;
      const url = new URL(endpoint, baseUrl || window.location.origin);

      if (dimensionId !== undefined) {
        url.searchParams.set('dimensionId', dimensionId);
      }

      const fetchOptions = {
        method: 'GET',
        ...state.apiFetchOptions
      };

      return fetch(url.toString(), fetchOptions)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          this.graphData(data);
          return data;
        })
        .catch(error => {
          state.onApiError(error, 'initGraphFromApi');
          throw error;
        });
    },

    loadNextNodes: function(state, nodeIds) {
      if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
        return Promise.resolve({ nodes: [], links: [] });
      }

      const baseUrl = state.apiBaseUrl;
      const endpoint = state.apiLoadNodesEndpoint;
      const url = new URL(endpoint, baseUrl || window.location.origin);

      const fetchOptions = {
        ...state.apiFetchOptions,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(state.apiFetchOptions.headers || {})
        },
        body: JSON.stringify({ nodeIds })
      };

      return fetch(url.toString(), fetchOptions)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(newData => {
          // Merge new nodes and links with existing graph data
          const currentData = this.graphData();
          const nodeIdAccessor = state.nodeId || 'id';
          const getNodeId = typeof nodeIdAccessor === 'function'
            ? nodeIdAccessor
            : node => node[nodeIdAccessor];

          const existingNodeIds = new Set(currentData.nodes.map(getNodeId));
          const newNodes = (newData.nodes || []).filter(node => !existingNodeIds.has(getNodeId(node)));

          const linkSourceAccessor = state.linkSource || 'source';
          const linkTargetAccessor = state.linkTarget || 'target';
          const getLinkSource = typeof linkSourceAccessor === 'function'
            ? linkSourceAccessor
            : link => link[linkSourceAccessor];
          const getLinkTarget = typeof linkTargetAccessor === 'function'
            ? linkTargetAccessor
            : link => link[linkTargetAccessor];

          const existingLinks = new Set(currentData.links.map(link => {
            const sourceId = typeof getLinkSource(link) === 'object' ? getNodeId(getLinkSource(link)) : getLinkSource(link);
            const targetId = typeof getLinkTarget(link) === 'object' ? getNodeId(getLinkTarget(link)) : getLinkTarget(link);
            return `${sourceId}->${targetId}`;
          }));

          const newLinks = (newData.links || []).filter(link => {
            const sourceId = getLinkSource(link);
            const targetId = getLinkTarget(link);
            return !existingLinks.has(`${sourceId}->${targetId}`);
          });

          const mergedData = {
            nodes: [...currentData.nodes, ...newNodes],
            links: [...currentData.links, ...newLinks]
          };

          this.graphData(mergedData);
          return { nodes: newNodes, links: newLinks };
        })
        .catch(error => {
          state.onApiError(error, 'loadNextNodes');
          throw error;
        });
    },

    ...linkedFGMethods,
    ...linkedRenderObjsMethods
  },

  stateInit: ({ controlType, rendererConfig, extraRenderers }) => {
    const forceGraph = new ThreeForceGraph();
    return {
      forceGraph,
      renderObjs: ThreeRenderObjects({ controlType, rendererConfig, extraRenderers })
        .objects([forceGraph]) // Populate scene
        .lights([
          new three.AmbientLight(0xcccccc, Math.PI),
          new three.DirectionalLight(0xffffff, 0.6 * Math.PI)
        ]),
      _animationManager: animationManager, // Use singleton animation manager by default
      _lastFrameTime: null
    }
  },

  init: function(domNode, state) {
    // Wipe DOM
    domNode.innerHTML = '';

    // Add relative container
    domNode.appendChild(state.container = document.createElement('div'));
    state.container.style.position = 'relative';

    // Add renderObjs
    const roDomNode = document.createElement('div');
    state.container.appendChild(roDomNode);
    state.renderObjs(roDomNode);
    const camera = state.renderObjs.camera();
    const renderer = state.renderObjs.renderer();
    const controls = state.renderObjs.controls();
    controls.enabled = !!state.enableNavigationControls;
    state.lastSetCameraZ = camera.position.z;

    // Add info space
    let infoElem;
    state.container.appendChild(infoElem = document.createElement('div'));
    infoElem.className = 'graph-info-msg';
    infoElem.textContent = '';

    // config forcegraph
    state.forceGraph
      .onLoading(() => { infoElem.textContent = 'Loading...' })
      .onFinishLoading(() => { infoElem.textContent = '' })
      .onUpdate(() => {
        // sync graph data structures
        state.graphData = state.forceGraph.graphData();

        // re-aim camera, if still in default position (not user modified)
        if (camera.position.x === 0 && camera.position.y === 0 && camera.position.z === state.lastSetCameraZ && state.graphData.nodes.length) {
          camera.lookAt(state.forceGraph.position);
          state.lastSetCameraZ = camera.position.z = Math.cbrt(state.graphData.nodes.length) * CAMERA_DISTANCE2NODES_FACTOR;
        }
      })
      .onFinishUpdate(() => {
        // Setup node drag interaction
        if (state._dragControls) {
          const curNodeDrag = state.graphData.nodes.find(node => node.__initialFixedPos && !node.__disposeControlsAfterDrag); // detect if there's a node being dragged using the existing drag controls
          if (curNodeDrag) {
            curNodeDrag.__disposeControlsAfterDrag = true; // postpone previous controls disposal until drag ends
          } else {
            state._dragControls.dispose(); // cancel previous drag controls
          }

          state._dragControls = undefined;
        }

        if (state.enableNodeDrag && state.enablePointerInteraction && state.forceEngine === 'd3') { // Can't access node positions programmatically in ngraph
          const dragControls = state._dragControls = new ThreeDragControls(
            state.graphData.nodes.map(node => node.__threeObj).filter(obj => obj),
            camera,
            renderer.domElement
          );

          dragControls.addEventListener('dragstart', function (event) {
            const nodeObj = getGraphObj(event.object);
            if (!nodeObj) return;

            controls.enabled = false; // Disable controls while dragging

            // track drag object movement
            event.object.__initialPos = event.object.position.clone();
            event.object.__prevPos = event.object.position.clone();

            const node = nodeObj.__data;
            !node.__initialFixedPos && (node.__initialFixedPos = {fx: node.fx, fy: node.fy, fz: node.fz});
            !node.__initialPos && (node.__initialPos = {x: node.x, y: node.y, z: node.z});

            // lock node
            ['x', 'y', 'z'].forEach(c => node[`f${c}`] = node[c]);

            // drag cursor
            renderer.domElement.classList.add('grabbable');
          });

          dragControls.addEventListener('drag', function (event) {
            const nodeObj = getGraphObj(event.object);
            if (!nodeObj) return;

            if (!event.object.hasOwnProperty('__graphObjType')) {
              // If dragging a child of the node, update the node object instead
              const initPos = event.object.__initialPos;
              const prevPos = event.object.__prevPos;
              const newPos = event.object.position;

              nodeObj.position.add(newPos.clone().sub(prevPos)); // translate node object by the motion delta
              prevPos.copy(newPos);
              newPos.copy(initPos); // reset child back to its initial position
            }

            const node = nodeObj.__data;
            const newPos = nodeObj.position;
            const translate = {x: newPos.x - node.x, y: newPos.y - node.y, z: newPos.z - node.z};
            // Move fx/fy/fz (and x/y/z) of nodes based on object new position
            ['x', 'y', 'z'].forEach(c => node[`f${c}`] = node[c] = newPos[c]);

            state.forceGraph
              .d3AlphaTarget(0.3) // keep engine running at low intensity throughout drag
              .resetCountdown();  // prevent freeze while dragging

            node.__dragged = true;
            state.onNodeDrag(node, translate);
          });

          dragControls.addEventListener('dragend', function (event) {
            const nodeObj = getGraphObj(event.object);
            if (!nodeObj) return;

            delete(event.object.__initialPos); // remove tracking attributes
            delete(event.object.__prevPos);

            const node = nodeObj.__data;

            // dispose previous controls if needed
            if (node.__disposeControlsAfterDrag) {
              dragControls.dispose();
              delete(node.__disposeControlsAfterDrag);
            }

            const initFixedPos = node.__initialFixedPos;
            const initPos = node.__initialPos;
            const translate = {x: initPos.x - node.x, y: initPos.y - node.y, z: initPos.z - node.z};
            if (initFixedPos) {
              ['x', 'y', 'z'].forEach(c => {
                const fc = `f${c}`;
                if (initFixedPos[fc] === undefined) {
                  delete(node[fc])
                }
              });
              delete(node.__initialFixedPos);
              delete(node.__initialPos);
              if (node.__dragged) {
                delete(node.__dragged);
                state.onNodeDragEnd(node, translate);
              }
            }

            state.forceGraph
              .d3AlphaTarget(0)   // release engine low intensity
              .resetCountdown();  // let the engine readjust after releasing fixed nodes

            if (state.enableNavigationControls) {
              controls.enabled = true; // Re-enable controls

              controls._status && controls._onPointerCancel?.(); // cancel pressed status on fly controls

              controls.domElement && controls.domElement.ownerDocument && controls.domElement.ownerDocument.dispatchEvent(
                // simulate mouseup to ensure the controls don't take over after dragend
                new PointerEvent('pointerup', { pointerType: 'touch' })
              );
            }

            // clear cursor
            renderer.domElement.classList.remove('grabbable');
          });
        }
      });

    // config renderObjs
    three.REVISION < 155 && (state.renderObjs.renderer().useLegacyLights = false); // force behavior for three < 155
    state.renderObjs
      .hoverOrderComparator((a, b) => {
        // Prioritize graph objects
        const aObj = getGraphObj(a);
        if (!aObj) return 1;
        const bObj = getGraphObj(b);
        if (!bObj) return -1;

        // Prioritize nodes over links
        const isNode = o => o.__graphObjType === 'node';
        return isNode(bObj) - isNode(aObj);
      })
      .tooltipContent(obj => {
        const graphObj = getGraphObj(obj);
        return graphObj ? accessorFn(state[`${graphObj.__graphObjType}Label`])(graphObj.__data) || '' : '';
      })
      .hoverDuringDrag(false)
      .onHover(obj => {
        // Update tooltip and trigger onHover events
        const hoverObj = getGraphObj(obj);

        if (hoverObj !== state.hoverObj) {
          const prevHoverObj = state.hoverObj;
          const prevObjType = prevHoverObj ? prevHoverObj.__graphObjType : null;
          const prevObjData = prevHoverObj ? prevHoverObj.__data : null;
          const objType = hoverObj ? hoverObj.__graphObjType : null;
          const objData = hoverObj ? hoverObj.__data : null;
          if (prevObjType && prevObjType !== objType) {
            // Hover out
            const fn = state[`on${prevObjType === 'node' ? 'Node' : 'Link'}Hover`];
            fn && fn(null, prevObjData);
          }
          if (objType) {
            // Hover in
            const fn = state[`on${objType === 'node' ? 'Node' : 'Link'}Hover`];
            fn && fn(objData, prevObjType === objType ? prevObjData : null);
          }

          // Handle hover animations for nodes
          if (state.nodeHoverAnimation && state._animationManager) {
            // Stop animation on previous node
            if (prevHoverObj && prevObjType === 'node') {
              state._animationManager.stopAnimation(prevHoverObj, state.nodeHoverAnimation);
            }
            // Start animation on new node
            if (hoverObj && objType === 'node') {
              state._animationManager.startAnimation(
                hoverObj,
                state.nodeHoverAnimation,
                state.nodeHoverAnimationOptions
              );
            }
          }

          // set pointer if hovered object is clickable
          renderer.domElement.classList[
            ((hoverObj && state[`on${objType === 'node' ? 'Node' : 'Link'}Click`]) || (!hoverObj && state.onBackgroundClick)) &&
            accessorFn(state.showPointerCursor)(objData) ? 'add' : 'remove'
          ]('clickable');

          state.hoverObj = hoverObj;
        }
      })
      .clickAfterDrag(false)
      .onClick((obj, ev) => {
        const graphObj = getGraphObj(obj);
        if (graphObj) {
          const fn = state[`on${graphObj.__graphObjType === 'node' ? 'Node' : 'Link'}Click`];
          fn && fn(graphObj.__data, ev);
        } else {
          state.onBackgroundClick && state.onBackgroundClick(ev);
        }
      })
      .onRightClick((obj, ev) => {
        // Handle right-click events
        const graphObj = getGraphObj(obj);
        if (graphObj) {
          const fn = state[`on${graphObj.__graphObjType === 'node' ? 'Node' : 'Link'}RightClick`];
          fn && fn(graphObj.__data, ev);
        } else {
          state.onBackgroundRightClick && state.onBackgroundRightClick(ev);
        }
      });

    //

    // Kick-off renderer
    this._animationCycle();
  }
});

//

function getGraphObj(object) {
  let obj = object;
  // recurse up object chain until finding the graph object
  while (obj && !obj.hasOwnProperty('__graphObjType')) {
    obj = obj.parent;
  }
  return obj;
}
