import { getParentContainer } from "../utils"
import { loadContainer } from "../object-loader"

const WIDTH = 4
const HEIGHT = 2.25
const LAYER_SPACING = 1
// Allows us to click the depth layer vs root container
const DEPTH_LAYER_OFFSET = 0.0002

export const container = AFRAME.registerComponent('container', {
  schema: {
    activeDepthLayer: { type: 'string', default: '' },
  },

  init: function () {
    if (getParentContainer(this.el)) {  
      this.zoomLevel = this.getZoomLevel()
      const edges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(WIDTH / this.zoomLevel, HEIGHT / this.zoomLevel))
      const segments = new THREE.LineSegmentsGeometry().fromEdgesGeometry(edges)
      const material = new THREE.LineMaterial({
    
        color: 0xffffff,
        worldUnits: true,
        linewidth: 0.02, // in pixels
        transparent: true,
        opacity: 0.5
    
      })
      const mesh = new THREE.LineSegments2(segments, material)
      mesh.computeLineDistances()
      mesh.scale.set(1, 1, 1)
      this.el.setObject3D('mesh', mesh)

      // Check if this is a depth layer
      if (!getParentContainer(this.el.parentEl)) {
        this.el.classList.add('collidable')
        const index = [...this.el.parentEl.children].indexOf(this.el)
        this.el.object3D.position.z = -index * LAYER_SPACING + DEPTH_LAYER_OFFSET
        this.clickHandler = this.clickHandler.bind(this)
        this.el.addEventListener('click', this.clickHandler)
        this.el.addEventListener('container.deactivate', () => {
          this.el.parentEl.setAttribute('container', { activeDepthLayer: '' })
        })
      }
    } else {
      if (!this.el.children.length) {
        this.addDepthLayer(false)
      }
      this.setContainerBox()
    }
  },

  remove: function () {
    this.el.removeObject3D('mesh')
    this.el.removeEventListener('click', this.clickHandler)
  },

  update: function (oldData) {
    const mesh = this.el.getObject3D('mesh')
    if (!mesh) return

    if (this.data.activeDepthLayer !== oldData.activeDepthLayer) {
      if (oldData.activeDepthLayer) {
        const mesh = this.el.querySelector(`#${oldData.activeDepthLayer}`).getObject3D('mesh')
        mesh.material.transparent = true
      }

      if (this.data.activeDepthLayer) {
        const mesh = this.el.querySelector(`#${this.data.activeDepthLayer}`).getObject3D('mesh')
        mesh.material.transparent = false
      }
    }
  },

  clickHandler: function () {
    this.el.parentEl.setAttribute('container', { activeDepthLayer: this.el.id })
    document.querySelector('[holo]').setAttribute('holo', { selectedContainer: this.el.id })
  },

  setContainerBox: function () {
    const boxDepth = LAYER_SPACING * this.getDepthLayers() - 1
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(WIDTH, HEIGHT, boxDepth))
    const segments = new THREE.LineSegmentsGeometry().fromEdgesGeometry(edges)
    const material = new THREE.LineMaterial({
  
      color: 0xffffff,
      worldUnits: true,
      linewidth: 0.02, // in pixels
      transparent: true,
      opacity: 0.5
  
    })
    const mesh = new THREE.LineSegments2(segments, material)
    mesh.computeLineDistances()
    mesh.scale.set(1, 1, 1)
    mesh.position.z = -boxDepth / 2 
    this.el.setObject3D('mesh', mesh)
  },

  addDepthLayer: function (updateCointanerBox = true) {
    // We set the the ID beforehand so obj-wrapper can set it as the selectedContainer on load
    const depthLayerId = Math.random().toString(36).replace(/[^a-z]+/g, '')
    const depthContainerEl = loadContainer(depthLayerId, true)
    this.el.appendChild(depthContainerEl)

    if (updateCointanerBox) {
      this.setContainerBox()
    }
  },

  getDepthLayers: function () {
    // We start counting at 0
    return this.el.children.length 
  },

  getZoomLevel: function () {
    const parentContainers = []
    let el = this.el
    while (el.hasAttribute('container')) {
      parentContainers.push(el)
      el = el.parentEl
    }

    // Remove one to account for the root container
    return parentContainers.length - 1
  }
})