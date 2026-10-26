// Можно ли встроить ролики VK. В API такого признака нет: VK решает, когда отдаёт страницу плеера,
// и вместо плеера присылает заглушку с embedErrorCallback(<код>)
const PLAYER_URL = 'https://vkvideo.ru/video_ext.php';
const VIDEO = /^(-?\d+)_(\d+)_([0-9a-f]+)$/;
const MAX_VIDEOS = 40;
// Пачку запросов VK часто встречает антибот-страницей, поэтому не больше пяти одновременно
const PARALLEL = 5;
const TIMEOUT = 6000;
const CACHE_TIME = 6 * 3600 * 1000;

// Как плеер в Lampa: страница грузится во фрейме и без Referer
const HEADERS = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    'accept-language': 'ru',
    'sec-fetch-dest': 'iframe'
};

// Ответы VK, пока жив экземпляр функции: owner_id_id → {blocked, at}
const cache = new Map();

async function check(video) {
    const [, oid, id, hash] = video.match(VIDEO);
    const key = oid + '_' + id;
    const known = cache.get(key);

    if (known && Date.now() - known.at < CACHE_TIME) return {key, blocked: known.blocked};

    try {
        // Тот же адрес, что открывает плагин
        const vk = await fetch(`${PLAYER_URL}?oid=${oid}&id=${id}&hash=${hash}&partner_name=lampa`, {headers: HEADERS, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT)});
        const page = await vk.text();
        // Без обоих признаков пришла антибот-страница или ошибка: ответа нет, ролик не прячем
        const blocked = page.includes('embedErrorCallback') ? true : page.includes('"is_embed":true') ? false : null;

        if (blocked !== null) cache.set(key, {blocked, at: Date.now()});

        return {key, blocked};
    }
    catch (e) {
        return {key, blocked: null};
    }
}

async function checkAll(videos) {
    const results = [];
    let next = 0;

    async function worker() {
        while (next < videos.length) {
            const i = next++;

            results[i] = await check(videos[i]);
        }
    }

    await Promise.all(Array.from({length: PARALLEL}, worker));

    return results;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const query = new URL(req.url, 'http://localhost').searchParams.get('videos') || '';
    const videos = [...new Set(query.split(',').filter(Boolean))];

    if (req.method !== 'GET' || !videos.length || videos.length > MAX_VIDEOS || !videos.every(video => VIDEO.test(video))) {
        res.setHeader('Cache-Control', 'no-store');
        res.statusCode = req.method !== 'GET' ? 405 : 400;
        return res.end('{"error":"Bad request"}');
    }

    const results = await checkAll(videos);
    const unknown = results.some(result => result.blocked === null);

    // Полный ответ CDN Vercel держит час, с неизвестными не кэшируем
    res.setHeader('Cache-Control', unknown ? 'no-store' : 'public, max-age=0, s-maxage=3600');
    res.end(JSON.stringify({blocked: results.filter(result => result.blocked).map(result => result.key)}));
};
