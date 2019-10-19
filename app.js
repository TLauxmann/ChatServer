var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

http.listen(3000, function() {
    console.log('listening on *:3000');
});

var usersOnline = []

io.on('connection', function(socket) {

    socket.on('disconnect', function() {
        usersOnline.splice(usersOnline.indexOf(socket.username), 1);
        socket.broadcast.emit('userLeft', socket.username) // to all others
    });

    socket.on('chat message', function(msg) {
        io.emit('chat message', msg);
    });

    //user Login
    socket.on('checkName', function(username) {
        if (!usersOnline.includes(username)) {

            socket.username = username;
            usersOnline.push(username);

            socket.emit('validLogin', usersOnline);
            socket.broadcast.emit('userJoint', username) // to all others
        } else {
            socket.emit('invalidLogin');
        }
    });

});