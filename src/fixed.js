export const fixed = AFRAME.registerComponent('fixed', {
  init: function () {
    this.cameraEl = this.el.querySelector('[camera]')
    this.cameraEl.removeAttribute('wasd-controls')
  },

  remove: function () {
    this.cameraEl.setAttribute('wasd-controls', '')
  }
})