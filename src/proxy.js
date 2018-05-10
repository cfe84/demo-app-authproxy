const url = require("url");
const fs = require("fs");
const proxy = (params, req, data, res) => {
    let proxyUrl = params.proxyTo;
    let proxyPath = params.proxyPath;
    let certFile = params.certFile;
    let keyFile = params.keyFile;
    const cert = params.cert || (certFile ? fs.readFileSync(certFile) : null);
    const key = params.key || (keyFile ? fs.readFileSync(keyFile) : null);

    let proxyTo = url.parse(proxyUrl);
    if (!proxyTo.protocol) {
        proxyUrl = `http://${proxyUrl}`;
        proxyTo = url.parse(proxyUrl);
    }
    const protocol = proxyTo.protocol.slice(0, -1);
    const http = require(protocol);
    const port = proxyTo.port || (protocol === "http" ? 80 : 443);
    const path = proxyPath ? `${proxyTo.path}${req.url}` : proxyTo.path;
    
    let authHeader = (req["authorization"] || req["Authorization"]);
    if (authHeader) {
        authHeader = authHeader.replace("Bearer ", "");
        req.headers["ocp-apim-subscription-key"] = authHeader;
    }
    else {
        console.log("No auth header was present");
    }

    console.log(`Proxying to ${req.method} ${protocol}://${proxyTo.hostname}:${port}${path}`);

    req.headers.host = `${proxyTo.hostname}:${port}`

    const passThru = http.request({
        port: port,
        hostname: proxyTo.hostname,
        path,
        method: req.method,
        headers: req.headers,
        key,
        cert
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
            const obj = JSON.parse(data);
            if (obj.host) {
                obj.host = process.env.PROXY_HOSTNAME;
                console.log(`Replace hostname in the response`);
            }
            res.json(obj);
            res.end();
        });
    });
    passThru.write(data);
    passThru.end();
}

module.exports = proxy;