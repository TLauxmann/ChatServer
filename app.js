var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
const { IamAuthenticator } = require('ibm-watson/auth');

const languageTranslator = new LanguageTranslatorV3({
    version: '2018-05-01',
    authenticator: new IamAuthenticator({
        apikey: 'GGccI632myKze1YMkfF_603xVaToXSUHfFjYvmJ60Hdb',
    }),
    url: 'https://gateway-fra.watsonplatform.net/language-translator/api',
});

const identifyParams = {
    text: "Hallo wie geht es dir?"
};

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

const port = process.env.PORT || 3000;

http.listen(port, () => {
  console.log('Server running on port: %d', port);
});

var usersOnline = new Map();

io.on('connection', function(socket) {

    getTranslation();

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

function getTranslation() {
    languageTranslator.identify(identifyParams)
        .then(identifiedLanguages => {
            var identifiedLanguage;
            identifiedLanguages.result.languages.forEach(function (languageObject) {
                if (languageObject.confidence < 1 && languageObject.confidence > 0.9) {
                    identifiedLanguage = languageObject.language;
                }
            });
            const translateParams = {
                text: identifyParams.text,
                modelId: identifiedLanguage + "-en",
            };
            languageTranslator.translate(translateParams)
                .then(translationResult => {
                    console.log(JSON.stringify(translationResult, null, 2));
                })
                .catch(err => {
                    console.log('error:', err);
                });
        })
        .catch(err => {
            console.log('error:', err);
        });
}
