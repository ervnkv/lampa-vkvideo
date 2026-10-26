(function () {
    'use strict';

    if (window.vkvideo_plugin) return;

    window.vkvideo_plugin = true;

    // Функции api/token.js и api/embed.js, задеплоенные на Vercel вместе с этим файлом
    var TOKEN_URL = 'https://lampa-vkvideo.vercel.app/api/token';
    var EMBED_URL = 'https://lampa-vkvideo.vercel.app/api/embed';
    var CLIENT_ID = '52461373';
    var API_VERSION = '5.282';
    var API_URL = 'https://api.vkvideo.ru/method/';
    var CATALOG_URL = 'https://vkvideo.ru/';
    var PLAYER_ORIGIN = 'https://vkvideo.ru';
    var MENU_TITLE = 'VK Видео';
    var TOKEN_KEY = 'vkvideo_token';
    // Токен живёт сутки. Когда ему больше часа, продлеваем
    var TOKEN_PROLONG_LEFT = 23 * 3600 * 1000;
    // Так карточки VK помечены в «Истории» Lampa
    var HISTORY_SOURCE = 'vkvideo';
    var HISTORY_SIZE = 20;
    var TIMEOUT = 15000;
    var EMBED_TIMEOUT = 8000;
    var SHELF_SIZE = 20;
    var SHELVES_PER_BATCH = 3;
    var COMMENTS_PER_PAGE = 20;

    // Вкладки сайта VK Видео, полками после «Рекомендаций»
    var SHOWCASES = [
        {url: 'https://vkvideo.ru/trends', title: 'Тренды'},
        {url: 'https://vkvideo.ru/lives', title: 'Трансляции'},
        {url: 'https://vkvideo.ru/for_kids', title: 'Детям'},
        {url: 'https://vkvideo.ru/movies_serials', title: 'Фильмы и сериалы'},
        {url: 'https://vkvideo.ru/tvchannels', title: 'Телеканалы'},
        {url: 'https://vkvideo.ru/family', title: 'Семья и дети'}
    ];

    var ICON_MENU = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="4.5" width="19" height="15" rx="4.5" stroke="currentColor" stroke-width="2"/><path d="M10 9.27v5.46c0 .46.5.75.9.52l4.73-2.73a.6.6 0 0 0 0-1.04L10.9 8.75a.6.6 0 0 0-.9.52z" fill="currentColor"/></svg>';
    var ICON_LIKE = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.6 5c2.1 0 3.6 1.2 5.4 3 1.8-1.8 3.3-3 5.4-3C21 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>';
    var ICON_VERIFIED = '<svg viewBox="0 0 24 24"><path d="M12 1.5l2.6 2 3.3-.2 1 3.1 2.7 1.9-1 3.2 1 3.1-2.7 1.9-1 3.1-3.3-.2-2.6 2-2.6-2-3.3.2-1-3.1-2.7-1.9 1-3.1-1-3.2 2.7-1.9 1-3.1 3.3.2z" fill="currentColor"/><path d="M7.8 12.3l2.8 2.8 5.6-5.6" stroke="#000" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    var STYLE = [
        '.items-line .card--vkvideo { width: 21em; }',
        '.card--vkvideo .card__view { padding-bottom: 56.25%; margin-bottom: 0.7em; }',
        '.card--vkvideo .card__img { object-fit: cover; }',
        '.card--vkvideo .card__title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; max-height: 2.6em; }',
        '.card--vkvideo .card__age { margin-top: 0.35em; font-size: 0.9em; opacity: 0.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
        '.card__vkvideo-badge { position: absolute; right: 0.6em; bottom: 0.6em; padding: 0.2em 0.45em; border-radius: 0.4em; background: rgba(0, 0, 0, 0.75); font-size: 0.85em; font-weight: 600; line-height: 1.2; }',
        '.card__vkvideo-badge--live { background: #ff3347; }',
        '@media screen and (max-width: 480px) { .items-line .card--vkvideo { width: 18em; } }',

        '.vkvideo-watch { padding: 0 1.5em 3em; }',
        '.vkvideo-watch__inner { margin: 0 auto; }',
        '.vkvideo-watch__back { margin-bottom: 0.8em; }',
        '@media screen and (min-width: 768px) and (min-height: 480px) { .vkvideo-watch__inner { max-width: calc((100vh - 17em) * 1.7778); } }',
        '.vkvideo-watch__player { position: relative; padding-top: 56.25%; background: #000; border-radius: 1em; overflow: hidden; }',
        '.vkvideo-watch__player.focus { box-shadow: 0 0 0 0.2em #fff; }',
        '.vkvideo-watch__player iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }',
        '.vkvideo-watch__title { margin-top: 0.8em; font-size: 1.6em; font-weight: 600; line-height: 1.3; }',
        '.vkvideo-watch__stats { margin-top: 0.4em; color: rgba(255, 255, 255, 0.6); }',
        '.vkvideo-watch__stats svg, .vkvideo-watch__verified svg { width: 1em; height: 1em; vertical-align: -0.12em; }',
        '.vkvideo-watch__likes { margin-left: 0.2em; }',
        '.vkvideo-watch__channel { display: flex; align-items: center; margin-top: 1.2em; }',
        '.vkvideo-watch__avatar, .vkvideo-comment__avatar { flex-shrink: 0; border-radius: 50%; background: rgba(255, 255, 255, 0.1) center / cover no-repeat; }',
        '.vkvideo-watch__avatar { width: 3em; height: 3em; margin-right: 0.9em; }',
        '.vkvideo-watch__channel-name { font-size: 1.15em; font-weight: 600; }',
        '.vkvideo-watch__verified { margin-left: 0.3em; color: #99a2ad; }',
        '.vkvideo-watch__channel-sub { margin-top: 0.2em; font-size: 0.9em; color: rgba(255, 255, 255, 0.5); }',
        '.vkvideo-watch__desc { margin: 1.2em -0.8em 0; padding: 0.8em; border-radius: 1em; background: rgba(255, 255, 255, 0.06); }',
        '.vkvideo-watch__desc.focus { background: rgba(255, 255, 255, 0.14); }',
        '.vkvideo-watch__desc-text { white-space: pre-line; word-wrap: break-word; line-height: 1.45; max-height: 4.35em; overflow: hidden; }',
        '.vkvideo-watch__desc.expanded .vkvideo-watch__desc-text { max-height: none; }',
        '.vkvideo-watch__desc-toggle { margin-top: 0.4em; font-weight: 600; }',
        '.vkvideo-watch__comments-head { margin-top: 1.8em; font-size: 1.3em; font-weight: 600; }',
        '.vkvideo-watch__comments-head span { margin-left: 0.4em; color: rgba(255, 255, 255, 0.5); font-weight: 400; }',
        '.vkvideo-watch__note { margin-top: 1em; color: rgba(255, 255, 255, 0.5); }',
        '.vkvideo-watch__more { display: inline-flex; margin-top: 1em; }',
        '.vkvideo-comment { display: flex; margin: 0.6em -0.8em 0; padding: 0.6em 0.8em; border-radius: 1em; }',
        '.vkvideo-comment.focus { background: rgba(255, 255, 255, 0.08); }',
        '.vkvideo-comment__avatar { width: 2.4em; height: 2.4em; margin-right: 0.8em; }',
        '.vkvideo-comment__body { min-width: 0; }',
        '.vkvideo-comment__name { font-weight: 600; }',
        '.vkvideo-comment__date { margin-left: 0.5em; font-size: 0.85em; color: rgba(255, 255, 255, 0.45); }',
        '.vkvideo-comment__text { margin-top: 0.25em; white-space: pre-line; word-wrap: break-word; line-height: 1.4; }',
        '@media screen and (max-width: 767px) { .vkvideo-watch { padding: 0 0 3em; } .vkvideo-watch__back { margin: 0 1em 0.8em; } .vkvideo-watch__player { border-radius: 0; } .vkvideo-watch__body { padding: 0 1em; } .vkvideo-watch__title { font-size: 1.35em; } }'
    ].join('\n');

    var jsonp_seq = 0;
    var token_waiters = null;
    var card_modules = null;
    // Ролики, которые VK не дал встроить, до перезагрузки Lampa
    var blocked = {};

    function extend(target, source) {
        for (var key in source) target[key] = source[key];

        return target;
    }

    function query(params) {
        var parts = [];

        for (var key in params) {
            if (params[key] !== undefined && params[key] !== null) {
                parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
        }

        return parts.join('&');
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function plural(n, one, few, many) {
        var mod10 = n % 10;
        var mod100 = n % 100;

        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;

        return many;
    }

    function shortNumber(n) {
        function trim(x) {
            return String(x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10).replace('.', ',');
        }

        if (n >= 1e6) return trim(n / 1e6) + ' млн';
        if (n >= 1e3) return trim(n / 1e3) + ' тыс.';

        return String(n || 0);
    }

    function countText(n, one, few, many) {
        return shortNumber(n) + ' ' + (n >= 1000 ? many : plural(n || 0, one, few, many));
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function formatDuration(sec) {
        var h = Math.floor(sec / 3600);
        var m = Math.floor(sec % 3600 / 60);

        return (h ? h + ':' + pad(m) : m) + ':' + pad(sec % 60);
    }

    function formatDate(ts) {
        return ts ? new Date(ts * 1000).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'}).replace(/\s*г\.$/, '') : '';
    }

    function ago(ts) {
        var diff = Date.now() / 1000 - ts;
        var steps = [
            [31536000, 'год', 'года', 'лет'],
            [2592000, 'месяц', 'месяца', 'месяцев'],
            [604800, 'неделю', 'недели', 'недель'],
            [86400, 'день', 'дня', 'дней'],
            [3600, 'час', 'часа', 'часов'],
            [60, 'минуту', 'минуты', 'минут']
        ];

        for (var i = 0; i < steps.length; i++) {
            var n = Math.floor(diff / steps[i][0]);

            if (n >= 1) return n + ' ' + plural(n, steps[i][1], steps[i][2], steps[i][3]) + ' назад';
        }

        return 'только что';
    }

    function jsonp(method, params, callback) {
        var name = 'vkvideo_cb_' + (++jsonp_seq);
        var script = document.createElement('script');
        var timer;
        var done = false;

        function finish(err, data) {
            if (done) return;

            done = true;
            clearTimeout(timer);
            window[name] = function () {};

            if (script.parentNode) script.parentNode.removeChild(script);

            callback(err, data);
        }

        window[name] = function (data) {
            finish(null, data);
        };

        script.src = API_URL + method + '?' + query(extend({
            v: API_VERSION,
            client_id: CLIENT_ID,
            lang: 'ru',
            callback: name
        }, params));
        script.onerror = function () {
            finish(new Error('Нет связи с VK'));
        };

        timer = setTimeout(function () {
            finish(new Error('VK не отвечает'));
        }, TIMEOUT);

        document.head.appendChild(script);
    }

    // Токен выдаёт прокси: VK не отдаёт его браузеру с чужого домена
    function getToken(force, callback) {
        var saved = Lampa.Storage.get(TOKEN_KEY, '');
        var old = saved && saved.token ? saved.token : '';
        var left = old ? saved.expired_at * 1000 - Date.now() : 0;

        if (!force && left > 60000) {
            // Продлеваем заранее, пока токен жив: у продлённого тот же anonym_id, по нему VK копит рекомендации
            if (left < TOKEN_PROLONG_LEFT) requestToken(old, function () {});

            return callback(null, old);
        }

        requestToken(old, callback);
    }

    // POST со старым токеном продлевает его, GET выдаёт новый. Параллельные запросы ждут один ответ
    function requestToken(old, callback) {
        if (token_waiters) return token_waiters.push(callback);

        token_waiters = [callback];

        var xhr = new XMLHttpRequest();

        function flush(err, token) {
            var list = token_waiters;

            token_waiters = null;
            list.forEach(function (fn) {
                fn(err, token);
            });
        }

        xhr.open(old ? 'POST' : 'GET', TOKEN_URL);
        xhr.timeout = TIMEOUT;
        xhr.onload = function () {
            var data = null;

            try {
                data = JSON.parse(xhr.responseText);
            }
            catch (e) {}

            if (!data || !data.token) return flush(new Error('Прокси не выдал токен'));

            Lampa.Storage.set(TOKEN_KEY, {token: data.token, expired_at: data.expired_at});
            flush(null, data.token);
        };
        xhr.onerror = xhr.ontimeout = function () {
            flush(new Error('Прокси недоступен'));
        };
        xhr.send(old || null);
    }

    // JSONP понимают только catalog.* и execute. Остальные методы отдают чистый JSON, который браузер не исполнит,
    // поэтому их вызываем через execute
    function api(method, params, callback) {
        var direct = method.indexOf('catalog.') === 0;
        var name = direct ? method : 'execute';
        var args = direct ? params : {code: 'return API.' + method + '(' + JSON.stringify(params) + ');'};

        function run(force, retried) {
            getToken(force, function (err, token) {
                if (err) return callback(err);

                jsonp(name, extend({access_token: token}, args), function (err, data) {
                    if (err) return callback(err);

                    if (data && data.error) {
                        // 1116: токен истёк или отозван
                        if (data.error.error_code == 1116 && !retried) return run(true, true);

                        var error = new Error(data.error.error_msg);

                        error.code = data.error.error_code;

                        return callback(error);
                    }

                    callback(null, data.response);
                });
            });
        }

        run(false, false);
    }

    // Самая маленькая картинка не уже min, иначе самая большая
    function pickImage(list, min) {
        var best = null;

        (list || []).forEach(function (img) {
            if (!best) best = img;
            else if (best.width < min ? img.width > best.width : img.width >= min && img.width < best.width) best = img;
        });

        return best ? best.url : '';
    }

    function findOwner(id, res) {
        var list = (id < 0 ? res.groups : res.profiles) || [];

        for (var i = 0; i < list.length; i++) {
            var item = list[i];

            if (item.id === Math.abs(id)) {
                return {
                    name: item.name || ((item.first_name || '') + ' ' + (item.last_name || '')).trim(),
                    photo: item.photo_100 || item.photo_200 || '',
                    verified: !!item.verified,
                    members: item.members_count || 0
                };
            }
        }

        return {name: '', photo: '', verified: false, members: 0};
    }

    function toCard(video, res) {
        var owner = findOwner(video.owner_id, res);

        if (!card_modules) card_modules = Lampa.Maker.module('Card').only('Card', 'Callback');

        return {
            id: video.owner_id + '_' + video.id,
            title: video.title,
            img: pickImage(video.image, 640),
            background: pickImage(video.image, 320),
            owner_id: video.owner_id,
            video_id: video.id,
            player: video.player,
            channel: owner.name,
            channel_photo: owner.photo,
            channel_verified: owner.verified,
            channel_members: owner.members,
            views: video.views || 0,
            likes: video.likes ? video.likes.count : 0,
            comments: video.comments || 0,
            date: video.date || 0,
            duration: video.duration || 0,
            live: video.live_status === 'started',
            description: video.description || '',
            params: {module: card_modules}
        };
    }

    // В API нет признака, можно ли встроить ролик: VK решает это, когда отдаёт страницу плеера.
    // Её проверяет функция api/embed.js. Если функция не ответила, показываем всё
    function filterEmbeddable(videos, callback) {
        var ask = [];

        videos.forEach(function (video) {
            var hash = (String(video.player || '').match(/[?&]hash=([0-9a-f]+)/) || [])[1];

            if (hash && !blocked[video.owner_id + '_' + video.id]) ask.push(video.owner_id + '_' + video.id + '_' + hash);
        });

        function done() {
            callback(videos.filter(function (video) {
                return !blocked[video.owner_id + '_' + video.id];
            }));
        }

        if (!ask.length) return done();

        var xhr = new XMLHttpRequest();

        xhr.open('GET', EMBED_URL + '?videos=' + ask.join(','));
        xhr.timeout = EMBED_TIMEOUT;
        xhr.onload = function () {
            var data = null;

            try {
                data = JSON.parse(xhr.responseText);
            }
            catch (e) {}

            ((data && data.blocked) || []).forEach(function (id) {
                blocked[id] = true;
            });

            done();
        };
        xhr.onerror = xhr.ontimeout = done;
        xhr.send();
    }

    // Карточки в порядке ids без роликов, которые VK не даст встроить
    function toCards(ids, res, callback) {
        var byId = {};

        (res.videos || res.items || []).forEach(function (video) {
            byId[video.owner_id + '_' + video.id] = video;
        });

        filterEmbeddable(ids.map(function (id) {
            return byId[id];
        }).filter(Boolean), function (videos) {
            callback(videos.map(function (video) {
                return toCard(video, res);
            }));
        });
    }

    // more — куда ведёт «Ещё»: {history}, {showcase_url}, {section_id} или {section_url}
    function toLine(title, cards, more) {
        return cards.length ? {title: title, results: cards, total_pages: more ? 2 : 1, more: more} : null;
    }

    // Загрузчики полок работают параллельно, порядок полок сохраняется, пустые выкидываются
    function loadLines(loaders, callback) {
        var lines = [];
        var left = loaders.length;

        if (!left) return callback([]);

        loaders.forEach(function (load, i) {
            load(function (line) {
                lines[i] = line;

                if (--left === 0) callback(lines.filter(Boolean));
            });
        });
    }

    function historyCards() {
        return Lampa.Favorite.get({type: 'history'}).filter(function (card) {
            return card.source === HISTORY_SOURCE;
        });
    }

    // Карточка в «Истории» Lampa. Lampa хранит из неё только свои поля, остальное берём у VK заново
    function addHistory(video) {
        Lampa.Favorite.add('history', {id: video.id, source: HISTORY_SOURCE, title: video.title, img: video.img, background_image: video.background}, 100);

        // В истории Lampa 100 мест на всё: ролики не должны вытеснить фильмы и сериалы
        historyCards().slice(HISTORY_SIZE).forEach(function (card) {
            Lampa.Favorite.remove('history', card);
        });
    }

    function historyLine(done) {
        var ids = historyCards().map(function (card) {
            return card.id;
        });

        if (!ids.length) return done(null);

        api('video.get', {videos: ids.join(','), extended: 1, fields: 'photo_100,members_count,verified'}, function (err, res) {
            if (err) return done(null);

            toCards(ids, res, function (cards) {
                done(toLine('История просмотра', cards, {history: true}));
            });
        });
    }

    function sectionLine(section) {
        return function (done) {
            api('catalog.getSection', {section_id: section.id}, function (err, res) {
                var block = !err && res.section && res.section.blocks && res.section.blocks[0];

                if (!block || !block.videos_ids) return done(null);

                toCards(block.videos_ids, res, function (cards) {
                    done(toLine(section.title, cards, block.next_from ? {section_id: section.id} : null));
                });
            });
        };
    }

    // Секция витрины с блоками: из ответа getVideoShowcase или getSection
    function showcaseSection(res) {
        if (res.section) return res.section;

        return ((res.catalog && res.catalog.sections) || []).filter(function (section) {
            return section.blocks && section.blocks.length;
        })[0];
    }

    // Полки витрины — блоки с видео. Название и «Показать все» бывают у блока или у заголовка перед ним
    function showcaseShelves(section) {
        var shelves = [];
        var prev = null;

        (section.blocks || []).forEach(function (block) {
            var head = prev && prev.layout && prev.layout.name === 'header' ? prev : null;
            var more = (block.actions || []).concat(head && head.actions || []).filter(function (item) {
                return item.action && item.action.url;
            })[0];

            prev = block;

            if (block.data_type !== 'videos' || !block.videos_ids || !block.videos_ids.length) return;

            shelves.push({
                title: block.title || (head && head.layout.title) || '',
                ids: block.videos_ids,
                url: more ? more.action.url : ''
            });
        });

        return shelves;
    }

    // На главной витрина — одна полка: ролики по очереди из всех её блоков
    function mixShelves(shelves) {
        var ids = [];

        for (var i = 0; ids.length < SHELF_SIZE; i++) {
            var found = false;

            shelves.forEach(function (shelf) {
                var id = shelf.ids[i];

                if (!id) return;

                found = true;

                if (ids.length < SHELF_SIZE && ids.indexOf(id) < 0) ids.push(id);
            });

            if (!found) break;
        }

        return ids;
    }

    function showcaseLine(showcase) {
        return function (done) {
            api('catalog.getVideoShowcase', {url: showcase.url, need_blocks: 1}, function (err, res) {
                var section = !err && showcaseSection(res);
                var shelves = section ? showcaseShelves(section) : [];

                if (!shelves.length) return done(null);

                var more = shelves.length > 1 ? {showcase_url: showcase.url} : shelves[0].url ? {section_url: shelves[0].url} : null;

                toCards(mixShelves(shelves), res, function (cards) {
                    done(toLine(showcase.title, cards, more));
                });
            });
        };
    }

    function notify(err) {
        Lampa.Noty.show(MENU_TITLE + ': ' + err.message);
    }

    function openVideo(video) {
        Lampa.Activity.push({component: 'vkvideo_video', title: video.title, oid: video.owner_id, vid: video.video_id, video: video, url: '', page: 1});
    }

    function openMore(more, title) {
        if (more.history) return Lampa.Router.call('favorite', {type: 'history', title: Lampa.Lang.translate('title_history')});

        if (more.showcase_url) return Lampa.Activity.push({component: 'vkvideo_showcase', title: title, showcase_url: more.showcase_url, url: '', page: 1});

        Lampa.Activity.push({component: 'vkvideo_section', title: title, section_id: more.section_id, section_url: more.section_url, url: '', page: 1});
    }

    function openCatalog() {
        Lampa.Activity.push({component: 'vkvideo_main', title: MENU_TITLE, url: '', page: 1});
    }

    // Вид карточки ролика: 16:9, длительность или «Эфир», канал и просмотры под названием
    var CardView = {
        onCreate: function () {
            var data = this.data;
            var view = this.html.querySelector('.card__view');
            var meta = this.html.querySelector('.card__age');

            this.html.classList.add('card--vkvideo');

            if (data.live || data.duration) {
                var badge = document.createElement('div');

                badge.className = 'card__vkvideo-badge' + (data.live ? ' card__vkvideo-badge--live' : '');
                badge.textContent = data.live ? 'Эфир' : formatDuration(data.duration);
                view.appendChild(badge);
            }

            if (!meta) {
                meta = document.createElement('div');
                meta.className = 'card__age';
                this.html.appendChild(meta);
            }

            meta.textContent = [data.channel, countText(data.views, 'просмотр', 'просмотра', 'просмотров')].filter(Boolean).join(' · ');
        }
    };

    function setupCard(card, video) {
        card.use(CardView);
        card.use({
            onEnter: function () {
                openVideo(video);
            },
            onFocus: function () {
                Lampa.Background.change(video.background);
            }
        });
    }

    function setupLine(line) {
        line.use({
            onMore: function (data) {
                openMore(data.more, data.title);
            },
            onInstance: setupCard
        });
    }

    function CatalogPage(object) {
        var queue = [];
        var comp = Lampa.Maker.make('Main', object);

        comp.use({
            onCreate: function () {
                var self = this;

                api('catalog.getVideo', {url: CATALOG_URL, need_blocks: 1}, function (err, res) {
                    if (err) {
                        notify(err);

                        return self.empty();
                    }

                    var all = res.catalog.sections;
                    var block = all[0].blocks && all[0].blocks[0];

                    function recommended(done) {
                        if (!block || !block.videos_ids) return done(null);

                        toCards(block.videos_ids, res, function (cards) {
                            done(toLine('Рекомендации', cards, {section_id: all[0].id}));
                        });
                    }

                    queue = SHOWCASES.map(showcaseLine).concat(all.slice(1).map(sectionLine));

                    loadLines([historyLine, recommended].concat(queue.splice(0, 2)), function (lines) {
                        if (lines.length) self.build(lines);
                        else self.empty();
                    });
                });
            },
            onNext: function (resolve, reject) {
                if (!queue.length) return reject();

                loadLines(queue.splice(0, SHELVES_PER_BATCH), resolve);
            },
            onInstance: setupLine
        });

        return comp;
    }

    // Все полки одной вкладки VK: «Детям», «Трансляции» и т. д.
    function ShowcasePage(object) {
        var section = null;
        var comp = Lampa.Maker.make('Main', object);

        function lines(res, callback) {
            loadLines(showcaseShelves(section).map(function (shelf) {
                return function (done) {
                    toCards(shelf.ids, res, function (cards) {
                        done(toLine(shelf.title || object.title, cards, shelf.url ? {section_url: shelf.url} : null));
                    });
                };
            }), callback);
        }

        comp.use({
            onCreate: function () {
                var self = this;

                api('catalog.getVideoShowcase', {url: object.showcase_url, need_blocks: 1}, function (err, res) {
                    section = !err && showcaseSection(res);

                    if (!section) {
                        if (err) notify(err);

                        return self.empty();
                    }

                    lines(res, function (list) {
                        if (list.length) self.build(list);
                        else self.empty();
                    });
                });
            },
            onNext: function (resolve, reject) {
                var from = section && section.next_from;

                if (!from) return reject();

                section.next_from = null;

                api('catalog.getSection', {section_id: section.id, start_from: from}, function (err, res) {
                    if (err || !res.section) return reject();

                    section = res.section;
                    lines(res, resolve);
                });
            },
            onInstance: setupLine
        });

        return comp;
    }

    function SectionPage(object) {
        var section_id = object.section_id;
        var cursor = null;

        // Широких карточек в ряд помещается меньше, чем постеров
        object.params = {items: {cols: 4}};

        var comp = Lampa.Maker.make('Category', object, function (mod) {
            return mod.toggle(mod.MASK.base, 'Pagination');
        });

        // Раздел витрины открывается по адресу, дальше листается по section_id
        function load(done, fail) {
            var method = section_id ? 'catalog.getSection' : 'catalog.getVideoShowcase';
            var params = section_id ? {section_id: section_id, start_from: cursor} : {url: object.section_url, need_blocks: 1};

            api(method, params, function (err, res) {
                var section = !err && showcaseSection(res);
                var blocks = section ? section.blocks.filter(function (block) {
                    return block.data_type === 'videos' && block.videos_ids;
                }) : [];

                if (!blocks.length) {
                    // 15: дальше первой страницы VK анониму не показывает («Тренды», «Телеканалы»)
                    if (err && err.code != 15) notify(err);

                    return fail();
                }

                section_id = section.id;
                cursor = blocks[0].next_from || null;

                toCards([].concat.apply([], blocks.map(function (block) {
                    return block.videos_ids;
                })), res, function (cards) {
                    done({
                        results: cards,
                        page: object.page,
                        total_pages: cursor ? object.page + 1 : object.page
                    });
                });
            });
        }

        comp.use({
            onCreate: function () {
                var self = this;

                load(function (data) {
                    self.build(data);
                }, function () {
                    self.empty();
                });
            },
            onNext: function (resolve, reject) {
                if (!cursor) return reject();

                load(resolve, reject);
            },
            onInstance: setupCard
        });

        return comp;
    }

    function cleanText(text) {
        // Упоминания VK вида [id1|Имя] показываем как имя
        return String(text || '').replace(/\[(?:id|club|public)\d+\|([^\]]+)\]/g, '$1');
    }

    function avatar(className, url) {
        return '<div class="' + className + '"' + (url ? ' style="background-image: url(\'' + esc(url) + '\')"' : '') + '></div>';
    }

    function WatchPage(object) {
        this.object = object;
        this.video = object.video;
        this.scroll = new Lampa.Scroll({mask: true, over: true, step: 250});
        this.html = document.createElement('div');
        this.comments_offset = 0;
        this.comments_total = 0;
    }

    WatchPage.prototype.create = function () {
        this.scroll.minus();
        this.html.appendChild(this.scroll.render(true));

        if (this.video) this.build();
        else this.restore();
    };

    // После перезагрузки страницы Lampa восстанавливает экран по адресу, где есть только oid и vid
    WatchPage.prototype.restore = function () {
        var self = this;
        var object = this.object;

        this.activity.loader(true);

        api('video.get', {videos: object.oid + '_' + object.vid, extended: 1, fields: 'photo_100,members_count,verified'}, function (err, res) {
            var video = !err && res.items && res.items[0];

            if (self.destroyed) return;

            self.activity.loader(false);

            if (video) {
                self.video = object.video = toCard(video, res);
                self.build();
            }
            else {
                self.scroll.append($('<div class="vkvideo-watch"><div class="vkvideo-watch__note">Видео недоступно</div></div>'));
            }

            self.activity.toggle();
        });
    };

    WatchPage.prototype.build = function () {
        var self = this;
        var video = this.video;
        var stats = [countText(video.views, 'просмотр', 'просмотра', 'просмотров'), formatDate(video.date)].filter(Boolean).join(' · ');
        var sub = video.channel_members ? countText(video.channel_members, 'подписчик', 'подписчика', 'подписчиков') : '';
        var long = video.description.length > 200 || video.description.split('\n').length > 3;

        this.body = document.createElement('div');
        this.body.className = 'vkvideo-watch';
        this.body.innerHTML = [
            '<div class="vkvideo-watch__inner">',
            '<div class="simple-button simple-button--inline selector vkvideo-watch__back"><svg><use xlink:href="#sprite-backward"></use></svg><span>Назад</span></div>',
            '<div class="vkvideo-watch__player selector"></div>',
            '<div class="vkvideo-watch__body">',
            '<div class="vkvideo-watch__title">' + esc(video.title) + '</div>',
            '<div class="vkvideo-watch__stats">' + esc(stats) + (video.likes ? ' · <span class="vkvideo-watch__likes">' + ICON_LIKE + ' ' + esc(shortNumber(video.likes)) + '</span>' : '') + '</div>',
            video.channel ? '<div class="vkvideo-watch__channel">' + avatar('vkvideo-watch__avatar', video.channel_photo) +
                '<div><div class="vkvideo-watch__channel-name">' + esc(video.channel) + (video.channel_verified ? '<span class="vkvideo-watch__verified">' + ICON_VERIFIED + '</span>' : '') + '</div>' +
                (sub ? '<div class="vkvideo-watch__channel-sub">' + esc(sub) + '</div>' : '') + '</div></div>' : '',
            video.description ? '<div class="vkvideo-watch__desc' + (long ? ' selector' : ' expanded') + '"><div class="vkvideo-watch__desc-text">' + esc(cleanText(video.description)) + '</div>' +
                (long ? '<div class="vkvideo-watch__desc-toggle">Показать полностью</div>' : '') + '</div>' : '',
            '<div class="vkvideo-watch__comments-head">Комментарии</div>',
            '<div class="vkvideo-watch__comments"></div>',
            '<div class="simple-button selector vkvideo-watch__more hide"><span>Показать ещё</span></div>',
            '</div>',
            '</div>'
        ].join('');

        this.head = this.body.querySelector('.vkvideo-watch__comments-head');
        this.list = this.body.querySelector('.vkvideo-watch__comments');
        this.more = this.body.querySelector('.vkvideo-watch__more');

        if (video.player) {
            this.frame = document.createElement('iframe');
            this.frame.src = video.player + (video.player.indexOf('?') < 0 ? '?' : '&') + 'js_api=1';
            this.frame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture; screen-wake-lock');
            this.frame.setAttribute('allowfullscreen', '');
            this.body.querySelector('.vkvideo-watch__player').appendChild(this.frame);
        }

        // VK шлёт inited, когда плеер готов. Запускаем один раз: после перезагрузки iframe пользователь жмёт play сам
        this.onMessage = function (e) {
            if (e.origin !== PLAYER_ORIGIN || !self.frame || e.source !== self.frame.contentWindow) return;

            var data = e.data;

            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                }
                catch (err) {
                    return;
                }
            }

            if (!data) return;

            if (data.state) self.state = data.state;

            if (data.event === 'inited' && !self.autoplayed) {
                self.autoplayed = true;
                self.command('play');
            }

            // Эмбед засчитывает просмотр своей анонимной сессии. Чтобы VK учёл его в рекомендациях нашего токена, сообщаем сами
            if (data.event === 'started' && !self.reported) {
                self.reported = true;
                api('video.viewStarted', {owner_id: video.owner_id, video_id: video.video_id}, function () {});
            }

            // VK не дал встроить ролик, а функция проверки этого не поймала. Плеер сам покажет причину
            if (data.event === 'error') blocked[video.id] = true;
        };

        window.addEventListener('message', this.onMessage);

        // После клика по плееру клавиатура остаётся в iframe, и Esc до Lampa не доходит
        $(this.body.querySelector('.vkvideo-watch__back')).on('hover:enter', function () {
            Lampa.Activity.backward();
        });

        // С пульта фокус в iframe не попасть, поэтому OK на плеере ставит паузу и продолжает
        this.last = this.body.querySelector('.vkvideo-watch__player');

        $(this.last).on('hover:enter', function () {
            self.command(self.state === 'playing' ? 'pause' : 'play');
        });

        $(this.body.querySelector('.vkvideo-watch__desc.selector')).on('hover:enter', function () {
            $(this).toggleClass('expanded');
            $(this).find('.vkvideo-watch__desc-toggle').text($(this).hasClass('expanded') ? 'Свернуть' : 'Показать полностью');
        });

        $(this.more).on('hover:enter', function () {
            self.loadComments();
        });

        this.bindFocus(this.body.querySelectorAll('.selector'));
        this.scroll.append(this.body);

        Lampa.Background.change(video.background);

        addHistory(video);
        this.loadComments();
    };

    WatchPage.prototype.command = function (method) {
        if (this.frame && this.frame.contentWindow) this.frame.contentWindow.postMessage({method: method}, PLAYER_ORIGIN);
    };

    WatchPage.prototype.bindFocus = function (nodes) {
        var self = this;

        $(nodes).on('hover:focus', function () {
            self.last = this;

            // «Назад» и плеер вверху страницы: показываем её с начала, иначе «Назад» уедет за край
            if (this.classList.contains('vkvideo-watch__player') || this.classList.contains('vkvideo-watch__back')) self.scroll.reset();
            else self.scroll.update($(this), true);
        });
    };

    WatchPage.prototype.note = function (text) {
        $(this.list).append($('<div class="vkvideo-watch__note"></div>').text(text));
    };

    WatchPage.prototype.loadComments = function () {
        var self = this;
        var video = this.video;

        if (this.loading) return;

        this.loading = true;

        api('video.getComments', {
            owner_id: video.owner_id,
            video_id: video.video_id,
            count: COMMENTS_PER_PAGE,
            offset: this.comments_offset,
            sort: 'desc',
            extended: 1,
            fields: 'photo_100'
        }, function (err, res) {
            self.loading = false;

            if (self.destroyed) return;

            if (err) {
                self.more.classList.add('hide');

                // 801: автор закрыл комментарии
                return self.note(err.code == 801 ? 'Комментарии закрыты' : 'Не удалось загрузить комментарии');
            }

            var nodes = [];

            self.comments_total = res.current_level_count || res.count || 0;
            self.head.innerHTML = 'Комментарии' + (res.count ? '<span>' + esc(Number(res.count).toLocaleString('ru-RU')) + '</span>' : '');

            res.items.forEach(function (comment) {
                var text = cleanText(comment.text);

                if (!text) return;

                var author = findOwner(comment.from_id, res);
                var node = $('<div class="vkvideo-comment selector">' + avatar('vkvideo-comment__avatar', author.photo) +
                    '<div class="vkvideo-comment__body"><div><span class="vkvideo-comment__name">' + esc(author.name || 'Пользователь VK') + '</span>' +
                    '<span class="vkvideo-comment__date">' + esc(ago(comment.date)) + '</span></div>' +
                    '<div class="vkvideo-comment__text">' + esc(text) + '</div></div></div>')[0];

                nodes.push(node);
                self.list.appendChild(node);
            });

            self.comments_offset += res.items.length;

            if (!self.comments_offset) self.note('Комментариев пока нет');

            self.more.classList.toggle('hide', !res.items.length || self.comments_offset >= self.comments_total);

            self.bindFocus(nodes);

            if (Lampa.Controller.own(self)) Lampa.Controller.collectionAppend($(nodes));
        });
    };

    WatchPage.prototype.start = function () {
        var self = this;
        var render = this.scroll.render(true);

        Lampa.Controller.add('content', {
            link: this,
            invisible: true,
            toggle: function () {
                Lampa.Controller.collectionSet(render);

                if (Lampa.Platform.screen('tv')) Lampa.Controller.collectionFocus(self.last || false, render);
            },
            left: function () {
                if (Navigator.canmove('left')) Navigator.move('left');
                else Lampa.Controller.toggle('menu');
            },
            right: function () {
                Navigator.move('right');
            },
            up: function () {
                if (Navigator.canmove('up')) Navigator.move('up');
                else Lampa.Controller.toggle('head');
            },
            down: function () {
                Navigator.move('down');
            },
            back: function () {
                Lampa.Activity.backward();
            }
        });

        Lampa.Controller.toggle('content');
    };

    WatchPage.prototype.pause = function () {
        this.command('pause');
    };

    WatchPage.prototype.stop = function () {};

    WatchPage.prototype.destroy = function () {
        this.destroyed = true;

        window.removeEventListener('message', this.onMessage);

        // Iframe может доиграть, пока Lampa убирает экран, поэтому выгружаем его сразу
        if (this.frame) {
            this.frame.src = 'about:blank';
            $(this.frame).remove();
        }

        this.scroll.destroy();
        $(this.html).remove();
    };

    WatchPage.prototype.render = function (js) {
        return js ? this.html : $(this.html);
    };

    function addMenu() {
        var sort = Lampa.Storage.get('menu_sort', []);

        // Первым пункт встаёт только при первой установке, дальше порядком управляет редактор меню
        if (sort.indexOf(MENU_TITLE) < 0) {
            sort.unshift(MENU_TITLE);
            Lampa.Storage.set('menu_sort', sort);
        }

        Lampa.Menu.addButton(ICON_MENU, MENU_TITLE, openCatalog);
    }

    // Карточки из «Истории» Lampa открывает как фильм TMDB. Ролики VK открываем своей страницей
    function routeHistory() {
        var call = Lampa.Router.call;

        Lampa.Router.call = function (name, data) {
            if (name !== 'full' || !data || data.source !== HISTORY_SOURCE) return call.apply(this, arguments);

            var ids = String(data.id).split('_');

            Lampa.Activity.push({component: 'vkvideo_video', title: data.title, oid: ids[0], vid: ids[1], url: '', page: 1});
        };
    }

    function init() {
        var style = document.createElement('style');

        style.textContent = STYLE;
        document.head.appendChild(style);

        Lampa.Component.add('vkvideo_main', CatalogPage);
        Lampa.Component.add('vkvideo_showcase', ShowcasePage);
        Lampa.Component.add('vkvideo_section', SectionPage);
        Lampa.Component.add('vkvideo_video', WatchPage);

        routeHistory();
        addMenu();
    }

    function start() {
        if (!window.Lampa || !Lampa.Listener || !Lampa.Maker) return setTimeout(start, 50);

        if (window.appready) return init();

        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') init();
        });
    }

    start();
})();
