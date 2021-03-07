const frontVector = new THREE.Vector3(0, 0, 1)

export const objWrapper = AFRAME.registerComponent('obj-wrapper', {
  schema: {
    type: {type: 'string', default: ''},
    active: {type: 'boolean', default: false}
  },

  init: function () {
    this.el.classList.add('collidable')
    this.active = false
    this.mouse = new THREE.Vector2()
    this.cameraPosition = new THREE.Vector3()
    this._phi = 0
    this._theta = 0
    this.activeAction = null

    this.mouseMoveHandler = (event) => {
      event.stopPropagation()
      event.preventDefault()

      if (this.mouse.x === 0 && this.mouse.y === 0) {
        this.mouse.set(event.clientX, event.clientY)
      }
      const newMouse = new THREE.Vector2(event.clientX, event.clientY)
      const object = this.el.getObject3D('mesh') || this.el.getObject3D('text')

      switch (this.activeAction.name) {
        case 'resize': {
          const diff = this.mouse.sub(newMouse)
          diff.x = diff.x * -1
          object.scale.addScalar((diff.x + diff.y) * 0.01)
          break
        }
        case 'move': {
          const diff = this.mouse.sub(newMouse)
          diff.x = diff.x * -1
          object.position.x = object.position.x + diff.x * 0.001
          object.position.y = object.position.y + diff.y * 0.001
          break
        }
        case 'rotate': {
          newMouse.set(this.mouse.x - event.movementX, this.mouse.y - event.movementY)
          const delta = new THREE.Vector2().subVectors(newMouse, this.mouse)
          const phi = this._phi + 2 * Math.PI * delta.y / screen.height * 1
          this._phi = Math.max(-Math.PI/2, Math.min(phi, Math.PI/2))
          this._theta += 2 * Math.PI * delta.x / screen.width * 1
          object.rotation.set(-this._phi, -this._theta, 0, 'YXZ')
          break
        }
        default:
          break
      }

      this.getBox()
      this.el.setObject3D('box', this.box)
      this.el.setObject3D('resize', this.resize)
      this.el.setObject3D('move', this.move)
      this.el.setObject3D('rotate', this.rotate)
      this.mouse.set(newMouse.x, newMouse.y)
    }

    this.mouseDownHandler = (event) => {
      console.log('mouse down')
      const object = event.detail.intersection?.object
      if (object.name === 'resize' || object.name === 'move' || object.name === 'rotate') {
        console.log(object.name)
        console.log(event)
        this.activeAction = object
        this.mouse.set(0, 0)
        this.cameraPosition.set(0, 0, 0)
        document.addEventListener('mousemove', this.mouseMoveHandler)
      }
    }

    this.mouseUpHandler = (event) => {
      console.log('mouse up')
      console.log(event)
      this.activeAction = null
      document.removeEventListener('mousemove', this.mouseMoveHandler)
    }

    this.clickHandler = () => {
      for (const obj of [...document.querySelectorAll('[obj-wrapper]')]) {
        if (obj !== this.el) {
          obj.emit('objWrapper.deactivate')
        }

        if (!this.data.active) {
          console.log('heyhey')
          this.getBox()
          this.el.setAttribute('obj-wrapper', 'active: true')
          this.el.addEventListener('mousedown', this.mouseDownHandler)
          this.el.addEventListener('mouseup', this.mouseUpHandler)
        }
      }
    }

    this.el.addEventListener('click', this.clickHandler)
    this.el.addEventListener('objWrapper.deactivate', () => {
      this.el.setAttribute('obj-wrapper', 'active: false')
      this.el.removeEventListener('mousedown', this.mouseDownHandler)
      this.el.removeEventListener('mouseup', this.mouseUpHandler)
    })
  },

  update: function (oldData) {
    if (Object.keys(oldData).length === 0) { return }

    const data = this.data

    if (data.active !== oldData.active) {
      if (data.active) {
        this.el.setObject3D('box', this.box)
        this.el.setObject3D('resize', this.resize)
        this.el.setObject3D('move', this.move)
        this.el.setObject3D('rotate', this.rotate)
      } else {
        this.el.removeObject3D('box')
        this.el.removeObject3D('resize', this.resize)
        this.el.removeObject3D('move', this.move)
        this.el.removeObject3D('rotate', this.rotate)
      }
    }
  },

  tick: function () {
    const isFixed = this.el.sceneEl.hasAttribute('fixed')

    if (this.activeAction?.name === 'move') {
      if (!isFixed) {
        const object = this.el.getObject3D('mesh') || this.el.getObject3D('text')
        const camera = this.el.sceneEl.camera.el.object3D
        const position = frontVector.clone().applyQuaternion(camera.quaternion).multiplyScalar(-1)
        const newCameraPosition = camera.position.clone().add(position)
        if (this.cameraPosition.x === 0 && this.cameraPosition.y === 0 && this.cameraPosition.z === 0) {
          this.cameraPosition.copy(newCameraPosition)
        }
        const cameraDiff = this.cameraPosition.sub(newCameraPosition).multiplyScalar(-1)
        console.log(cameraDiff)
        // console.log(cameraDiff)
        object.position.add(cameraDiff)
        this.cameraPosition.copy(newCameraPosition)
      }
    }
  },

  remove: function () {
    this.el.removeEventListener('click', this.clickHandler)
    this.el.removeObject3D('box')
    this.el.removeObject3D('resize', this.resize)
    this.el.removeObject3D('move', this.move)
    this.el.removeObject3D('rotate', this.rotate)
  },

  getBox: function () {
    const mesh = this.data.type === 'text' ?
      this.el.getObject3D('text') :
      this.el.getObject3D('mesh')
    const box3 = new THREE.Box3().setFromObject(mesh)
    const dimensions = new THREE.Vector3().subVectors(box3.max, box3.min)
    const boxGeo = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z)
    const edges = new THREE.EdgesGeometry(boxGeo)
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x000000}))
    line.position.copy(mesh.position)
    switch (this.data.type) {
      case 'text':
        line.position.x = line.position.x + dimensions.x / 2
        break
      case 'emoji':
        line.position.x = line.position.x + dimensions.x / 2
        line.position.y = line.position.y - dimensions.y / 2
        break
      case 'gltf':
        line.position.y = line.position.y + dimensions.y / 2
        break
      default:
        break
    }

    const boxSize = 0.1
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, 0.002)
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x508AA8 })

    const resizeTexture = new THREE.TextureLoader().load(`icons/resize.png`)
    const moveTexture = new THREE.TextureLoader().load(`icons/move.png`)
    const rotateTexture = new THREE.TextureLoader().load(`icons/rotate.png`)
  
    const resizeMesh = new THREE.Mesh(boxGeometry.clone(),
      getButtonMaterials(new THREE.MeshBasicMaterial({ map: resizeTexture, color: 0x508AA8 }), boxMaterial))
    resizeMesh.position.set(
      line.position.x + dimensions.x / 2 + boxSize / 2,
      line.position.y + -dimensions.y / 2 - boxSize / 2,
      line.position.z
    )
    resizeMesh.name = 'resize'

    const moveMesh = new THREE.Mesh(boxGeometry.clone(),
      getButtonMaterials(new THREE.MeshBasicMaterial({ map: moveTexture }), boxMaterial))
    moveMesh.position.set(
      line.position.x + dimensions.x / 2 + boxSize / 2 + boxSize,
      line.position.y + -dimensions.y / 2 - boxSize / 2,
      line.position.z
    )
    moveMesh.name = 'move'

    const rotateMesh = new THREE.Mesh(boxGeometry.clone(),
    getButtonMaterials(new THREE.MeshBasicMaterial({ map: rotateTexture }), boxMaterial))
    rotateMesh.position.set(
      line.position.x + dimensions.x / 2 + boxSize / 2 + boxSize * 2,
      line.position.y + -dimensions.y / 2 - boxSize / 2,
      line.position.z
    )
    rotateMesh.name = 'rotate'

    this.box = line
    this.resize = resizeMesh
    this.move = moveMesh
    this.rotate = rotateMesh
  }
})

function getButtonMaterials (image, material) {
  const firstFourFaces = new Array(4).fill(material.clone())
  return [...firstFourFaces, image, material.clone()]
}