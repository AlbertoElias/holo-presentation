function fetchScript (src) {
  return new Promise(function (resolve, reject) {
    var script = document.createElement('script')
    document.body.appendChild(script)
    script.onload = resolve
    script.onerror = reject
    script.async = true
    script.src = src
  })
}

/**
 * glTF model system.
 *
 * Configures glTF loading options. Models using glTF compression require that a Draco decoder be
 * provided externally.
 *
 * @param {string} dracoDecoderPath - Base path from which to load Draco decoder library.
 * @param {string} meshoptDecoderPath - Full path from which to load Meshopt decoder.
 */
export const hGltfModelSystem = AFRAME.registerSystem('h-gltf-model', {
  schema: {
    dracoDecoderPath: {default: ''},
    meshoptDecoderPath: {default: ''}
  },

  init: function () {
    this.update()
  },

  update: function () {
    const dracoDecoderPath = this.data.dracoDecoderPath
    const meshoptDecoderPath = this.data.meshoptDecoderPath
    if (!this.dracoLoader && dracoDecoderPath) {
      this.dracoLoader = new THREE.DRACOLoader()
      this.dracoLoader.setDecoderPath(dracoDecoderPath)
    }
    if (!this.meshoptDecoder && meshoptDecoderPath) {
      this.meshoptDecoder = fetchScript(meshoptDecoderPath)
        .then(function () { return window.MeshoptDecoder.ready })
        .then(function () { return window.MeshoptDecoder })
    }
  },

  getDRACOLoader: function () {
    return this.dracoLoader
  },

  getMeshoptDecoder: function () {
    return this.meshoptDecoder
  }
})