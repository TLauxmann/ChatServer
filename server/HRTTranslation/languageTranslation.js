
const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
const { IamAuthenticator } = require('ibm-watson/auth');

const languageTranslator = new LanguageTranslatorV3({
  version: '2018-05-01',
  authenticator: new IamAuthenticator({
    apikey: 'GGccI632myKze1YMkfF_603xVaToXSUHfFjYvmJ60Hdb',
  }),
  url: 'https://gateway-fra.watsonplatform.net/language-translator/api',
});  

function getTheErrorResponse(statusCode, errorMessage) {
  return {
    statusCode: statusCode,
    errorMessage: errorMessage,
  };
}

//Callback for reduce operation
const getHighestConfidenceObject = (acc, cur) => {
  if (acc.confidence > cur.confidence) {
    return acc;
  } else {
    return cur;
  }
};


languageDetection(textObject) {

  return new Promise(function (resolve, reject) {

    try {

        if(!textObject || !textObject.text){
          throw new Error('No text to translate!');
        }
      
        languageTranslator.identify(textObject).then(identifiedLanguages => {

        var identifiedLanguageObject = identifiedLanguages.result.languages.filter(function (languageObject){
          //filter all objects with high confidence
          return (languageObject.confidence < 1 && languageObject.confidence > 0.9);
          //gets language with best confidence or else an empty array
        }).reduce(getHighestConfidenceObject, []);

          if (identifiedLanguageObject.language){
            return resolve(
              {
                statusCode: 200,
                body: {
                  text: textObject.text,
                  language: identifiedLanguageObject.language,
                  confidence: identifiedLanguageObject.confidence,
                },
                headers: { 'Content-Type': 'application/json' }
              });
          }else{
            return reject(getTheErrorResponse(404, "Could not detect any language!"));
          }
      })
      .catch(err => {
        throw err;
      });

    } catch (err) {
      reject(getTheErrorResponse(400, err.message));
    }
  });
}

//TODO
  languageTranslation(translateObject) {

    return new Promise(function (resolve, reject) {

      try {

        languageTranslator.translate(translateObject)
          .then(translationResult => {

            resolve({
              statusCode: 200,
              body: {
                translations: "<translated text>",
                words: 1,
                characters: 11,
              },
              headers: { 'Content-Type': 'application/json' }
            });

          })
          .catch(err => {
            console.log('error:', err);
          });

      } catch (err) {
        reject(getTheErrorResponse(400, err.message));
      }
    });

  }