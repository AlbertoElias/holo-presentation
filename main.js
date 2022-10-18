import Dexie from 'dexie'
import { SimpleDropzone } from 'simple-dropzone'

import * as Utils from './src/utils'
import {
  loadRootContainer,
  loadContainer,
  loadText,
  loadEmoji,
  loadImage,
  loadGltf
} from './src/object-loader'
import './src/components/obj-wrapper'
import './src/components/holo'
import './src/components/root-container'
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
const textUploaderEl = document.body.querySelector('.textUploader')

function addAssetToScene (entity, forceRoot = false) {
  const sceneEl = document.querySelector('a-scene')

  const selectedContainerId = sceneEl.getAttribute('holo').selectedContainer
  const selectedContainer = selectedContainerId ? sceneEl.querySelector(`#${selectedContainerId}`) : null
  if (selectedContainer && !forceRoot) {
    selectedContainer.appendChild(entity)
  } else {
    const cameraQuaternion = sceneEl.camera.el.object3D.quaternion
    const cameraPosition = sceneEl.camera.el.object3D.position
    const position = frontVector.clone().applyQuaternion(cameraQuaternion).multiplyScalar(-2)
    const {x, y, z} = cameraPosition.clone().add(position)
    entity.setAttribute('position', `${x} ${y} ${z}`)
    sceneEl.appendChild(entity)
  }
}

function processText (text) {
  if (Utils.isSingleEmoji(text)) {
    loadEmoji(text).then(addAssetToScene)
  } else {
    const textEl = loadText(text)
    addAssetToScene(textEl)
  }
}

document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.repeat) {
    return
  }

  switch (event.key) {
    case 't':
      textUploaderEl.classList.add('textUploader--visible')
      textUploaderEl.focus()
      break
    case 'c':
      const containerEl = loadContainer()
      addAssetToScene(containerEl)
      break
    case 'C':
      const rootContainerEl = loadRootContainer()
      addAssetToScene(rootContainerEl, true)
      break
    case 's':
      if (event.metaKey) {
        const sceneEl = document.querySelector('a-scene')
        const selectedContainerId = sceneEl.getAttribute('holo').selectedContainer
        const selectedContainer = selectedContainerId ? sceneEl.querySelector(`#${selectedContainerId}`) : null
        if (selectedContainer) {
          const tree = buildTree(selectedContainer)
          console.log(tree)
          db.holos.put(tree)
        }
      }
      break
    case 'v':
      const sceneEl = document.querySelector('a-scene')
      const selectedContainerId = sceneEl.getAttribute('holo').selectedContainer
      const selectedContainer = selectedContainerId ? sceneEl.querySelector(`#${selectedContainerId}`) : null
      if (selectedContainer) {
        sceneEl.setAttribute('holo', {
          isFixed: true,
          isVisualizing: true
        })
      }
      break
    case 'Escape':
      textUploaderEl.classList.remove('textUploader--visible')
      textUploaderEl.value = ''
      textUploaderEl.blur()

      document.body.querySelector('a-scene').setAttribute('holo', {
        selectedContainer: '',
        isFixed: false,
        isVisualizing: false
      })

      // Todo: improve speed
      for (const obj of [...document.querySelectorAll('[obj-wrapper]')]) {
        obj.emit('objWrapper.deactivate')
      }
      break
    case 'Delete':
      for (const obj of [...document.querySelectorAll('[obj-wrapper]')]) {
        const attrs = obj.getAttribute('obj-wrapper')
        if (attrs.active) {
          db.holos.delete(obj.id)
          obj.parentElement.removeChild(obj)
        }
      }
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

document.querySelector('[raycaster]').components.raycaster.raycaster.params.Line.threshold = 0.01

async function unpackObject (obj) {
  let objWrapperEl
  switch (obj.type) {
    case 'root-container':
      objWrapperEl = loadRootContainer(obj.id)
      break
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
  console.log(objWrapperEl.id, obj.id)
  objWrapperEl.id = obj.id
  objWrapperEl.object3D.position.set(...obj.position)
  objWrapperEl.object3D.rotation.set(...obj.rotation)
  objWrapperEl.object3D.scale.set(...obj.scale)
  return objWrapperEl
}

async function unpackTree (rootObj) {
  console.log(rootObj)
  const unpackedRootObj = await unpackObject(rootObj)
  for (const childObj of rootObj.children) {
    const unpackedChildObj = await unpackTree(childObj)
    unpackedRootObj.appendChild(unpackedChildObj)
  }
  return unpackedRootObj
}

db.holos.toArray()
  .then(async (storedHolos) => {
    for (const storedHolo of storedHolos) {
      const unpackedHolo = await unpackTree(storedHolo)
      const sceneEl = document.querySelector('a-scene')
      sceneEl.appendChild(unpackedHolo)
    }
  })