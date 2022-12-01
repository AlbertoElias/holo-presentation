import Dexie from 'dexie'
import { SimpleDropzone } from 'simple-dropzone'

import * as Utils from './src/utils'
import {
  loadContainer,
  loadText,
  loadEmoji,
  loadImage,
  loadGltf
} from './src/object-loader'
import './src/components/emoji'
import './src/components/obj-wrapper'
import './src/components/holo'
import './src/components/container'
import './src/components/h-gltf-model'
import './src/primitives/h-gltf-model'
import './src/systems/h-gltf-model'

const db = new Dexie('Holos')
db.version(1).stores({
  holos: `
    id,
    type,
    asset,
    position,
    rotation,
    scale,
    children
  `,
})

const frontVector = new THREE.Vector3(0, 0, 1)
const sceneEl = document.querySelector('a-scene')
const movementControls = sceneEl.querySelector('[movement-controls]')
const textUploaderEl = sceneEl.querySelector('.textUploader')
const keyboard = sceneEl.querySelector('#keyboard')
const leftHand = sceneEl.querySelector('#handLeft')
const rightHand = sceneEl.querySelector('#handRight')

textUploaderEl.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    processText(textUploaderEl.value)
    hideTextInput()
  }
})

keyboard.addEventListener('superkeyboardinput', (event) => {
  processText(event.detail.value)
  hideTextInput()
})

keyboard.addEventListener('superkeyboarddismiss', () => {
  movementControls.setAttribute('movement-controls', {
    enabled: true
  })
})

function processText (text) {
  if (Utils.isSingleEmoji(text)) {
    const emojiEl = loadEmoji(text)
    addAssetToScene(emojiEl)
  } else {
    const textEl = loadText(text)
    addAssetToScene(textEl)
  }
}

function isPresenting () {
  return sceneEl.renderer.xr.isPresenting
}

function isTextInputVisible () {
  if (isPresenting()) {
    return keyboard.getAttribute('super-keyboard').show
  } else {
    return textUploaderEl.classList.contains('textUploader--visible')
  }
}

function showTextInput () {
  if (isPresenting()) {
    movementControls.setAttribute('movement-controls', {
      enabled: false
    })
    const cameraQuaternion = sceneEl.camera.el.object3D.quaternion
    const cameraRigPosition = sceneEl.camera.el.parentEl.object3D.position
    const cameraPosition = sceneEl.camera.el.object3D.position
    const position = frontVector.clone().applyQuaternion(cameraQuaternion).multiplyScalar(-1)
    const {x, y, z} = cameraRigPosition.clone().add(position).add(cameraPosition)
    keyboard.setAttribute('position', `${x} ${y - 0.5 > 0.2 ? y - 0.5 : 0.2} ${z}`)
    keyboard.object3D.setRotationFromQuaternion(cameraQuaternion)
    keyboard.setAttribute('super-keyboard', {
      show: true,
      value: ''
    })
  } else {
    textUploaderEl.classList.add('textUploader--visible')
    textUploaderEl.focus()
  }
}

function hideTextInput () {
  if (isPresenting()) {
    keyboard.setAttribute('super-keyboard', {
      show: false,
      value: ''
    })
    movementControls.setAttribute('movement-controls', {
      enabled: true
    })
  } else {
    textUploaderEl.classList.remove('textUploader--visible')
    textUploaderEl.value = ''
    textUploaderEl.blur()
  }
}

function addAssetToScene (entity, forceRoot = false) {
  const selectedContainerId = sceneEl.getAttribute('holo').selectedContainer
  const selectedContainer = selectedContainerId ? sceneEl.querySelector(`#${selectedContainerId}`) : null
  if (selectedContainer && !forceRoot) {
    const rootContainer = !Utils.getParentContainer(selectedContainer) ?
      selectedContainer.children[0] :
      selectedContainer
      rootContainer.appendChild(entity)
  } else {
    sceneEl.appendChild(entity)
    const cameraQuaternion = sceneEl.camera.el.object3D.quaternion
    const cameraPosition = sceneEl.camera.el.object3D.getWorldPosition(new THREE.Vector3())
    const position = frontVector.clone().applyQuaternion(cameraQuaternion).multiplyScalar(-2)
    entity.object3D.position.copy(cameraPosition.clone().add(position))
    entity.object3D.lookAt(cameraPosition)
  }

  if (entity.hasAttribute('container')) {
    cancelSelection()
    entity.setAttribute('obj-wrapper', { active: true })
  }
}

function cancelSelection () {
  hideTextInput()

  document.body.querySelector('a-scene').setAttribute('holo', {
    selectedContainer: '',
    isFixed: false,
    isVisualizing: false
  })
}

function toggleVisualizing () {
  if (sceneEl.getAttribute('holo').isVisualizing) {
    cancelSelection()
  } else {
    const selectedContainerId = sceneEl.getAttribute('holo').selectedContainer
    const selectedContainer = selectedContainerId ? sceneEl.querySelector(`#${selectedContainerId}`) : null
    if (selectedContainer) {
      sceneEl.setAttribute('holo', {
        isFixed: true,
        isVisualizing: true
      })
    }
  }
}

function saveHolo () {
  const selectedContainerId = sceneEl.getAttribute('holo').selectedContainer
  const selectedContainer = selectedContainerId ? sceneEl.querySelector(`#${selectedContainerId}`) : null
  if (selectedContainer) {
    const rootContainer = !selectedContainer.hasAttribute('obj-wrapper') ?
      selectedContainer.parentEl :
      selectedContainer
    const tree = buildTree(rootContainer)
    console.log(tree)
    db.holos.put(tree)
  } else {
    db.holos.toArray()
      .then(async (storedHolos) => {
        for (const storedHolo of storedHolos) {
          if (!sceneEl.querySelector(`#${storedHolo.id}`)) {
            db.holos.delete(storedHolo.id)
          }
        }
      })
  }
}

leftHand.addEventListener('ybuttonup', () => {
  if (!isTextInputVisible()) {
    showTextInput()
  } else {
    hideTextInput()
  }
})

leftHand.addEventListener('xbuttonup', () => {
  if (!isTextInputVisible()) {
    const containerEl = loadContainer()
    addAssetToScene(containerEl)
    containerEl.setAttribute('obj-wrapper', 'active: true')
  }
})

rightHand.addEventListener('bbuttonup', () => {
  if (!isTextInputVisible()) {
    saveHolo()
  }
})

rightHand.addEventListener('abuttonup', () => {
  if (!isTextInputVisible()) {
    toggleVisualizing()
  }
})

document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.repeat) {
    return
  }

  switch (event.key) {
    case 't':
      if (!isTextInputVisible() && !event.metaKey) {
        event.preventDefault()
        showTextInput()
      }

      break
    case 'c':
      if (isTextInputVisible()) {
        return
      }

      const containerEl = loadContainer()
      addAssetToScene(containerEl)
      containerEl.setAttribute('obj-wrapper', 'active: true')
      break
    case 's':
      if (event.metaKey) {
        event.preventDefault()
        saveHolo()
      }
      break
    case 'v':
      if (isTextInputVisible()) {
        return
      }

      toggleVisualizing()
      break
    case 'Escape':
      cancelSelection()
      break
    case 'Backspace':
    case 'Delete':
      if (isTextInputVisible()) {
        return
      }

      for (const obj of [...document.querySelectorAll('[obj-wrapper]')]) { 
        const attrs = obj.getAttribute('obj-wrapper')
        if (attrs.active) {
          obj.parentElement.removeChild(obj)
        }
      }
      break
    default:
      return
  }
}, false)

const dropCtrl = new SimpleDropzone(document.body, document.body.querySelector('.dropzone'))
dropCtrl.on('drop', async ({files}) => {
  // All extra gltf files will be stored as dataurl
  const fileMap = {}
  let rootGltfFile

  for (const [path, file] of [...files]) {
    if (file.name.match(/\.gltf$/)) {
      rootGltfFile = file
    }

    fileMap[path.substring(1)] = await Utils.fileToDataURL(file)
  }

  for (const [path, file] of [...files]) {
    const extension = file?.name.split('.').pop().toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png': {
        if (rootGltfFile) {
          break
        }

        const fileDataUrl = fileMap[path.substring(1)]
        const aImageEl = loadImage(`${file.name}&${fileDataUrl}`)
        addAssetToScene(aImageEl)
        break
      }
      case 'glb':
      case 'gltf': {
        fileMap.main = fileMap[path.substring(1)]
        const gltfEl = loadGltf(fileMap)
        addAssetToScene(gltfEl)
        break
      }
      default:
        break
    }
  }
}, false)

document.body.addEventListener('dragover', function (event) {
  event.preventDefault();
})

function buildTree (objEl) {
  const childObjs = Utils.getChildObjects(objEl)
  const objWrapper = objEl.getAttribute('obj-wrapper')
  const objData = {
    id: objEl.id,
    type: objWrapper?.type || 'container',
    isDepthLayer: !(!!objWrapper),
    asset: objWrapper?.asset,
    position: objEl.object3D.position.toArray(),
    rotation: objEl.object3D.rotation.toArray(),
    scale: objEl.object3D.scale.toArray(),
    children: [...childObjs].map((childObj) => buildTree(childObj))
  }
  return objData
}

function saveAll () {
  const objs = document.querySelectorAll('a-scene > [obj-wrapper]')
  const objsTree = [...objs].map((childObj) => buildTree(childObj))
}

async function unpackObject (obj) {
  let objWrapperEl
  switch (obj.type) {
    case 'container':
      objWrapperEl = loadContainer(obj.id, obj.isDepthLayer)
      break
    case 'text':
      objWrapperEl = loadText(obj.asset.main, obj.id)
      break
    case 'emoji':
      objWrapperEl = loadEmoji(obj.asset.main, obj.id)
      break
    case 'image':
      objWrapperEl = loadImage(obj.asset.main, obj.id)
      break
    case 'gltf':
      objWrapperEl = loadGltf(obj.asset, obj.id)
      break
    default:
      break
  }

  objWrapperEl.id = obj.id
  objWrapperEl.object3D.position.set(...obj.position)
  objWrapperEl.object3D.rotation.set(...obj.rotation)
  objWrapperEl.object3D.scale.set(...obj.scale)
  return objWrapperEl
}

async function unpackTree (rootObj) {
  const unpackedRootObj = await unpackObject(rootObj)
  for (const childObj of rootObj.children) {
    const unpackedChildObj = await unpackTree(childObj)
    unpackedRootObj.appendChild(unpackedChildObj)
  }
  return unpackedRootObj
}

window.addEventListener('load', () => {
  db.holos.toArray()
    .then(async (storedHolos) => {
      for (const storedHolo of storedHolos) {
        const unpackedHolo = await unpackTree(storedHolo)
        sceneEl.appendChild(unpackedHolo)
      }
    })
})

