const azure = require('azure-storage');
const TOKEN_TABLE = "tokens";
const API_KEY = process.env.API_KEY;

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
        throw Error(`Your token (${token}) does not exist.`);
    }
}

const validateTokenAsync = async (authorizationToken) => {
    const expiration = await getTokenExpiryAsync(authorizationToken);
    console.log(`Token expiring on ${expiration} (Now is ${new Date()})`);
    if (expiration.getTime() < Date.now()) {
        console.error("Token is expired!");
        throw Error(`Your session has expired.`);
    }
}

const validateTokenAndSwapAsync = async (authorizationToken) => {
    if (!authorizationToken) {
        console.log("There's no auth token");
        return null;
    }
    await validateTokenAsync(authorizationToken.replace("Bearer ", ""));
    return API_KEY;
}

module.exports = validateTokenAndSwapAsync;