var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fetch = require('node-fetch');

const database = require('./db');

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
var profilePictures = new Map();

io.on('connection', function(socket) {

    socket.on('disconnect', function() {
        usersOnline.delete(socket.username);
        profilePictures.delete(socket.username);
        socket.broadcast.emit('userLeft', socket.username) // to all others
    });

    socket.on('chat message', function (msg, file, writingToList, translate) {

        //if checkbox checked
        if (translate){
            translateMessage(msg)
            .then(res => 
                {
                    if (res && res.translations && res.translations[0].translation) {
                        sendMessage(writingToList, res.translations[0].translation, socket, file);
                    } else if(res && res.errorMessage) {
                        io.to(socket.id).emit('alertMsg', res.errorMessage);
                    } else {
                        io.to(socket.id).emit('alertMsg', "Something bad happend during the Translation");                    
                    }
                }
                    )
            } else{
                sendMessage(writingToList, msg, socket, file);
            }
    });

    //user Login
    socket.on('checkName', function(username, password) {
        //Do not care...Easteregg
        if (username.toUpperCase() == "WÜRGER" || username.toUpperCase() == "DER WÜRGER"){
            username = "Robin F";
        }
        database.dataQuery("SELECT * FROM users WHERE USERNAME = ? AND PASSWORD = ? ;", [username.toLowerCase(), password]).then(function(result){
            if(result && result.length > 0){
                if (!usersOnline.has(username)) {
                    socket.username = username;
                    usersOnline.set(username, socket.id);
                    profilePictures.set(username, result[0].PIC)
                    //remove own name
                    var uoList = Array.from(usersOnline.keys());
                    uoList.splice(uoList.indexOf(socket.username), 1)
                    socket.emit('validLogin', uoList, profilePictures);
                    socket.broadcast.emit('userJoint', username, result[0].PIC) // to all others
                } else {
                    socket.emit('invalidLogin');
                }
            }else{
                socket.emit('alertMsg', "Wrong username or password")                            
            }
        });
    });

    //user SignUp
    socket.on('signUp', function (signUpData, buffer) {

        var detectPic = detectImage(buffer);
        var dbEntry = database.dataQuery("SELECT * FROM users WHERE username = ? ;", [signUpData[0].toLowerCase()])
        
        Promise.all([detectPic, dbEntry]).then(function(result){
            if (result[0].errorMessage && result[0].errorMessage.body) {
                socket.emit('alertMsg', JSON.parse(result[0].errorMessage.body).images[0].error.description)
            } else if (result[0].errorMessage && result[0].errorMessage.message) {
                socket.emit('alertMsg', result[0].errorMessage.message)
            } else if(result[1] && result[1].length > 0){
                socket.emit('alertMsg', "This user already exists")                            
            }else{
                signUpData[0] = signUpData[0].toLowerCase();
                database.dataQuery("INSERT INTO USERS (USERNAME,PASSWORD,EMAIL,PIC) VALUES ( ?, ?, ?, ? );", signUpData).then(function(result){
                    socket.emit('signUpSuccess') ;                           
                })
            }
        });
    });

    socket.on('checkProfilePicture', function (buffer, base64) {
        console.log(base64.length);

    });

});

function sendMessage(writingToList, msg, socket, file) {
    if (writingToList.length) {
        //send to selected users
        writingToList.forEach(function (username) {
            io.to(usersOnline.get(username)).emit('chat message', msg, socket.username, file, writingToList);
        });
        //and to yourself
        io.to(socket.id).emit('chat message', msg, socket.username, file, writingToList);
    }
    else {
        io.emit('chat message', msg, socket.username, file, writingToList);
    }
}

    async function translateMessage(incomingMessage){

    const url = 'https://eu-de.functions.cloud.ibm.com/api/v1/web/86dd21a5-4b63-4429-a760-b21e371df199/hrt-demo/identify-and-translate';
    const detectObject = {
        text: incomingMessage
    };

    return await fetch(url, {
        method: 'post',
        body: JSON.stringify(detectObject),
        headers: { 'Content-Type': 'application/json' },
    })
    .then(res => res.json())
    .then(json => json)
}

async function detectImage(fileBuffer) {
    const url = 'https://eu-de.functions.cloud.ibm.com/api/v1/web/86dd21a5-4b63-4429-a760-b21e371df199/default/my-action';

    return await fetch(url, {
        method: 'post',
        body: fileBuffer,
    })
        .then(res => res.json())
        .then(json => json)
}