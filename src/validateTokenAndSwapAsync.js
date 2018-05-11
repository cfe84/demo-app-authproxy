const azure = require('azure-storage');
const TOKEN_TABLE = "tokens";
const API_KEY = process.env.API_KEY;
const FRONT_END_URL = process.env.FRONT_END_URL;

const tableService = azure.createTableService();

const retrieveEntityAsync = (tableName, pk, rk) => {
    return new Promise((resolve, reject) => {
        tableService.retrieveEntity(tableName, pk, rk, function(error, result, response) {
        if (!error) {
            resolve(result);
        } else {
            reject(error)
        }
      });
    });
}

const getTokenExpiryAsync = async (token) => {
    try {
        tokenEntity = await retrieveEntityAsync(TOKEN_TABLE, token, "");
        return tokenEntity.expiration._;        
    } catch (error) {
        throw Error(`Your token (${token}) does not exist. You need to sign-in first on ${FRONT_END_URL}`);
    }
}

const validateTokenAsync = async (authorizationToken) => {
    const expiration = await getTokenExpiryAsync(authorizationToken);
    if (expiration.getTime() < Date.now()) {
        throw Error(`Your session has expired, you need to log back in on ${FRONT_END_URL}`);
    }
}

const validateTokenAndSwapAsync = async (authorizationToken) => {
    if (!authorizationToken) {
        return null;
    }
    await validateTokenAsync(authorizationToken.replace("Bearer ", ""));
    return API_KEY;
}

module.exports = validateTokenAndSwapAsync;