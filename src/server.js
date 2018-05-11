const express = require("express");
const fs = require("fs");
const proxy = require("./proxy");

const PORT = process.env.PORT || 8080;
const proxyTo = process.env.SERVICE_URL;

let requestCount = 0;

const app = new express();

app.all("*", (req, res) => {
	requestCount++;
	console.log(`\n\n#${requestCount} - ${new Date()}: ${req.method.toUpperCase()} ${req.url}`);
	console.log(`Received from ${req.connection.remoteAddress}`);
	console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
	console.log(`Query: ${JSON.stringify(req.query, null, 2)}`);
	console.log(`Params: ${JSON.stringify(req.params, null, 2)}`);
	let data = "";
	req.on("data", (chunk) => data += chunk);
	req.on("end", () => {
		proxy(proxyTo, req, data, res);
		console.log(`Body: ${data}`);
		console.log(`\n\n------------------------------`);
	});
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));