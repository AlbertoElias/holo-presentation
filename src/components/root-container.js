export const container = AFRAME.registerComponent('root-container', {
  init: function () {
    const boxGeo = new THREE.BoxGeometry(4, 2.25, 4)
    const edges = new THREE.EdgesGeometry(boxGeo)
    this.mesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x24b59f}))
    this.mesh.position.z = -2
    this.el.setObject3D('mesh', this.mesh)
  },

  remove: function () {
    this.el.removeObject3D('mesh')
  }
})