// Анонимный токен VK для плагина. Браузеру с чужого домена VK его не отдаёт: в ответе нет CORS
const VK_TOKEN_URL = 'https://api.vk.com/oauth/get_anonym_token?client_id=52461373&scope=video';
const TOKEN = /^anonym\.[\w-]+\.[\w-]+\.[\w-]+$/;

// VK видит клиента так же, как при прямом запросе из браузера. Куки не передаём: своих кук VK браузер сюда не пришлёт
const FORWARD_HEADERS = ['user-agent', 'accept-language', 'origin', 'referer', 'x-forwarded-for'];

async function readBody(req) {
    // Vercel читает тело сам, локальный http.createServer — нет
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString();

    let body = '';

    for await (const chunk of req) {
        body += chunk;

        if (body.length > 2048) break;
    }

    return body;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'GET' && req.method !== 'POST') {
        res.statusCode = 405;
        return res.end('{"error":"Method not allowed"}');
    }

    // POST продлевает присланный токен: VK оставляет тот же anonym_id, по нему копятся рекомендации
    const old = req.method === 'POST' ? (await readBody(req)).trim() : '';

    if (req.method === 'POST' && !TOKEN.test(old)) {
        res.statusCode = 400;
        return res.end('{"error":"Bad token"}');
    }

    const headers = {};

    for (const name of FORWARD_HEADERS) {
        if (req.headers[name]) headers[name] = req.headers[name];
    }

    try {
        let vk = null;
        let text = '';

        if (old) {
            vk = await fetch(VK_TOKEN_URL + '&anonymous_token=' + encodeURIComponent(old), {headers});
            text = await vk.text();
        }

        // Битый токен VK не продлевает и отвечает ошибкой. Тогда выдаём новый
        if (!vk || !vk.ok || !text.includes('"token"')) {
            vk = await fetch(VK_TOKEN_URL, {headers});
            text = await vk.text();
        }

        res.statusCode = vk.status;
        res.end(text);
    }
    catch (e) {
        res.statusCode = 502;
        res.end('{"error":"VK is unavailable"}');
    }
};
