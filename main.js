import GraphemeBreaker from 'grapheme-breaker-mjs'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader'

import * as Utils from './src/utils'
import './src/obj-wrapper'
import './src/fixed'

const frontVector = new THREE.Vector3(0, 0, 1)
const textUploaderEl = document.body.querySelector('.textUploader')

function isSingleEmoji (text) {
  return GraphemeBreaker.break(text).length === 1
    && /\p{Extended_Pictographic}/u.test(text)
}

function generate3dEmojiFromPng (emojiHex) {
  const geometry = new THREE.BoxBufferGeometry(1, 1, 0)
  const texture = new THREE.TextureLoader().load(`emojis/${emojiHex}.png`)
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  return new THREE.Mesh(geometry, material)
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

function addAssetToScene (entity, objectType) {
  entity.setAttribute('obj-wrapper', `type: ${objectType}`)
  const sceneEl = document.querySelector('a-scene')
  const cameraQuaternion = sceneEl.camera.el.object3D.quaternion
  const cameraPosition = sceneEl.camera.el.object3D.position
  const position = frontVector.clone().applyQuaternion(cameraQuaternion).multiplyScalar(-1)
  const {x, y, z} = cameraPosition.clone().add(position)
  entity.setAttribute('position', `${x} ${y} ${z}`)
  sceneEl.appendChild(entity)
}

function processText (text) {
  if (isSingleEmoji(text)) {
    generate3dEmojiFromSvg(Utils.emojiToHex(text))
      .then((mesh) => {
        const entityEl = document.createElement('a-entity')
        entityEl.setObject3D('mesh', mesh)
        addAssetToScene(entityEl, 'emoji')
      })
  } else {
    const textEl = document.createElement('a-text')
    textEl.setAttribute('value', text)
    textEl.setAttribute('color', 'black')
    textEl.setAttribute('side', 'double')
    addAssetToScene(textEl, 'text')
  }
}

document.addEventListener('keyup', (event) => {
  if (event.defaultPrevented || event.repeat) {
    return
  }

  switch (event.key) {
    case 't':
      textUploaderEl.classList.add('textUploader--visible')
      textUploaderEl.focus()
      break
    case 'Escape':
      textUploaderEl.value = ''
      textUploaderEl.classList.remove('textUploader--visible')
      textUploaderEl.blur()
      document.body.querySelector('a-scene').removeAttribute('fixed')
      break
    case 'Shift':
      document.body.querySelector('a-scene').setAttribute('fixed', '')
      break
    default:
      return
  }
  event.preventDefault()
}, false)

textUploaderEl.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    processText(textUploaderEl.value)
    textUploaderEl.value = ''
    textUploaderEl.classList.remove('textUploader--visible')
  }
})

document.body.addEventListener('drop', (event) => {
  event.preventDefault()
  event.stopPropagation()

  for (const file of event.dataTransfer.files) {
    const extension = file.name.split('.').pop().toLowerCase()
    const fileUrl = URL.createObjectURL(file)
    switch (extension) {
      case 'jpg':
      case 'png': {
        const aImageEl = document.createElement('a-image')
        const imageEl = document.createElement('img')

        const imageId = fileUrl.split('/').pop()
        imageEl.id = imageId

        imageEl.addEventListener('load', (event) => {
          const imageWidth = event.target.width
          const imageHeight = event.target.height
          const aspectRatio = imageWidth / imageHeight
          aImageEl.setAttribute('width', 0.5)
          aImageEl.setAttribute('height', 0.5 / aspectRatio)
        })

        imageEl.setAttribute('src', fileUrl)
        const assetsEl = document.body.querySelector('#assets')
        assetsEl.appendChild(imageEl)

        aImageEl.setAttribute('src', `#${imageId}`)
        addAssetToScene(aImageEl, 'image')
        break
      }
      case 'glb': {
        const gltfEl = document.createElement('a-gltf-model')
        gltfEl.setAttribute('src', fileUrl)
        addAssetToScene(gltfEl, 'gltf')
        break
      }
      default:
        break
    }
  }
}, false)

document.body.addEventListener("dragover", function(event) {
  event.preventDefault();
})

document.querySelector('[raycaster]').components.raycaster.raycaster.params.Line.threshold = 0.01

