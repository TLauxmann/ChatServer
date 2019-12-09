var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fetch = require('node-fetch');

var ibmdb = require('ibm_db');
const dbCredentials = "DATABASE=BLUDB;HOSTNAME=dashdb-txn-sbox-yp-lon02-01.services.eu-gb.bluemix.net;PORT=50000;PROTOCOL=TCPIP;UID=vbh62188;PWD=mp86p3^197c7zh21"

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

    socket.on('disconnect', function() {
        usersOnline.delete(socket.username);
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
                        io.to(socket.id).emit('translationFailed', res.errorMessage);
                    } else {
                        io.to(socket.id).emit('translationFailed', "Something bad happend during the Translation");                    
                    }
                }
                    )
            } else{
                sendMessage(writingToList, msg, socket, file);
            }
    });

    //user Login
    socket.on('checkName', function(username) {
        //Do not care...Easteregg
        if (username.toUpperCase() == "WÜRGER" || username.toUpperCase() == "DER WÜRGER"){
            username = "Robin F";
        }
        //check username and pw TODO
        var queryParams = [username];
        var queryResult = dataQuery("SELECT * FROM users WHERE username = ? ;", queryParams);
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

    //user SignUp
    socket.on('signUp', function (signUpData) {
        console.log(signUpData[0].toLowerCase());
        dataQuery("SELECT * FROM users WHERE username = ? ;", [signUpData[0].toLowerCase()], function(result){
            console.log("callback " + result);
        });
        /*
        if(queryResult.length > 0){
            console.log("already exists")
        }else{
            console.log("valid")
            //insert into db
        }
*/
    });

    socket.on('checkProfilePicture', function (imageDateUrl) {
        detectImage(imageDateUrl).then(result => {
            console.log(result);
            if (result === true){
                console.log("isPerson");
            }else{
                console.log("noPerson");
            }
        });
    });

});

function dataQuery(query, params, callback) {
    console.log("asy")
    ibmdb.open(dbCredentials, function (err, conn) {
        if (err)
            return console.log(err);
        conn.query(query, params, function (err, data) {
            if (err)
                console.log(err);
            else
                console.log(data);
                callback(data);
            conn.close(function () {
                console.log('done');
            });
        });
    });
    console.log("nc")
}

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

async function detectImage(imageUrl) {

    const url = 'https://eu-de.functions.cloud.ibm.com/api/v1/web/86dd21a5-4b63-4429-a760-b21e371df199/default/my-action';
    const detectObject = {
        imageUrl: imageUrl
    };

    return await fetch(url, {
        method: 'post',
        body: JSON.stringify(detectObject),
        headers: { 'Content-Type': 'application/json' },
    })
        .then(res => res.json())
        .then(json => json)
}