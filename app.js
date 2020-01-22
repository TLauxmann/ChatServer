var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const fetch = require('node-fetch');
const helmet = require('helmet');
const port = process.env.PORT || 3000;
const database = require('./db');
var rediscfg = require('./redisDb');
const bcrypt = require('bcryptjs');
var bodyParser = require('body-parser');

var serverName = process.env.CF_INSTANCE_ADDR ? process.env.CF_INSTANCE_ADDR : "localhost:" + port;
const SECRET = 'udontknow';

//needed for multiple instances
var cookieParser = require('cookie-parser')
var expressSession = require("express-session");
var redis = require('redis');
var RedisStore = require('connect-redis')(expressSession);

redisLogin = {
    host: rediscfg.host,
    port: rediscfg.port,
    password: rediscfg.password
};
var rClient = redis.createClient(redisLogin)

var sessionStore = new RedisStore({client: rClient});
var session = expressSession({
    store: sessionStore,
    key: 'JSESSIONID', 
    resave: true, 
    saveUninitialized: true, 
    secret: SECRET })


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(SECRET));
app.use(session);
    
var socketIOExpressSession = require('socket.io-express-session');
io.use(socketIOExpressSession(session)); // session support

//Creating pub and sub
var sub = redis.createClient(redisLogin);
var pub = redis.createClient(redisLogin);
sub.subscribe('chat message');
sub.subscribe('userLeft');
sub.subscribe('userJoint');

//start Security
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
app.use(helmet());
//Security end

//start - express, html config
app.use('/client', express.static(__dirname + '/client'));
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

http.listen(port, () => {
  console.log('Server running on port: %d', port);
});
//end - express, html config

var usersOnline = new Map();
var profilePictures = new Map();


io.on('connection', function(socket){

    socket.emit('serverName', serverName);

    socket.on('disconnect', function() {
        usersOnline.delete(socket.username);
        profilePictures.delete(socket.username);
        data = { "username": socket.username };

        pub.publish('userLeft', JSON.stringify(data));
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
        database.dataQuery("SELECT * FROM users WHERE USERNAME = ? ;", [username.toLowerCase()]).then(function(result){
            if (result && result.length > 0){
                //compare password with hashed db pw
                    bcrypt.compare(password, result[0].PASSWORD).then(function (compared) {
                        if(compared){
                            if (!usersOnline.has(username)) {
                                socket.username = username;
                                usersOnline.set(username, socket.id);
                                profilePictures.set(username, result[0].PIC)
                                //remove own name
                                var uoList = Array.from(usersOnline.keys());
                                uoList.splice(uoList.indexOf(socket.username), 1)
                                socket.emit('validLogin', uoList, Array.from(profilePictures));
                                var data = { "username": username, "picture": result[0].PIC, "socketId": String(socket.id) };

                                pub.publish('userJoint', JSON.stringify(data));
                            } else {
                                socket.emit('invalidLogin');
                            }
                        }else{
                            socket.emit('alertMsg', "Wrong password")    
                        }
                });
            }else{
                socket.emit('alertMsg', "Wrong username")                            
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
                signUpData[1] = result[2].pw;
                database.dataQuery("INSERT INTO USERS (USERNAME,PASSWORD,EMAIL,PIC) VALUES ( ?, ?, ?, ? );", signUpData).then(function(result){
                    socket.emit('signUpSuccess') ;                           
                })
            }
        });
    });

    sub.on('message', function (channel, data) {
        if (channel == 'chat message' && JSON.parse(data).writingToList != ""){
            JSON.parse(JSON.parse(data).writingToList)[0].forEach(function (username) {
                if(usersOnline.get(username) == socket.id){
                    socket.emit('chat message', data);
                }
            });
        }else{
            socket.emit(channel, data);            
        }

        if (channel == 'userJoint'){
            if (data && data != 'undefined'){
                var jointObj = JSON.parse(data);
                if(!usersOnline.has(jointObj.username)){
                    usersOnline.set(jointObj.username, jointObj.socketId);
                    profilePictures.set(jointObj.username, jointObj.picture);
                }
            }
        }else if(channel == 'userLeft'){
            if (data && data != 'undefined'){
                var leftObj = JSON.parse(data);
                if (usersOnline.has(leftObj.username)) {
                    usersOnline.delete(leftObj.username);
                    profilePictures.delete(leftObj.username);
                }
            }
        }
    });

});

async function hashPassword(originalPw){
    //generate Salt
    const salt = await bcrypt.genSalt(10);

    //hash the password
    const hashPassword = await bcrypt.hash(originalPw, salt);
    return {
        pw: hashPassword
    }
}

function sendMessage(writingToList, msg, socket, file) {
    if (writingToList.length) {
        writingToList.push(socket.username)
        data = { "msg": msg, "username": socket.username, "file": file, "writingToList": JSON.stringify(Array.of(writingToList)) }
    } else {
        data = {"msg": msg, "username": socket.username, "file": file, "writingToList": ""}
    }
    pub.publish('chat message', JSON.stringify(data));
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