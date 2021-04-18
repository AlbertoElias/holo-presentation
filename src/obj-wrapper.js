import { getChildObjects, getParentObjects } from './utils'

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

    this.setUpBox()

    this.clickHandler = this.clickHandler.bind(this)
    this.mouseMoveHandler = this.mouseMoveHandler.bind(this)
    this.mouseDownHandler = this.mouseDownHandler.bind(this)
    this.mouseUpHandler = this.mouseUpHandler.bind(this)

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
        console.log('removing')
        !this.el.hasAttribute('container') && this.el.removeObject3D('box')
        this.el.removeObject3D('resize', this.resize)
        this.el.removeObject3D('move', this.move)
        this.el.removeObject3D('rotate', this.rotate)
      }
    }
  },

  tick: function () {
    const isFixed = !!this.el.sceneEl.getAttribute('fixed').selectedContainer

    if (!this.box) {
      this.setUpBox()
      return
    }

    if (this.data.active) {
      this.updateBox()
    }

    if (this.activeAction?.name === 'move') {
      if (!isFixed) {
        const camera = this.el.sceneEl.camera.el.object3D
        const position = frontVector.clone().applyQuaternion(camera.quaternion).multiplyScalar(-1)
        const newCameraPosition = camera.position.clone().add(position)
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
    this.el.removeObject3D('box')
    this.el.removeObject3D('resize', this.resize)
    this.el.removeObject3D('move', this.move)
    this.el.removeObject3D('rotate', this.rotate)
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
        const childEls = getChildObjects(this.el)
        const parentEls = getParentObjects(childEls)
        const object = childEls[0].getObject3D('text') || childEls[0].getObject3D('mesh')

        function attachEls (childEls, parentEls, attach) {
          for (let i = 0; i < childEls.length; i++) {
            const childEl = childEls[i]
            if (Array.isArray(childEl)) {
              attachEls(childEl, parentEls[i], attach)
            } else {
              const mesh = childEl.getObject3D('text') || childEl.getObject3D('mesh')
              if (object !== mesh) {
                if (attach) {
                  object.attach(mesh)
                } else {
                  parentEls[i].attach(mesh)
                }
              }
            }
          }
        }

        attachEls(childEls, parentEls, true)
        const diff = this.mouse.sub(newMouse)
        diff.x = diff.x * -1
        object.scale.addScalar((diff.x + diff.y) * 0.01)
        object.updateMatrix()
        object.updateMatrixWorld()
        attachEls(childEls, parentEls, false)
        break
      }
      case 'move': {
        const diff = this.mouse.sub(newMouse)
        diff.x = diff.x * -1
        this.el.object3D.position.x = this.el.object3D.position.x + diff.x * 0.005
        this.el.object3D.position.y = this.el.object3D.position.y + diff.y * 0.005
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
      this.activeAction = object
      this.mouse.set(0, 0)
      this.cameraPosition.set(0, 0, 0)
      document.addEventListener('mousemove', this.mouseMoveHandler)
      console.log(getChildObjects(this.el))
    }
  },

  mouseUpHandler: function () {
    this.activeAction = null
    document.removeEventListener('mousemove', this.mouseMoveHandler)
  },

  clickHandler: function (event) {
    console.log(this.el)
    event.stopPropagation()
    for (const obj of [...document.querySelectorAll('[obj-wrapper]')]) {
      if (obj !== this.el) {
        obj.emit('objWrapper.deactivate')
      }
    }

    if (!this.data.active) {
      console.log('huh')
      this.updateBox()
      this.el.setAttribute('obj-wrapper', 'active: true')
      this.el.addEventListener('mousedown', this.mouseDownHandler)
      this.el.addEventListener('mouseup', this.mouseUpHandler)
    }
  },

  setUpBox: function () {
    if (!this.el.hasAttribute('container')) {
      const mesh = this.data.type === 'text' ?
        this.el.getObject3D('text') :
        this.el.getObject3D('mesh')
      if (!mesh) return
  
      const box3 = new THREE.Box3().setFromObject(mesh)
      const dimensions = new THREE.Vector3().subVectors(box3.max, box3.min)
      const boxGeo = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z)
      const edges = new THREE.EdgesGeometry(boxGeo)
      this.box = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x000000}))
    } else {
      this.box = this.el.getObject3D('mesh')
    }

    const boxSize = 0.1
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, 0.002)
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x508AA8 })

    const resizeTexture = new THREE.TextureLoader().load(`icons/resize.png`)
    const moveTexture = new THREE.TextureLoader().load(`icons/move.png`)
    const rotateTexture = new THREE.TextureLoader().load(`icons/rotate.png`)
  
    const resizeMesh = new THREE.Mesh(boxGeometry.clone(),
      getButtonMaterials(new THREE.MeshBasicMaterial({ map: resizeTexture, color: 0x508AA8 }), boxMaterial))
    resizeMesh.name = 'resize'

    const moveMesh = new THREE.Mesh(boxGeometry.clone(),
      getButtonMaterials(new THREE.MeshBasicMaterial({ map: moveTexture }), boxMaterial))
    moveMesh.name = 'move'

    const rotateMesh = new THREE.Mesh(boxGeometry.clone(),
    getButtonMaterials(new THREE.MeshBasicMaterial({ map: rotateTexture }), boxMaterial))
    rotateMesh.name = 'rotate'

    this.resize = resizeMesh
    this.move = moveMesh
    this.rotate = rotateMesh
  },

  updateBox: function () {
    const mesh = this.data.type === 'text' ?
      this.el.getObject3D('text') :
      this.el.getObject3D('mesh')
    if (!mesh) return

    if (this.el.hasAttribute('container')) {
      mesh.updateMatrix()
      // mesh.geometry.applyMatrix(mesh.matrix)
      mesh.geometry.computeBoundingBox()
    }
    
    const box3 = new THREE.Box3().setFromObject(mesh)
    // box3.matrix.copy(mesh.matrix)
    const dimensions = new THREE.Vector3().subVectors(box3.max, box3.min)

    if (!this.el.hasAttribute('container')) {
      const boxGeo = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z)
      const edges = new THREE.EdgesGeometry(boxGeo)
      this.box.geometry = edges
      this.box.position.copy(mesh.position)
    }

    switch (this.data.type) {
      case 'text':
        this.box.position.x = this.box.position.x + dimensions.x / 2
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

    const boxSize = 0.1
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
  }
})

function getButtonMaterials (image, material) {
  const firstFourFaces = new Array(4).fill(material.clone())
  return [...firstFourFaces, image, material.clone()]
}