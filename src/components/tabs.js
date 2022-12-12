export const container = AFRAME.registerComponent('tabs', {
  schema: {
    active: { type: 'string', default: '' }
  },

  update: function (oldData) {
    if (this.data.active !== oldData.active) {
      const activeTabEl = this.el.querySelector(`#${this.data.active}`)
      if (activeTabEl) {
        activeTabEl.getObject3D('mesh').material.opacity = 1
        const activePanelEl = this.el.parentEl.querySelector(`#${activeTabEl.getAttribute('tab')}`)
        if (activePanelEl) {
          activePanelEl.setAttribute('visible', true)
        }
      }

      const inactiveTabEl = this.el.querySelector(`#${oldData.active}`)
      if (inactiveTabEl) {
        inactiveTabEl.getObject3D('mesh').material.opacity = 0
        const inactivePanelEl = this.el.parentEl.querySelector(`#${inactiveTabEl.getAttribute('tab')}`)
        if (inactivePanelEl) {
          inactivePanelEl.setAttribute('visible', false)
        }
      }
    }
  }
})