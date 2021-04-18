export const container = AFRAME.registerComponent('container', {
  init: function () {
    this.el.id = Math.random().toString(36).replace(/[^a-z]+/g, '')
    this.el.sceneEl.setAttribute('fixed', `selectedContainer: ${this.el.id}`)
    console.log(this.el.sceneEl.getAttribute('fixed'))
    this.cameraEl = this.el.querySelector('[camera]')
    this.setUpBox()
    this.el.setObject3D('mesh', this.mesh)
    
    this.clickHandler = this.clickHandler.bind(this)
    this.el.addEventListener('click', this.clickHandler)
  },

  remove: function () {
    this.el.removeEventListener('click', this.clickHandler)
    this.el.removeObject3D('mesh')
  },

  setUpBox: function () {
    const zoomLevel = this.getZoomLevel()
    const edges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(6 / zoomLevel, 4.5 / zoomLevel))
    this.mesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x24b59f}))
    this.mesh.position.y = 1.6
  },

  clickHandler: function () {
    this.el.sceneEl.setAttribute('fixed', `selectedContainer: ${this.el.id}`)
  },

  getZoomLevel: function () {
    const parentContainers = []
    let el = this.el
    while (el.hasAttribute('container')) {
      parentContainers.push(el)
      el = el.parentEl
    }

    console.log(parentContainers.length)
    return parentContainers.length
  }
})