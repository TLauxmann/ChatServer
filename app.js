var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//Services
const languageTranslation = require('./server/HRTTranslation/languageTranslation');

//start - express, html config
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

const port = process.env.PORT || 3000;

http.listen(port, () => {
  console.log('Server running on port: %d', port);
});
//end - express, html config

var usersOnline = new Map();

io.on('connection', function(socket) {

    const params = {
        text: "Hallo wie geht es dir?"
    };

    languageTranslation.languageDetection(params).then(response => {
        console.log(response);
    });

    socket.on('disconnect', function() {
        usersOnline.delete(socket.username);
        socket.broadcast.emit('userLeft', socket.username) // to all others
    });

    socket.on('chat message', function (msg, file, writingToList) {
        if (writingToList.length) {
            //send to selected users
            writingToList.forEach(function (username) {
                io.to(usersOnline.get(username)).emit('chat message', msg, socket.username, file, writingToList);
            });
            //and to yourself
            io.to(socket.id).emit('chat message', msg, socket.username, file, writingToList);
        } else {
            io.emit('chat message', msg, socket.username, file, writingToList);
        }
    });

    //user Login
    socket.on('checkName', function(username) {
        if (!usersOnline.has(username)) {
            socket.username = username;
            usersOnline.set(username, socket.id);
            //remove own name
            var uoList = Array.from(usersOnline.keys());
            uoList.splice(uoList.indexOf(socket.username), 1)
            socket.emit('validLogin', uoList);
            socket.broadcast.emit('userJoint', username) // to all others
        } else {
            socket.emit('invalidLogin');
        }
    });

});
