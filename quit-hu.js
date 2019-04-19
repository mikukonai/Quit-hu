const jsdom = require("jsdom");
const https = require("https");
const request = require('request');
const fs = require("fs");

const { JSDOM } = jsdom;

const category = "QH";

const fetchImage = function(src, dest){
    request(src).pipe(fs.createWriteStream(dest)).on('close', function(){
        // console.log(`图片 ${dest} 已保存`);
    });
};

void function() {
    let urlList = fs.readFileSync(`./${category}.txt`, {encoding:"utf-8"}).split("\n");
    for(let urlLine of urlList) {
        if(urlLine.length <= 0) continue;
        else if(/([\u4e00-\u9fa5])/gi.test(urlLine)) continue;
        else if(/^\#/gi.test(urlLine)) continue;
        let url = new URL(urlLine);
        let responseData = '';
        let imageCounter = 0;
        setTimeout(()=>{
            const req = https.request({
                hostname: url.hostname,
                path: url.pathname,
                port: 443,
                method: 'GET',
            }, (res)=> {
                res.on('data', (data) => {
                    responseData += data;
                });
                res.on('end', () => {
                    let content = responseData.toString();
                    const doc = new JSDOM(content).window.document;
                    if(doc.querySelector("title") === null) return;
                    const title = doc.querySelector("title").innerHTML.replace(/\s\-\s知乎$/gi, "");
                    let contentDOMclass = "";
                    if(/zhuanlan/gi.test(urlLine)) {
                        contentDOMclass = ".Post-RichText";
                    }
                    else {
                        contentDOMclass = ".RichContent-inner";
                    }
                    const dom = doc.querySelector(contentDOMclass);
                    if(dom === null) {
                        console.log(urlLine);
                        return;
                    }
                    dom.querySelectorAll("figure").forEach(function(fig) {
                        let imgNode = fig.querySelector("noscript");
                        let imgsrc = imgNode.innerHTML.split("src=\"")[1].replace(/\"[\s\S]*$/gi, "");
                        let localPath = `./images/${url.pathname.replace(/^\//gi, "").replace(/\//gi, ".").replace("question.", "").replace("answer.", "")}.${imageCounter}.jpg`;
                        fetchImage(imgsrc, localPath);
                        imageCounter++;

                        fig.querySelectorAll("[src$='</svg>']").forEach(function(noimg) {
                            noimg.setAttribute("src", localPath);
                        });
                        fig.removeChild(imgNode);
                    });

                    let question = dom.innerHTML;
                    let finalHTML = `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    
    <link rel="stylesheet" type="text/css" href="./css/zhihu.css" charset="utf-8"/>

    <title>${title}</title>
</head>
<body>
<div class="zhihu-card">
<div class="zhihu-card-title">${title}</div>
<div class="zhihu-card-url"><a class="internal" href="${urlLine}" target="_blank">查看原文</a></div>
${question}
</div>
</body>
</html>`;

                    let outputPath = `${category}.${url.pathname.replace(/^\//gi, "").replace(/\//gi, ".").replace("question.", "").replace("answer.", "")}.html`;
                    fs.writeFileSync(outputPath, finalHTML, {encoding:"utf-8"});
                    fs.writeFileSync("./index.html", `<a href="${outputPath}">【${category}】${title}</a><br>\n`, {flag: "a", encoding:"utf-8"});
                    console.log(`解析完成：${outputPath}`);
                });
            });
            req.on('error', (e) => {
                console.error(e.toString());
            });
            req.end();
        }, 2000);
    }

}();





