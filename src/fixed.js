export const fixed = AFRAME.registerComponent('fixed', {
  schema: {
    selectedContainer: {type: 'string', default: ''}
  },

  init: function () {
    this.cameraEl = this.el.querySelector('[camera]')
  },

  update: function (oldData) {
    const data = this.data
    if (data.selectedContainer) {
      this.cameraEl.removeAttribute('wasd-controls')
    } else {
      this.cameraEl.setAttribute('wasd-controls', '')
    }
  },

  remove: function () {
    this.cameraEl.setAttribute('wasd-controls', '')
  }
})