var fs = require('fs')
var join = require('path').join
var sodium = require('sodium-native')

fs.readFile(join(__dirname, 'key.txt'), function (err, secretKey) {
  if (err) console.error(err)
  var key = Buffer.from(secretKey, 'hex')
  var message = Buffer.from('yo yo yo')
  var cipher = Buffer.alloc(message.length + sodium.crypto_secretbox_MACBYTES)
  var nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
  sodium.randombytes_buf(nonce)

  sodium.crypto_secretbox_easy(cipher, message, nonce, key)

  var payload = {
    cipher: message.toString('hex'),
    nonce: nonce.toString('hex')
  }

  payload = JSON.stringify(payload, null, 2)

  fs.writeFile(join(__dirname, 'cipher.json'), payload, function (err) {
    if (err) console.error(err)
  })
})
