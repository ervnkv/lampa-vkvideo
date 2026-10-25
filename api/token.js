// Анонимный токен VK для плагина. Браузеру с чужого домена VK его не отдаёт: в ответе нет CORS
const VK_TOKEN_URL = 'https://api.vk.com/oauth/get_anonym_token?client_id=52461373&scope=video';

// VK видит клиента так же, как при прямом запросе из браузера. Куки не передаём: своих кук VK браузер сюда не пришлёт
const FORWARD_HEADERS = ['user-agent', 'accept-language', 'origin', 'referer', 'x-forwarded-for'];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'GET') {
        res.statusCode = 405;
        return res.end('{"error":"Method not allowed"}');
    }

    const headers = {};

    for (const name of FORWARD_HEADERS) {
        if (req.headers[name]) headers[name] = req.headers[name];
    }

    try {
        const vk = await fetch(VK_TOKEN_URL, {headers});

        res.statusCode = vk.status;
        res.end(await vk.text());
    }
    catch (e) {
        res.statusCode = 502;
        res.end('{"error":"VK is unavailable"}');
    }
};
