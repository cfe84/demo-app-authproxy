const url = require("url");
const fs = require("fs");
const tokenSwap = require("./tokenSwap");

const proxy = (proxyUrl, req, data, res) => {

    let proxyTo = url.parse(proxyUrl);
    if (!proxyTo.protocol) {
        proxyUrl = `http://${proxyUrl}`;
        proxyTo = url.parse(proxyUrl);
    }

    const protocol = proxyTo.protocol.slice(0, -1);
    const http = require(protocol);
    const port = proxyTo.port || (protocol === "http" ? 80 : 443);
    const path = req.url;
    
    try {
        const authorization = tokenSwap(req.headers["authorization"])
        if (authorization !== null) {
            req.headers["authorization"] = authorization;
        }
    }
    catch(error) {
        if (error.message === "Forbidden") {
            res.statusCode = 403;
            return res.end("Forbidden");
        }
        res.statusCode = 500;
        return res.end("Internal server error");
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
        res.set(resp.headers);
        resp.on("data", (chunk) => {
            data += chunk
        });
        resp.on("end", () => {
            console.log(`   Response Body: ${data}`);
            if (data && (resp.headers["content-type"] === "application/json"
                || resp.headers["Content-Type"] === "application/json" 
                || resp.headers["Content-type"] === "application/json")) {
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

module.exports = proxy;