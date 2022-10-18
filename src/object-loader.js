import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader'

import { emojiToHex } from './utils'

function loadRootContainer (id) {
  const rootContainerEl = document.createElement('a-entity')
  rootContainerEl.setAttribute('root-container', '')
  rootContainerEl.setAttribute('obj-wrapper', {
    type: 'root-container',
    id
  })
  return rootContainerEl
}

function loadContainer (id) {
  const containerEl = document.createElement('a-entity')
  containerEl.setAttribute('container', '')
  containerEl.setAttribute('obj-wrapper', {
    type: 'container',
    id
  })
  return containerEl
}

function loadText (text, id) {
  const textEl = document.createElement('a-text')
  textEl.setAttribute('value', text)
  textEl.setAttribute('color', 'black')
  textEl.setAttribute('side', 'double')
  textEl.setAttribute('obj-wrapper', {
    type: 'text',
    asset: { main: text },
    id
  })
  return textEl
}

function generate3dEmojiFromSvg (emojiHex) {
  return new Promise((resolve) => {
    new SVGLoader().load(`emojis/${emojiHex}.svg`, (data) => {
      const group = new THREE.Group
      group.scale.multiplyScalar(0.01)
      group.scale.y *= -1
      for (const path of data.paths) {
        const material = new THREE.MeshBasicMaterial( {
          color: path.userData.style.fill,
          depthWrite: false
        })

        const shapes = path.toShapes(true)
        for (const shape of shapes) {
          const geometry = new THREE.ExtrudeBufferGeometry(shape, {
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

function loadEmoji (emoji, id) {
  return generate3dEmojiFromSvg(emojiToHex(emoji))
    .then((mesh) => {
      const emojiEl = document.createElement('a-entity') 
      emojiEl.setObject3D('mesh', mesh)
      emojiEl.setAttribute('obj-wrapper', {
        type: 'emoji',
        asset: { main: emoji },
        id
    })
      return emojiEl
    })
}

function loadImage (asset, id) {
  const aImageEl = document.createElement('a-image')
  const imageEl = document.createElement('img')

  const imageId = asset.substring(0, asset.indexOf('&'))
  imageEl.id = imageId

  imageEl.addEventListener('load', (event) => {
    const imageWidth = event.target.width
    const imageHeight = event.target.height
    const aspectRatio = imageWidth / imageHeight
    aImageEl.setAttribute('width', 0.5)
    aImageEl.setAttribute('height', 0.5 / aspectRatio)
  })

  const fileDataUrl = asset.substring(asset.indexOf('&') + 1)
  imageEl.setAttribute('src', fileDataUrl)
  const assetsEl = document.body.querySelector('#assets')
  assetsEl.appendChild(imageEl)

  aImageEl.setAttribute('src', `#${imageId}`)
  aImageEl.setAttribute('obj-wrapper', {
    type: 'image',
    asset: { main: asset },
    id
  })
  return aImageEl
}

// https://stackoverflow.com/a/30408129
function dataURLtoBlob (dataurl) {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

function loadGltf (fileDataUrlMap, id) {
  const fileUrls = {}
  for (const path of Object.keys(fileDataUrlMap)) {
    const file = dataURLtoBlob(fileDataUrlMap[path])
    fileUrls[path] = URL.createObjectURL(file)
  }
  const gltfEl = document.createElement('h-gltf-model')
  gltfEl.setAttribute('h-gltf-model', {
    src: fileUrls.main,
    fileMap: fileUrls
  })
  gltfEl.setAttribute('obj-wrapper', {
    type: 'gltf',
    asset: fileDataUrlMap,
    id
  })
  return gltfEl
}

export {
  loadRootContainer,
  loadContainer,
  loadText,
  loadEmoji,
  loadImage,
  loadGltf
}