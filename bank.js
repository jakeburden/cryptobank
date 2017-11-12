var jsonStream = require('duplex-json-stream')
var net = require('net')

var log = []
var commands = {
  'deposit': function (sum, amount) {
    return sum + amount
  },
  'withdraw': function (sum, amount) {
    return sum - amount
  },
  'balance': function (sum, amount) {
    return sum + amount
  }
}

var server = net.createServer(function (stream) {
  stream = jsonStream(stream)
  stream.on('data', function (msg) {
    console.log('Bank recieved:', msg)

    var options = Object.keys(commands)
    if (options.indexOf(msg.command) === -1) return

    log.push(msg)

    var balance = log.reduce(function (sum, msg) {
      return commands[msg.command](sum, msg.amount)
    }, 0)

    if (balance < 0) {
      log.pop()
      stream.write('Refused: not enough funding.')
      return
    }

    stream.write({
      balance: balance
    })
  })
})

server.listen(3876)
