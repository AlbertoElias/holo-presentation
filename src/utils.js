import GraphemeBreaker from 'grapheme-breaker-mjs'

function emojiToHex(str) {
  return [...str].map(x => x.codePointAt(0).toString(16)).join('-')
}

function isSingleEmoji (text) {
  return GraphemeBreaker.break(text).length === 1
    && /\p{Extended_Pictographic}/u.test(text)
}

function getChildObjects(containerEl) {
  const childObjects = []

  for (const childObject of containerEl.children) {
    if (childObject.hasAttribute('obj-wrapper') || childObject.hasAttribute('container')) {
      childObjects.push(childObject)
    }
  }

  return childObjects
}

function getParentObjects(childObjs) {
  return childObjs.map((childEl) => {
    if (Array.isArray(childEl)) {
      return getParentObjects(childEl)
    } else {
      const object = childEl.getObject3D('text') || childEl.getObject3D('mesh')
      return object.parent
    }
  })
}

function fileToDataURL (file) {
  return new Promise ((resolve) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      resolve(reader.result)
    })
    reader.readAsDataURL(file)
  })
}

function getParentContainer (el) {
  el = el.parentEl
    while (!el.hasAttribute('container')) {
      if (!el.parentEl) {
        return null
      }
      el = el.parentEl
    }
    return el
}

function getRootContainer (el) {
  const parentContainer = getParentContainer(el)
  if (parentContainer) {
    return getRootContainer(parentContainer)
  } else {
    return el
  }
}

export {
  emojiToHex,
  isSingleEmoji,
  getChildObjects,
  getParentObjects,
  fileToDataURL,
  getParentContainer,
  getRootContainer
}