import { getRootContainer } from '../utils'

const visualizationState = {
  initialObject: null,
  selectedObject: null,
  selectedObjectPosition: new THREE.Vector3(),
  selectedRootObject: null,
  selectedRootObjectPosition: new THREE.Vector3(),
  selectedObjectSize: new THREE.Vector3(),
  cameraPosition: new THREE.Vector3()
}

function findLastChild (el) {
  if (el?.lastChild) {
    return findLastChild(el.lastChild)
  }

  return el
}

export const holo = AFRAME.registerComponent('holo', {
  schema: {
    selectedContainer: { type: 'string', default: '' },
    isFixed: { type: 'boolean', default: false },
    isVisualizing: { type: 'boolean', default: false}
  },

  init: function () {
    this.cameraEl = this.el.querySelector('[camera]')
    this.movementControls = this.el.querySelector('[movement-controls]')
    this.rightHand = this.el.sceneEl.querySelector('#handRight')
    this.keyDownHandler = this.keyDownHandler.bind(this)
    this.thumbstickMovedHandler = this.thumbstickMovedHandler.bind(this)
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

    if (data.selectedContainer !== oldData.selectedContainer) {
      if (oldData.selectedContainer) {
        const oldSelectedContainer = this.el.sceneEl.querySelector(`#${oldData.selectedContainer}`)
        oldSelectedContainer?.emit('objWrapper.deactivate')
        if (data.selectedContainer) {
          const selectedContainer = this.el.sceneEl.querySelector(`#${data.selectedContainer}`)
          // Checks if it is not a change between layers of the same container. In that case, the container component takes care of it
          if (!oldSelectedContainer.hasAttribute('obj-wrapper') && selectedContainer.hasAttribute('obj-wrapper')) {
            oldSelectedContainer?.emit('container.deactivate')
          }
        } else {
          // If there is no new selected container, that we means we are cancelling all selections
          oldSelectedContainer?.emit('objWrapper.deactivate')
          oldSelectedContainer?.emit('container.deactivate')
        }
      }
    }

    if (data.isVisualizing && !oldData.isVisualizing) {
      if (!data.isFixed) {
        this.el.setAttribute('holo', {
          isFixed: true
        })
      }

      const selectedContainer = this.el.sceneEl.querySelector(`#${this.data.selectedContainer}`)
      const rootContainer = getRootContainer(selectedContainer)
      
      visualizationState.initialObject = selectedContainer
      visualizationState.selectedObject = selectedContainer
      visualizationState.selectedRootObject = rootContainer
      visualizationState.selectedRootObjectPosition.copy(rootContainer.object3D.position)

      if (rootContainer.children[0] === selectedContainer) {
        visualizationState.initialObject = rootContainer
        visualizationState.selectedObject = rootContainer
      }
  
      if (!selectedContainer.hasAttribute('obj-wrapper')) {
        rootContainer.removeObject3D('tools')
        selectedContainer.removeObject3D('box')
        selectedContainer.removeObject3D('visible')
      } else {
        selectedContainer.removeObject3D('tools')
      }

      this.toggleContainerMeshes(false)
      this.updateSelectedObjectPosition()

      document.addEventListener('keydown', this.keyDownHandler)
      this.rightHand.addEventListener('thumbstickmoved', this.thumbstickMovedHandler)
    } else if (!data.isVisualizing && oldData.isVisualizing) {
      this.toggleContainerMeshes(true)
      visualizationState.selectedRootObject.object3D.position.copy(visualizationState.selectedRootObjectPosition)
      document.removeEventListener('keydown', this.keyDownHandler)
      this.rightHand.removeEventListener('thumbstickmoved', this.thumbstickMovedHandler)
    }
  },

  remove: function () {
    this.movementControls.setAttribute('movement-controls', {
      enabled: true
    })
    document.body.removeEventListener('keydown', this.keyDownHandler)
  },

  keyDownHandler: function (event) {
    if (event.defaultPrevented || event.repeat) {
      return
    }

    switch (event.key) {
      case 'ArrowRight':
        visualizeRight()
        this.updateSelectedObjectPosition()
        break
      case 'ArrowLeft':
        visualizeLeft()
        this.updateSelectedObjectPosition()
        break
      default:
        break
    }
  },

  thumbstickMovedHandler: function (event) {
    const strength = Math.abs(event.detail.x)
    if (strength < 0.5) {
      this.canMoveThumbstick = true
    }

    if (this.canMoveThumbstick) {
      if (event.detail.x < -0.95) {
        this.canMoveThumbstick = false
        visualizeLeft()
        this.updateSelectedObjectPosition()
      } else if (event.detail.x > 0.95) {
        this.canMoveThumbstick = false
        visualizeRight()
        this.updateSelectedObjectPosition()
      }
    }
  },

  updateSelectedObjectPosition: function () {
    const object = visualizationState.selectedObject.object3D
    const rootObject = visualizationState.selectedRootObject.object3D
    const camera = this.cameraEl.object3D.children[0]

    const box = new THREE.Box3().setFromObject(object)
    box.getSize(visualizationState.selectedObjectSize)
    box.getCenter(visualizationState.selectedObjectPosition)
  
    // Calculation based on https://wejn.org/2020/12/cracking-the-threejs-object-fitting-nut/
    const fov = camera.fov * ( Math.PI / 180 )
    const fovh = 2 * Math.atan(Math.tan( fov / 2 ) * camera.aspect)
    const dx = visualizationState.selectedObjectSize.z / 2 + Math.abs( visualizationState.selectedObjectSize.x / 2 / Math.tan( fovh / 2 ) )
    const dy = visualizationState.selectedObjectSize.z / 2 + Math.abs( visualizationState.selectedObjectSize.y / 2 / Math.tan( fov / 2 ) )
    const cameraZ = Math.max(dx, dy)

    camera.getWorldPosition(visualizationState.cameraPosition)
    const diff = visualizationState.selectedObjectPosition
      .sub(visualizationState.cameraPosition)
    diff.z += cameraZ
    if (this.el.sceneEl.renderer.xr.isPresenting) {
      diff.z += 0.5
    }
    rootObject.position.sub(diff)
  },

  toggleContainerMeshes: function (isVisible) {
    const containerChildren = visualizationState.selectedRootObject.querySelectorAll(':scope > [container]')
    containerChildren.forEach(child => child.getObject3D('mesh').visible = isVisible)
  }
})

function visualizeRight () {
  const child = visualizationState.selectedObject.children[0]
  if (child) {
    visualizationState.selectedObject = child
    return
  }

  const nextSibling = visualizationState.selectedObject.nextSibling
  if (nextSibling) {
    visualizationState.selectedObject = nextSibling
    return
  }

  let selectedObjectParent = visualizationState.selectedObject.parentEl
  let nextParentSibling = selectedObjectParent.nextSibling
  while (!nextParentSibling) {
    selectedObjectParent = selectedObjectParent.parentEl
    nextParentSibling = selectedObjectParent.nextSibling
  }
  if (nextParentSibling && visualizationState.selectedRootObject.contains(nextParentSibling)) {
    visualizationState.selectedObject = nextParentSibling
    return
  }

  // If we are at the end, start from the beginning
  visualizationState.selectedObject = visualizationState.selectedRootObject
}

function visualizeLeft () {
  // We are already at the beginning and it makes no sense to go back
  if (visualizationState.selectedObject === visualizationState.selectedRootObject) {
    const lastRootChild = findLastChild(visualizationState.selectedObject)
    visualizationState.selectedObject = lastRootChild
    return
  }

  const previousSiblingChild = findLastChild(visualizationState.selectedObject.previousSibling)
  if (previousSiblingChild) {
    visualizationState.selectedObject = previousSiblingChild
    return
  }

  const previousSibling = visualizationState.selectedObject.previousSibling
  if (previousSibling) {
    visualizationState.selectedObject = previousSibling
    return
  }

  const parent = visualizationState.selectedObject.parentEl
  if (parent && visualizationState.selectedRootObject.contains(parent)) {
    visualizationState.selectedObject = parent
    return
  }
}