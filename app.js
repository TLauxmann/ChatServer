var express = require('express');
var session = require("express-session");
var cookieParser = require('cookie-parser')
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fetch = require('node-fetch');
const helmet = require('helmet');
const port = process.env.PORT || 3000;
const database = require('./db');
const bcrypt = require('bcryptjs');

var serverName = process.env.CF_INSTANCE_ADDR ? process.env.CF_INSTANCE_ADDR : "localhost:" + port;

//redis trial based on https://www.cloudfoundry.org/blog/scaling-real-time-apps-on-cloud-foundry-using-node-js-and-redis/
/*var SessionSockets = require('session.socket.io');
var sessionSockets = new SessionSockets(io, sessionStore, cookieParser, 'jsessionid');

var redis = require('redis');
var RedisStore = require('connect-redis')(express);
var rClient = redis.createClient();
var sessionStore = new RedisStore({client:rClient});*/

app.enable('trust proxy');

   app.use (function (req, res, next) {
    if (req.secure) {
            // request was via https, so do no special handling
            next();
    } else {
            // request was via http, so redirect to https
            res.redirect('https://' + req.headers.host + req.url);
    }
});

//Security
app.use(helmet());
app.use(cookieParser('u dont know'));
app.use(session({key: 'jsessionid', resave: false, saveUninitialized: false, secret: 'u dont know'}));

app.use('/client', express.static(__dirname + '/client'));
//start - express, html config
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

http.listen(port, () => {
  console.log('Server running on port: %d', port);
});
//end - express, html config

var usersOnline = new Map();
var profilePictures = new Map();

//sessionSockets.on('connection', function(err, socket, session) {
io.on('connection', function(socket){

    socket.emit('serverName', serverName);

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

        //TODO: Not search for password, because its not saved in plain text
        database.dataQuery("SELECT * FROM users WHERE USERNAME = ? AND PASSWORD = ? ;", [username.toLowerCase(), password]).then(function(result){
            //TODO: compare passwords - bcrypt.compare(password, result[0].password) must be true
            if(result && result.length > 0){
                if (!usersOnline.has(username)) {
                    socket.username = username;
                    usersOnline.set(username, socket.id);
                    profilePictures.set(username, result[0].PIC)
                    //remove own name
                    var uoList = Array.from(usersOnline.keys());
                    uoList.splice(uoList.indexOf(socket.username), 1)
                    socket.emit('validLogin', uoList, Array.from(profilePictures));
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
        var hashPw = hashPassword(signUpData[1]);
        
        Promise.all([detectPic, dbEntry, hashPw]).then(function(result){
            if (result[0].errorMessage && result[0].errorMessage.body) {
                socket.emit('alertMsg', JSON.parse(result[0].errorMessage.body).images[0].error.description)
            } else if (result[0].errorMessage && result[0].errorMessage.message) {
                socket.emit('alertMsg', result[0].errorMessage.message)
            } else if(result[1] && result[1].length > 0){
                socket.emit('alertMsg', "This user already exists")                            
            }else{
                signUpData[0] = signUpData[0].toLowerCase();
                console.log(result[2].pw);
                console.log(signUpData[1]);
                signUpData[1] = result[2].pw;
                console.log(signUpData[1]);
                database.dataQuery("INSERT INTO USERS (USERNAME,PASSWORD,EMAIL,PIC) VALUES ( ?, ?, ?, ? );", signUpData).then(function(result){
                    socket.emit('signUpSuccess') ;                           
                })
            }
        });
    });

});

async function hashPassword(originalPw){
    //generate Salt
    const salt = await bcrypt.genSalt(10);

    //hash the password
    const hashPassword = await bcrypt.hash(originalPw, salt);
    
    console.log(salt);

    return {
        pw: hashPassword
    }
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

async function detectImage(fileBuffer) {
    const url = 'https://eu-de.functions.cloud.ibm.com/api/v1/web/86dd21a5-4b63-4429-a760-b21e371df199/default/my-action';

    return await fetch(url, {
        method: 'post',
        body: fileBuffer,
    })  
        .then(res => res.json())
        .then(json => json)
}