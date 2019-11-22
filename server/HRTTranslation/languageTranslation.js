
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
          if (translationResult.status == 200) {
            console.log(translationResult.result.translations[0].translation);
            return translationResult.result.translations[0].translation;
          } else {
            return "";
          }
        })
        .catch(err => {
          console.log('error:', err);
        });
    })
    .catch(err => {
      console.log('error:', err);
    });
}
  
/**
 * Helper 
 * @param {*} errorMessage 
 * @param {*} defaultLanguage 
 */
function getTheErrorResponse(errorMessage, defaultLanguage) {
  return {
    statusCode: 200,
    body: {
      language: defaultLanguage || 'en',
      errorMessage: errorMessage
    }
  };
}

/**
  *
  * main() will be run when the action is invoked
  *
  * @param Cloud Functions actions accept a single parameter, which must be a JSON object.
  *
  * @return The output of this action, which must be a JSON object.
  *
  */
module.exports = {

languageDetection(params) {

  /*
   * The default language to choose in case of an error
   */
  const defaultLanguage = 'en';

  return new Promise(function (resolve, reject) {

    try {

      // *******TODO**********
      // - Call the language identification API of the translation service
      // see: https://cloud.ibm.com/apidocs/language-translator?code=node#identify-language
      // - if successful, resolve exactly like shown below with the
      // language that is most probable the best one in the "language" property
      // and the confidence it got detected in the "confidence" property

      // in case of errors during the call resolve with an error message according to the pattern 
      // found in the catch clause below
	  
      var identifiedLanguageObject = languageTranslator.identify(params).then(identifiedLanguages => {


      //console.log(JSON.stringify(identifiedLanguages, null, 2));

      //Callback for reduce operation
      var getHighestConfidenceObject = (acc, cur) => {
        if (acc.confidence > cur.confidence) {
          return acc;
        } else {
          return cur;
        }
      };

      var identifiedLanguageObject = identifiedLanguages.result.languages.filter(function (languageObject){
        //filter all objects with high confidence
        return (languageObject.confidence < 1 && languageObject.confidence > 0.9);
      }).reduce(getHighestConfidenceObject);

        console.log(identifiedLanguageObject);
      return identifiedLanguageObject

	  })
	  .catch(err => {
		console.log('error:', err);
	  });

      resolve({
        statusCode: 200,
        body: {
          text: params.text, 
          language: identifiedLanguageObject.language,
          confidence: identifiedLanguageObject.confidence,
        },
        headers: { 'Content-Type': 'application/json' }
      });


    } catch (err) {
      console.error('Error while initializing the AI service', err);
      resolve(getTheErrorResponse('Error while communicating with the language service', defaultLanguage));
    }
  });
}
}
