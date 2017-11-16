var assert = require('assert')
var net = require('net')
var fs = require('fs')
var jsonStream = require('duplex-json-stream')
var sodium = require('sodium-native')

var log, keypair
try {
  log = require('./data.json')
} catch (e) {
  log = []
}

try {
  keypair = require('./keypair.json')
} catch (e) {
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

    // formats and writes entire log to disk on every transaction
    // this should be optimized in the future
    var prettyLog = JSON.stringify(log, null, 2)
    fs.writeFile('data.json', prettyLog, function (err) {
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
