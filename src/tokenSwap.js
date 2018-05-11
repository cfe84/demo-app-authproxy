const API_KEY = process.env.API_KEY;

const validateToken = (authorizationToken) => {
    return true;
};

const tokenSwap = (authorizationToken) => {
    if (!authorizationToken) {
        return null;
    }
    if (!validateToken(authorizationToken)) {
        throw Error("Forbidden");
    }
    return API_KEY;
}

module.exports = tokenSwap;