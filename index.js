const express = require('express');

const { Cluster } = require('puppeteer-cluster');

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const app = express();

(async () => {

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_BROWSER,
        maxConcurrency: 100,
        timeout: 60000,
        monitor: false,
        puppeteerOptions: {
            headless: true,
            args: [
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list ',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        },
        puppeteer: puppeteer,
    });

    await cluster.task(async ({ page, data: data }) => {

        const action = data.action;

        console.log("Started : ",action);

        await page.setBypassCSP(true);
        //await page.setViewport({ width: 0, height: 0 });
        await page.goto(data.url, {waitUntil: 'networkidle2', timeout: 120000});

        console.log("Page Loaded !");

        //cloudflare waiting
        await page.waitForSelector('[class="btn-login login-singnup-link js-popup-member"]' , {timeout: 80000});
        await page.waitForTimeout(1000);
        await page.click('[class="btn-login login-singnup-link js-popup-member"]');

        console.log("Click Login Button");

        const getToken = async(action) => {
            return page.evaluate(async (parameter) => {
                return new Promise(resolve => {
                    setTimeout((type) => {
                        window.reCaptcha.createToken(type).then(function (e) {
                            resolve(e);
                        });
                    }, 2500, parameter)
                })
            },action);
        }

        return await getToken(action);
    });

    app.get('/', async function (req, res) {
        try {
            console.log("Request : ",req.query);
            let data = {
                'url' : 'https://www.sikayetvar.com/',
                'action' : req.query.action
            };
            const resp = await cluster.execute(data);

            let response = {
                'status' : true,
                'reCaptcha' : resp
            };
            console.log(response)
            res.status(200).json(response);
        } catch (err) {
            // catch error
            let response = {
                'status' : false,
                'message' : err.message
            };
            console.log(response)
            res.status(400).json(response);
        }
    });

    app.listen(3001, function () {
        console.log('Listening Port 3001');
    });

})();