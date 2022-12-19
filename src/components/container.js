import { getParentContainer } from "../utils"
import { loadContainer } from "../object-loader"

const WIDTH = 4
const HEIGHT = 2.25
const LAYER_SPACING = 1.5
// Allows us to click the depth layer vs root container
const DEPTH_LAYER_OFFSET = 0.0002
const boxSize = 0.2

export const container = AFRAME.registerComponent('container', {
  schema: {
    activeDepthLayer: { type: 'string', default: '' },
  },

  init: function () {
    if (getParentContainer(this.el)) {  
      this.zoomLevel = this.getZoomLevel()
      const geometry = new THREE.PlaneGeometry(WIDTH / this.zoomLevel, HEIGHT / this.zoomLevel)
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        side: THREE.DoubleSide
      })
      const mesh = new THREE.Mesh(geometry, material)
      this.el.setObject3D('mesh', mesh)

      // Check if this is a depth layer
      if (!getParentContainer(this.el.parentEl)) {
        this.el.classList.add('collidable')
        this.addTools()
        this.addBox()
        const index = [...this.el.parentEl.children].indexOf(this.el)
        this.el.object3D.position.z = -index * LAYER_SPACING + DEPTH_LAYER_OFFSET
        this.clickHandler = this.clickHandler.bind(this)
        this.el.addEventListener('click', this.clickHandler)
        this.el.addEventListener('container.deactivate', () => {
          this.el.parentEl.setAttribute('container', { activeDepthLayer: '' })
        })
        this.el.emit('container.depthLayerReady')
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
        const oldActiveDepthLayerEl = this.el.querySelector(`#${oldData.activeDepthLayer}`)
        oldActiveDepthLayerEl.removeObject3D('box', oldActiveDepthLayerEl.components['container'].box)
        oldActiveDepthLayerEl.removeObject3D('visible', oldActiveDepthLayerEl.components['container'].visible)
      }

      if (this.data.activeDepthLayer) {
        const activeDepthLayerEl = this.el.querySelector(`#${this.data.activeDepthLayer}`)
        activeDepthLayerEl.setObject3D('box', activeDepthLayerEl.components['container'].box)
        activeDepthLayerEl.setObject3D('visible', activeDepthLayerEl.components['container'].visible)
      }
    }
  },

  clickHandler: function (event) {
    this.el.parentEl.setAttribute('container', { activeDepthLayer: this.el.id })
    document.querySelector('[holo]').setAttribute('holo', { selectedContainer: this.el.id })

    const object = event?.detail?.intersection?.object
    if (object?.name === 'visible') {
      if (this.isVisible === true) {
        for (const child of this.el.children) {
          child.setAttribute('visible', false)
        }
        this.el.getObject3D('mesh').visible = false
        this.isVisible = false
      } else {
        for (const child of this.el.children) {
          child.setAttribute('visible', true)
        }
        this.el.getObject3D('mesh').visible = true
        this.isVisible = true
      }
    }
  },

  setContainerBox: function () {
    const boxDepth = LAYER_SPACING * this.getDepthLayers() - LAYER_SPACING
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(WIDTH, HEIGHT, boxDepth))
    const segments = new THREE.LineSegmentsGeometry().fromEdgesGeometry(edges)
    const material = new THREE.LineMaterial({
      color: 0xffffff,
      worldUnits: true,
      linewidth: 0.02, // in pixels
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const mesh = new THREE.LineSegments2(segments, material)
    mesh.position.z = -boxDepth / 2 
    this.el.setObject3D('mesh', mesh)
  },

  addDepthLayer: function (updateCointanerBox = true) {
    // We set the the ID beforehand so obj-wrapper can set it as the selectedContainer on load
    const depthLayerId = Math.random().toString(36).replace(/[^a-z]+/g, '')
    const depthContainerEl = loadContainer(depthLayerId, true)
    this.el.appendChild(depthContainerEl)
    depthContainerEl.addEventListener('container.depthLayerReady', () => {
      depthContainerEl.emit('click')
    })

    if (updateCointanerBox) {
      this.setContainerBox()
    }
  },

  addTools: function () {
    const boxGeometry = new THREE.CircleGeometry(boxSize / 2, 32)
    const visibleTexture = new THREE.TextureLoader().load(`icons/visible.png`)
    this.visible = new THREE.Mesh(boxGeometry.clone(),
      new THREE.MeshBasicMaterial({ map: visibleTexture, color: '#FFFFFF', side: THREE.DoubleSide }))
    this.visible.name = 'visible'
    this.isVisible = true

    const mesh = this.el.getObject3D('mesh')
    const box3 = new THREE.Box3().setFromObject(mesh)
    const meshDimensions = new THREE.Vector3().subVectors(box3.max, box3.min)
    this.visible.position.set(
      -meshDimensions.x / 2 - boxSize / 2 - 0.03,
      meshDimensions.y / 2 - boxSize / 2,
      0
    )
  },

  addBox: function () {
    const mesh = this.el.getObject3D('mesh')
    this.el.sceneEl.object3D.add(mesh)
    const box3 = new THREE.Box3().setFromObject(mesh)
    const meshDimensions = new THREE.Vector3().subVectors(box3.max, box3.min)
    this.el.object3D.add(mesh)

    const boxGeo = new THREE.BoxGeometry(meshDimensions.x, meshDimensions.y, meshDimensions.z)
    const edges = new THREE.EdgesGeometry(boxGeo)
    const segments = new THREE.LineSegmentsGeometry().fromEdgesGeometry(edges)
    const material = new THREE.LineMaterial({
      color: 0xffffff,
      worldUnits: true,
      linewidth: 0.02 // in pixels
    })
    this.box = new THREE.LineSegments2(segments, material)
    this.box.position.copy(mesh.position)
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