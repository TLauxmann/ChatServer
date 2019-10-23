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

var usersOnline = new Map();

io.on('connection', function(socket) {

    socket.on('disconnect', function() {
        usersOnline.delete(socket.username);
        socket.broadcast.emit('userLeft', socket.username) // to all others

        console.log(usersOnline);
    });

    socket.on('chat message', function(msg) {
        var data = msg.trim();
        console.log(data.substr(0,3));
        //check for private msg
        if(data.substr(0,3) === '/p '){
            console.log('------------test');
           data = data.substr(3);
            var ind = data.indexOf(' ');
            var name = data.substr(0, ind);
            console.log(name);
            data = data.substr(ind+1);
            if (name in usersOnline) {
                usersOnline[name].emit('private message', msg, socket.username);
                console.log("private");
            }
        } else {
            io.emit('chat message', msg, socket.username);
        }
    });

    //user Login
    socket.on('checkName', function(username) {
        if (!usersOnline.has(username)) {
            socket.username = username;
            usersOnline.set(username, socket.id);
            socket.emit('validLogin', Array.from(usersOnline.keys()));
            socket.broadcast.emit('userJoint', username) // to all others

            console.log(usersOnline);
        } else {
            socket.emit('invalidLogin');
        }
    });

});