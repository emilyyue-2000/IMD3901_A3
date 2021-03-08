const express   = require('express');
const { read } = require('fs');
const app       = express();
const http      = require('http');
const server    = require('http').createServer(app);  
const io        = require('socket.io')(server);

const LISTEN_PORT   = 8080;

//run this if you want to play the comp game
server.listen(LISTEN_PORT);
app.use(express.static(__dirname + '/public')); //set root path of server ...

console.log("Listening on port: " + LISTEN_PORT );

//our routes
app.get( '/', function( req, res ){ 
    res.sendFile( __dirname + '/public/index.html' );
});

app.get( '/collab', function( req, res ){ 
    res.sendFile( __dirname + '/public/collabGame.html' );
});

app.get( '/comp', function( req, res ){ 
    res.sendFile( __dirname + '/public/compGame.html' );
});

var playerList = {};
var playerColor = ["red", "blue"];
var gameState = 0;

var numOfPlayers = 0;

//socket.io stuff
io.on('connection', (socket) => {

    if(numOfPlayers == 2){
        socket.emit('reject', 'maxUserReached');
    }

    console.log( socket.id + " connected" );
    let playerID = socket.id; 
    let color = playerColor[numOfPlayers];
    //console.log(color);
    if (!playerList[playerID]) {
        playerList[playerID] = {
          color: color, 
          occipiedPlanes : new Set(),
        };
      }
      socket.emit('playerAcepted', playerID, color);
      //console.log(color);
      numOfPlayers = numOfPlayers+1;

      if(numOfPlayers == 2) {

        io.sockets.emit('getReady');
        var timeLeft = 5; 
        var countdownTimer = setInterval(function(){
            timeLeft--;
            io.sockets.emit('timeLeft', timeLeft);
            if(timeLeft <= 0){
                io.sockets.emit('start', 'start');
                gameState = 1;
            }
        }, 1000);
    }

    socket.on('disconnect', () => {

        console.log( socket.id + " disconnected" );
        delete playerList[socket.id];
        numOfPlayers = numOfPlayers-1;
        let keys = Object.keys(playerList);
        for(key in keys){
            playerList[keys[key]].occipiedPlanes.clear();
        };
        io.sockets.emit('playerDisconnect', socket.id);
        gameState = 0;
    });


    socket.on("red", (data1, data2) => {
        let planeStr = data1;
        let sendingPlayerID = data2;

if (gameState == 1){

        if(playerList[sendingPlayerID].color == 'red' ){

            playerList[sendingPlayerID].occipiedPlanes.add(planeStr);
            io.sockets.emit("color_change", {r:255, g:0, b:0}, planeStr);
            if(playerList[sendingPlayerID].occipiedPlanes.size == 4){

                io.sockets.emit("gameCompleted", sendingPlayerID);
                gameState = 0;

            }
        };

        console.log( "red event received, size: " + playerList[sendingPlayerID].occipiedPlanes.size);
    }

    });

    socket.on("blue", (data1, data2) => {
        let planeStr = data1;
        let sendingPlayerID = data2;
        if (gameState == 1) {
        
        if(playerList[sendingPlayerID].color == 'blue' && numOfPlayers == 2 ){
            
            playerList[sendingPlayerID].occipiedPlanes.add(planeStr);
            io.sockets.emit("color_change", {r:0, g:0, b:255}, planeStr);
            if(playerList[sendingPlayerID].occipiedPlanes.size == 4) {

                io.sockets.emit("gameCompleted", sendingPlayerID);
                let keys = Object.keys(playerList);
                for(key in keys){
                    playerList[keys[key]].occipiedPlanes.clear();
                };
                gameState = 0;

            }
        };

        console.log( "blue event received, size: " + playerList[sendingPlayerID].occipiedPlanes.size);
    }
    });

    socket.on("restart", (data) => {
        gameState = 0;
        let keys = Object.keys(playerList);
        for(key in keys){
            playerList[keys[key]].occipiedPlanes.clear();
        };
        io.sockets.emit('gameReset', data);
        if (numOfPlayers == 2){
            io.sockets.emit('getReady');
        var timeLeft = 5; 
        var countdownTimer = setInterval(function(){
            timeLeft--;
            io.sockets.emit('timeLeft', timeLeft);
            if(timeLeft <= 0){
                io.sockets.emit('start', 'start');
                gameState = 1;
            }
        }, 1000);
        };
    
    });

});