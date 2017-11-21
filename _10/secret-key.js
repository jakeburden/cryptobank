var sodium = require('sodium-native')

var secretKey = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
sodium.randombytes_buf(secretKey)

var hex = secretKey.toString('hex')


// writes key to file
var fs = require('fs')
var join = require('path').join

var writeTo = join(__dirname, 'key.txt')
fs.writeFile(writeTo, hex, function (err) {
  if (err) console.error(err)
})