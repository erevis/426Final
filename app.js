// Uses socket.io to send and recieve information(packages) between client and server
// Use socket.emit() and socket.on() to send the 

//Setting Up NodeJS 
const e = require('express');
var express = require('express');
const { dirname } = require('path');
var app = express()
var serv = require('http').Server(app);
const hostname = 'tarheels.live/nwillengame/'

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html')
})

app.use('/client', express.static(__dirname + '/client'))

serv.listen(2000, hostname);
console.log("Server Started")


var SOCKET_LIST = {};
var PLAYER_LIST = {};
let Users = {}

var Player = function(id){
    var self = {
        user:"",
        pass:"",
        x:250,
        y:250,
        id:id,
        number: "" +Math.floor(10*Math.random()),
        pressRight:false,
        pressLeft:false,
        pressDown:false,
        pressUp:false,
        spd: 10,
    }

    self.move = function(){
        if (self.pressRight) {
            self.x+= self.spd
        } else if (self.pressLeft) {
            self.x-= self.spd
        } else if (self.pressDown) {
            self.y -= self.spd
        } else if (self.pressUp) {
            self.y += self.spd
        }
    }
    return self
}

var io = require('socket.io') (serv, {})
io.sockets.on('connection', function(socket) {

    
    socket.id = Math.random()
    SOCKET_LIST[socket.id] = socket;
    var player = Player(socket.id)
    PLAYER_LIST[socket.id] = player;

    socket.on('signIn', function(data){
        if (Users[data.Usr] === data.Pas) {
            socket.emit('signInRes', {result:true})
            player.user = data.Usr
            player.pass = data.Pas
        } else {
            socket.emit('signInRes', {result:false})
        }
    })

    socket.on('signUp', function(data){
        if (Users[data.Usr]){
            socket.emit('signUpRes', {success:false})
            player.user = data.Usr
            player.pass = data.Pas
        } else {
            Users[data.Usr] = data.Pas
            socket.emit('signUpRes', {success:true})
        }
    }) 

    socket.on('disconnect',function() {
        delete SOCKET_LIST[socket.id]
        delete PLAYER_LIST[socket.id]
    })

    socket.on('keyPress', function(data){
        if (data.InputId == "right") {
            player.pressRight = data.state
        } else if (data.InputId == "left") {
            player.pressLeft = data.state
        } else if (data.InputId == "up") {
            player.pressUp = data.state
        } else if (data.InputId == "down") {
            player.pressDown = data.state
        }
    })

    socket.on('msgServ', function(data){
        let playerName = player.user
        for (let i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('addToChat', playerName+": " +data)
        }
    })
    socket.on('evalServ', function(data) {
        let ans = eval(data)
        socket.emit('evalAns', ans)
    })

    
})

setInterval(function() {
    var package = []
    for (var p in PLAYER_LIST) {
        var player = PLAYER_LIST[p]
        player.move()
        package.push({
            x:player.x,
            y:player.y,
            name:player.user
        })  
    }
    for (var i in SOCKET_LIST) {
        var socket= SOCKET_LIST[i]
        socket.emit('newPostions', package)
    }

}, 1000/25)

