const frontVector = new THREE.Vector3(0, 0, 1)

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
    this.el.id = this.data.id || Math.random().toString(36).replace(/[^a-z]+/g, '')
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

    this.el.addEventListener('click', this.clickHandler)
    this.el.addEventListener('objWrapper.deactivate', () => {
      console.log(1)
      this.el.setAttribute('obj-wrapper', 'active: false')
      console.log(2)
      this.el.removeEventListener('mousedown', this.mouseDownHandler)
      this.el.removeEventListener('mouseup', this.mouseUpHandler)
      console.log(3)
    })
  },

  update: function (oldData) {
    const data = this.data

    if (data.active) {
      console.log(1.5)
      if (!this.isContainer()) {
        this.el.setObject3D('box', this.box)
      }
      this.el.setObject3D('resize', this.resize)
      this.el.setObject3D('move', this.move)
      this.el.setObject3D('rotate', this.rotate)
      this.el.setObject3D('close', this.close)

      this.el.addEventListener('mousedown', this.mouseDownHandler)
      this.el.addEventListener('mouseup', this.mouseUpHandler)

      this.el.sceneEl.setAttribute('holo', {
        selectedContainer: this.el.id,
        isFixed: this.isContainer()
      })
    } else if (oldData.active) {
      console.log(1.5)
      if (!this.isContainer()) {
        this.el.removeObject3D('box')
      }
      this.el.removeObject3D('resize', this.resize)
      this.el.removeObject3D('move', this.move)
      this.el.removeObject3D('rotate', this.rotate)
      this.el.removeObject3D('close', this.close)
    }
  },

  tick: function () {
    const isFixed = this.el.sceneEl.getAttribute('holo').isFixed

    if (!this.box) {
      this.setUpBox()  
      // if (this.parentContainer?.components['obj-wrapper'].box) {
      //   const parentBox = new THREE.Box3().setFromObject(this.parentContainer?.components['obj-wrapper'].box)
      //   const helper = new THREE.Box3Helper(parentBox, 0xffff00)
      //   console.log(this.el.parentEl)
      //   this.el.sceneEl.object3D.add(helper)
      // }
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
  },

  remove: function () {
    this.el.removeEventListener('click', this.clickHandler)
    if (!this.isContainer()) {
      this.el.removeObject3D('box')
    }
    this.el.removeObject3D('resize', this.resize)
    this.el.removeObject3D('move', this.move)
    this.el.removeObject3D('rotate', this.rotate)
    this.el.removeObject3D('close', this.close)
  },

  clickHandler: function (event) {
    event?.stopPropagation()
    const object = event.detail.intersection?.object

    if (!this.data.active) {
      this.deactivateAllObjWrappers()
      this.el.setAttribute('obj-wrapper', 'active: true')
    } else if (object.name === 'close') {
      this.el.parentEl.removeChild(this.el)
    }
  },

  mouseMoveHandler: function (event) {
    event.stopPropagation()
    event.preventDefault()

    if (this.mouse.x === 0 && this.mouse.y === 0) {
      this.mouse.set(event.clientX, event.clientY)
    }
    const newMouse = new THREE.Vector2(event.clientX, event.clientY)
    // const parentBox = this.newParentContainer && new THREE.Box3().setFromObject(this.newParentContainer.components['obj-wrapper'].box)
    // const mesh = this.data.type === 'text' ?
    //   this.el.getObject3D('text') :
    //   this.el.getObject3D('mesh')
    // const boxObject = this.box.clone()
    const box = new THREE.Box3().setFromObject(this.box)
    const boxCenter =  box.getCenter(new THREE.Vector3())
  
    switch (this.activeAction.name) {
      case 'resize': {
        const diff = this.mouse.sub(newMouse)
        diff.x = diff.x * -1

        // boxObject.scale.addScalar((diff.x + diff.y) * 0.01)
        // const box = new THREE.Box3().setFromObject(boxObject)
        // const helper = new THREE.Box3Helper(box, 0xffff00)
        // this.el.sceneEl.object3D.add(helper)
        // console.log(parentBox)
        // console.log(box)

        // console.log(parentBox.containsBox(box))
        // if (!this.parentContainer || parentBox.containsBox(box)) {
          this.el.object3D.scale.addScalar((diff.x + diff.y) * 0.01)
        // }
        break
      }
      case 'move': {
        const diff = this.mouse.sub(newMouse)
        diff.x = diff.x * -1
        this.el.object3D.position.x = this.el.object3D.position.x + diff.x * 0.004
        this.el.object3D.position.y = this.el.object3D.position.y + diff.y * 0.004

        if (this.currentParentContainer === null) break
  
        const containers = this.getAllOtherContainers()
        for (const container of containers) {
          const containerBox = new THREE.Box3().setFromObject(container.components['obj-wrapper'].box)
          if (containerBox.containsPoint(boxCenter)) {
            this.newParentContainer = container
            break
          }
        }
        break
      }
      case 'rotate': {
        newMouse.set(this.mouse.x - event.movementX, this.mouse.y - event.movementY)
        const delta = new THREE.Vector2().subVectors(newMouse, this.mouse)
        const phi = this._phi + 2 * Math.PI * delta.y / screen.height * 1
        this._phi = Math.max(-Math.PI/2, Math.min(phi, Math.PI/2))
        this._theta += 2 * Math.PI * delta.x / screen.width * 1
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
    if (object.name === 'resize' || object.name === 'move' || object.name === 'rotate') {
      this.currentParentContainer = this.newParentContainer = this.getParentContainer()
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
    if (this.currentParentContainer !== this.newParentContainer) {
      const position = this.el.object3D.getWorldPosition(new THREE.Vector3())
      const scale = this.el.object3D.getWorldScale(new THREE.Vector3())
      const rotation = this.el.object3D.getWorldQuaternion(new THREE.Quaternion())
  
      this.el.flushToDOM()
      const copy = this.el.cloneNode()
      this.newParentContainer.appendChild(copy)

      this.newParentContainer.object3D.worldToLocal(position)
      this.newParentContainer.object3D.worldToLocal(scale)
      copy.object3D.position.copy(position)
      copy.object3D.scale.copy(this.el.object3D.scale)
      copy.object3D.quaternion.copy(rotation)

      this.currentParentContainer.removeChild(this.el)
    }
    this.el.sceneEl.setAttribute('holo', {
      isFixed: this.isContainer()
    })
  },

  setUpBox: function () {
    const mesh = this.data.type === 'text' ?
      this.el.getObject3D('text') :
      this.el.getObject3D('mesh')
    if (!mesh) return

    const box3 = new THREE.Box3().setFromObject(mesh)
    const dimensions = new THREE.Vector3().subVectors(box3.max, box3.min)

    if (!this.isContainer()) {
      const boxGeo = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z)
      const edges = new THREE.EdgesGeometry(boxGeo)
      this.box = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x000000}))
      this.box.position.copy(mesh.position)
    } else {
      this.box = this.el.getObject3D('mesh')
    }

    switch (this.data.type) {
      case 'text':
        this.box.position.x = this.box.position.x + dimensions.x / 2
        this.box.position.y = this.box.position.y + dimensions.y / 2
        break
      case 'emoji':
        this.box.position.x = this.box.position.x + dimensions.x / 2
        this.box.position.y = this.box.position.y - dimensions.y / 2
        break
      case 'gltf':
        this.box.position.y = this.box.position.y + dimensions.y / 2
        break
      default:
        break
    }

    const boxSize = 0.2
    const boxGeometry = new THREE.PlaneGeometry(boxSize, boxSize)

    const resizeTexture = new THREE.TextureLoader().load(`icons/resize.png`)
    const moveTexture = new THREE.TextureLoader().load(`icons/move.png`)
    const rotateTexture = new THREE.TextureLoader().load(`icons/rotate.png`)
    const closeTexture = new THREE.TextureLoader().load(`icons/close.png`)
  
    const resizeMesh = new THREE.Mesh(boxGeometry.clone(),
      new THREE.MeshBasicMaterial({ map: resizeTexture, transparent: true, side: THREE.DoubleSide }))
    resizeMesh.name = 'resize'

    const moveMesh = new THREE.Mesh(boxGeometry.clone(),
      new THREE.MeshBasicMaterial({ map: moveTexture, transparent: true, side: THREE.DoubleSide }))
    moveMesh.name = 'move'

    const rotateMesh = new THREE.Mesh(boxGeometry.clone(),
      new THREE.MeshBasicMaterial({ map: rotateTexture, transparent: true, side: THREE.DoubleSide }))
    rotateMesh.name = 'rotate'

    const closeMesh = new THREE.Mesh(boxGeometry.clone(),
      new THREE.MeshBasicMaterial({ map: closeTexture, transparent: true, side: THREE.DoubleSide }))
    closeMesh.name = 'close'

    this.resize = resizeMesh
    this.move = moveMesh
    this.rotate = rotateMesh
    this.close = closeMesh

    this.resize.position.set(
      this.box.position.x + dimensions.x / 2 + boxSize / 2,
      this.box.position.y + -dimensions.y / 2 - boxSize / 2,
      this.box.position.z + dimensions.z / 2
    )

    this.move.position.set(
      this.box.position.x + dimensions.x / 2 + boxSize / 2 + boxSize,
      this.box.position.y + -dimensions.y / 2 - boxSize / 2,
      this.box.position.z + dimensions.z / 2
    )

    this.rotate.position.set(
      this.box.position.x + dimensions.x / 2 + boxSize / 2 + boxSize * 2,
      this.box.position.y + -dimensions.y / 2 - boxSize / 2,
      this.box.position.z + dimensions.z / 2
    )

    this.close.position.set(
      -this.box.position.x - dimensions.x / 2,
      -this.box.position.y + dimensions.y / 2,
      -this.box.position.z + dimensions.z / 2
    )
  },

  deactivateAllObjWrappers: function () {
    for (const obj of [...document.querySelectorAll('[obj-wrapper]')]) {
      if (obj !== this.el) {
        obj.emit('objWrapper.deactivate')
      }
    }
  },

  isContainer: function () {
    return this.data.type === 'container'
  },

  getParentContainer: function () {
    let el = this.el.parentEl
    while (!el.hasAttribute('container')) {
      if (!el.parentEl) {
        return null
      }
      el = el.parentEl
    }
    return el
  },

  getAllOtherContainers () {
    return [...this.el.sceneEl.querySelectorAll('[container]')]
      .filter((c) => this.isContainer && c !== this.el)
      .sort((c1, c2) => c2.components['container'].zoomLevel - c1.components['container'].zoomLevel)
  }
})