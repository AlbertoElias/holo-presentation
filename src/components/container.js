export const container = AFRAME.registerComponent('container', {
  init: function () {
    const zoomLevel = this.getZoomLevel()
    const edges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(4 / zoomLevel, 2.25 / zoomLevel))
    this.mesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x24b59f}))
    this.el.setObject3D('mesh', this.mesh)
  },

  remove: function () {
    this.el.removeObject3D('mesh')
  }, 

  getZoomLevel: function () {
    const parentContainers = []
    let el = this.el
    while (el.hasAttribute('container') || el.hasAttribute('root-container')) {
      parentContainers.push(el)
      el = el.parentEl
    }

    return parentContainers.length
  }
})