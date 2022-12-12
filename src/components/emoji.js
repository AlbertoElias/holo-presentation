import { emojiToHex } from '../utils'

function generate3dEmojiFromSvg (emojiHex) {
  return new Promise((resolve) => {
    new THREE.SVGLoader().load(`emojis/${emojiHex}.svg`, (data) => {
      const group = new THREE.Group
      group.scale.multiplyScalar(0.01)
      group.scale.y *= -1
      for (const path of data.paths) {
        const material = new THREE.MeshBasicMaterial( {
          color: path.userData.style.fill,
          depthWrite: false,
          opacity: 1
        })

        const shapes = path.toShapes(true)
        for (const shape of shapes) {
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 1.5,
            bevelEnabled: false
          })
          const mesh = new THREE.Mesh(geometry, material)
          group.add(mesh)
        }
      }
      resolve(group)
    })
  })
}

export const container = AFRAME.registerComponent('emoji', {
  schema: {
    emoji: { type: 'string', default: '' }
  },

  init: function () {
    this.updateEmoji(this.data.emoji)
  },

  update: function (oldData) {
    if (this.data.emoji !== oldData.emoji) {
      this.updateEmoji(this.data.emoji)
    }
  },

  remove: function () {
    this.el.removeObject3D('mesh')
  },

  updateEmoji: function(emoji) {
    if (emoji) {
      generate3dEmojiFromSvg(emojiToHex(emoji))
        .then((mesh) => {
          this.el.setObject3D('mesh', mesh)
        })
    }
  }
})