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

serv.listen(process.env.PORT || 2000);
console.log("Server Started at localhost:2000")

var SOCKET_LIST = {};
var PLAYER_LIST = {};
let Users = {};

//let canvas = document.getElementById("canv")

var Player = function(id){
    var self = {
        user:"",
        pass:"",
        x:250,
        y:250,
        color:"",
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
        }
        if (self.pressLeft) {
            self.x-= self.spd
        }
        if (self.pressDown) {
            self.y -= self.spd
        }
        if (self.pressUp) {
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
            player.user = data.Usr;
            player.pass = data.Pas;
            player.color = getRandomColor();
            console.log(player.color)
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
        }
        if (data.InputId == "left") {
            player.pressLeft = data.state
        }
        if (data.InputId == "up") {
            player.pressUp = data.state
        }
        if (data.InputId == "down") {
            player.pressDown = data.state
        }
    })

    socket.on('msgServ', function(data){
        let playerName = player.user
        let playerColor = player.color
        for (let i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('addToChat', playerColor, playerName+": " +data)
        }
    })
    socket.on('evalServ', function(data) {
        let ans = eval(data)
        socket.emit('evalAns', ans)
    })  

    
})

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

setInterval(function() {
    var package = []
    for (var p in PLAYER_LIST) {
        var player = PLAYER_LIST[p]
        player.move()
        package.push({
            x:player.x,
            y:player.y,
            name:player.user,
            color:player.color
        })  
    }
    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i]
        socket.emit('newPostions', package)
    }

}, 20)

