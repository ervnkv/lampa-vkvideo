(function () {
    'use strict';

    if (window.vkvideo18_plugin) return;

    window.vkvideo18_plugin = true;

    var CATALOG_URL = 'https://porno-vkvideo.ru/api/dr-video/catalog';
    // Ролик играет обёртка Яндекса из каталога: напрямую VK не показывает видео для взрослых на чужих сайтах
    var PLAYER_ORIGIN = 'https://yastatic.net';
    var MENU_TITLE = 'VK Видео 18+';
    var CACHE_TIME = 30 * 60 * 1000;
    var TIMEOUT = 20000;
    var LINES_PER_BATCH = 6;
    var PAGE_SIZE = 20;

    var ICON_MENU = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="4.5" width="19" height="15" rx="4.5" stroke="currentColor" stroke-width="2"/><text x="12" y="15.2" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="700" fill="currentColor">18+</text></svg>';

    var STYLE = [
        '.items-line .card--vk18 { width: 21em; }',
        '.card--vk18 .card__view { padding-bottom: 56.25%; margin-bottom: 0.7em; }',
        '.card--vk18 .card__img { object-fit: cover; }',
        '.card--vk18 .card__title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; max-height: 2.6em; }',
        '.card--vk18 .card__age { margin-top: 0.35em; font-size: 0.9em; opacity: 0.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
        '@media screen and (max-width: 480px) { .items-line .card--vk18 { width: 18em; } }',

        '.vk18-watch { padding: 0 1.5em 3em; }',
        '.vk18-watch__inner { margin: 0 auto; }',
        '@media screen and (min-width: 768px) and (min-height: 480px) { .vk18-watch__inner { max-width: calc((100vh - 17em) * 1.7778); } }',
        '.vk18-watch__back { margin-bottom: 0.8em; }',
        '.vk18-watch__player { position: relative; padding-top: 56.25%; background: #000; border-radius: 1em; overflow: hidden; }',
        '.vk18-watch__player.focus { box-shadow: 0 0 0 0.2em #fff; }',
        '.vk18-watch__player iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }',
        '.vk18-watch__title { margin-top: 0.8em; font-size: 1.6em; font-weight: 600; line-height: 1.3; }',
        '.vk18-watch__author { margin-top: 0.4em; color: rgba(255, 255, 255, 0.6); }',
        '.vk18-watch__desc { margin-top: 1.2em; white-space: pre-line; word-wrap: break-word; line-height: 1.45; color: rgba(255, 255, 255, 0.8); }',
        '.vk18-watch__note { margin-top: 1em; color: rgba(255, 255, 255, 0.5); }',
        '@media screen and (max-width: 767px) { .vk18-watch { padding: 0 0 3em; } .vk18-watch__back { margin: 0 1em 0.8em; } .vk18-watch__player { border-radius: 0; } .vk18-watch__body { padding: 0 1em; } .vk18-watch__title { font-size: 1.35em; } }'
    ].join('\n');

    var catalog = null;
    var catalog_time = 0;
    var catalog_waiters = null;
    var card_modules = null;

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Каталог около 900 КБ, поэтому держим его в памяти. Параллельные запросы ждут один ответ
    function loadCatalog(callback) {
        if (catalog && Date.now() - catalog_time < CACHE_TIME) return callback(null, catalog);

        if (catalog_waiters) return catalog_waiters.push(callback);

        catalog_waiters = [callback];

        var xhr = new XMLHttpRequest();

        function flush(err) {
            var list = catalog_waiters;

            catalog_waiters = null;
            list.forEach(function (fn) {
                fn(err, catalog);
            });
        }

        xhr.open('GET', CATALOG_URL);
        xhr.timeout = TIMEOUT;
        xhr.onload = function () {
            var data = null;

            try {
                data = JSON.parse(xhr.responseText);
            }
            catch (e) {}

            if (!data || !data.items) return flush(new Error('Каталог не загрузился'));

            data.byId = {};
            data.items.forEach(function (item) {
                data.byId[item.id] = item;
            });

            catalog = data;
            catalog_time = Date.now();
            flush(null);
        };
        xhr.onerror = xhr.ontimeout = function () {
            flush(new Error('Нет связи с каталогом'));
        };
        xhr.send();
    }

    function notify(err) {
        Lampa.Noty.show(MENU_TITLE + ': ' + err.message);
    }

    function toCard(item) {
        if (!card_modules) card_modules = Lampa.Maker.module('Card').only('Card', 'Callback');

        return {
            id: item.id,
            title: item.title,
            img: item.imageUrl || '',
            author: item.author || '',
            description: item.description || '',
            // Эмбед VK лежит в адресе обёртки закодированным. Помечаем его как встроенный в Lampa
            player: item.playback.url.replace(/partner_name%3D\w+/, 'partner_name%3Dlampa'),
            params: {module: card_modules}
        };
    }

    function isCategory(id) {
        return catalog.categories.some(function (category) {
            return category.id === id;
        });
    }

    // Все ролики полки для «Ещё»: у темы — все ролики темы, у «Новинок» — весь каталог, у «Клипов» — вертикальные
    function shelfItems(shelf) {
        if (isCategory(shelf.id)) {
            return catalog.items.filter(function (item) {
                return (item.categoryIds || []).indexOf(shelf.id) >= 0;
            });
        }

        if (shelf.id === 'newest') return catalog.items;

        if (shelf.id === 'clips') {
            return catalog.items.filter(function (item) {
                return item.presentation === 'portrait';
            });
        }

        return shelf.itemIds.map(function (id) {
            return catalog.byId[id];
        }).filter(Boolean);
    }

    function toLine(shelf) {
        var items = shelf.itemIds.map(function (id) {
            return catalog.byId[id];
        }).filter(Boolean);

        return {
            title: shelf.title,
            shelf_id: shelf.id,
            results: items.map(toCard),
            total_pages: shelfItems(shelf).length > items.length ? 2 : 1
        };
    }

    function findShelf(id) {
        return (catalog.shelves || []).filter(function (shelf) {
            return shelf.id === id;
        })[0];
    }

    function openVideo(video) {
        Lampa.Activity.push({component: 'vkvideo18_video', title: video.title, item_id: video.id, url: '', page: 1});
    }

    function openCatalog() {
        Lampa.Activity.push({component: 'vkvideo18_main', title: MENU_TITLE, url: '', page: 1});
    }

    var CardView = {
        onCreate: function () {
            var meta = this.html.querySelector('.card__age');

            this.html.classList.add('card--vk18');

            if (!meta) {
                meta = document.createElement('div');
                meta.className = 'card__age';
                this.html.appendChild(meta);
            }

            meta.textContent = this.data.author;
        }
    };

    // Фон Lampa не меняем: большие превью она почти не размывает
    function setupCard(card, video) {
        card.use(CardView);
        card.use({
            onEnter: function () {
                openVideo(video);
            }
        });
    }

    function CatalogPage(object) {
        var lines = [];
        var comp = Lampa.Maker.make('Main', object);

        comp.use({
            onCreate: function () {
                var self = this;

                loadCatalog(function (err) {
                    if (err) {
                        notify(err);

                        return self.empty();
                    }

                    lines = (catalog.shelves || []).map(toLine).filter(function (line) {
                        return line.results.length;
                    });

                    if (lines.length) self.build(lines.splice(0, LINES_PER_BATCH));
                    else self.empty();
                });
            },
            onNext: function (resolve, reject) {
                if (!lines.length) return reject();

                resolve(lines.splice(0, LINES_PER_BATCH));
            },
            onInstance: function (line) {
                line.use({
                    onMore: function (data) {
                        Lampa.Activity.push({component: 'vkvideo18_section', title: data.title, shelf_id: data.shelf_id, url: '', page: 1});
                    },
                    onInstance: setupCard
                });
            }
        });

        return comp;
    }

    function SectionPage(object) {
        var items = [];
        var page = 0;

        // Широких карточек в ряд помещается меньше, чем постеров
        object.params = {items: {cols: 4}};

        var comp = Lampa.Maker.make('Category', object, function (mod) {
            return mod.toggle(mod.MASK.base, 'Pagination');
        });

        function next() {
            page++;

            return {
                results: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(toCard),
                page: page,
                total_pages: Math.ceil(items.length / PAGE_SIZE)
            };
        }

        comp.use({
            onCreate: function () {
                var self = this;

                loadCatalog(function (err) {
                    var shelf = !err && findShelf(object.shelf_id);

                    if (!shelf) {
                        if (err) notify(err);

                        return self.empty();
                    }

                    items = shelfItems(shelf);
                    self.build(next());
                });
            },
            onNext: function (resolve, reject) {
                if (page * PAGE_SIZE >= items.length) return reject();

                resolve(next());
            },
            onInstance: setupCard
        });

        return comp;
    }

    function WatchPage(object) {
        this.object = object;
        this.scroll = new Lampa.Scroll({mask: true, over: true, step: 250});
        this.html = document.createElement('div');
    }

    // В адресе Lampa только id ролика, остальное берём из каталога. После перезагрузки его надо скачать заново
    WatchPage.prototype.create = function () {
        var self = this;

        this.scroll.minus();
        this.html.appendChild(this.scroll.render(true));

        if (catalog && Date.now() - catalog_time < CACHE_TIME) return this.show();

        this.activity.loader(true);

        loadCatalog(function () {
            if (self.destroyed) return;

            self.activity.loader(false);
            self.show();
            self.activity.toggle();
        });
    };

    WatchPage.prototype.show = function () {
        var item = catalog && catalog.byId[this.object.item_id];

        if (item) this.build(toCard(item));
        else this.scroll.append($('<div class="vk18-watch"><div class="vk18-watch__note">Видео недоступно</div></div>'));
    };

    WatchPage.prototype.build = function (video) {
        var self = this;

        this.body = document.createElement('div');
        this.body.className = 'vk18-watch';
        this.body.innerHTML = [
            '<div class="vk18-watch__inner">',
            '<div class="simple-button simple-button--inline selector vk18-watch__back"><svg><use xlink:href="#sprite-backward"></use></svg><span>Назад</span></div>',
            '<div class="vk18-watch__player selector"></div>',
            '<div class="vk18-watch__body">',
            '<div class="vk18-watch__title">' + esc(video.title) + '</div>',
            video.author ? '<div class="vk18-watch__author">' + esc(video.author) + '</div>' : '',
            video.description ? '<div class="vk18-watch__desc">' + esc(video.description) + '</div>' : '',
            '</div>',
            '</div>'
        ].join('');

        this.frame = document.createElement('iframe');
        this.frame.src = video.player;
        this.frame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture; screen-wake-lock');
        this.body.querySelector('.vk18-watch__player').appendChild(this.frame);

        // Обёртка пересылает события плеера VK с префиксом sandbox:. Свой inited она шлёт без state и иногда раньше,
        // чем готов плеер VK, тогда play теряется. Запускаем один раз по inited от VK
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

            if (data.event === 'sandbox:inited' && data.state && !self.autoplayed) {
                self.autoplayed = true;
                self.command('play');
            }
        };

        window.addEventListener('message', this.onMessage);

        // После клика по плееру клавиатура остаётся в iframe, и Esc до Lampa не доходит
        $(this.body.querySelector('.vk18-watch__back')).on('hover:enter', function () {
            Lampa.Activity.backward();
        });

        // С пульта фокус в iframe не попасть, поэтому OK на плеере ставит паузу и продолжает
        this.last = this.body.querySelector('.vk18-watch__player');

        $(this.last).on('hover:enter', function () {
            self.command(self.state === 'playing' ? 'pause' : 'play');
        });

        $(this.body.querySelectorAll('.selector')).on('hover:focus', function () {
            self.last = this;
            self.scroll.reset();
        });

        this.scroll.append(this.body);
    };

    WatchPage.prototype.command = function (method) {
        if (this.frame && this.frame.contentWindow) this.frame.contentWindow.postMessage({method: 'sandbox:' + method}, PLAYER_ORIGIN);
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

    function init() {
        var style = document.createElement('style');

        style.textContent = STYLE;
        document.head.appendChild(style);

        Lampa.Component.add('vkvideo18_main', CatalogPage);
        Lampa.Component.add('vkvideo18_section', SectionPage);
        Lampa.Component.add('vkvideo18_video', WatchPage);

        Lampa.Menu.addButton(ICON_MENU, MENU_TITLE, openCatalog);
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
