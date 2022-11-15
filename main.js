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
    loadEmoji(text).then(addAssetToScene)
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
    keyboard.object3D.quaternion.copy(new THREE.Quaternion())
    keyboard.object3D.applyQuaternion(cameraQuaternion)
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
    selectedContainer.appendChild(entity)
  } else {
    const cameraQuaternion = sceneEl.camera.el.object3D.quaternion
    const cameraRigPosition = sceneEl.camera.el.parentEl.object3D.position
    const cameraPosition = sceneEl.camera.el.object3D.position
    const position = frontVector.clone().applyQuaternion(cameraQuaternion).multiplyScalar(-2)
    const {x, y, z} = cameraRigPosition.clone().add(position).add(cameraPosition)
    entity.setAttribute('position', `${x} ${y} ${z}`)
    entity.object3D.applyQuaternion(cameraQuaternion)
    sceneEl.appendChild(entity)
  }
}

function cancelSelection () {
  hideTextInput()

  document.body.querySelector('a-scene').setAttribute('holo', {
    selectedContainer: '',
    isFixed: false,
    isVisualizing: false
  })

  // Todo: improve speed
  for (const obj of [...document.querySelectorAll('[obj-wrapper]')]) {
    obj.emit('objWrapper.deactivate')
  }
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
    const tree = buildTree(selectedContainer)
    db.holos.put(tree)
  } else {
    db.holos.toArray()
      .then(async (storedHolos) => {
        for (const storedHolo of storedHolos) {
          console.log(storedHolo, storedHolo.id)
          if (!sceneEl.querySelector(`#${storedHolo.id}`)) {
            console.log('doesnt exist', storedHolo.id)
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
    containerEl.setAttribute('obj-wrapper', 'active: true')
    addAssetToScene(containerEl)
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
      containerEl.setAttribute('obj-wrapper', 'active: true')
      addAssetToScene(containerEl)
      break
    case 's':
      if (event.metaKey) {
        saveHolo()
        event.preventDefault()
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
    type: objWrapper.type,
    asset: objWrapper.asset,
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
      objWrapperEl = loadContainer(obj.id)
      break
    case 'text':
      objWrapperEl = loadText(obj.asset.main, obj.id)
      break
    case 'emoji':
      objWrapperEl = await loadEmoji(obj.asset.main, obj.id)
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
  
        cancelSelection()
      }
    })

  const raycasters = document.querySelectorAll('[raycaster]')
  for (const raycaster of raycasters) {
    raycaster.components.raycaster.raycaster.params.Line.threshold = 0.01
  }
})