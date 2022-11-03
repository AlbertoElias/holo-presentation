const visualizationState = {
  selectedObject: null,
  selectedObjectPosition: new THREE.Vector3(),
  selectedRootObject: null,
  selectedRootObjectPosition: new THREE.Vector3(),
  cameraPosition: new THREE.Vector3()
}

function findLastChild (el) {
  if (el?.lastChild) {
    return findLastChild(el.lastChild)
  }

  return el
}

// Add vector to object to make sure the object is always in front of the camera
const inFrontVector = new THREE.Vector3(0, 0, 1)

export const holo = AFRAME.registerComponent('holo', {
  schema: {
    selectedContainer: { type: 'string', default: '' },
    isFixed: { type: 'boolean', default: false },
    isVisualizing: { type: 'boolean', default: false}
  },

  init: function () {
    this.cameraEl = this.el.querySelector('[camera]')
    this.movementControls = this.el.querySelector('[movement-controls]')
    this.keyDownHandler = this.keyDownHandler.bind(this)
  },

  update: function (oldData) {
    if (Object.keys(oldData).length === 0) { return }

    const data = this.data
    if (data.isFixed) {
      this.movementControls.setAttribute('movement-controls', {
        enabled: false
      })
    } else {
      this.movementControls.setAttribute('movement-controls', {
        enabled: true
      })
    }

    if (data.isVisualizing && !oldData.isVisualizing) {
      if (!data.isFixed) {
        this.el.setAttribute('holo', {
          isFixed: true
        })
      }

      const selectedContainer = this.el.sceneEl.querySelector(`#${this.data.selectedContainer}`)
      visualizationState.selectedObject = selectedContainer
      visualizationState.selectedRootObject = selectedContainer
      visualizationState.selectedRootObjectPosition.copy(selectedContainer.object3D.position)

      document.addEventListener('keydown', this.keyDownHandler)
    } else if (!data.isVisualizing && oldData.isVisualizing) {
      visualizationState.selectedRootObject.object3D.position.copy(visualizationState.selectedRootObjectPosition)
      document.removeEventListener('keydown', this.keyDownHandler)
    }
  },

  keyDownHandler: function (event) {
    if (event.defaultPrevented || event.repeat) {
      return
    }

    switch (event.key) {
      case 'ArrowRight':
        const child = visualizationState.selectedObject.children[0]
        if (child) {
          visualizationState.selectedObject = child
          break
        }

        const nextSibling = visualizationState.selectedObject.nextSibling
        if (nextSibling) {
          visualizationState.selectedObject = nextSibling
          break
        }

        const nextParentSibling = visualizationState.selectedObject.parentEl.nextSibling
        if (nextParentSibling) {
          visualizationState.selectedObject = nextParentSibling
          break
        }

        // If we are at the end, start from the beginning
        visualizationState.selectedObject = visualizationState.selectedRootObject
        break
      case 'ArrowLeft':
        // We are already at the beginning and it makes no sense to go back
        if (visualizationState.selectedObject === visualizationState.selectedRootObject) {
          const lastRootChild = findLastChild(visualizationState.selectedObject)
          visualizationState.selectedObject = lastRootChild
          break
        }

        const previousSiblingChild = findLastChild(visualizationState.selectedObject.previousSibling)
        if (previousSiblingChild) {
          visualizationState.selectedObject = previousSiblingChild
          break
        }

        const previousSibling = visualizationState.selectedObject.previousSibling
        if (previousSibling) {
          visualizationState.selectedObject = previousSibling
          break
        }

        const parent = visualizationState.selectedObject.parentEl
        if (parent) {
          visualizationState.selectedObject = parent
          break
        }
        break
      default:
        break
    }

    this.updateSelectedObjectPosition()
    event.preventDefault()
  },

  remove: function () {
    this.movementControls.setAttribute('movement-controls', {
      enabled: true
    })
    document.body.removeEventListener('keydown', this.keyDownHandler)
  },

  updateSelectedObjectPosition: function () {
    const object = visualizationState.selectedObject.object3D
    const rootObject = visualizationState.selectedRootObject.object3D
    const camera = this.cameraEl.object3D.children[0]

    const box = new THREE.Box3().setFromObject(object)
    const sizeVector = new THREE.Vector3()
    box.getCenter(visualizationState.selectedObjectPosition)
  
    // Calculation based on https://wejn.org/2020/12/cracking-the-threejs-object-fitting-nut/
    const fov = camera.fov * ( Math.PI / 180 )
    const fovh = 2 * Math.atan(Math.tan( fov / 2 ) * camera.aspect)
    const dx = sizeVector.z / 2 + Math.abs( sizeVector.x / 2 / Math.tan( fovh / 2 ) )
    const dy = sizeVector.z / 2 + Math.abs( sizeVector.y / 2 / Math.tan( fov / 2 ) )
    const cameraZ = Math.max(dx, dy)

    camera.getWorldPosition(visualizationState.cameraPosition)
    const diff = visualizationState.selectedObjectPosition
      .sub(visualizationState.cameraPosition)
    diff.z += cameraZ
    rootObject.position.sub(diff)
  }
})