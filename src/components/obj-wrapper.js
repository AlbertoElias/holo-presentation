import { getParentContainer } from "../utils"

const frontVector = new THREE.Vector3(0, 0, 1)
const boxSize = 0.2
const boxMargin = 0.02
const pivot = new THREE.Group()

export const objWrapper = AFRAME.registerComponent('obj-wrapper', {
  schema: {
    // "text" | "emoji" | "container" | "image" | "gltf"
    type: { type: 'string', default: '' },
    id: { type: 'string', default: '' },
    asset: { type: 'map', default: `{ main: '' }` },
    active: { type: 'boolean', default: false }
  },

  init: function () {
    this.el.classList.add('collidable')
    this.el.setAttribute('hoverable', '')
    this.el.setAttribute('clickable', '')
    this.el.setAttribute('stretchable', '')

    this.el.id = this.el.id || this.data.id || Math.random().toString(36).replace(/[^a-z]+/g, '')

    this.mouse = new THREE.Vector2()
    this.cameraPosition = new THREE.Vector3()
    this._phi = 0
    this._theta = 0
    this.activeAction = null
    this.movementControls = this.el.sceneEl.querySelector('[movement-controls]')

    this.setUpBox()

    this.clickHandler = this.clickHandler.bind(this)
    this.mouseMoveHandler = this.mouseMoveHandler.bind(this)
    this.mouseDownHandler = this.mouseDownHandler.bind(this)
    this.mouseUpHandler = this.mouseUpHandler.bind(this)
    this.grabStartHandler = this.grabStartHandler.bind(this)
    this.grabEndHandler = this.grabEndHandler.bind(this)

    this.el.addEventListener('click', this.clickHandler)
    this.el.addEventListener('objWrapper.deactivate', () => {
      this.el.setAttribute('obj-wrapper', 'active: false')
    })
  
    this.el.addEventListener('grab-start', this.grabStartHandler)
    this.el.addEventListener('grab-end', this.grabEndHandler)
  },

  update: function (oldData) {
    const data = this.data

    // It will break otherwise
    if (!this.box) return

    if (data.active && !oldData.active) {
      if (!this.isContainer()) {
        this.el.setObject3D('box', this.box)
      } else if (getParentContainer(this.el)) {
        this.box.material.transparent = false
      }

      if (!this.el.sceneEl.renderer.xr.isPresenting) {
        this.resize.visible = true
        this.move.visible = true
        this.rotate.visible = true
        if (this.add) this.add.position.y = boxSize * 4 + boxMargin * 3

        this.el.addEventListener('mousedown', this.mouseDownHandler)
        this.el.addEventListener('mouseup', this.mouseUpHandler)
      } else {
        this.resize.visible = false
        this.move.visible = false
        this.rotate.visible = false
        if (this.add) this.add.position.y = boxSize
      }

      this.el.setObject3D('tools', this.tools)

      // If a container is selected, check if it has an active depth layer. If not, use the first depth layer
      // Other wise it's a normal container or object, so use its id
      const selectedContainerId = this.el.hasAttribute('container') && !getParentContainer(this.el) ?
        this.el.getAttribute('container').activeDepthLayer || this.el.children[0].id :
        this.el.id

      this.el.sceneEl.setAttribute('holo', {
        selectedContainer: selectedContainerId,
        isFixed: this.isContainer()
      })
    } else if (!data.active && oldData.active) {
      if (!this.isContainer()) {
        this.el.removeObject3D('box')
      } else if (getParentContainer(this.el)) {
        this.box.material.transparent = true
      }

      if (!this.el.sceneEl.renderer.xr.isPresenting) {
        this.el.removeEventListener('mousedown', this.mouseDownHandler)
        this.el.removeEventListener('mouseup', this.mouseUpHandler)
      }

      this.el.removeObject3D('tools', this.tools)
    }
  },

  tick: function () {
    const isFixed = this.el.sceneEl.getAttribute('holo').isFixed

    if (!this.box) {
      this.setUpBox()
      return
    }

    if (this.activeAction?.name === 'move') {
      if (!isFixed) {
        const camera = this.el.sceneEl.camera.el.object3D
        const position = frontVector.clone().applyQuaternion(camera.quaternion).multiplyScalar(-1)
        const newCameraPosition = this.movementControls.object3D.position.clone().add(position)
        if (this.cameraPosition.x === 0 && this.cameraPosition.y === 0 && this.cameraPosition.z === 0) {
          this.cameraPosition.copy(newCameraPosition)
        }
        const cameraDiff = this.cameraPosition.sub(newCameraPosition).multiplyScalar(-1)
        this.el.object3D.position.add(cameraDiff)
        this.cameraPosition.copy(newCameraPosition)
      }
    }

    if (this.grabbingHand && this.currentParentContainer !== null) {
      this.checkNewParentContainer()
    }
  },

  remove: function () {
    if (!this.isContainer()) {
      this.el.removeObject3D('box')
    }
    this.el.removeObject3D('tools')
    this.el.removeEventListener(' click', this.clickHandler)
    if (!this.isChangingParent) {
      this.el.sceneEl.setAttribute('holo', {
        selectedContainer: '',
        isFixed: false
      })
    }
  },

  clickHandler: function (event) {
    event?.stopPropagation()
    const object = event.detail.intersection?.object

    if (!this.data.active) {
      this.el.setAttribute('obj-wrapper', 'active: true')
    } else if (object?.name === 'close') {
      this.el.parentEl.removeChild(this.el)
    } else if (object?.name === 'add') {
      this.el.components['container'].addDepthLayer()
    }
  },

  mouseMoveHandler: function (event) {
    event.stopPropagation()
    event.preventDefault()

    if (this.mouse.x === 0 && this.mouse.y === 0) {
      this.mouse.set(event.clientX, event.clientY)
    }
    const newMouse = new THREE.Vector2(event.clientX, event.clientY)
  
    switch (this.activeAction.name) {
      case 'resize': {
        const diff = this.mouse.sub(newMouse)
        diff.x = diff.x * -1
        this.el.object3D.scale.addScalar((diff.x + diff.y) * 0.01)
        break
      }
      case 'move': {
        const diff = this.mouse.sub(newMouse)
        diff.x = diff.x * -1
        this.el.object3D.position.x = this.el.object3D.position.x + diff.x * 0.004
        this.el.object3D.position.y = this.el.object3D.position.y + diff.y * 0.004

        if (this.currentParentContainer === null) break

        this.checkNewParentContainer()
        break
      }
      case 'rotate': {
        newMouse.set(this.mouse.x - event.movementX, this.mouse.y - event.movementY)
        const delta = new THREE.Vector2().subVectors(newMouse, this.mouse)
        const phi = this._phi + 2 * Math.PI * delta.y / screen.height
        this._phi = Math.max(-Math.PI/2, Math.min(phi, Math.PI/2))
        this._theta += 2 * Math.PI * delta.x / screen.width
        this.el.object3D.rotation.set(-this._phi, -this._theta, 0, 'YXZ')
        break
      }
      default:
        break
    }
    this.mouse.set(newMouse.x, newMouse.y)
  },

  mouseDownHandler: function (event) {
    const object = event.detail.intersection?.object
    if (!object) return
    if (object.name === 'resize' || object.name === 'move' || object.name === 'rotate') {
      this.currentParentContainer = this.newParentContainer = getParentContainer(this.el)
      this.activeAction = object
      this.mouse.set(0, 0)
      this.cameraPosition.set(0, 0, 0)
      document.addEventListener('mousemove', this.mouseMoveHandler)
      document.addEventListener('mouseout', this.mouseUpHandler)
      this.el.sceneEl.setAttribute('holo', {
        isFixed: false
      })
    }
  },

  mouseUpHandler: function () {
    this.activeAction = null
    document.removeEventListener('mousemove', this.mouseMoveHandler)
    document.removeEventListener('mouseout', this.mouseUpHandler)
    this.el.sceneEl.setAttribute('holo', {
      isFixed: this.isContainer()
    })

    if (this.currentParentContainer) {
      const currentParentContainerMesh = this.currentParentContainer.getObject3D('mesh')
      currentParentContainerMesh?.material.color.setHex(0xffffff)
      currentParentContainerMesh.material.transparent = true
    }
    if (this.currentParentContainer !== this.newParentContainer) {
      const newParentContainerMesh = this.newParentContainer.getObject3D('mesh')
      newParentContainerMesh.material.color.setHex(0x24b59f)
      newParentContainerMesh.material.transparent = true
      this.changeParent()
    }
  },

  grabStartHandler: function (event) {
    event.stopPropagation()
    event.preventDefault()

    if (this.grabbingHand) return

    this.grabbingHand = event.detail.hand
    this.intersectionPoint = this.grabbingHand.object3D.worldToLocal(this.grabbingHand.components.raycaster.getIntersection(this.el).point)
    pivot.position.copy(this.intersectionPoint)
    pivot.attach(this.el.object3D)
    this.grabbingHand.object3D.attach(pivot)

    this.currentParentContainer = this.newParentContainer = getParentContainer(this.el)
  },

  grabEndHandler: function () {
    this.el.parentEl.object3D.attach(this.el.object3D)
    this.grabbingHand.object3D.remove(pivot)
    this.grabbingHand = null
    if (this.currentParentContainer !== this.newParentContainer) {
      this.changeParent()
    }
  },

  setUpBox: function () {
    const mesh = this.data.type === 'text' ?
      this.el.getObject3D('text') :
      this.el.getObject3D('mesh')
    if (!mesh) return
    
    // Temporarily makes the object a child of the scene so the bounding box ignores any parent transforms
    this.el.sceneEl.object3D.add(mesh)
    const box3 = new THREE.Box3().setFromObject(mesh)
    const meshDimensions = new THREE.Vector3().subVectors(box3.max, box3.min)
    this.el.object3D.add(mesh)

    if (!this.isContainer()) {
      const boxGeo = new THREE.BoxGeometry(meshDimensions.x, meshDimensions.y, meshDimensions.z)
      const edges = new THREE.EdgesGeometry(boxGeo)
      this.box = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}))
      this.box.position.copy(mesh.position)
    } else {
      this.box = this.el.getObject3D('mesh')
    }

    switch (this.data.type) {
      case 'text':
        mesh.position.x = this.box.position.x - meshDimensions.x / 2
        mesh.position.y = this.box.position.y - meshDimensions.y / 2
        break
      case 'emoji':
        mesh.position.x = this.box.position.x - meshDimensions.x / 2
        mesh.position.y = this.box.position.y + meshDimensions.y / 2
        break
      case 'gltf':
        mesh.position.y = this.box.position.y - meshDimensions.y / 2
        break
      default:
        break
    }

    const boxGeometry = new THREE.CircleGeometry(boxSize / 2, 32)

    const resizeTexture = new THREE.TextureLoader().load(`icons/resize.png`)
    const moveTexture = new THREE.TextureLoader().load(`icons/move.png`)
    const rotateTexture = new THREE.TextureLoader().load(`icons/rotate.png`)
    const closeTexture = new THREE.TextureLoader().load(`icons/close.png`)
  
    this.resize = new THREE.Mesh(boxGeometry.clone(),
      new THREE.MeshBasicMaterial({ map: resizeTexture, color: '#FFFFFF', side: THREE.DoubleSide }))
    this.resize.name = 'resize'

    this.move = new THREE.Mesh(boxGeometry.clone(),
      new THREE.MeshBasicMaterial({ map: moveTexture, transparent: true, opacity: 1, color: '#ffffff', side: THREE.DoubleSide }))
    this.move.name = 'move'

    this.rotate = new THREE.Mesh(boxGeometry.clone(),
      new THREE.MeshBasicMaterial({ map: rotateTexture, transparent: true, side: THREE.DoubleSide }))
    this.rotate.name = 'rotate'

    this.close = new THREE.Mesh(boxGeometry.clone(),
      new THREE.MeshBasicMaterial({ map: closeTexture, transparent: true, side: THREE.DoubleSide }))
    this.close.name = 'close'

    this.tools = new THREE.Group()
    this.tools.add(this.resize)
    this.tools.add(this.move)
    this.tools.add(this.rotate)
    this.tools.add(this.close)

    this.tools.position.set(
      this.box.position.x + meshDimensions.x / 2 + boxSize / 2 + 0.03,
      this.box.position.y + -meshDimensions.y / 2 - boxSize / 2,
      this.box.position.z + meshDimensions.z / 2
    )

    this.resize.position.y = boxSize
    this.move.position.y = boxSize * 2 + boxMargin
    this.rotate.position.y = boxSize * 3 + boxMargin * 2
    this.close.position.y = boxSize * 4 + boxMargin * 3

    const toolsBox3 = new THREE.Box3().setFromObject(this.tools)
    const toolsDimensions = new THREE.Vector3().subVectors(toolsBox3.max, toolsBox3.min)
    if (toolsDimensions.y + boxSize > meshDimensions.y && !this.el.sceneEl.renderer.xr.isPresenting) {
      this.tools.position.y = -toolsDimensions.y / 2 - boxSize / 2
    } else {
      const closePosition = new THREE.Vector3(
        this.box.position.x + meshDimensions.x / 2 + boxSize / 2 + 0.03,
        this.box.position.y + meshDimensions.y / 2 - boxSize / 2,
        this.box.position.z + meshDimensions.z / 2
      )
      this.close.position.copy(this.tools.worldToLocal(closePosition))
    }

    if (this.isContainer() && !getParentContainer(this.el)) {
      const addTexture = new THREE.TextureLoader().load(`icons/add.png`)
      this.add = new THREE.Mesh(boxGeometry.clone(),
        new THREE.MeshBasicMaterial({ map: addTexture, transparent: false, side: THREE.DoubleSide }))
      this.add.name = 'add'
      // It can have the same position as the close button
      // because in a container there will always be enough height to fit the close button in the top right
      this.add.position.y = boxSize * 4
      this.tools.add(this.add)
    }

    this.el.emit('objWrapper.boxReady')
  },

  checkNewParentContainer: function () {
    const box = new THREE.Box3().setFromObject(this.box)
    const boxCenter = box.getCenter(new THREE.Vector3())
    const containers = this.getAllOtherContainers()
    for (const container of containers) {
      const containerBox = new THREE.Box3().setFromObject(container.getObject3D('mesh'))
      if (containerBox.containsPoint(boxCenter)) {
        const previousParentContainerMesh = this.newParentContainer.getObject3D('mesh')
        previousParentContainerMesh.material.color.setHex(0xffffff)
        previousParentContainerMesh.material.transparent = true
        this.newParentContainer = container
        const newParentContainerMesh = container.getObject3D('mesh')
        newParentContainerMesh.material.color.setHex(0xFFAA01)
        previousParentContainerMesh.material.transparent = false
        break
      }
    }
  },

  isContainer: function () {
    return this.data.type === 'container'
  },

  getAllOtherContainers () {
    return [...this.el.sceneEl.querySelectorAll('[container]')]
      .filter((c) => (this.isContainer && c !== this.el) && getParentContainer(c))
      .sort((c1, c2) => c2.components['container'].zoomLevel - c1.components['container'].zoomLevel)
  },

  changeParent () {
    const position = this.el.object3D.getWorldPosition(new THREE.Vector3())
    const scale = this.el.object3D.getWorldScale(new THREE.Vector3())
    const rotation = this.el.object3D.quaternion

    // Save the data from current objects to preserve the data as is
    const currentObjectData = {}
    const currentObjectWithChildren = [this.el, ...this.el.querySelectorAll('[obj-wrapper]')]
    for (const object of currentObjectWithChildren) {
      currentObjectData[object.id] = { ...object.getAttribute('obj-wrapper') }
    }

    this.el.flushToDOM(true)
    const copy = this.el.cloneNode()

    // When flushing to DOM, the "asset" property is saved as the string [object Object]
    // We need to store it as an object to then be able to save it in storage
    for (const id of Object.keys(currentObjectData)) {
      const newObject = copy.id === id ? copy : copy.querySelector(`#${id}`)
      console.log('setting', newObject)
      newObject.setAttribute('obj-wrapper', currentObjectData[id])
    }
    // Make sure new object is not active, as this will try to load box in #update()
    // If there is no box, #update() will not be called again as it requires a data change
    copy.setAttribute('obj-wrapper', { active: false })


    this.newParentContainer.object3D.worldToLocal(position)
    this.newParentContainer.object3D.worldToLocal(scale)
    copy.object3D.position.copy(position)
    copy.object3D.scale.copy(this.el.object3D.scale)
    copy.object3D.quaternion.copy(rotation)
  
    copy.addEventListener('objWrapper.boxReady', () => {
      this.isChangingParent = true
      this.currentParentContainer.removeChild(this.el)
      // Now that the box is ready, activate the object
      copy.setAttribute('obj-wrapper', { active: true })
      console.log(document.querySelector('#' + copy.id).getAttribute('obj-wrapper'))
    })
    this.newParentContainer.appendChild(copy)
  }
})