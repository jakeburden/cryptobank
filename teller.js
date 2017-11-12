var jsonStream = require('duplex-json-stream')
var net = require('net')

var args = process.argv.slice(2)

var cmd = args[0]
var amount = args[1]

var stream = jsonStream(net.connect(3876))

stream.once('data', function (data) {
  console.log('Teller received:', data)
})

var commands = ['deposit', 'withdraw', 'balance']
if (commands.indexOf(cmd) === -1) {
  console.error('commands are', JSON.stringify(commands))
  stream.end(null)
}

var msg = payload(cmd, parseFloat(amount, 10))
stream.end(msg)
console.log('Teller sent:', msg)

function payload (cmd, amount) {
  var msg = {}
  msg.command = cmd
  msg.amount = amount || 0
  return msg
}
