/**
 * Cylinder Node Object Type
 *
 * Creates a cylinder mesh for nodes.
 *
 * Node properties:
 * - val: affects cylinder size (default: 1)
 * - color: cylinder color (default: '#ffffaa')
 * - opacity: cylinder opacity (default: 0.75)
 * - cylinderRadiusTop: top radius override
 * - cylinderRadiusBottom: bottom radius override
 * - cylinderHeight: height override
 * - cylinderSegments: radial segments (default: 8)
 */

export const typeName = 'cylinder';

export function create(node, THREE, factory) {
  const val = node.val || 1;
  const baseSize = Math.cbrt(val) * 4;
  const radiusTop = node.cylinderRadiusTop || baseSize / 2;
  const radiusBottom = node.cylinderRadiusBottom || baseSize / 2;
  const height = node.cylinderHeight || baseSize;
  const segments = node.cylinderSegments || 8;
  const color = node.color || '#ffffaa';
  const opacity = node.opacity !== undefined ? node.opacity : 0.75;

  // Use factory cache for geometry if available
  const geometryKey = `cylinder_${radiusTop}_${radiusBottom}_${height}_${segments}`;
  const geometry = factory
    ? factory.getGeometry(geometryKey, () => new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments))
    : new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);

  // Use factory cache for material if available
  const materialKey = `lambert_${color}_${opacity}`;
  const material = factory
    ? factory.getMaterial(materialKey, () => new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity
      }))
    : new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity
      });

  return new THREE.Mesh(geometry, material);
}

export default { typeName, create };
