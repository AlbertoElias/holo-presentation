function emojiToHex(str) {
  return [...str].map(x => x.codePointAt(0).toString(16)).join('-')
}

function getChildObjects(containerEl) {
  const childObjects = [containerEl]

  for (const childObject of containerEl.children) {
    if (childObject.hasAttribute('obj-wrapper')) {
      if (childObject.hasAttribute('container')) {
        childObjects.push([...getChildObjects(childObject)])
      } else {
        childObjects.push(childObject)
      }
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

export {
  emojiToHex,
  getChildObjects,
  getParentObjects
}