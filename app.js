var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fetch = require('node-fetch');

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

    //testing translate
    translate("Was ein krasser Chatserver!")

    socket.on('disconnect', function() {
        usersOnline.delete(socket.username);
        socket.broadcast.emit('userLeft', socket.username) // to all others
    });

    socket.on('chat message', function (msg, file, writingToList) {

        //if checkbox checked
        //msg = translate(msg);

        console.log($('#checkTranslation input').is(':checked'));

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

async function translate(incomingMessage){

    const url = 'https://eu-de.functions.cloud.ibm.com/api/v1/web/86dd21a5-4b63-4429-a760-b21e371df199/hrt-demo/identify-and-translate';
    const detectObject = {
        text: incomingMessage
    };

    const response = await fetch(url, [detectObject]);
    const jsonTrans = await response.json();
    console.log(JSON.stringify(jsonTrans));
    //return JSON.stringify(jsonTrans.translations)
}