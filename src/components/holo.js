const visualizationState = {
  selectedObject: null
}

export const holo = AFRAME.registerComponent('holo', {
  schema: {
    selectedContainer: { type: 'string', default: '' },
    isFixed: { type: 'boolean', default: false },
    isVisualizing: { type: 'boolean', default: false}
  },

  init: function () {
    this.cameraEl = this.el.querySelector('[camera]')
    this.keyDownHandler = this.keyDownHandler.bind(this)
  },

  update: function (oldData) {
    if (Object.keys(oldData).length === 0) { return }

    const data = this.data
    if (data.isFixed) {
      this.cameraEl.removeAttribute('wasd-controls')
    } else {
      this.cameraEl.setAttribute('wasd-controls', '')
    }

    if (data.isVisualizing && !oldData.isVisualizing) {
      if (!data.isFixed) {
        this.el.setAttribute('holo', {
          isFixed: true
        })
      }

      console.log(this.data.selectedContainer)
      visualizationState.selectedObject = this.data.selectedContainer

      document.addEventListener('keydown', this.keyDownHandler)
    } else {
      document.removeEventListener('keydown', this.keyDownHandler)
    }
  },

  keyDownHandler: function (event) {
    if (event.defaultPrevented || event.repeat) {
      return
    }

    switch (event.key) {
      case 'ArrowRight':
        break
      case 'ArrowLeft':
        console.log('left')
        break
      default:
        break
    }
    event.preventDefault()
  },

  remove: function () {
    this.cameraEl.setAttribute('wasd-controls', '')
    document.body.removeEventListener('keydown', this.keyDownHandler)
  }
})