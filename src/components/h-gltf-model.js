const warn = AFRAME.utils.debug('components:gltf-model:warn')
const MANAGER = new THREE.LoadingManager()
const blobURLs = []

// Forked from https://github.com/aframevr/aframe/blob/v1.3.0/src/components/gltf-model.js
// to include a custom three.js LoadManager
export const hGltfModel = AFRAME.registerComponent('h-gltf-model', {
  schema: {
    src: { type: 'string', default: '' },
    fileMap: { type: 'map', default: '{}' }
  },

  init: function () {
    const self = this
    const dracoLoader = this.system.getDRACOLoader()
    const meshoptDecoder = this.system.getMeshoptDecoder()
    this.model = null

    this.loader = new THREE.GLTFLoader(MANAGER)
    if (dracoLoader) {
      this.loader.setDRACOLoader(dracoLoader)
    }
    if (meshoptDecoder) {
      this.ready = meshoptDecoder.then(function (meshoptDecoder) {
        self.loader.setMeshoptDecoder(meshoptDecoder)
      })
    } else {
      this.ready = Promise.resolve()
    }
  },

  update: function () {
    const self = this
    const el = this.el
    const src = this.data.src

    if (!src) { return }

    this.remove()

    this.ready.then(() => {
      const baseURL = THREE.LoaderUtils.extractUrlBase(src)
      // Intercept and override relative URLs.
      // Copied from https://github.com/donmccurdy/three-gltf-viewer/blob/main/src/viewer.js
      MANAGER.setURLModifier((url, path) => {

        // URIs in a glTF file may be escaped, or not. Assume that assetMap is
        // from an un-escaped source, and decode all URIs before lookups.
        // See: https://github.com/donmccurdy/three-gltf-viewer/issues/146
        const normalizedURL = decodeURI(url)
          .replace(baseURL, '')
          .replace(/^(\.?\/)/, '')

        const blobURL = self.data.fileMap[normalizedURL]
        if (blobURL) {
          blobURLs.push(blobURL)
          return blobURL
        }

        return (path || '') + url

      })

      self.loader.load(src, function gltfLoaded (gltfModel) {
        self.model = gltfModel.scene || gltfModel.scenes[0]
        self.model.animations = gltfModel.animations
        blobURLs.forEach(URL.revokeObjectURL)

        el.setObject3D('mesh', self.model)
        el.emit('model-loaded', { format: 'gltf', model: self.model })
      }, undefined /* onProgress */, function gltfFailed (error) {
        const message = (error && error.message) ? error.message : 'Failed to load glTF model'
        warn(message)
        el.emit('model-error', { format: 'gltf', src: src })
      })
    })
  },

  remove: function () {
    if (!this.model) { return }
    this.el.removeObject3D('mesh')
  }
})