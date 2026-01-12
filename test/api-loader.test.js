import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ForceGraph3D from '../src/3d-force-graph.js';

// Mock data
const mockInitialGraphData = {
  nodes: [
    { id: 'node1', name: 'Node 1', val: 10 },
    { id: 'node2', name: 'Node 2', val: 20 },
    { id: 'node3', name: 'Node 3', val: 15 }
  ],
  links: [
    { source: 'node1', target: 'node2' },
    { source: 'node2', target: 'node3' }
  ]
};

const mockNextNodesData = {
  nodes: [
    { id: 'node4', name: 'Node 4', val: 25 },
    { id: 'node5', name: 'Node 5', val: 30 }
  ],
  links: [
    { source: 'node3', target: 'node4' },
    { source: 'node4', target: 'node5' }
  ]
};

// Helper to create a mock fetch response
function createMockResponse(data, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data)
  };
}

describe('API Loader', () => {
  let container;
  let graph;
  let originalFetch;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    if (graph) {
      graph._destructor();
      graph = null;
    }
    document.body.removeChild(container);
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Configuration Properties', () => {
    it('should have default apiBaseUrl as empty string', () => {
      graph = new ForceGraph3D(container);
      expect(graph.apiBaseUrl()).toBe('');
    });

    it('should have default apiInitEndpoint as /graph-data', () => {
      graph = new ForceGraph3D(container);
      expect(graph.apiInitEndpoint()).toBe('/graph-data');
    });

    it('should have default apiLoadNodesEndpoint as /graph-data/nodes', () => {
      graph = new ForceGraph3D(container);
      expect(graph.apiLoadNodesEndpoint()).toBe('/graph-data/nodes');
    });

    it('should allow setting apiBaseUrl', () => {
      graph = new ForceGraph3D(container)
        .apiBaseUrl('https://api.example.com');
      expect(graph.apiBaseUrl()).toBe('https://api.example.com');
    });

    it('should allow setting apiInitEndpoint', () => {
      graph = new ForceGraph3D(container)
        .apiInitEndpoint('/custom/init');
      expect(graph.apiInitEndpoint()).toBe('/custom/init');
    });

    it('should allow setting apiLoadNodesEndpoint', () => {
      graph = new ForceGraph3D(container)
        .apiLoadNodesEndpoint('/custom/nodes');
      expect(graph.apiLoadNodesEndpoint()).toBe('/custom/nodes');
    });

    it('should allow setting apiFetchOptions', () => {
      const options = { credentials: 'include', headers: { 'X-Custom': 'value' } };
      graph = new ForceGraph3D(container)
        .apiFetchOptions(options);
      expect(graph.apiFetchOptions()).toEqual(options);
    });

    it('should support method chaining for API configuration', () => {
      graph = new ForceGraph3D(container)
        .apiBaseUrl('https://api.example.com')
        .apiInitEndpoint('/init')
        .apiLoadNodesEndpoint('/nodes')
        .apiFetchOptions({ credentials: 'include' });

      expect(graph.apiBaseUrl()).toBe('https://api.example.com');
      expect(graph.apiInitEndpoint()).toBe('/init');
      expect(graph.apiLoadNodesEndpoint()).toBe('/nodes');
      expect(graph.apiFetchOptions()).toEqual({ credentials: 'include' });
    });
  });

  describe('initGraphFromApi', () => {
    it('should fetch graph data from default endpoint', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockInitialGraphData));

      graph = new ForceGraph3D(container);
      const result = await graph.initGraphFromApi();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/graph-data');
      expect(options.method).toBe('GET');
      expect(result).toEqual(mockInitialGraphData);
    });

    it('should include dimensionId in query params when provided', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockInitialGraphData));

      graph = new ForceGraph3D(container);
      await graph.initGraphFromApi('dimension-123');

      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('dimensionId=dimension-123');
    });

    it('should use custom apiBaseUrl when set', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockInitialGraphData));

      graph = new ForceGraph3D(container)
        .apiBaseUrl('https://api.example.com');
      await graph.initGraphFromApi();

      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('https://api.example.com');
    });

    it('should use custom apiInitEndpoint when set', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockInitialGraphData));

      graph = new ForceGraph3D(container)
        .apiInitEndpoint('/custom/graph-init');
      await graph.initGraphFromApi();

      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('/custom/graph-init');
    });

    it('should include apiFetchOptions in the request', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockInitialGraphData));

      graph = new ForceGraph3D(container)
        .apiFetchOptions({ credentials: 'include', headers: { 'Authorization': 'Bearer token' } });
      await graph.initGraphFromApi();

      const [, options] = global.fetch.mock.calls[0];
      expect(options.credentials).toBe('include');
      expect(options.headers.Authorization).toBe('Bearer token');
    });

    it('should set graph data after successful fetch', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockInitialGraphData));

      graph = new ForceGraph3D(container);
      await graph.initGraphFromApi();

      const graphData = graph.graphData();
      expect(graphData.nodes.length).toBe(3);
      expect(graphData.links.length).toBe(2);
    });

    it('should call onApiError callback on fetch failure', async () => {
      const error = new Error('Network error');
      global.fetch.mockRejectedValueOnce(error);

      const onApiError = vi.fn();
      graph = new ForceGraph3D(container)
        .onApiError(onApiError);

      await expect(graph.initGraphFromApi()).rejects.toThrow('Network error');
      expect(onApiError).toHaveBeenCalledWith(error, 'initGraphFromApi');
    });

    it('should call onApiError callback on HTTP error', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse({}, false, 404));

      const onApiError = vi.fn();
      graph = new ForceGraph3D(container)
        .onApiError(onApiError);

      await expect(graph.initGraphFromApi()).rejects.toThrow('HTTP error! status: 404');
      expect(onApiError).toHaveBeenCalledWith(expect.any(Error), 'initGraphFromApi');
    });

    it('should handle numeric dimensionId', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockInitialGraphData));

      graph = new ForceGraph3D(container);
      await graph.initGraphFromApi(42);

      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('dimensionId=42');
    });
  });

  describe('loadNextNodes', () => {
    beforeEach(async () => {
      // Initialize graph with some data first
      global.fetch.mockResolvedValueOnce(createMockResponse(mockInitialGraphData));
      graph = new ForceGraph3D(container);
      await graph.initGraphFromApi();
      vi.clearAllMocks();
    });

    it('should return empty result for empty nodeIds array', async () => {
      const result = await graph.loadNextNodes([]);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({ nodes: [], links: [] });
    });

    it('should return empty result for non-array nodeIds', async () => {
      const result = await graph.loadNextNodes(null);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({ nodes: [], links: [] });
    });

    it('should make POST request with nodeIds in body', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockNextNodesData));

      await graph.loadNextNodes(['node3']);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/graph-data/nodes');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(options.body)).toEqual({ nodeIds: ['node3'] });
    });

    it('should use custom apiLoadNodesEndpoint when set', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockNextNodesData));

      graph.apiLoadNodesEndpoint('/custom/load-nodes');
      await graph.loadNextNodes(['node3']);

      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('/custom/load-nodes');
    });

    it('should merge new nodes with existing graph data', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockNextNodesData));

      const initialNodes = graph.graphData().nodes.length;
      await graph.loadNextNodes(['node3']);

      const graphData = graph.graphData();
      expect(graphData.nodes.length).toBe(initialNodes + 2);
    });

    it('should merge new links with existing graph data', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockNextNodesData));

      const initialLinks = graph.graphData().links.length;
      await graph.loadNextNodes(['node3']);

      const graphData = graph.graphData();
      expect(graphData.links.length).toBe(initialLinks + 2);
    });

    it('should return only newly added nodes and links', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockNextNodesData));

      const result = await graph.loadNextNodes(['node3']);

      expect(result.nodes.length).toBe(2);
      expect(result.links.length).toBe(2);
      expect(result.nodes.map(n => n.id)).toEqual(['node4', 'node5']);
    });

    it('should not duplicate existing nodes', async () => {
      const dataWithDuplicate = {
        nodes: [
          { id: 'node1', name: 'Node 1 Updated' }, // Already exists
          { id: 'node6', name: 'Node 6', val: 35 }
        ],
        links: []
      };
      global.fetch.mockResolvedValueOnce(createMockResponse(dataWithDuplicate));

      const initialNodes = graph.graphData().nodes.length;
      const result = await graph.loadNextNodes(['node1']);

      const graphData = graph.graphData();
      expect(graphData.nodes.length).toBe(initialNodes + 1); // Only node6 added
      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].id).toBe('node6');
    });

    it('should not duplicate existing links', async () => {
      const dataWithDuplicateLink = {
        nodes: [],
        links: [
          { source: 'node1', target: 'node2' }, // Already exists
          { source: 'node1', target: 'node3' }  // New
        ]
      };
      global.fetch.mockResolvedValueOnce(createMockResponse(dataWithDuplicateLink));

      const initialLinks = graph.graphData().links.length;
      const result = await graph.loadNextNodes(['node1']);

      const graphData = graph.graphData();
      expect(graphData.links.length).toBe(initialLinks + 1);
      expect(result.links.length).toBe(1);
    });

    it('should include apiFetchOptions headers in request', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockNextNodesData));

      graph.apiFetchOptions({ headers: { 'Authorization': 'Bearer token123' } });
      await graph.loadNextNodes(['node3']);

      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer token123');
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('should call onApiError callback on failure', async () => {
      const error = new Error('Network failure');
      global.fetch.mockRejectedValueOnce(error);

      const onApiError = vi.fn();
      graph.onApiError(onApiError);

      await expect(graph.loadNextNodes(['node3'])).rejects.toThrow('Network failure');
      expect(onApiError).toHaveBeenCalledWith(error, 'loadNextNodes');
    });

    it('should call onApiError callback on HTTP error', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse({}, false, 500));

      const onApiError = vi.fn();
      graph.onApiError(onApiError);

      await expect(graph.loadNextNodes(['node3'])).rejects.toThrow('HTTP error! status: 500');
      expect(onApiError).toHaveBeenCalledWith(expect.any(Error), 'loadNextNodes');
    });

    it('should handle multiple nodeIds', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(mockNextNodesData));

      await graph.loadNextNodes(['node1', 'node2', 'node3']);

      const [, options] = global.fetch.mock.calls[0];
      expect(JSON.parse(options.body)).toEqual({ nodeIds: ['node1', 'node2', 'node3'] });
    });
  });

  describe('Custom node/link accessors', () => {
    it('should respect custom nodeId accessor when merging', async () => {
      const customIdData = {
        nodes: [
          { customId: 'a', name: 'A' },
          { customId: 'b', name: 'B' }
        ],
        links: [{ source: 'a', target: 'b' }]
      };
      global.fetch.mockResolvedValueOnce(createMockResponse(customIdData));

      graph = new ForceGraph3D(container)
        .nodeId('customId');
      await graph.initGraphFromApi();

      vi.clearAllMocks();

      const newData = {
        nodes: [
          { customId: 'a', name: 'A Updated' }, // Duplicate by customId
          { customId: 'c', name: 'C' }
        ],
        links: []
      };
      global.fetch.mockResolvedValueOnce(createMockResponse(newData));

      const result = await graph.loadNextNodes(['a']);

      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].customId).toBe('c');
    });

    it('should respect custom linkSource/linkTarget accessors when merging', async () => {
      const customLinkData = {
        nodes: [{ id: 'a' }, { id: 'b' }],
        links: [{ from: 'a', to: 'b' }]
      };
      global.fetch.mockResolvedValueOnce(createMockResponse(customLinkData));

      graph = new ForceGraph3D(container)
        .linkSource('from')
        .linkTarget('to');
      await graph.initGraphFromApi();

      vi.clearAllMocks();

      const newData = {
        nodes: [{ id: 'c' }],
        links: [
          { from: 'a', to: 'b' }, // Duplicate
          { from: 'b', to: 'c' }  // New
        ]
      };
      global.fetch.mockResolvedValueOnce(createMockResponse(newData));

      const result = await graph.loadNextNodes(['b']);

      expect(result.links.length).toBe(1);
      expect(result.links[0].from).toBe('b');
      expect(result.links[0].to).toBe('c');
    });
  });
});
