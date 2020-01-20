var ibmdb = require('ibm_db');
const dbCredentials = "DATABASE=BLUDB;HOSTNAME=dashdb-txn-sbox-yp-lon02-01.services.eu-gb.bluemix.net;PORT=50000;PROTOCOL=TCPIP;UID=mtg90551;PWD=b4p^80d71ztbpkkd"

module.exports = {

    dataQuery(query, params) {
        return new Promise(function (resolve, reject) {
            try{
                ibmdb.open(dbCredentials).then(function (conn){
                    if (conn.connected){
                        conn.query(query, params).then(function(result){
                            conn.close();
                            return resolve(result);
                        }).catch(err => {throw err;});
                    }else{
                        return reject(new Error("Could not connect to database"));
                    }
                }).catch(err => {throw err;});
            } catch (err){
                conn.close();
                return reject(err.message);
            }
        });
    }
}