function emojiToHex(str) {
  return [...str].map(x => x.codePointAt(0).toString(16)).join('-')
}

export {
  emojiToHex
}