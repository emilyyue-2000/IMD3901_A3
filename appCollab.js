const express   = require('express');
const { read } = require('fs');
const app       = express();
const http      = require('http');
const server    = require('http').createServer(app);  
const io        = require('socket.io')(server);

const LISTEN_PORT   = 8080;

//run this is you want to play the collab game 
//this code in the collab game and the ocmp game is very similar except the collab game has a timer counting up
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
var index = Math.floor(Math.random() * 2);
var selectedColor = playerColor[index];
console.log(index);
var occipiedPlanes = new Set();
var startTime;
var stopTime;

//socket.io stuff
io.on('connection', (socket) => {

    if(numOfPlayers == 2){
        socket.emit('reject', 'maxUserReached');
    }

    //making sure the user is connected
    console.log( socket.id + " connected" );
    let playerID = socket.id; 
    let color = playerColor[index];
    if (!playerList[playerID]) {
        playerList[playerID] = {
          color: color 
        };
      }
      socket.emit('playerAcepted', playerID, color);
      //console.log(color); >> testing
      numOfPlayers = numOfPlayers+1;

      //the count down for the players to start 
      if(numOfPlayers == 2) {
        io.sockets.emit('getReady');
        var timeLeft = 5; 
        //timer for the collb players to see how long it takes for them to complete the game
        var countdownTimer = setInterval(function(){
            timeLeft--;
            io.sockets.emit('timeLeft', timeLeft);
            if(timeLeft <= 0){
                clearInterval(countdownTimer);
                io.sockets.emit('start', 'start');
                gameState = 1;
                startTime = Date.now();
                console.log('start time:' + startTime);

                
            }
        }, 1000);
    }

    //when disconnecting code clears their info in order to make space for someone else
    socket.on('disconnect', () => {

        console.log( socket.id + " disconnected" );
        numOfPlayers = numOfPlayers-1;
        occipiedPlanes.clear();
        io.sockets.emit('playerDisconnect', socket.id);
        gameState = 0;
    });


    socket.on("red", (data1, data2) => {
        let planeStr = data1;
        let sendingPlayerID = data2;

// making sure the game state is correct so that players can play (1 = start, 0 = no )
if (gameState == 1){

        //color change
        if(selectedColor == 'red'){

            occipiedPlanes.add(planeStr);
            io.sockets.emit("color_change", {r:255, g:0, b:0}, planeStr);
            if(occipiedPlanes.size == 4){

                //stop and calculate time
                stopTime = Date.now();
                console.log('stop time:' + stopTime);
                io.sockets.emit("gameCompleted", sendingPlayerID, stopTime - startTime);
                occipiedPlanes.clear();
                gameState = 0;
                

            }
        };

        console.log( "red event received, size: " + occipiedPlanes.size);
    }

    });

    //color change
    socket.on("blue", (data1, data2) => {
        let planeStr = data1;
        let sendingPlayerID = data2;
        if (gameState == 1) {
        
        if(selectedColor == 'blue'){
            
            occipiedPlanes.add(planeStr);
            io.sockets.emit("color_change", {r:0, g:0, b:255}, planeStr);
            if(occipiedPlanes.size == 4) {

                //stop and calculate time
                stopTime = Date.now();
                console.log('stop time:' + stopTime);
                io.sockets.emit("gameCompleted", sendingPlayerID, stopTime-startTime);                
                occipiedPlanes.clear();
                gameState = 0;

            }
        };

        console.log( "blue event received, size: " + occipiedPlanes.size);
    }
    });

    //restart the game and restart timer so numbers are normal
    socket.on("restart", (data) => {
        occipiedPlanes.clear();
        io.sockets.emit('gameReset', data);
        if (numOfPlayers == 2){
            io.sockets.emit('getReady');
        var timeLeft = 5; 
        var countdownTimer = setInterval(function(){
            timeLeft--;
            io.sockets.emit('timeLeft', timeLeft);
            if(timeLeft <= 0){
                clearInterval(countdownTimer);
                io.sockets.emit('start', 'start');
                gameState = 1;
                startTime = Date.now();
                console.log('start time:' + startTime);
                
            }
        }, 1000);
        };


    
    });

});