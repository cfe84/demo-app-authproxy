const url = require("url");
const fs = require("fs");
const validateTokenAndSwapAsync = require("./validateTokenAndSwapAsync");
const FRONT_END_URL = process.env.FRONT_END_URL;

const proxyAsync = async (proxyUrl, req, data, res) => {

    let proxyTo = url.parse(proxyUrl);
    if (!proxyTo.protocol) {
        proxyUrl = `http://${proxyUrl}`;
        proxyTo = url.parse(proxyUrl);
    }

    const protocol = proxyTo.protocol.slice(0, -1);
    const http = require(protocol);
    const port = proxyTo.port || (protocol === "http" ? 80 : 443);
    const path = req.url;
    const token = req.headers["authorization"];
    
    try {
        const authorization = await validateTokenAndSwapAsync(token);
        if (authorization !== null) {
            req.headers["authorization"] = authorization;
        }
    }
    catch(error) {
        console.log(`Authentication failed: ${error}`);
        //res.set(req.headers);
        res.set("access-control-allow-origin", "https://officeapps.azureml.net");
        res.statusCode = 401;
        res.json({
            "error": {
                "code":"Unauthorized",
                "message": error.message,
                "details": [{"code":"ScoreRequestUnauthorized","message": `You need to sign-in first on ${FRONT_END_URL}`}]
            }
        });
        return res.end();
    }
    console.log(`Proxying to ${req.method} ${protocol}://${proxyTo.hostname}:${port}${path}`);

    req.headers.host = `${proxyTo.hostname}:${port}`

    const passThru = http.request({
        port: port,
        hostname: proxyTo.hostname,
        path,
        method: req.method,
        headers: req.headers,
    }, (resp) => {
        let data = "";
        console.log(`Response Status Code: ${resp.statusCode}`);
        console.log(`    Response Headers: ${JSON.stringify(req.headers, null, 2)}`);
        res.statusCode = resp.statusCode;
        if (resp.headers["authorization"]) {
            resp.headers["authorization"] = token;
        }
        res.set(resp.headers);
        resp.on("data", (chunk) => {
            data += chunk
        });
        resp.on("end", () => {
            console.log(`   Response Body: ${data}`);
            if (data) {
                const obj = JSON.parse(data);
                if (obj.host) {
                    obj.host = process.env.PROXY_HOSTNAME;
                    console.log(`Replace hostname in the response`);
                }
                res.json(obj);
            }
            res.end();
        });
    });
    passThru.write(data);
    passThru.end();
}

module.exports = proxyAsync;