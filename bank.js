var assert = require('assert')
var net = require('net')
var fs = require('fs')
var jsonStream = require('duplex-json-stream')
var sodium = require('sodium-native')
var parallel = require('run-parallel')

var log, keypair, box

try {
  keypair = require('./keypair.json')
  box = require('./box.json')
  data = require('./data.json')

  var cipher = Buffer.from(data.cipher, 'hex')
  var nonce = Buffer.from(data.nonce, 'hex')
  var boxSecretKey = Buffer.from(box.secretKey, 'hex')

  var plainText = Buffer.alloc(cipher.length - sodium.crypto_secretbox_MACBYTES)
  sodium.crypto_secretbox_open_easy(plainText, cipher, nonce, boxSecretKey)
  log = JSON.parse(plainText.toString())
} catch (e) {
  console.log('creating keys...')
  var publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  var secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
  sodium.crypto_sign_keypair(publicKey, secretKey)

  keypair = {
    publicKey: publicKey.toString('hex'),
    secretKey: secretKey.toString('hex')
  }

  fs.writeFile('keypair.json', JSON.stringify(keypair, null, 2), function (err) {
    if (err) console.error(err)
  })

  var boxSecretKey = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES)
  sodium.randombytes_buf(boxSecretKey)

  box = {
    secretKey: boxSecretKey.toString('hex')
  }

  fs.writeFile('box.json', JSON.stringify(box, null, 2), function (err) {
    if (err) console.error(err)
  })

  var writeKeys = [
    function (cb) {
      write('keypair.json', keypair, function (err) {
        if (err) return cb(new Error('Could not write keypair.'))
        cb()
      })
    },
    function (cb) {
      write('box.json', box, function (err) {
        if (err) return cb(new Error('Could not write box secretKey.'))
        cb()
      })
    }
  ]

  parallel(writeKeys, function (err) {
    if (err) return new Error(err)
    console.log('keys created!')
  })
  log = []
}

var commands = {
  'deposit': function (sum, amount) {
    return sum + amount
  },
  'withdraw': function (sum, amount) {
    return sum - amount
  }
}

commands.balance = commands.genesis = commands.withdraw

var secretKey = Buffer.from(keypair.secretKey, 'hex')
var publicKey = Buffer.from(keypair.publicKey, 'hex')

var boxSecretKey = Buffer.from(box.secretKey, 'hex')

// add a genesis block to new logs
if (!log.length) {
  var genesisEntry = {
    command: 'genesis',
    amount: 0
  }

  var genesisObj = {
    value: genesisEntry,
    hash: hashToHex('genesis hash'),
    signature: sigToHex(Buffer.from(JSON.stringify(genesisEntry)), secretKey)
  }

  log.push(genesisObj)
}

var server = net.createServer(function (stream) {
  stream = jsonStream(stream)
  stream.on('data', function (msg) {
    console.log('Bank recieved:', msg)

    var options = Object.keys(commands)
    var commandNotFound = options.indexOf(msg.command) === -1
    if (commandNotFound) return

    // append transaction to log
    var prevHash = log[log.length - 1].hash
    log.push({
      value: msg,
      hash: hashToHex(prevHash + JSON.stringify(msg)),
      signature: sigToHex(Buffer.from(JSON.stringify(msg)), secretKey)
    })

    var balance = log.reduce(function (sum, entry, idx) {
      if (idx !== 0) { // not genesis block
        // verify hash 
        var prevHash = log[idx - 1].hash
        var computedHash = hashToHex(prevHash + JSON.stringify(entry.value))
        assert.equal(computedHash, entry.hash)
        var signature = Buffer.from(entry.signature, 'hex')
        var value = Buffer.from(JSON.stringify(entry.value))
        assert(
          sodium.crypto_sign_verify_detached(signature, value, publicKey)
        )
      }
      return commands[entry.value.command](sum, entry.value.amount)
    }, 0)

    if (balance < 0) {
      log.pop()
      stream.write('Refused: not enough funding.')
      return
    }

    // encrypt log
    var logBuf = Buffer.from(JSON.stringify(log))
    var cipher = Buffer.alloc(logBuf.length + sodium.crypto_secretbox_MACBYTES)
    var nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
    sodium.randombytes_buf(nonce)
    sodium.crypto_secretbox_easy(cipher, logBuf, nonce, boxSecretKey)

    var encryptedLog = {
      cipher: cipher.toString('hex'),
      nonce: nonce.toString('hex')
    }

    var plainText = Buffer.alloc(cipher.length - sodium.crypto_secretbox_MACBYTES)
    sodium.crypto_secretbox_open_easy(plainText, cipher, nonce, boxSecretKey)

    // formats and writes entire log to disk on every transaction
    // this should be optimized in the future
    write('data.json', encryptedLog, function (err) {
      if (err) console.error(err)
    })

    stream.write({
      balance: balance
    })
  })
})

server.listen(3876)

function hashToHex (value) {
  var out = Buffer.alloc(sodium.crypto_generichash_BYTES)
  var buf = Buffer.from(value)
  sodium.crypto_generichash(out, buf)
  return out.toString('hex')
}

function sigToHex (message, secretKey) {
  var signature = Buffer.alloc(sodium.crypto_sign_BYTES)
  sodium.crypto_sign_detached(signature, message, secretKey)
  return signature.toString('hex')
}

function write (file, data, cb) {
  fs.writeFile(file, JSON.stringify(data, null, 2), function (err) {
    if (err) return cb(new Error('Could not write file ' + file))
    cb()
  })
}
