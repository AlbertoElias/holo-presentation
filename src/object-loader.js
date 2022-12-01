function loadContainer (id, isDepthLayer = false) {
  const containerEl = document.createElement('a-entity')
  containerEl.setAttribute('container', '')
  if (!isDepthLayer) {
    containerEl.setAttribute('obj-wrapper', {
      type: 'container'
    })
  }
  if (id) {
    containerEl.id = id
  }
  return containerEl
}

function loadText (text, id) {
  const textEl = document.createElement('a-text')
  textEl.setAttribute('text', {
    value: text,
    color: 'black',
    side: 'double',
    zOffset: 0
  })
  textEl.setAttribute('obj-wrapper', {
    type: 'text',
    asset: { main: text },
    id
  })
  return textEl
}

function loadEmoji (emoji, id) {
  const emojiEl = document.createElement('a-entity') 
  emojiEl.setAttribute('emoji', { emoji })
  emojiEl.setAttribute('obj-wrapper', {
    type: 'emoji',
    asset: { main: emoji },
    id
  })
  return emojiEl
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
  loadContainer,
  loadText,
  loadEmoji,
  loadImage,
  loadGltf
}