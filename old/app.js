
// Uses socket.io to send and recieve information(packages) between client and server
// Use socket.emit() and socket.on() to send the 

//Setting Up NodeJS 

require("./database");
const e = require('express');
var express = require('express');
const { dirname } = require('path');
var app = express();
var serv = require('http').Server(app);
const hostname = 'tarheels.live/nwillengame/';

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
})

app.use('/client', express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);
console.log("Server Started at localhost:2000");

var SOCKET_LIST = {};
var PLAYER_LIST = {};
let chosenColors = [];
var bullet_list = [];
var powerUp_list = [];
var bulletId = 0;

var global_time = 0;

var Bullet = function (id, x, y, dir, spd) {
    let bullet = {
        x: x,
        y: y,
        dir: dir,
        spd: spd,
        age: 0,
        id: id
    }

    bullet.move = function () {
        bullet.x += Math.cos(bullet.dir) * bullet.spd;
        bullet.y += Math.sin(bullet.dir) * bullet.spd;
        bullet.age++;
        if (bullet.age > 200) {
            delete bullet_list[bullet.id];
        }
    }
    return bullet;
}

var Player = function (id) {
    var self = {
        user: "",
        pass: "",
        x: 375,
        y: 250,
        color: "",
        id: id,
        pressRight: false,
        pressLeft: false,
        pressDown: false,
        pressUp: false,
        pressSpace: false,
        spd: 10,
        dead: false,
        ready: false,
        powerUp:'none',
        blink:null
    }

    self.move = function () {
        if (self.blink != null && self.blink.status){
            self.x = self.blink.x;
            self.y = self.blink.y;
            self.blink = null;
            self.powerUp = 'none';
        }
        if (self.pressRight && self.x+self.spd <=750) {
            self.x += self.spd;
        }
        if (self.pressLeft && self.x-self.spd >=0) {
            self.x -= self.spd;
        }
        if (self.pressDown && self.y-self.spd>=0) {
            self.y -= self.spd;
        }
        if (self.pressUp && self.y+self.spd<=500) {
            self.y += self.spd;
        }
    }
    return self;
}

var PowerUp = function(x,y,type){
    var powerUp = {
        x:x,
        y:y,
        type:type
    }
    return powerUp;
}

var io = require('socket.io') (serv, {});
io.sockets.on('connection', function(socket) {
    socket.emit('updateColors', PLAYER_LIST, chosenColors);
    
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;

    socket.on('signIn', function(data, clr) {
        Database.correctPass(data, function(res) {
            if (res){
                player.user = data.Usr;
                player.color = clr;
                socket.emit('signInRes', {result:true}, player, PLAYER_LIST);
            } else {
                socket.emit('signInRes', {result:false})
            }
        })
    })

    socket.on('signUp', function(data) {
        Database.takenUser(data, function(res) {
            if (res) {
                socket.emit('signUpRes', {result:false})
            } else {
                Database.addUser(data, function() {
					socket.emit('signUpRes', {result:true});					
				});
                player.user = data.Usr;
            }
        })
    })

    socket.on('removeAct', function(data) {
        Database.deleteUser(data);
    })

    socket.on('disconnect',function() {
        chosenColors.pop(PLAYER_LIST[socket.id].color);
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    })

    socket.on('keyPress', function (data) {
        if (data.InputId == "right") {
            player.pressRight = data.state;
        }
        if (data.InputId == "left") {
            player.pressLeft = data.state;
        }
        if (data.InputId == "up") {
            player.pressUp = data.state;
        }
        if (data.InputId == "down") {
            player.pressDown = data.state;
        }
        if (data.InputId == "space") {
            player.pressSpace = data.state;
        }
    })

    socket.on('canvasClick', function(x,y){
        if (player.powerUp == 'blink') {
            player.blink = {status:true, x:x, y:y}
        }
    })

    socket.on('msgServ', function (data) {
        let playerName = player.user;
        let playerColor = player.color;
        for (let i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('addToChat', playerColor, playerName + ": " + data);
        }
    })
    
    socket.on('evalServ', function (data) {
        let ans = eval(data);
        socket.emit('evalAns', ans);
    })

    socket.on('readyUp', function() {
        player.ready = true;
        let ready = true;
        for (var p in PLAYER_LIST) {
            if(!PLAYER_LIST[p].ready) {
                ready = false;
            }
        }
        if(ready){
            startGame();
        }
    })
})

function startGame(){
    setInterval(function () {
        global_time += 5;
    
        var bullet_package = [];
        var player_package = [];
        var powerUp_package = [];
        let allDead = true;
        for (var p in PLAYER_LIST) {
            var player = PLAYER_LIST[p];
            if (player.pressSpace && player.powerUp == 'barrier') {
                for (var b in bullet_list) {
                    var bullet = bullet_list[b];
                    if (distance(player.x, player.y, bullet.x, bullet.y) <= 100) {
                        delete bullet_list[b];
                    }
                }
                player.powerUp = 'none';
            }
            if (!player.dead) {
                allDead = false;
            }

            if (!player.dead) {
                player.move();
                player_package.push({
                    x: player.x,
                    y: player.y,
                    name: player.user,
                    color: player.color,
                    powerUp: player.powerUp
                })
            }
        }
        if(allDead) {
            for(var i in SOCKET_LIST) {
                SOCKET_LIST[i].emit('addToChat','white', "Game Over");
            }
            clearInterval(this);
            resetGame();
        }
        for (var b in bullet_list) {
            var bullet = bullet_list[b];
            bullet.move();
            bullet_package.push({
                x: bullet.x,
                y: bullet.y
            })
        }
        for (var b in bullet_list) {
            var bullet = bullet_list[b];
            for (var p in PLAYER_LIST) {
                var player = PLAYER_LIST[p]
                if (!player.dead && distance(player.x, player.y, bullet.x, bullet.y) <= 15) {
                    player.dead = true;
                    for(var i in SOCKET_LIST) {
                        SOCKET_LIST[i].emit('addToChat', player.color, player.user + " died!");
                    }
                }
            }
        }
        for (var p in powerUp_list) {
            var power = powerUp_list[p];
            for(var j in PLAYER_LIST) {
                var player = PLAYER_LIST[j];
                if (distance(power.x, power.y, player.x, player.y) <=25) {
                    player.powerUp = power.type;
                    delete powerUp_list[p];
                }
            }
            powerUp_package.push(power);
        }
    
        if (global_time % 10 == 0) {
            let pos = getBulletStart();
            var bullet = Bullet(bulletId++, pos.x, pos.y, pos.dir, 10);
            bullet_list.push(bullet);
        }

        if (global_time % 1000 == 0) {
            let pos = getPowerUpStart();
            var power = PowerUp(pos.x, pos.y, pos.type);
            powerUp_list.push(power);
        }

        for (var i in SOCKET_LIST) {
            var socket = SOCKET_LIST[i];
            let package = { players: player_package, bullets: bullet_package, powerUps: powerUp_package};
            socket.emit('newPostions', package);
        }
    }, 20)
}

function resetGame( ){
    for (var p in PLAYER_LIST) {
        let player = PLAYER_LIST[p];
        player.ready = false;
        player.dead= false;
        player.x = 375;
        player.y = 250;
        player.powerUp = 'none';
    }
    bullet_list = [];
    powerUp_list = [];
    global_time = 0;
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getBulletStart() {
    let options = Math.floor(Math.random() * Math.floor(4));
    switch (options) {
        case 0:
            return {
                x: Math.random() * (560 - 190) + 190,
                y: 0,
                dir: Math.random() * (315 - 225) + 225
            }
        case 1:
            return {
                x: Math.random() * (560 - 190) + 190,
                y: 500,
                dir: Math.random() * (135 - 45) + 45
            }
        case 2:
            return {
                x: 0,
                y: Math.random() * (375 - 125) + 125,
                dir: Math.random() * (330 - 30) + 30
            }
        case 3:
            return {
                x: 750,
                y: Math.random() * (375 - 125) + 125,
                dir: Math.random() * (210 - 150) + 150
            }
    }
}

function getPowerUpStart() {
    let options =  Math.floor(Math.random() * Math.floor(2));
    switch(options) {
        case 0:
            return {
                x: Math.random() * (750-1) +1,
                y: Math.random() * (500-1) +1,
                type: 'barrier'
            }
        case 1: 
            return {
                x: Math.random() * (750-1) +1,
                y: Math.random() * (500-1) +1,
                type: 'blink'
            }   
    }
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1)*(x2 - x1)  + (y2 - y1)*(y2 - y1));
}